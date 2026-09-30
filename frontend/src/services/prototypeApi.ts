import type { RiskPrediction, Scenario } from "../types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
type ApiRecord = Record<string, unknown>;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  if (!response.ok) throw new Error(`TERRAFLUX API ${response.status} for ${path}`);
  return response.json() as Promise<T>;
}
const post = <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", ...(body === undefined ? {} : { body: JSON.stringify(body) }) });

/** Deterministic, explainable local fallback; this is not a trained model. */
export function predictFloodRiskFallback(input: { rainfall: number; forecastRainfall: number; soilMoisture: number; elevation: number; slope: number; waterLevel: number; historicalFrequency: number; iotObservations: number; terrainVulnerability: number }): RiskPrediction {
  const factors = [
    { label: "Current rainfall", value: Math.min(input.rainfall / 120, 1) * 20 },
    { label: "Forecast rainfall", value: Math.min(input.forecastRainfall / 120, 1) * 15 },
    { label: "Soil moisture", value: input.soilMoisture * 0.15 },
    { label: "Low elevation exposure", value: Math.max(0, 1 - input.elevation / 3000) * 10 },
    { label: "Slope runoff potential", value: Math.min(input.slope / 45, 1) * 10 },
    { label: "Water level", value: Math.min(input.waterLevel / 100, 1) * 10 },
    { label: "Historical flood frequency", value: input.historicalFrequency * 0.1 },
    { label: "IoT observation coverage", value: Math.min(input.iotObservations / 20, 1) * 5 },
    { label: "Terrain vulnerability", value: input.terrainVulnerability * 0.15 },
  ];
  const score = Math.round(Math.min(100, factors.reduce((sum, factor) => sum + factor.value, 0)));
  return { score, level: score >= 80 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 40 ? "MODERATE" : "LOW", confidence: Math.min(95, 65 + Math.round(input.iotObservations * 1.2)), factors: factors.sort((a, b) => b.value - a.value).slice(0, 4).map(({ label }) => label) };
}

function predictionInput(input: Parameters<typeof predictFloodRiskFallback>[0]) {
  return {
    rainfall: input.rainfall,
    forecast_rainfall: input.forecastRainfall,
    soil_moisture: input.soilMoisture,
    elevation: input.elevation,
    slope: input.slope,
    water_level: Math.min(input.waterLevel / 10, 20),
    historical_flood_frequency: input.historicalFrequency,
    terrain_vulnerability: input.terrainVulnerability,
    iot_observation: input.iotObservations > 0,
  };
}
export async function predictFloodRisk(input: Parameters<typeof predictFloodRiskFallback>[0]): Promise<RiskPrediction> {
  try {
    const result = await post<ApiRecord>("/predictions/calculate", predictionInput(input));
    const components = result.contributing_factors as Record<string, number> | undefined;
    return {
      score: Number(result.risk_score),
      level: String(result.risk_level).toUpperCase() as RiskPrediction["level"],
      confidence: Math.round(Number(result.confidence) * 100),
      factors: Object.entries(components || {}).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name]) => name.replaceAll("_", " ")),
    };
  } catch {
    return predictFloodRiskFallback(input);
  }
}

