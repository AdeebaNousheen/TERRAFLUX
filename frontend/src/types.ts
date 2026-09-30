export type Role = "Citizen" | "Disaster Authority" | "Rescue Operator" | "Admin";
export interface User { id: string; name: string; role: Role; email: string }
export interface Scenario { time: string; risk: number; confidence: number; rainfall: string; rainfallValue: number; forecastRainfall: number; soil: number; water: string; roads: number; isolated: number; affected: number; evacuated: number }
export interface RiskPrediction { score: number; level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL"; confidence: number; factors: string[] }
export type IncidentStatus = "NEW" | "ASSIGNED" | "EN ROUTE" | "RESCUED" | "CLOSED";
export interface Incident { id: string; location: string; people: number; condition: string; status: IncidentStatus; team?: string; medical?: boolean }
export interface SOSAlert { id: string; people: number; location: string; medical: boolean; condition: string; battery: number; queued: boolean; createdAt: string }
export interface Shelter { id: string; name: string; capacity: number; occupants: number; water: string; food: string; medicine: string; blankets: string; accessible: boolean }
export type EvacuationStatus = "Evacuated" | "Pending" | "Assistance Required" | "High Risk" | "Unknown";
export interface EvacuationRecord { id: string; household: string; village: string; people: number; status: EvacuationStatus }
export interface ReliefRequirement { id: string; village: string; item: string; required: number; allocated: number; unit: string; verified: boolean }
export interface Donation { id: string; requirementId: string; amount: number; transactionId: string; simulated: true }
export interface CommunicationNode { id: string; name: string; kind: "LoRa gateway" | "Relay" | "Control centre"; status: "ONLINE" | "OFFLINE" | "GATEWAY AVAILABLE" }
export interface Notification { id: string; kind: string; message: string; time: string; read: boolean }
export interface AuditLog { id: string; action: string; detail: string; time: string }
