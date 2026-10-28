from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from spam_filter import SpamFilter

MODEL_PATH = "spam_model.joblib"
MIN_KNOWN_TERMS = 5  # below this, the model knows too few words to be reliable

app = FastAPI(title="Spam Filter API", version="1.0")

# Open CORS for development. Restrict allow_origins before a public deployment.
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

spam_filter = SpamFilter(MODEL_PATH)  # loaded once, when the server starts


class EmailIn(BaseModel):
    subject: str = ""
    message: str = Field("", max_length=200_000)
    threshold: float | None = Field(None, ge=0, le=1)  # optional: override the saved threshold


class PredictionOut(BaseModel):
    is_spam: bool
    probability: float | None
    threshold: float
    known_terms: int
    low_confidence: bool
    note: str | None = None


@app.get("/health")
def health():
    return {"status": "ok", "default_threshold": spam_filter.threshold}


@app.post("/predict", response_model=PredictionOut)
def predict(email: EmailIn):
    threshold = spam_filter.threshold if email.threshold is None else email.threshold

    # Nothing to analyse: do not call the model
    if not email.subject.strip() and not email.message.strip():
        return PredictionOut(is_spam=False, probability=None, threshold=round(threshold, 3),
                             known_terms=0, low_confidence=True, note="empty email")

    # The email content is never logged or stored.
    res = spam_filter.predict(email.subject, email.message, threshold=threshold)
    low = res["known_terms"] < MIN_KNOWN_TERMS
    return PredictionOut(is_spam=res["is_spam"], probability=res["probability"],
                         threshold=res["threshold"], known_terms=res["known_terms"],
                         low_confidence=low,
                         note="few known words: result may be unreliable" if low else None)