export const prototypeApi = {
  async advanceScenario(current: number, scenarios: Scenario[]): Promise<number> {
    try {
      const state = await post<ApiRecord>("/simulation/advance");
      return Math.max(0, Math.min(scenarios.length - 1, Number(state.stage)));
    } catch {
      return (current + 1) % scenarios.length;
    }
  },
  async resetScenario(): Promise<number> {
    try { await post("/simulation/reset"); } catch { /* local demo fallback */ }
    return 0;
  },
  async recalculateRoute(blockedRoads: number): Promise<{ route: string; accessible: boolean }> {
    try {
      const result = await post<ApiRecord[] | ApiRecord>("/evacuation/recalculate");
      const route = Array.isArray(result) ? result[0] : result;
      return { route: `${String(route.destination_shelter || "Shelter")}: ${String(route.recommendation || route.origin || "route refreshed")}`, accessible: true };
    } catch {
      return { route: blockedRoads > 0 ? "North ridge path to School B" : "River road to Community Hall A", accessible: true };
    }
  },
  async predict(input: Parameters<typeof predictFloodRiskFallback>[0]) { return predictFloodRisk(input); },
  getSimulation: () => request<ApiRecord>("/simulation/state"),
  getDashboardSummary: () => request<ApiRecord>("/dashboard/summary"),
  getImpact: () => request<ApiRecord>("/impact"),
  getRoutes: () => request<ApiRecord[]>("/evacuation/routes"),
  getIncidents: () => request<ApiRecord[]>("/incidents"),
  getSos: () => request<ApiRecord[]>("/sos"),
  getShelters: () => request<ApiRecord[]>("/shelters"),
  getHouseholds: () => request<ApiRecord[]>("/preventive-evacuation/households"),
  getRequirements: () => request<ApiRecord[]>("/relief/requirements"),
  getDonations: () => request<ApiRecord>("/donations"),
  getRescueAssignments: () => request<ApiRecord[]>("/rescue/assignments"),
  getCommunicationNodes: () => request<ApiRecord[]>("/communication/nodes"),
  getAuditLogs: () => request<ApiRecord[]>("/audit-logs"),
  async sendSOS(input: { people_count: number; location: string; medical_emergency: boolean; battery: number; severity: "HIGH" | "CRITICAL" }) {
    return post<ApiRecord>("/sos", input);
  },
  assignIncident(id: string, team: string) { return post<ApiRecord>(`/incidents/${encodeURIComponent(id)}/assign`, { team }); },
  updateIncident(id: string, status: string) { return post<ApiRecord>(`/incidents/${encodeURIComponent(id)}/status`, { status: status.replaceAll(" ", "_") }); },
  dispatchRescue(team: string) { return post<ApiRecord>("/rescue/dispatch", { team }); },
  updateHousehold(householdId: string, status: string) {
    const normalized = status === "Evacuated" ? "evacuated" : status === "Assistance Required" ? "assistance_required" : "pending";
    return post<ApiRecord>("/preventive-evacuation/update-status", { household_id: householdId, status: normalized });
  },
  updateShelter(id: string, update: ApiRecord) { return post<ApiRecord>(`/shelters/${encodeURIComponent(id)}/update`, update); },
  simulateDonation() { return post<ApiRecord>("/donations/simulate"); },
  simulateOffline() { return post<ApiRecord>("/communication/simulate-offline"); },
};

export function mapIncident(record: ApiRecord) {
  const status = String(record.status || "NEW").replaceAll("_", " ").toUpperCase();
  return { id: String(record.id), location: String(record.location || "Unknown location"), people: Number(record.people_count || record.people || 0), condition: String(record.title || record.description || "Prototype incident"), status: (status === "EN ROUTE" ? "EN ROUTE" : status) as "NEW" | "ASSIGNED" | "EN ROUTE" | "RESCUED" | "CLOSED", team: record.assigned_team ? String(record.assigned_team) : undefined, medical: Boolean(record.medical_emergency) };
}
export function mapShelter(record: ApiRecord) {
  return { id: String(record.id), name: String(record.name), capacity: Number(record.capacity), occupants: Number(record.occupants), water: String(record.water_status || "unknown"), food: String(record.food_status || "unknown"), medicine: String(record.medicine_status || "unknown"), blankets: String(record.blankets_status || "unknown"), accessible: true };
}
export function mapHousehold(record: ApiRecord) {
  const value = String(record.status || "unknown").toLowerCase();
  const status = value === "evacuated" ? "Evacuated" : value === "assistance_required" ? "Assistance Required" : value === "high risk" ? "High Risk" : value === "pending" ? "Pending" : "Unknown";
  return { id: String(record.id), household: `Household ${record.id}`, village: String(record.location || "Unknown"), people: Number(record.people || 0), status } as const;
}
export function mapSos(record: ApiRecord) {
  return { id: String(record.id), people: Number(record.people_count || 1), location: String(record.location || "Unknown"), medical: Boolean(record.medical_emergency), condition: "SOS request", battery: Number(record.battery || 0), queued: false, createdAt: String(record.last_update || "") };
}
export function mapAudit(record: ApiRecord) {
  return { id: String(record.id), action: String(record.action || "Action"), detail: `${String(record.entity || "record")} ${String(record.entity_id || "")}`, time: String(record.timestamp || "") };
}
