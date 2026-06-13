# OpenJetty Backend (FastAPI)

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then add your ANTHROPIC_API_KEY
```

## Run

```bash
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Check it: http://localhost:8000/health
