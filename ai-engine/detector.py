"""Explainable rule-based detection for scam / phishing messages.

Every rule documents what it looks for, why that is suspicious and what the
user should do. Nothing here is machine learning.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List, Optional

from risk_engine import Indicator, build_result, severity_for_weight
from url_analyzer import quick_score

MAX_MESSAGE_LENGTH = 5000

URL_RE = re.compile(
    r"(?:https?://|www\.)[^\s<>\"']+|"
    r"\b(?:[a-z0-9-]+\.)+(?:com|in|net|org|co|xyz|top|click|link|info|biz|online|site|shop|live|app|me|ly|gl|cc|tk|ml|ga|cf|gq|support|work|icu|buzz)\b(?:/[^\s<>\"']*)?",
    re.I,
)
NEGATION_RE = re.compile(r"\b(do\s*not|don'?t|never|dont|mat|na)\s+(ever\s+)?$", re.I)


@dataclass
class Rule:
    key: str
    name: str
    category: str
    weight: int
    pattern: re.Pattern
    explanation: str
    recommendation: str
    check_negation: bool = False


def _p(*alts: str) -> re.Pattern:
    return re.compile("|".join(alts), re.I)


RULES: List[Rule] = [
    Rule("prize", "Fake prize or lottery claim", "prize", 30,
         _p(r"\b(you('| ha)?ve|you have|you are|you've been)\s+(been\s+)?(won|selected|chosen)\b",
            r"\bcongratulations?\b[^.!\n]{0,60}\b(won|winner|prize|reward|gift|selected)\b",
            r"\blucky\s*(draw|winner|customer|user)\b", r"\blottery\b", r"\bclaim\s+(your\s+)?(prize|reward|gift|cashback|winnings?)\b",
            r"\bfree\s+(iphone|gift|recharge|laptop|data)\b", r"\bwon\s+(rs\.?|inr|₹|\$|usd)?\s*[\d,]{4,}",
            r"\binaam\b", r"\bjeet(a|e|ey)\b[^.\n]{0,30}\b(inaam|lottery|prize)\b", r"\bkbc\b[^.\n]{0,40}\b(lottery|winner|prize)\b"),
         "Scammers promise prizes, lotteries or rewards you never entered for, so you hand over details or fees.",
         "Ignore prize messages for contests you did not enter. Genuine prizes never require a fee or personal data."),
    Rule("account_threat", "Account suspension or verification threat", "account", 28,
         _p(r"\b(account|a/c|card|wallet|sim|number|khata)\b[^.!\n]{0,40}\b(suspend(ed)?|block(ed)?|lock(ed)?|clos(ed|ure)|deactivat(ed|ion)|disabled|terminated|restrict(ed)?|band)\b",
            r"\b(suspend(ed)?|block(ed)?|deactivat(ed|ion)|terminat(ed|ion))\b[^.!\n]{0,40}\b(account|a/c|card|wallet|sim)\b",
            r"\bverify\s+your\s+(account|identity|details|information|bank|card|kyc|number)\b",
            r"\bkyc\b[^.!\n]{0,40}\b(pending|expire[sd]?|update|verification|incomplete|mandatory|required|suspend)",
            r"\b(update|complete|renew|verify)\s+(your\s+)?kyc\b",
            r"\bunusual\s+(sign[- ]?in|login|activity)\b", r"\bsuspicious\s+(activity|transaction|login)\b[^.\n]{0,40}\byour\b",
            r"\b(confirm|re-?activate|re-?validate|secure)\s+your\s+account\b"),
         "A message that says your account will be blocked or needs urgent verification tries to scare you into acting without thinking.",
         "Do not use links in the message. Open the official app or website yourself, or call the number printed on your card or statement."),
    Rule("urgency", "Urgency and pressure tactics", "urgency", 15,
         _p(r"\burgent(ly)?\b", r"\bimmediate(ly)?\b", r"\bwithin\s+\d+\s*(hours?|hrs?|minutes?|mins?|days?)\b",
            r"\b(act|reply|respond|call|click|pay)\s+(now|fast|today|immediately|asap)\b", r"\blast\s+(chance|warning|reminder)\b",
            r"\bfinal\s+(notice|warning|reminder)\b", r"\bexpires?\s+(today|tonight|soon|in)\b", r"\bonly\s+\d+\s+(hours?|minutes?|slots?|left)\b",
            r"\bturant\b", r"\bjaldi\b", r"\baaj\s+hi\b", r"\bbefore\s+it'?s\s+too\s+late\b", r"\bhurry\b"),
         "Scammers create time pressure so you do not have time to check whether the message is real.",
         "Pause. Real organisations do not demand instant action by message. Take time to verify through an official channel."),
    Rule("otp", "Request for OTP, PIN or CVV", "secret", 38,
         _p(r"\b(share|send|give|tell|provide|forward|reply\s+with|enter|read\s+out|bata(o|yein|iye)?|bhej(o|ein|iye)?)\s+(me\s+|us\s+|it\s+)?(your\s+|the\s+|this\s+|ur\s+)?(otp|one[- ]time\s+(password|pin|code)|cvv|cvc|atm\s+pin|upi\s+pin|mpin|pin|verification\s+code)\b",
            r"\b(otp|cvv|pin)\b[^.!\n]{0,25}\b(share|send|bata(o|yein)|bhej(o|ein)|reply)\b",
            r"\breply\s+(with\s+)?(the\s+)?(code|otp)\b"),
         "OTPs, PINs and CVV numbers are secret keys to your money. No bank, wallet or government office will ask you to send them.",
         "Never share an OTP, PIN or CVV with anyone, even if they claim to be from your bank.",
         check_negation=True),
    Rule("credentials", "Request for passwords or sensitive personal data", "credentials", 30,
         _p(r"\b(enter|confirm|send|share|provide|submit|update|verify)\s+(your\s+)?(password|login\s+details|net\s*banking|internet\s+banking|card\s+(number|details)|debit\s+card|credit\s+card|bank\s+details|account\s+(number|details)|aadhaar|aadhar|pan\s+(card|number)|date\s+of\s+birth|ssn|social\s+security)\b",
            r"\b(login|log\s*in|sign\s*in)\s+(details|credentials|to\s+(your\s+)?(account|bank|portal))\b",
            r"\bfull\s+card\s+number\b", r"\bsecurity\s+question\b"),
         "Requests for passwords, card numbers or ID numbers are a core phishing technique used to take over accounts or commit identity theft.",
         "Never type passwords or card details into a page reached from a message. Go to the official website or app yourself.",
         check_negation=True),
    Rule("payment", "Payment, fee or money transfer demand", "payment", 25,
         _p(r"\b(processing|registration|clearance|customs|delivery|handling|release|insurance|activation|verification)\s+(fee|charges?|tax)\b",
            r"\bpay\s+(a\s+)?(small\s+)?(fee|charge|deposit|amount|tax)\b",
            r"\bpay\s+(rs\.?|inr|₹|\$|usd|rupees)?\s*[\d,]+",
            r"\b(transfer|send|deposit|remit)\s+(rs\.?|inr|₹|\$|usd|money|amount|funds|rupees)\s*[\d,]*",
            r"\bgift\s*cards?\b", r"\b(bitcoin|btc|usdt|crypto(currency)?)\b[^.\n]{0,30}\b(pay|send|transfer|wallet)\b",
            r"\bwestern\s+union\b", r"\bwire\s+transfer\b", r"\bcollect\s+request\b", r"\bscan\s+(this\s+)?qr\b[^.\n]{0,40}\b(receive|get)\b"),
         "Being asked to pay a fee, tax or deposit to receive money, a parcel or a prize is a classic advance-fee scam.",
         "Do not send money to claim a prize, loan or parcel. Never approve UPI collect requests you did not start."),
    Rule("remote_access", "Request to install remote-access software", "remote", 38,
         _p(r"\b(anydesk|teamviewer|quick\s*support|ammyy|rustdesk|airdroid|screen\s*share)\b"),
         "Fraudsters ask you to install screen-sharing apps so they can see your screen and OTPs and move money themselves.",
         "Never install remote-access apps at the request of a caller or message."),
    Rule("authority", "Threat of arrest or legal action", "authority", 25,
         _p(r"\b(arrest(ed)?|warrant|police\s+case|legal\s+action|court\s+(notice|case)|cbi|ed\s+officer|narcotics|money\s+laundering|digital\s+arrest)\b",
            r"\b(fir|case)\s+(has\s+been\s+)?(registered|filed)\b[^.\n]{0,40}\byou\b",
            r"\bparcel\b[^.\n]{0,50}\b(drugs?|illegal|seized|customs)\b"),
         "Scammers pose as police, courts or customs and threaten arrest to frighten you into paying or sharing details.",
         "Real agencies do not arrest people or demand payment over messages or video calls. Hang up and contact the agency directly."),
    Rule("financial_offer", "Too-good-to-be-true money offer", "offer", 22,
         _p(r"\b(pre-?approved|instant)\s+loan\b", r"\bloan\s+(approved|sanctioned)\b", r"\bguaranteed\s+(returns?|profit|income)\b",
            r"\bdouble\s+your\s+(money|investment)\b", r"\bearn\s+(rs\.?|inr|₹|\$)?\s*[\d,]+\s*(per|/|a)\s*(day|week|hour)\b",
            r"\b(work\s+from\s+home|part[- ]time\s+job)\b[^.\n]{0,60}\b(earn|income|salary|daily)\b", r"\bno\s+(interest|credit\s+check)\b[^.\n]{0,30}\bloan\b",
            r"\b(investment|trading)\s+(tips?|group|opportunity)\b[^.\n]{0,50}\b(profit|returns?|guaranteed)\b"),
         "Offers of easy loans, guaranteed returns or high pay for simple tasks are common bait for financial scams.",
         "Be sceptical of guaranteed profits. Check that any lender or investment firm is registered with the RBI or SEBI."),
    Rule("secrecy", "Request to keep it secret", "pressure", 15,
         _p(r"\b(do\s*not|don'?t|dont)\s+(tell|inform|share\s+this\s+with|discuss\s+with)\s+(anyone|anybody|your\s+(family|bank|friends?))\b",
            r"\bkeep\s+(this|it)\s+(secret|confidential|private)\b", r"\bconfidential\s+matter\b"),
         "Scammers isolate victims by asking for secrecy so nobody can warn them.",
         "Talk to a family member or your bank before acting on any message that asks for secrecy."),
    Rule("click_prompt", "Prompt to click a link", "linkprompt", 10,
         _p(r"\b(click|tap|open|visit|follow)\s+(on\s+)?(the\s+|this\s+|below\s+)?(link|here|url|button)\b", r"\bclick\s+(below|now)\b",
            r"\blink\s+(below|given)\b", r"\bdownload\s+(the\s+)?(app|apk|file)\b"),
         "Messages that push you to click a link are the main way phishing pages are delivered.",
         "Do not tap links in unexpected messages. Open the official app or type the website address yourself."),
]

BRAND_PATTERN = re.compile(
    r"\b(sbi|state\s+bank|hdfc|icici|axis\s+bank|kotak|paytm|phonepe|google\s*pay|gpay|amazon|flipkart|netflix|microsoft|apple\s*id|icloud|paypal|"
    r"income\s*tax|uidai|aadhaar|rbi|irctc|epfo|dhl|fedex|blue\s*dart|india\s+post|whatsapp|facebook|instagram|jio|airtel|vi\s+(sim|customer)|bank)\b", re.I)


def _negated(text: str, start: int) -> bool:
    """True if the matched request is preceded by a 'do not' style phrase."""
    window = text[max(0, start - 24):start]
    return bool(NEGATION_RE.search(window))


def _snippet(text: str, m: re.Match) -> str:
    start, end = max(0, m.start() - 15), min(len(text), m.end() + 15)
    s = text[start:end].replace("\n", " ").strip()
    return ("..." if start > 0 else "") + s + ("..." if end < len(text) else "")


def _extract_links(text: str) -> List[str]:
    links, seen = [], set()
    for m in URL_RE.finditer(text):
        link = m.group(0).rstrip(".,;:!?)]}'\"")
        if m.start() > 0 and text[m.start() - 1] in "@.":
            continue  # part of an e-mail address, not a link
        if link.lower() not in seen:
            seen.add(link.lower())
            links.append(link)
    return links[:5]


def collect_indicators(text: str) -> tuple[List[Indicator], List[str]]:
    indicators: List[Indicator] = []
    fired = set()

    for rule in RULES:
        for m in rule.pattern.finditer(text):
            if rule.check_negation and _negated(text, m.start()):
                continue
            indicators.append(Indicator(
                name=rule.name, severity=severity_for_weight(rule.weight),
                explanation=rule.explanation, evidence=_snippet(text, m)[:160],
                recommendation=rule.recommendation, weight=rule.weight, category=rule.category))
            fired.add(rule.category)
            break  # one indicator per rule avoids repeating the same finding

    links = _extract_links(text)
    for link in links[:3]:
        scored = quick_score(link)
        if not scored:
            continue
        score, url_inds = scored
        if score >= 15:
            reasons = "; ".join(i.name.lower() for i in url_inds[:3])
            weight = min(30, max(10, round(score * 0.5)))
            indicators.append(Indicator(
                name="Suspicious link in message", severity=severity_for_weight(weight),
                explanation=f"The link '{link[:60]}' shows warning signs ({reasons}). "
                            "Use the URL Scanner for a full breakdown.",
                evidence=link[:160],
                recommendation="Do not open the link. Visit the official website by typing its address yourself.",
                weight=weight, category="links"))
            fired.add("links")
            break

    if BRAND_PATTERN.search(text) and fired & {"account", "secret", "credentials", "links", "urgency", "payment", "linkprompt", "authority"}:
        m = BRAND_PATTERN.search(text)
        indicators.append(Indicator(
            name="Possible impersonation of a known organisation", severity="MEDIUM",
            explanation="The message names a well-known bank, service or agency while also pressing you to act. "
                        "Scammers borrow trusted names to look official.",
            evidence=_snippet(text, m)[:160],
            recommendation="Contact the organisation using the official app or the number on its website, not the one in the message.",
            weight=18, category="impersonation"))

    letters = [c for c in text if c.isalpha()]
    if len(letters) >= 25 and sum(c.isupper() for c in letters) / len(letters) > 0.6:
        indicators.append(Indicator(
            name="Shouting in capital letters", severity="LOW",
            explanation="Messages written mostly in capitals are often used to create alarm. This is a weak signal.",
            evidence=text[:60].replace("\n", " "), recommendation="Judge the content, not the volume.",
            weight=5, category="style"))
    if text.count("!") >= 4:
        indicators.append(Indicator(
            name="Excessive exclamation marks", severity="LOW",
            explanation="Many exclamation marks add false excitement or alarm. This is a weak signal.",
            evidence=f"{text.count('!')} exclamation marks", recommendation="Stay calm and verify the claim.",
            weight=4, category="style"))
    return indicators, links


def analyze_message(text: str) -> dict:
    indicators, links = collect_indicators(text)
    return build_result("MESSAGE", indicators, "message", {"links_found": links})
