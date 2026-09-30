# TERRAFLUX

**Team:** PARALLAX  
**SIH:** 2026  
**PS ID:** SIH26192  
**Problem statement:** Flash Flood Prediction System for Hilly Regions using Multi-Source Data  
**Product:** AI-Based Flash Flood Prediction and Resilient Response System for Hilly Regions

## Solution overview

TERRAFLUX is a functional prototype for exploring flood risk and coordinating a resilient response in hilly regions. Its backend provides deterministic, transparent demo risk scoring and scenario data to support the existing frontend.

**Workflow:** Predict → Assess Impact → Warn → Evacuate → Communicate → Rescue → Shelter → Relief

## Key features

- Rule-based flood risk calculation and a three-stage scenario simulation
- Impact, evacuation zone, and route recommendation views
- Preventive evacuation household statuses
- SOS intake linked to incidents, incident assignment/status, and rescue dispatch
- Shelter capacity and supply status, relief needs, simulated donations
- Explicitly simulated offline/LoRa-style communication and audit records

## Stack and architecture

- **Frontend:** React 19, TypeScript, Vite, Leaflet/React Leaflet, Recharts, Lucide React
- **Backend:** Python, FastAPI, Pydantic, Uvicorn
- **Architecture:** existing frontend → JSON REST API (`/api`) → in-memory demo store and service layer. A repository/database adapter can replace the in-memory store later.

## Local setup

Run these in separate terminals from the repository root.

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Backend:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend health endpoint: `http://localhost:8000/api/health`  
Interactive API docs: `http://localhost:8000/docs`

## Prototype limitations

This is an SIH functional demo. Prediction is deterministic weighted logic, not trained ML. There are no real IoT/LoRa integrations, government APIs, live hazard feeds, production emergency dispatch services, payment processing, or persistent database. Communication and donations are simulated, all data is illustrative, and evacuation routes are recommendations based on demo/latest available conditions; they do not guarantee safety.

## GitHub project information

- Repository: `https://github.com/<organization-or-user>/<repository>` (placeholder)
- Default branch: `<branch>` (placeholder)

## Deployment

- Frontend URL: `<frontend deployment URL>`
- Backend URL: `<backend deployment URL>`
- Configure backend `FRONTEND_ORIGIN` with the deployed frontend origin.
