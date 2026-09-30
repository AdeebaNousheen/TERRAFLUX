import type { RiskPrediction, Scenario } from "../types";

/** Deterministic, explainable prototype calculation. Not a trained production model. */
export function predictFloodRisk(input: { rainfall: number; forecastRainfall: number; soilMoisture: number; elevation: number; slope: number; waterLevel: number; historicalFrequency: number; iotObservations: number; terrainVulnerability: number }): RiskPrediction {
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

export const prototypeApi = {
  /** API-ready seam: replace these local deterministic operations with HTTP calls. */
  async advanceScenario(current: number, scenarios: Scenario[]): Promise<number> {
    return (current + 1) % scenarios.length;
  },
  async recalculateRoute(blockedRoads: number): Promise<{ route: string; accessible: boolean }> {
    return { route: blockedRoads > 0 ? "North ridge path → School B" : "River road → Community Hall A", accessible: true };
  },
};
