"""Spam filter inference code.

Every preprocessing step here must stay identical to the training notebook,
otherwise the predictions will be wrong without any error message.
"""
import re
import string as st

import joblib
import nltk
import numpy as np
import pandas as pd
from nltk.corpus import stopwords, wordnet
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize
from scipy.sparse import csr_matrix, hstack

# NLTK data (skipped quickly if already installed)
for _pkg in ["stopwords", "wordnet", "punkt_tab", "averaged_perceptron_tagger_eng"]:
    nltk.download(_pkg, quiet=True)

_stopws = set(stopwords.words("english"))
_lemmatizer = WordNetLemmatizer()

MAX_CHARS = 20_000  # very long emails are cut, to keep the response time low

# ---------------------------------------------------------------- headers and prefixes
def strip_headers(text):
    text = re.sub(r"(?im)^[\s\-]*(original message|forwarded by).*$", "", text)
    text = re.sub(r"(?im)^\s*(from|to|cc|bcc|sent|date|subject)\s*:.*$", "", text)
    return text.strip()


def strip_subject_prefix(s):
    return re.sub(r"(?i)^\s*((re|fw|fwd)\s*:\s*)+", "", s).strip()


def prepare_email(subject, message):
    return strip_subject_prefix(str(subject).lower()), strip_headers(str(message).lower())


# ---------------------------------------------------------------- text cleaning
def normalize(text):
    return text.lower()


def remove_punctuation(text):
    return re.sub(f"[{re.escape(st.punctuation)}]", "", text)


def tokenizer(text):
    return word_tokenize(text.lower())


def remove_stopwords(tokens):
    return [token for token in tokens if token not in _stopws]


def _get_pos(tag):
    return {"J": wordnet.ADJ, "V": wordnet.VERB, "R": wordnet.ADV}.get(tag[0], wordnet.NOUN)


def lemma_words(tokens):
    return [_lemmatizer.lemmatize(w, _get_pos(t)) for w, t in nltk.pos_tag(tokens)]


def clean_pipeline(text):
    tokens = tokenizer(remove_punctuation(normalize(text)))
    tokens = remove_stopwords(tokens)
    tokens = lemma_words(tokens)
    return " ".join(tokens)


# ---------------------------------------------------------------- non-textual features
FIN_KW = ["free", "money", "cash", "credit", "loan", "mortgage", "winner", "won",
          "prize", "offer", "discount", "cheap", "viagra", "invest", "urgent",
          "guarantee", "bonus", "income", "million", "bargain"]
_fin_re = re.compile(r"\b(" + "|".join(FIN_KW) + r")\b")


def raw_features(subject, message):
    text = subject + " " + message
    return {
        "n_exclam": text.count("!"),
        "n_question": text.count("?"),
        "n_dollar": text.count("$"),
        "digit_ratio": len(re.findall(r"\d", text)) / max(len(text), 1),
        "n_urls": len(re.findall(r"http|www", text)),
        "n_fin_kw": len(_fin_re.findall(text)),
        "len_subject": len(subject),
        "len_message": len(message),
    }


def log_scale(f):
    f = f.copy()
    for c in f.columns:
        if c != "digit_ratio":
            f[c] = np.log1p(f[c])
    return f


# ---------------------------------------------------------------- the filter
class SpamFilter:
    def __init__(self, path="spam_model.joblib"):
        art = joblib.load(path)
        self.tfidf = art["tfidf"]
        self.scaler = art["scaler"]
        self.model = art["model"]
        self.threshold = float(art["threshold"])
        self.feat_cols = list(art["feat_cols"])

    def predict(self, subject, message, threshold=None):
        threshold = self.threshold if threshold is None else threshold
        subject, message = prepare_email(subject, message[:MAX_CHARS])
        text = clean_pipeline(subject + " " + message)
        feats = log_scale(pd.DataFrame([raw_features(subject, message)], columns=self.feat_cols))
        X = hstack([self.tfidf.transform([text]),
                    csr_matrix(self.scaler.transform(feats))]).tocsr()
        p = float(self.model.predict_proba(X)[0, 1])
        known_terms = int((X[:, :len(self.tfidf.vocabulary_)] != 0).sum())
        return {"probability": round(p, 4), "is_spam": p >= threshold,
                "threshold": round(threshold, 3), "known_terms": known_terms}