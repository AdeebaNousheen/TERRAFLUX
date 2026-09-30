# TERRAFLUX API

FastAPI backend for the SIH 2026 functional prototype. It starts with in-memory demo data; changes reset when the process restarts.

## Setup

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Use `source .venv/bin/activate` on macOS/Linux. Set `FRONTEND_ORIGIN` to a deployed frontend origin (comma separated values are accepted). Local Vite origins are allowed by default.

## API overview

All endpoints use `/api`. Interactive OpenAPI docs are at `/docs`; health is `GET /api/health`. Endpoint groups cover dashboard, predictions, simulation, impact, evacuation and preventive evacuation, SOS/incidents/rescue, shelters/relief/donations, communication simulation, and audit logs.

## Prototype limitations

Risk scoring and scenario progression are deterministic demo rules, not trained machine learning. All records are illustrative and in memory. Sensor observations, LoRa/offline delivery, donations, routes, and emergency coordination are simulations; no government data, actual radio network, real payment, or production emergency service is connected. Route recommendations cannot guarantee safety. PostgreSQL can be introduced behind repository interfaces when persistence is needed.
