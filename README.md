# 🌊 TERRAFLUX

### AI-Based Flash Flood Prediction and Resilient Response System for Hilly Regions

<p align="center">
  <strong>Smart India Hackathon 2026</strong><br>
  Disaster Management • Software Solution
</p>

---

## 🏆 Project Information

| Detail | Information |
|---|---|
| **Team** | PARALLAX |
| **Hackathon** | Smart India Hackathon 2026 |
| **PS ID** | SIH26192 |
| **Problem Statement** | Flash Flood Prediction System for Hilly Regions using Multi-Source Data |
| **Product** | TERRAFLUX |
| **Domain** | Disaster Management |

---

## 🌍 Overview

**TERRAFLUX** is a functional prototype designed to support flash-flood risk assessment and coordinated disaster response in hilly regions.

The system brings prediction, impact assessment, evacuation, emergency communication, rescue coordination, shelter management, and relief support into a unified decision-support workflow.

### 🔄 Core Workflow

> **Predict → Assess Impact → Warn → Evacuate → Communicate → Rescue → Shelter → Relief**

TERRAFLUX is designed as a **complementary decision-support system**, supporting authorities and responders rather than replacing official disaster-warning or emergency-response systems.

---

# 🚨 The Problem

Flash floods in hilly regions can develop rapidly due to a combination of factors such as:

- 🌧️ Intense and forecast rainfall
- 💧 Increasing soil moisture and saturation
- 🌊 Rising water levels
- ⛰️ Terrain and slope vulnerability
- 📍 Population exposure
- 🚧 Road and bridge disruption
- 📡 Loss of communication connectivity

A response system therefore needs to do more than simply identify flood risk.

It should help connect:

**Risk → Impact → Warning → Evacuation → Rescue → Shelter → Relief**

---

# 💡 TERRAFLUX Solution

TERRAFLUX integrates multiple operational capabilities into one platform.

### 🧠 1. Flood Risk Prediction

A transparent rule-based risk engine evaluates multiple factors including:

- Rainfall
- Forecast rainfall
- Soil moisture
- Elevation
- Slope
- Water level
- Historical flood frequency
- Terrain vulnerability
- IoT observation inputs

The prototype produces an interpretable risk score and displays contributing factors separately from the confidence indicator.

---

### 🌊 2. Flood Scenario Simulation

The system provides a three-stage flood scenario:

**Stage 1 → Stage 2 → Stage 3**

As the scenario progresses, the prototype demonstrates changes in:

- Flood risk
- Rainfall
- Soil moisture
- Water level
- Affected roads
- Affected households
- Connectivity
- Shelter occupancy

This allows the complete response workflow to be demonstrated under changing conditions.

---

### 🗺️ 3. Impact Assessment

TERRAFLUX provides an operational view of potential impact areas through map-based information such as:

- Flood-risk zones
- Villages
- Roads
- Shelters
- SOS locations
- Evacuation zones
- Emergency communication nodes

The objective is to help decision-makers understand **where the risk is increasing and who may be affected**.

---

### 🚶 4. Dynamic Evacuation Guidance

The system provides evacuation-zone and route-recommendation views.

It considers prototype conditions such as:

- Flooded roads
- Blocked routes
- Shelter availability
- Changing risk conditions

When conditions change, the recommended route can be recalculated.

> ⚠️ Routes shown by the prototype are recommendations based on available/demo conditions and do not guarantee safety.

---

### 🏠 5. Preventive Evacuation

TERRAFLUX includes household-level evacuation tracking for authorized response personnel.

Households can be represented through statuses such as:

- ✅ Evacuated
- 🟠 Pending
- 🔴 High Risk / Not Evacuated
- ⚠️ Assistance Required
- ❓ Unknown

The system can help identify people who may require additional assistance because of factors such as:

- Medical needs
- Mobility limitations
- Elderly residents
- Children/families
- Transportation requirements
- Communication loss
- Blocked routes

---

### 🆘 6. Citizen SOS & Incident Management

Citizens can submit emergency SOS information.

An SOS can be connected to an incident containing information such as:

- 📍 Location
- 👥 Number of people
- 🚑 Medical emergency
- 🔋 Battery status
- 📡 Communication status
- 🕐 Last update

Incidents can progress through a response workflow:

