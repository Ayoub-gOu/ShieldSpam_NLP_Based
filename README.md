# Anti-Spam Project

Système de détection de spam basé sur le NLP, intégré à Gmail via une extension de navigateur.

## Fonctionnement

1. L'extension lit le contenu d'un e-mail ouvert dans Gmail.
2. Elle envoie le texte à l'API locale.
3. L'API applique le modèle de classification et renvoie la prédiction (spam / non-spam).
4. L'extension affiche le résultat à l'utilisateur.

## Structure du projet

```
Anti-Spam-project/
├── spam-api/              # API d'inférence
│   ├── main.py            # Point d'entrée de l'API
│   ├── spam_filter.py     # Prétraitement et prédiction
│   └── spam_model.joblib  # Modèle entraîné
├── spam-extension/        # Extension Gmail
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── popup.html
│   └── popup.js
├── mini-project-nlp.ipynb # Notebook : exploration, entraînement, évaluation
├── pyproject.toml
└── uv.lock
```

## Installation

Prérequis : Python 3.10+ et [uv](https://docs.astral.sh/uv/).

```bash
git clone <url-du-repo>
cd Anti-Spam-project
uv sync
```

## Lancer l'API

```bash
cd spam-api
uv run uvicorn main:app --reload
```

L'API est disponible sur `http://127.0.0.1:8000` (documentation sur `/docs`).

## Installer l'extension

1. Ouvrir `chrome://extensions`
2. Activer le **mode développeur**
3. Cliquer sur **Charger l'extension non empaquetée**
4. Sélectionner le dossier `spam-extension`

## Technologies

Python, scikit-learn, joblib, FastAPI, uv, JavaScript (extension Chrome)

## Auteur

Ayoub GOUAHSSOUN, ENSA El Jadida, Master SDIA