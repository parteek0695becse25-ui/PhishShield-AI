"""Risk scoring shared by the message and URL analysers.

This is a transparent, weighted rule-based heuristic. It is NOT a trained
machine-learning model and the score is NOT a probability of fraud.

To avoid double-counting, indicators are grouped by category. Inside one
category the strongest indicator counts fully and the others count at 30%.
If several independent categories fire together a small, explicit
"combined tactics" bonus is added. The final score is capped at 100.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Dict, List

ENGINE_NAME = "PhishShield rule engine"
ENGINE_VERSION = "1.0.0"

DISCLAIMER = (
    "This result comes from rule-based heuristics, not a trained machine-learning "
    "model, and it is not a probability of fraud. False positives and false "
    "negatives are possible. When in doubt, contact the organisation using an "
    "official number or app that you already trust."
)

SEVERITY_ORDER = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}


@dataclass
class Indicator:
    name: str
    severity: str          # LOW | MEDIUM | HIGH | CRITICAL
    explanation: str
    evidence: str
    recommendation: str
    weight: int            # contribution before de-duplication
    category: str          # used for de-duplication

    def public(self) -> dict:
        d = asdict(self)
        d.pop("category")
        return d


def severity_for_weight(weight: int) -> str:
    if weight >= 35:
        return "CRITICAL"
    if weight >= 25:
        return "HIGH"
    if weight >= 13:
        return "MEDIUM"
    return "LOW"


def score_to_level(score: int) -> str:
    if score >= 75:
        return "CRITICAL"
    if score >= 50:
        return "HIGH"
    if score >= 25:
        return "MEDIUM"
    return "LOW"


def combine(indicators: List[Indicator]) -> int:
    """Combine indicator weights into a 0-100 score."""
    groups: Dict[str, List[int]] = {}
    for ind in indicators:
        groups.setdefault(ind.category, []).append(ind.weight)

    total = 0.0
    strong_categories = 0
    for weights in groups.values():
        weights = sorted(weights, reverse=True)
        cat_score = weights[0] + 0.3 * sum(weights[1:])
        total += cat_score
        if weights[0] >= 15:
            strong_categories += 1

    if strong_categories >= 3:
        total += 10  # several independent scam tactics together
    return max(0, min(100, int(round(total))))


def combined_bonus_applies(indicators: List[Indicator]) -> bool:
    groups: Dict[str, int] = {}
    for ind in indicators:
        groups[ind.category] = max(groups.get(ind.category, 0), ind.weight)
    return sum(1 for w in groups.values() if w >= 15) >= 3


def build_result(scan_type: str, indicators: List[Indicator], summary_subject: str,
                 extra: dict | None = None) -> dict:
    indicators = sorted(indicators, key=lambda i: (-SEVERITY_ORDER[i.severity], -i.weight))
    score = combine(indicators)
    level = score_to_level(score)

    if not indicators:
        summary = (f"No suspicious patterns were found in this {summary_subject}. "
                   "That does not guarantee it is safe, so stay careful with unexpected requests.")
    else:
        top = ", ".join(i.name.lower() for i in indicators[:3])
        summary = (f"Risk level {level} (score {score}/100). {len(indicators)} suspicious "
                   f"pattern(s) were found in this {summary_subject}, mainly: {top}.")
        if combined_bonus_applies(indicators):
            summary += " Several different scam tactics appear together, which raises the score."

    recs: List[str] = []
    for ind in indicators:
        if ind.recommendation and ind.recommendation not in recs:
            recs.append(ind.recommendation)
    if level in ("HIGH", "CRITICAL"):
        recs.insert(0, "Do not reply, click links, or share any personal or financial details.")
        recs.append("Report it: in India use the national cyber crime portal (cybercrime.gov.in) "
                    "or call 1930 if money was lost.")
    elif level == "MEDIUM":
        recs.insert(0, "Treat this with caution and verify the sender through an official channel.")
    else:
        recs.append("No strong warning signs were found, but never share OTPs, PINs or passwords.")

    result = {
        "scan_type": scan_type,
        "risk_score": score,
        "risk_level": level,
        "summary": summary,
        "indicators": [i.public() for i in indicators],
        "recommendations": recs,
        "engine": {
            "name": ENGINE_NAME,
            "version": ENGINE_VERSION,
            "method": "rule-based heuristics",
            "machine_learning": False,
            "threat_intelligence_lookup": False,
        },
        "disclaimer": DISCLAIMER,
    }
    if extra:
        result.update(extra)
    return result
