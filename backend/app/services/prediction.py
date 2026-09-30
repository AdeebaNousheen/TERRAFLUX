from datetime import datetime, timezone
from app.schemas import PredictionInput

def calculate(data: PredictionInput):
    components = {"rainfall": min(data.rainfall / 200, 1) * 20, "forecast_rainfall": min(data.forecast_rainfall / 200, 1) * 15, "soil_moisture": data.soil_moisture / 100 * 15, "water_level": min(data.water_level / 8, 1) * 15, "slope": data.slope / 90 * 10, "historical_flood_frequency": data.historical_flood_frequency / 100 * 10, "terrain_vulnerability": data.terrain_vulnerability / 100 * 15}
    score = min(round(sum(components.values()) + (5 if data.iot_observation else 0)), 100)
    level = "CRITICAL" if score >= 80 else "HIGH" if score >= 60 else "MODERATE" if score >= 35 else "LOW"
    return {"risk_score":score,"risk_level":level,"confidence":0.65,"contributing_factors":components,"timestamp":datetime.now(timezone.utc).isoformat(),"method":"Deterministic weighted demo rules; not trained ML"}
