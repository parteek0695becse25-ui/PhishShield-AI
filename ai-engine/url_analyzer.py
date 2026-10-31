"""Static URL analysis.

The analyser only inspects the *text* of a URL. It never opens, resolves or
downloads the address and it does not query any live threat-intelligence
service.
"""
from __future__ import annotations

import ipaddress
import re
from typing import List, Optional, Tuple
from urllib.parse import urlsplit, unquote

from risk_engine import Indicator, build_result, score_to_level, combine

MAX_URL_LENGTH = 2048

SHORTENERS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "cutt.ly", "rb.gy",
    "shorturl.at", "tiny.cc", "buff.ly", "rebrand.ly", "t.ly", "s.id", "bl.ink",
    "lnkd.in", "v.gd", "shorte.st", "adf.ly", "clk.sh", "qr.ae", "tr.im",
}

SUSPICIOUS_TLDS = {
    "xyz", "top", "tk", "ml", "ga", "cf", "gq", "work", "click", "link", "country",
    "kim", "loan", "men", "icu", "cyou", "buzz", "rest", "cam", "monster", "zip",
    "mov", "support", "download", "review", "stream", "gdn", "bid", "win", "party",
}

SUSPICIOUS_KEYWORDS = [
    "login", "signin", "log-in", "verify", "verification", "secure", "security",
    "account", "update", "confirm", "banking", "wallet", "password", "otp", "kyc",
    "bonus", "free", "prize", "claim", "reward", "suspend", "unlock", "recover",
    "billing", "refund", "gift", "lottery", "winner",
]

# brand token -> registrable domains that legitimately belong to it
BRANDS = {
    "paypal": {"paypal.com"},
    "google": {"google.com", "google.co.in", "goo.gl", "gstatic.com", "googleapis.com"},
    "amazon": {"amazon.com", "amazon.in", "amazon.co.uk", "amazonaws.com"},
    "microsoft": {"microsoft.com", "live.com", "office.com", "outlook.com", "microsoftonline.com"},
    "apple": {"apple.com", "icloud.com"},
    "facebook": {"facebook.com", "fb.com"},
    "instagram": {"instagram.com"},
    "whatsapp": {"whatsapp.com", "whatsapp.net"},
    "netflix": {"netflix.com"},
    "paytm": {"paytm.com", "paytmbank.com"},
    "phonepe": {"phonepe.com"},
    "flipkart": {"flipkart.com"},
    "sbi": {"sbi.co.in", "onlinesbi.sbi", "onlinesbi.com", "sbi.bank.in"},
    "hdfc": {"hdfcbank.com", "hdfc.com", "hdfclife.com"},
    "hdfcbank": {"hdfcbank.com"},
    "icici": {"icicibank.com", "icicilombard.com", "iciciprulife.com"},
    "icicibank": {"icicibank.com"},
    "axisbank": {"axisbank.com"},
    "kotak": {"kotak.com", "kotakbank.com"},
    "irctc": {"irctc.co.in"},
    "dhl": {"dhl.com"},
    "fedex": {"fedex.com"},
    "linkedin": {"linkedin.com"},
    "twitter": {"twitter.com", "x.com"},
    "dropbox": {"dropbox.com"},
}

