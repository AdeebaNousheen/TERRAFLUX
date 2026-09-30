from typing import Any, Literal
from pydantic import BaseModel, Field

class PredictionInput(BaseModel):
    rainfall: float = Field(ge=0, le=500)
    forecast_rainfall: float = Field(ge=0, le=500)
    soil_moisture: float = Field(ge=0, le=100)
    water_level: float = Field(ge=0, le=20)
    elevation: float = Field(ge=0, le=9000)
    slope: float = Field(ge=0, le=90)
    historical_flood_frequency: float = Field(ge=0, le=100)
    terrain_vulnerability: float = Field(ge=0, le=100)
    iot_observation: bool = False

class SOSCreate(BaseModel):
    people_count: int = Field(ge=1, le=1000)
    location: str = Field(min_length=2, max_length=200)
    medical_emergency: bool = False
    battery: int = Field(ge=0, le=100)
    communication_method: str = "internet (demo)"
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "HIGH"

class StatusUpdate(BaseModel):
    status: str

class AssignRequest(BaseModel):
    team: str = Field(min_length=1, max_length=100)

class ShelterUpdate(BaseModel):
    occupants: int | None = Field(default=None, ge=0)
    water_status: str | None = None
    food_status: str | None = None
    medicine_status: str | None = None
    blankets_status: str | None = None

class RequirementCreate(BaseModel):
    item: str
    quantity: int = Field(ge=1)
    location: str
    priority: str = "medium"

class DispatchRequest(BaseModel):
    household_id: str
    status: Literal["evacuated", "pending", "assistance_required", "unknown"] = "pending"
