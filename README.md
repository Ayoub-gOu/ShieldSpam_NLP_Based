# Shild Spam

NLP-based spam detection system integrated into Gmail through a browser extension.

## How it works

1. The extension reads the content of an email opened in Gmail.
2. It sends the text to the local API.
3. The API applies the classification model and returns the prediction (spam / not spam).
4. The extension displays the result to the user.

## Project structure

```
Anti-Spam-project/
├── spam-api/              # Inference API
│   ├── main.py            # API entry point
│   ├── spam_filter.py     # Preprocessing and prediction
│   └── spam_model.joblib  # Trained model
├── spam-extension/        # Gmail extension
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── popup.html
│   └── popup.js
├── mini-project-nlp.ipynb # Notebook: exploration, training, evaluation
├── pyproject.toml
└── uv.lock
```

## Installation

Prerequisites: Python 3.10+ and [uv](https://docs.astral.sh/uv/).

```bash
git clone <repo-url>
cd Anti-Spam-project
uv sync
```

## Running the API

```bash
cd spam-api
uv run uvicorn main:app --reload
```

The API is available at `http://127.0.0.1:8000` (documentation at `/docs`).

## Installing the extension

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `spam-extension` folder

## Technologies

Python, scikit-learn, joblib, FastAPI, uv, JavaScript (Chrome extension)

## Author

Ayoub GOUAHSSOUN, ENSA El Jadida, Master SDIA