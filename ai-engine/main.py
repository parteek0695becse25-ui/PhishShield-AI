"""PhishShield AI - detection engine (FastAPI).

Run:  uvicorn main:app --host 127.0.0.1 --port 8000
Docs: http://127.0.0.1:8000/docs
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from detector import MAX_MESSAGE_LENGTH, analyze_message
from risk_engine import ENGINE_NAME, ENGINE_VERSION
from url_analyzer import MAX_URL_LENGTH, InvalidUrlError, analyze_url

app = FastAPI(
    title="PhishShield AI Detection Engine",
    version=ENGINE_VERSION,
    description=("Explainable rule-based analysis of scam messages and URLs. "
                 "This is a heuristic engine, not a trained machine-learning model. "
                 "URLs are analysed as text only and are never visited."),
)


class MessageRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=MAX_MESSAGE_LENGTH,
                      description="SMS, WhatsApp or e-mail text to analyse.")


class UrlRequest(BaseModel):
    url: str = Field(..., min_length=1, max_length=MAX_URL_LENGTH, description="URL to analyse (never opened).")


class Indicator(BaseModel):
    name: str
    severity: str
    explanation: str
    evidence: str
    recommendation: str
    weight: int


class AnalysisResponse(BaseModel):
    scan_type: str
    risk_score: int = Field(..., ge=0, le=100)
    risk_level: str
    summary: str
    indicators: List[Indicator]
    recommendations: List[str]
    engine: Dict[str, Any]
    disclaimer: str
    links_found: Optional[List[str]] = None
    url_details: Optional[Dict[str, Any]] = None
    notice: Optional[str] = None


@app.get("/health")
def health() -> Dict[str, Any]:
    return {"status": "UP", "service": ENGINE_NAME, "version": ENGINE_VERSION, "machine_learning": False}


@app.post("/analyze/message", response_model=AnalysisResponse, response_model_exclude_none=True)
def analyze_message_endpoint(req: MessageRequest):
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="The message is empty.")
    return analyze_message(text)


@app.post("/analyze/url", response_model=AnalysisResponse, response_model_exclude_none=True)
def analyze_url_endpoint(req: UrlRequest):
    try:
        return analyze_url(req.url)
    except InvalidUrlError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.exception_handler(Exception)
async def unexpected_error(_, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": "The detection engine hit an unexpected error."})