SECOND_LEVEL_LABELS = {"co", "com", "org", "net", "gov", "ac", "edu", "nic", "res"}
RISKY_EXTENSIONS = (".exe", ".apk", ".scr", ".msi", ".bat", ".cmd", ".jar", ".vbs", ".ps1", ".zip", ".rar", ".iso")
DANGEROUS_SCHEMES = ("javascript:", "data:", "vbscript:", "file:")
LEET = str.maketrans({"0": "o", "1": "l", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s"})

_LABEL_RE = re.compile(r"^(?!-)[a-z0-9-]{1,63}(?<!-)$")


class InvalidUrlError(ValueError):
    """Raised when the text cannot be interpreted as a URL."""


def _levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def _host_is_ip(host: str) -> Tuple[bool, str]:
    """Return (is_ip, kind) where kind describes the encoding."""
    try:
        ip = ipaddress.ip_address(host.strip("[]"))
        return True, "private" if (ip.is_private or ip.is_loopback) else "public"
    except ValueError:
        pass
    if host.isdigit() and int(host) <= 0xFFFFFFFF and len(host) >= 8:
        return True, "decimal-encoded"
    if re.fullmatch(r"0x[0-9a-f]+", host):
        return True, "hex-encoded"
    return False, ""


def registrable_domain(host: str) -> str:
    labels = host.split(".")
    if len(labels) <= 2:
        return host
    if len(labels[-1]) == 2 and labels[-2] in SECOND_LEVEL_LABELS and len(labels) >= 3:
        return ".".join(labels[-3:])
    return ".".join(labels[-2:])


def normalise(raw: str) -> Tuple[str, bool]:
    """Strip whitespace and add a scheme if missing. Returns (url, scheme_was_missing)."""
    text = (raw or "").strip()
    if not text:
        raise InvalidUrlError("Please enter a URL.")
    if len(text) > MAX_URL_LENGTH:
        raise InvalidUrlError(f"The URL is longer than {MAX_URL_LENGTH} characters.")
    if re.search(r"\s", text):
        raise InvalidUrlError("A URL cannot contain spaces or line breaks.")
    if any(ord(c) < 32 for c in text):
        raise InvalidUrlError("The URL contains control characters.")
    lowered = text.lower()
    if lowered.startswith(DANGEROUS_SCHEMES):
        return text, False
    if re.match(r"^[a-z][a-z0-9+.-]*://", lowered):
        return text, False
    if lowered.startswith("//"):
        return "http:" + text, True
    return "http://" + text, True


def _validate_host(host: Optional[str], original: str) -> str:
    if not host:
        raise InvalidUrlError("This does not look like a valid URL: no website address was found.")
    host = host.lower().rstrip(".")
    if _host_is_ip(host)[0]:
        return host
    if not host.isascii():
        try:
            host_ascii = host.encode("idna").decode("ascii")
        except UnicodeError:
            raise InvalidUrlError("The website address contains characters that cannot be used in a domain.")
    else:
        host_ascii = host
    labels = host_ascii.split(".")
    if len(labels) < 2 or not all(_LABEL_RE.match(l) for l in labels):
        raise InvalidUrlError(
            "This does not look like a valid URL. Use a format such as https://example.com/page")
    tld = labels[-1]
    if not (tld.isalpha() or tld.startswith("xn--")) or len(tld) < 2:
        raise InvalidUrlError("The website address does not end in a valid domain extension.")
    return host


def _add(out: List[Indicator], name: str, weight: int, category: str, explanation: str,
         evidence: str, recommendation: str, severity: Optional[str] = None) -> None:
    from risk_engine import severity_for_weight
    out.append(Indicator(name=name, severity=severity or severity_for_weight(weight),
                         explanation=explanation, evidence=evidence[:160],
                         recommendation=recommendation, weight=weight, category=category))


def collect_indicators(raw_url: str) -> Tuple[List[Indicator], dict]:
    """Run all URL checks. Raises InvalidUrlError for malformed input."""
    url, scheme_missing = normalise(raw_url)
    lowered = url.lower()
    out: List[Indicator] = []

    # Dangerous non-web schemes are reported without further parsing.
    if lowered.startswith(DANGEROUS_SCHEMES):
        scheme = lowered.split(":", 1)[0]
        _add(out, "Dangerous link type", 80, "scheme",
             f"Links starting with '{scheme}:' can run code or load hidden content instead of opening a normal website.",
             url[:80], "Do not open or paste this link anywhere.", "CRITICAL")
        return out, {"normalized_url": url, "hostname": None, "scheme": scheme}

    try:
        parts = urlsplit(url)
        host = parts.hostname
        port = parts.port
    except ValueError:
        raise InvalidUrlError("This does not look like a valid URL (the address or port is malformed).")

    if parts.scheme not in ("http", "https", "ftp"):
        raise InvalidUrlError(f"Only web addresses are supported (found '{parts.scheme}://').")
    host = _validate_host(host, raw_url)
    path_query = unquote((parts.path or "") + ("?" + parts.query if parts.query else "")).lower()
    is_ip, ip_kind = _host_is_ip(host)
    reg_domain = host if is_ip else registrable_domain(host)
    meta = {"normalized_url": url, "hostname": host, "scheme": parts.scheme,
            "registrable_domain": reg_domain, "scheme_added": scheme_missing}

    # --- transport -------------------------------------------------------
    if parts.scheme != "https":
        _add(out, "Connection is not encrypted", 10, "transport",
             "The address does not use HTTPS, so anything typed on the page can be read in transit. "
             "Legitimate login and payment pages almost always use HTTPS.",
             f"scheme: {parts.scheme}" + (" (not specified, assumed http)" if scheme_missing else ""),
             "Avoid entering passwords or payment details on pages that do not use HTTPS.")

    # --- host structure --------------------------------------------------
    if is_ip:
        _add(out, "Address is an IP number", 40 if ip_kind != "private" else 30, "host",
             "Real companies use domain names. Links that point to a raw IP address are a common way to hide who runs the site"
             + (f" ({ip_kind} address)." if ip_kind not in ("public",) else "."),
             host, "Do not open links that use a numeric IP address.")
    else:
        labels = host.split(".")
        sub_labels = labels[:-len(reg_domain.split("."))]
        if len(sub_labels) >= 3:
            _add(out, "Too many subdomains", 18, "host",
                 "Attackers stack many subdomains so the real domain is hard to spot at a glance.",
                 host, f"The real site is '{reg_domain}'. Check that this is the organisation you expect.")
        if host in SHORTENERS or reg_domain in SHORTENERS:
            _add(out, "Shortened link", 20, "shortener",
                 "Link shorteners hide the real destination, which scammers use to disguise dangerous pages.",
                 host, "Expand the link with a trusted preview tool or ask the sender for the full address.")
        tld = labels[-1]
        if tld in SUSPICIOUS_TLDS:
            _add(out, "Domain extension often abused", 15, "tld",
                 f"The extension '.{tld}' is cheap or free to register and appears often in scam campaigns. "
                 "Many legitimate sites exist on such extensions, so this is only a weak signal.",
                 f".{tld}", "Check the site through an official app or a search engine you trust.")
        if host.startswith("xn--") or ".xn--" in host:
            _add(out, "Punycode (encoded) domain", 25, "charset",
                 "Domains beginning with 'xn--' hold non-English characters that can imitate familiar letters.",
                 host, "Type the organisation's address yourself instead of following this link.")
        if not host.isascii():
            _add(out, "Look-alike characters in domain", 30, "charset",
                 "The domain contains non-English characters that can imitate familiar letters (homograph attack).",
                 host, "Type the organisation's address yourself instead of following this link.")
        if host.count("-") >= 3:
            _add(out, "Many hyphens in domain", 12, "host",
                 "Domains stuffed with hyphens (for example secure-login-bank-update) are typical of fake pages.",
                 host, "Be cautious of long hyphenated domains.")
        stem = re.sub(r"[^a-z0-9]", "", host.rsplit(".", 1)[0])
        digits = sum(c.isdigit() for c in stem)
        if len(stem) >= 8 and digits / len(stem) > 0.3:
            _add(out, "Unusual number of digits in domain", 10, "host",
                 "Auto-generated or throw-away domains often contain many digits.",
                 host, "Check the website name carefully before trusting it.")
        if "_" in host:
            _add(out, "Underscore in domain", 12, "charset",
                 "Underscores are not normally used in real website names.", host,
                 "Do not trust this address.")

        # --- brand misuse / look-alikes ----------------------------------
        tokens = [t for t in re.split(r"[.\-]", host) if t]
        sld = reg_domain.split(".")[0]
        flagged_brand = False
        for brand, legit in BRANDS.items():
            if reg_domain in legit:
                continue
            if brand in tokens and not flagged_brand:
                flagged_brand = True
                _add(out, "Brand name used in a different domain", 35, "lookalike",
                     f"The name '{brand}' appears in the address, but the site actually belongs to '{reg_domain}', "
                     "which is not an official domain for that brand.",
                     host, f"Only trust {brand} pages at its official domain. Use the official app or type the address yourself.")
        if not flagged_brand:
            for part in re.split(r"-", sld):
                fixed = part.translate(LEET)
                for brand, legit in BRANDS.items():
                    if len(brand) < 5 or reg_domain in legit:
                        continue
                    if (fixed == brand and part != brand) or (part != brand and _levenshtein(part, brand) == 1):
                        _add(out, "Look-alike of a known brand", 40, "lookalike",
                             f"'{part}' closely imitates '{brand}' using swapped, added or missing characters.",
                             host, f"Do not trust this site. The real {brand} site is one of: {', '.join(sorted(legit))}.")
                        flagged_brand = True
                        break
                if flagged_brand:
                    break

    # --- authority / userinfo trick -------------------------------------
    if "@" in parts.netloc:
        _add(out, "'@' hides the real destination", 35, "userinfo",
             "Everything before '@' in a web address is ignored by the browser. Scammers put a trusted name there "
             "so the link looks safe while it really goes to the part after '@'.",
             parts.netloc, "Do not open this link.")

    if port and port not in (80, 443):
        _add(out, "Unusual port number", 12, "port",
             "Normal websites use the standard web ports. A custom port is uncommon for public sites.",
             f":{port}", "Be careful with addresses that specify a port number.")

    # --- length and encoding --------------------------------------------
    length = len(url)
    if length > 120:
        _add(out, "Very long URL", 15, "length",
             "Extremely long links are often used to hide the real domain or carry tracking and redirect data.",
             f"{length} characters", "Inspect the beginning of the address to see the real domain.")
    elif length > 75:
        _add(out, "Long URL", 8, "length",
             "Long links can bury the real destination.", f"{length} characters",
             "Inspect the beginning of the address to see the real domain.")
    if len(re.findall(r"%[0-9a-fA-F]{2}", parts.path + parts.query)) >= 3 or "%25" in url:
        _add(out, "Heavily encoded characters", 10, "encoding",
             "A lot of percent-encoding can be used to disguise words or paths.",
             (parts.path + parts.query)[:80], "Be cautious with links that look scrambled.")

    # --- keywords --------------------------------------------------------
    haystack = host + path_query
    found = [k for k in SUSPICIOUS_KEYWORDS if k in haystack]
    if found:
        weight = min(8 * len(found), 24)
        _add(out, "Sensitive keywords in the address", weight, "keywords",
             "Words such as login, verify or account are often used to make fake pages look official. "
             "Real sites use them too, so this is a weak signal on its own.",
             ", ".join(found[:6]), "Check that the domain itself belongs to the organisation before signing in.")

    # --- redirects and downloads ---------------------------------------
    if re.search(r"[?&](url|redirect|redirect_uri|next|target|dest|goto|return)=https?(:|%3a)", parts.query, re.I):
        _add(out, "Redirect to another site", 12, "redirect",
             "The link carries another web address as a parameter, which can bounce you to a different site.",
             parts.query[:80], "Check where the link finally leads before entering any details.")
    low_path = (parts.path or "").lower()
    if low_path.endswith(RISKY_EXTENSIONS):
        _add(out, "Link to a downloadable program or archive", 25, "download",
             "The address ends in a file type that can install malware.",
             low_path.rsplit("/", 1)[-1], "Do not download or open files from unknown sources.")

    return out, meta


def analyze_url(raw_url: str) -> dict:
    indicators, meta = collect_indicators(raw_url)
    extra = {"url_details": meta,
             "notice": "The URL was analysed as text only. It was never opened and was not checked "
                       "against a live threat-intelligence database."}
    return build_result("URL", indicators, "URL", extra)


def quick_score(raw_url: str) -> Optional[Tuple[int, List[Indicator]]]:
    """Score a URL embedded in a message. Returns None for unparsable links."""
    try:
        indicators, _ = collect_indicators(raw_url)
    except InvalidUrlError:
        return None
    return combine(indicators), indicators