**NEW → ASSIGNED → EN ROUTE → RESCUED → CLOSED**

---

### 🚑 7. Rescue Operations

The rescue workflow connects incidents with responder actions.

The prototype supports:

- Incident assignment
- Rescue dispatch
- Responder status
- Incident status updates
- Emergency prioritization

This creates a continuous operational chain from:

**SOS → Incident → Assignment → Rescue**

---

### 🏠 8. Shelters & Relief

TERRAFLUX provides shelter information including:

- Shelter capacity
- Occupancy
- Available capacity
- Water requirements
- Food requirements
- Medical requirements
- Blanket requirements

This allows authorities to monitor shelter pressure and resource shortages.

---

### ❤️ 9. Relief & Donations

The prototype connects affected areas with verified-style relief requirements.

Example requirements may include:

- 💧 Water
- 🍚 Food
- 💊 Medical supplies
- 🛏️ Blankets

Donation flows are simulated to demonstrate how support could be connected to verified requirements.

> 💡 Donation and transaction flows in the prototype are simulations and do not process real payments.

---

### 📡 10. Low-Connectivity Emergency Communication

TERRAFLUX demonstrates a low-connectivity emergency communication concept.

Normal communication:

```text
Citizen
   ↓
Internet
   ↓
Server
   ↓
Control Centre

Emergency / low-connectivity concept:
Citizen Device
      ↓
Bluetooth / LoRa-style Node
      ↓
Emergency Gateway
      ↓
Control Centre
The communication workflow is simulated in the current prototype.
⚠️ The prototype does not implement a deployed LoRa/mesh communication network or direct satellite communication.
🧩 Integrated Disaster-Response Workflow
TERRAFLUX connects individual modules into one operational chain:
MULTI-SOURCE DATA
       ↓
🌧️ FLOOD PREDICTION
       ↓
🌊 IMPACT ASSESSMENT
       ↓
⚠️ WARN
       ↓
🚶 PREVENTIVE EVACUATION
       ↓
🗺️ ROUTE GUIDANCE
       ↓
📡 COMMUNICATE
       ↓
🆘 SOS
       ↓
🚨 INCIDENT MANAGEMENT
       ↓
🚑 RESCUE
       ↓
🏠 SHELTER
       ↓
❤️ RELIEF
       ↓
📊 IMPACT TRACKING
🖥️ System Modules
Module
Purpose
📊 Situation Overview
Central operational dashboard
🌧️ Flood Prediction
Multi-source risk assessment
🌊 Impact Assessment
Population and infrastructure impact
🗺️ Evacuation Guidance
Safe-zone and route recommendations
🚶 Preventive Evacuation
Household evacuation tracking
🚨 Incident Management
Emergency incident coordination
🚑 Rescue Operator
Rescue assignment and dispatch
🏠 Shelters & Relief
Shelter capacity and resources
❤️ Relief & Donations
Relief requirements and support
🆘 Citizen / SOS
Emergency reporting
⚙️ Administration
Role and prototype configuration
🛠️ Technology Stack
🎨 Frontend
⚛️ React 19
🔷 TypeScript
⚡ Vite
🗺️ Leaflet / React Leaflet
📊 Recharts
🎨 Lucide React
💻 HTML / CSS
⚙️ Backend
🐍 Python
🚀 FastAPI
📋 Pydantic
⚡ Uvicorn
🔗 Architecture
┌──────────────────────────────┐
│        TERRAFLUX UI          │
│   React + TypeScript + Vite  │
└──────────────┬───────────────┘
               │
               │ JSON REST API
               ↓
┌──────────────────────────────┐
│       FastAPI Backend        │
│     Python + Pydantic        │
└──────────────┬───────────────┘
               │
               ↓
┌──────────────────────────────┐
│   In-Memory Prototype Store  │
│      + Service Layer         │
└──────────────────────────────┘
The service architecture is structured so that a persistent repository/database layer can be introduced later.
📁 Project Structure
TERRAFLUX/
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── services/
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── index.css
│   │   ├── main.tsx
│   │   └── types.ts
│   ├── public/
│   ├── package.json
│   └── vite.config.*
│
├── backend/
│   ├── app/
│   ├── requirements.txt
│   └── ...
│
├── legacy/
│   └── index-original.html
│
└── README.md
🚀 Local Setup
Run the frontend and backend in separate terminals.
🎨 Frontend
cd frontend
npm install
npm run dev
Frontend:
http://localhost:5173
⚙️ Backend
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
Backend:
http://localhost:8000
❤️ Health Check
http://localhost:8000/api/health
📚 Interactive API Documentation
http://localhost:8000/docs
🧪 API Testing
The FastAPI backend provides interactive API documentation through Swagger UI.
Example prototype endpoints include:
GET  /api/predictions
POST /api/predictions/calculate

POST /api/simulation/start
GET  /api/simulation/state
POST /api/simulation/advance

GET  /api/impact
GET  /api/evacuation/zones
GET  /api/evacuation/routes

POST /api/sos
GET  /api/sos

GET  /api/incidents
POST /api/incidents/{id}/assign
POST /api/incidents/{id}/status

GET  /api/shelters
GET  /api/relief/requirements

GET  /api/communication/nodes
GET  /api/audit-logs
🧠 Current Prediction Approach
The current prototype uses transparent deterministic weighted logic for flood-risk estimation.
It is intentionally designed so that the prediction process can be understood rather than presenting an unexplained score.
Current inputs include:
Rainfall
Forecast Rainfall
Soil Moisture
Elevation
Slope
Water Level
Historical Flood Frequency
Terrain Vulnerability
IoT Observations
Important
The current implementation is not a trained production machine-learning model.
The architecture can later be extended with ML/DL models and real multi-source datasets for validation and deployment.
⚠️ Prototype Limitations
TERRAFLUX is an SIH functional prototype.
The current prototype does not provide:
❌ A trained production ML/DL flood model
❌ Real-time government hazard APIs
❌ Live IoT sensor integration
❌ A deployed LoRa/mesh communication network
❌ Direct satellite communication from smartphones
❌ Production emergency dispatch services
❌ Real payment processing
❌ Persistent production database
❌ Guaranteed evacuation safety
❌ Official disaster warnings
The flood scenarios, communication flows, donation transactions, and operational data are demonstration/simulation data.
TERRAFLUX is intended as a complementary decision-support prototype and does not replace official emergency services or government disaster-warning systems.
🔮 Future Scope
TERRAFLUX can be extended with:
🤖 Machine-learning and deep-learning flood prediction
🛰️ Satellite and remote-sensing datasets
🌧️ Live weather and rainfall feeds
🌊 Real-time river and water-level sensors
💧 Soil-moisture sensor integration
📡 Real LoRa/LoRaWAN communication infrastructure
🗄️ PostgreSQL/PostGIS or other persistent databases
🗺️ Advanced geospatial flood modelling
🚨 Integration with authorized emergency systems
📱 Dedicated citizen mobile application
📈 Historical model training and validation
☁️ Cloud deployment and scalable infrastructure
🎯 Expected Impact
TERRAFLUX aims to demonstrate how multiple disaster-management functions can be connected into a single operational workflow.
👥 For Citizens
Emergency SOS support
Evacuation information
Shelter information
Low-connectivity communication concept
🏛️ For Authorities
Flood-risk overview
Impact assessment
Evacuation monitoring
Incident coordination
Shelter monitoring
Relief coordination
🚑 For Responders
Prioritized incidents
Rescue assignment
Location-based information
Incident status tracking
🌱 Overall
From prediction to response — TERRAFLUX connects the complete disaster-response lifecycle in one platform.
🌐 Project Links
💻 GitHub
https://github.com/AdeebaNousheen/TERRAFLUX⁠�
🚀 Frontend Deployment
<ADD-FRONTEND-DEPLOYMENT-URL>
⚙️ Backend Deployment
<ADD-BACKEND-DEPLOYMENT-URL>
Deployment URLs will be added after the production deployment is completed.
👩‍💻 Team PARALLAX
Smart India Hackathon 2026
#
Team Member
1
Adeeba Nousheen
2
Rida Fathima
3
Sameer
4
Maaz
5
Moiz
6
Mohi
🏆 Smart India Hackathon 2026
Problem Statement ID: SIH26192
Problem Statement: Flash Flood Prediction System for Hilly Regions using Multi-Source Data
🌊 TERRAFLUX
Predict the risk. Understand the impact. Coordinate the response.
�
Built with ❤️ by Team PARALLAX
Smart India Hackathon 2026
