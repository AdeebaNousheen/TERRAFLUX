from uuid import uuid4
from fastapi import APIRouter, HTTPException
from app import data
from app.schemas import PredictionInput, SOSCreate, StatusUpdate, AssignRequest, ShelterUpdate, RequirementCreate, DispatchRequest
from app.services.prediction import calculate
from app.services import simulation

router = APIRouter(prefix="/api")
def missing(items, key):
    item = next((x for x in items if x["id"] == key), None)
    if item is None: raise HTTPException(404, "Record not found")
    return item

@router.get("/health")
def health(): return {"status":"ok","service":"TERRAFLUX API"}
@router.get("/dashboard/summary")
def dashboard(): return {"critical_incidents":sum(i["severity"]=="CRITICAL" for i in data.incidents),"urgent_incidents":sum(i["severity"] in ("HIGH","CRITICAL") for i in data.incidents),"monitoring_incidents":len(data.incidents),"shelter_occupancy":round(sum(s['occupants'] for s in data.shelters)/sum(s['capacity'] for s in data.shelters)*100),"active_sos":len(data.sos_records),"connected_emergency_nodes":8,"people_high_risk":118,"people_protected":313,"demo":True}
@router.get("/predictions")
def predictions(): return [{"location":"North valley","risk_score":data.simulation['risk'],"risk_level":"HIGH" if data.simulation['risk']<80 else "CRITICAL","timestamp":data.now(),"method":"Scenario demo"}]
@router.post("/predictions/calculate")
def prediction(body: PredictionInput): return calculate(body)
@router.post("/simulation/start")
def start_sim(): data.simulation["running"]=True; return simulation.state()
@router.get("/simulation/state")
def sim_state(): return simulation.state()
@router.post("/simulation/advance")
def sim_advance(): return simulation.advance()
@router.post("/simulation/reset")
def sim_reset(): return simulation.reset()
@router.get("/impact")
def impact(): return {"risk":data.simulation['risk'],"affected_roads":data.simulation['affected_roads'],"affected_households":data.simulation['affected_households'],"connectivity":data.simulation['connectivity'],"shelter_occupancy":data.simulation['shelter_occupancy'],"demo":True}
@router.get("/impact/timeline")
def timeline(): return simulation.STAGES
@router.get("/evacuation/zones")
def zones(): return [{"id":"ZONE-1","name":"North valley","risk_level":"HIGH","households":data.simulation['affected_households']}]
def routes(): return [{"origin":"North valley","destination_shelter":data.shelters[0]['name'],"distance_km":4.2,"route_status":"MONITORING","blocked_roads":[],"recommendation":"Demo route recommendation based on latest available demo conditions; verify locally. Safety is not guaranteed."}]
@router.get("/evacuation/routes")
def get_routes(): return routes()
@router.post("/evacuation/recalculate")
def recalc(): return routes()
@router.post("/evacuation/start")
def evac_start(): return {"status":"started","routes":routes(),"demo":True}
@router.post("/evacuation/complete")
def evac_complete(): return {"status":"completed","demo":True}
@router.get("/preventive-evacuation/households")
def get_households(): return data.households
@router.get("/preventive-evacuation/alerts")
def alerts(): return [{"id":"ALERT-01","message":"Demo precautionary evacuation advisory","demo":True}]
@router.post("/preventive-evacuation/dispatch")
def dispatch(body: DispatchRequest):
    h=missing(data.households,body.household_id); h['status']=body.status; data.audit("dispatch","household",h['id']); return h
@router.post("/preventive-evacuation/update-status")
def household_status(body: DispatchRequest): return dispatch(body)
@router.post("/sos",status_code=201)
def create_sos(body: SOSCreate):
    ident="SOS-"+uuid4().hex[:8].upper(); rec={"id":ident,**body.model_dump(),"last_update":data.now(),"status":"NEW"}; data.sos_records.insert(0,rec)
    data.incidents.insert(0,{"id":"INC-"+uuid4().hex[:8].upper(),"title":"SOS assistance request","location":body.location,"severity":body.severity,"status":"NEW","sos_id":ident,"created_at":data.now()}); data.audit("created","sos",ident); return rec
@router.get("/sos")
def get_sos(): return data.sos_records
@router.get("/sos/{ident}")
def one_sos(ident): return missing(data.sos_records,ident)
@router.get("/incidents")
def get_incidents(): return data.incidents
@router.post("/incidents/{ident}/assign")
def assign(ident, body: AssignRequest):
    item=missing(data.incidents,ident); item.update(status="ASSIGNED",assigned_team=body.team); data.audit("assigned","incident",ident); return item
@router.post("/incidents/{ident}/status")
def incident_status(ident, body: StatusUpdate):
    if body.status not in {"NEW","ASSIGNED","EN_ROUTE","RESCUED","CLOSED"}: raise HTTPException(422,"Invalid incident status")
    item=missing(data.incidents,ident); item["status"]=body.status; data.audit("status_updated","incident",ident); return item
@router.get("/rescue/assignments")
def assignments(): return data.rescue_assignments
@router.post("/rescue/dispatch")
def rescue(body: AssignRequest):
    item={"id":"RSC-"+uuid4().hex[:8].upper(),"team":body.team,"status":"EN_ROUTE","demo":True}; data.rescue_assignments.append(item); data.audit("dispatched","rescue",item['id']); return item
@router.get("/shelters")
def all_shelters(): return [{**s,"available_space":s['capacity']-s['occupants']} for s in data.shelters]
@router.get("/shelters/{ident}")
def shelter(ident):
    s=missing(data.shelters,ident); return {**s,"available_space":s['capacity']-s['occupants']}
@router.post("/shelters/{ident}/update")
def update_shelter(ident, body: ShelterUpdate):
    s=missing(data.shelters,ident); s.update(body.model_dump(exclude_none=True))
    if s['occupants']>s['capacity']: raise HTTPException(422,"Occupants cannot exceed capacity")
    data.audit("updated","shelter",ident); return {**s,"available_space":s['capacity']-s['occupants']}
@router.get("/relief/requirements")
def get_relief(): return data.requirements
@router.post("/relief/requirements",status_code=201)
def add_relief(body: RequirementCreate):
    item={"id":"REL-"+uuid4().hex[:8].upper(),**body.model_dump(),"status":"open"}; data.requirements.append(item); return item
@router.post("/relief/requirements/{ident}/update")
def update_relief(ident, body: StatusUpdate):
    item=missing(data.requirements,ident); item['status']=body.status; return item
@router.get("/donations")
def get_donations(): return {"transactions":data.donations,"label":"Simulated transactions; demo data only"}
@router.post("/donations/simulate",status_code=201)
def donate():
    item={"id":"DON-"+uuid4().hex[:8].upper(),"amount":500,"currency":"INR","status":"SIMULATED","timestamp":data.now(),"demo":True}; data.donations.append(item); return item
@router.get("/communication/nodes")
def nodes(): return [{"id":f"NODE-{i}","status":"online" if i<7 else "intermittent","communication":"LoRa/offline link simulation only","demo":True} for i in range(1,9)]
@router.get("/communication/messages")
def get_messages(): return data.messages
@router.post("/communication/simulate-offline")
def offline():
    item={"id":"MSG-"+uuid4().hex[:8].upper(),"message":"Offline relay simulation message","transport":"SIMULATION ONLY (LoRa-style) - no real radio transmission","timestamp":data.now()}; data.messages.append(item); return item
@router.get("/audit-logs")
def audit_logs(): return data.audit_logs
