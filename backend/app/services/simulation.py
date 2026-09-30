from app import data

STAGES = [{"label":"12 PM","risk":42,"rainfall":48,"soil_moisture":62,"water_level":1.8,"affected_roads":1,"affected_households":12,"connectivity":"stable","shelter_occupancy":64},{"label":"3 PM","risk":71,"rainfall":82,"soil_moisture":78,"water_level":3.2,"affected_roads":3,"affected_households":46,"connectivity":"degraded","shelter_occupancy":76},{"label":"5 PM","risk":91,"rainfall":126,"soil_moisture":91,"water_level":5.1,"affected_roads":6,"affected_households":118,"connectivity":"intermittent","shelter_occupancy":89}]
def state(): return {**data.simulation,"stage_label":STAGES[data.simulation['stage']]['label']}
def advance():
    data.simulation["stage"] = min(data.simulation["stage"] + 1, len(STAGES)-1)
    data.simulation.update(STAGES[data.simulation["stage"]]); data.simulation["running"] = data.simulation["stage"] < len(STAGES)-1
    return state()
def reset():
    data.simulation.update({"running":False,"stage":0,**STAGES[0]}); return state()
