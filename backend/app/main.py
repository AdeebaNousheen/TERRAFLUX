import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.api import router

app = FastAPI(title="TERRAFLUX API", version="0.1.0", description="SIH 2026 functional prototype API; demo data and rule-based logic.")
origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
origins += [origin.strip() for origin in os.getenv("FRONTEND_ORIGIN", "").split(",") if origin.strip()]
app.add_middleware(CORSMiddleware, allow_origins=list(dict.fromkeys(origins)), allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(router)
