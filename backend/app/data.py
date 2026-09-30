"""Mutable in-memory demo store; replace with repository/database adapters later."""
from datetime import datetime, timezone

def now():
    return datetime.now(timezone.utc).isoformat()

simulation = {"running": False, "stage": 0, "risk": 42, "rainfall": 48, "soil_moisture": 62, "water_level": 1.8, "affected_roads": 1, "affected_households": 12, "connectivity": "stable", "shelter_occupancy": 64}
incidents = [{"id":"INC-001","title":"River level watch","location":"North valley","severity":"MEDIUM","status":"NEW","created_at":now()}]
sos_records = []
shelters = [{"id":"SH-01","name":"Valley Community Hall","location":"Central valley","capacity":300,"occupants":192,"water_status":"adequate","food_status":"adequate","medicine_status":"limited","blankets_status":"adequate"},{"id":"SH-02","name":"Hill School","location":"Upper ridge","capacity":180,"occupants":121,"water_status":"adequate","food_status":"limited","medicine_status":"adequate","blankets_status":"limited"}]
households = [{"id":f"HH-{i:03}","location":f"Ward {1+(i%4)}","people":2+(i%5),"status":["pending","evacuated","assistance_required","unknown"][i%4]} for i in range(1,13)]
requirements = [{"id":"REL-001","item":"Drinking water","quantity":240,"location":"Valley Community Hall","priority":"high","status":"open"}]
donations = []
messages = []
audit_logs = []
rescue_assignments = []

def audit(action, entity, entity_id):
    audit_logs.insert(0,{"id":f"AUD-{len(audit_logs)+1:04}","action":action,"entity":entity,"entity_id":entity_id,"timestamp":now(),"demo":True})
