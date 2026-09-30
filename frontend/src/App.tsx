import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Activity,
  ClipboardList,
  Layers,
  Moon,
  Sun,
  Settings,
  UserCircle,
  RadioTower,
  Bell,
  CheckCircle2,
  ChevronRight,
  CloudRain,
  Droplets,
  Gauge,
  HeartPulse,
  Home,
  MapPin,
  Menu,
  MessageSquareWarning,
  Navigation,
  Radio,
  RefreshCw,
  Route,
  Shield,
  Siren,
  Users,
  Waves,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";

import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import type { Role, Incident, EvacuationRecord, Notification, AuditLog, Shelter as ShelterModel, Donation, SOSAlert, RiskPrediction } from "./types";
import { prototypeApi, predictFloodRiskFallback, mapIncident, mapShelter, mapHousehold, mapSos, mapAudit } from "./services/prototypeApi";

type Page =
  | "overview"
  | "prediction"
  | "impact"
  | "evacuation"
  | "preventive"
  | "incidents"
  | "rescue"
  | "shelters"
  | "relief"
  | "citizen" | "simulation" | "communication" | "notifications" | "layers" | "audit" | "admin" | "signin" | "create-account";

type Scenario = {
  time: string;
  risk: number;
  confidence: number;
  rainfall: string;
  rainfallValue: number;
  forecastRainfall: number;
  soil: number;
  water: string;
  roads: number;
  isolated: number;
  affected: number;
  evacuated: number;
};

const scenarios: Scenario[] = [
  {
    time: "12:00 PM",
    risk: 42,
    confidence: 78,
    rainfall: "Moderate",
    rainfallValue: 38,
    forecastRainfall: 54,
    soil: 56,
    water: "Rising",
    roads: 0,
    isolated: 0,
    affected: 420,
    evacuated: 120,
  },
  {
    time: "3:00 PM",
    risk: 71,
    confidence: 81,
    rainfall: "Heavy",
    rainfallValue: 76,
    forecastRainfall: 88,
    soil: 82,
    water: "Rapidly rising",
    roads: 1,
    isolated: 0,
    affected: 860,
    evacuated: 540,
  },
  {
    time: "5:00 PM",
    risk: 91,
    confidence: 86,
    rainfall: "Extreme",
    rainfallValue: 112,
    forecastRainfall: 126,
    soil: 91,
    water: "Critical",
    roads: 3,
    isolated: 1,
    affected: 1240,
    evacuated: 1087,
  },
];

const villages = [
  {
    name: "Rampur",
    position: [30.1, 78.31] as [number, number],
    risk: 91,
    population: 1240,
  },
  {
    name: "Devgarh",
    position: [30.115, 78.335] as [number, number],
    risk: 76,
    population: 840,
  },
  {
    name: "Lakshmi Nagar",
    position: [30.085, 78.345] as [number, number],
    risk: 54,
    population: 610,
  },
  {
    name: "Bhairavpur",
    position: [30.125, 78.29] as [number, number],
    risk: 37,
    population: 430,
  },
];

const shelters = [
  {
    id: "S-01",
    name: "Community Hall A",
    position: [30.092, 78.32] as [number, number],
    capacity: 500,
    occupants: 420,
  },
  {
    id: "S-02",
    name: "Government School B",
    position: [30.118, 78.305] as [number, number],
    capacity: 700,
    occupants: 490,
  },
  {
    id: "S-03",
    name: "Relief Centre C",
    position: [30.073, 78.337] as [number, number],
    capacity: 350,
    occupants: 210,
  },
];

const roads: [number, number][][] = [
  [
    [30.06, 78.27],
    [30.085, 78.29],
    [30.1, 78.31],
    [30.115, 78.335],
    [30.14, 78.36],
  ],
  [
    [30.075, 78.35],
    [30.085, 78.345],
    [30.1, 78.31],
    [30.12, 78.29],
  ],
];

const evacuationRoute = [
  [30.1, 78.31],
  [30.095, 78.32],
  [30.092, 78.32],
] as [number, number][];

const floodPolygon = [
  [30.075, 78.285],
  [30.085, 78.275],
  [30.11, 78.28],
  [30.13, 78.30],
  [30.13, 78.34],
  [30.11, 78.355],
  [30.085, 78.35],
  [30.07, 78.325],
] as [number, number][];

function MapCenter() {
  const map = useMap();

  useEffect(() => {
    map.setView([30.1, 78.31], 12);
  }, [map]);

  return null;
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
  danger = false,
}: {
  icon: ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
  danger?: boolean;
}) {
  return (
    <div className={`stat-card ${danger ? "danger" : ""}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <div className="stat-title">{title}</div>
        <div className="stat-value">{value}</div>
        <div className="stat-subtitle">{subtitle}</div>
      </div>
    </div>
  );
}

function ProgressBar({
  value,
  label,
}: {
  value: number;
  label?: string;
}) {
  return (
    <div className="progress-wrapper">
      {label && (
        <div className="progress-label">
          <span>{label}</span>
          <b>{value}%</b>
        </div>
      )}
      <div className="progress">
        <div style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

function RiskBadge({ risk }: { risk: number }) {
  const level = risk >= 80 ? "CRITICAL" : risk >= 60 ? "HIGH" : risk >= 40 ? "MODERATE" : "LOW";

  return <span className={`risk-badge risk-${level.toLowerCase()}`}>{level}</span>;
}

function App() {
  const [activePage, setActivePage] = useState<Page>("overview");
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [scenarioOverrides, setScenarioOverrides] = useState<Partial<Scenario>>({});
  const [apiOnline, setApiOnline] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const [networkOnline, setNetworkOnline] = useState(true);
  const [routeChanged, setRouteChanged] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("terraflux-theme") === "dark");
  const [role, setRole] = useState<Role>((localStorage.getItem("terraflux-role") as Role) || "Disaster Authority");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sosAlerts, setSosAlerts] = useState<SOSAlert[]>([]);
  const [incidentRows, setIncidentRows] = useState<Incident[]>([
    { id: "FL-1042", location: "Rampur Village", people: 4, condition: "Building partially flooded", status: "NEW", medical: true },
    { id: "FL-1039", location: "Devgarh Road", people: 7, condition: "Road cut off", status: "ASSIGNED", team: "Team Alpha" },
    { id: "FL-1035", location: "Lakshmi Nagar", people: 3, condition: "Water entering homes", status: "EN ROUTE" },
  ]);
  const [records, setRecords] = useState<EvacuationRecord[]>([
    { id: "HH-014", household: "Household 014", village: "Rampur", people: 5, status: "High Risk" },
    { id: "HH-021", household: "Household 021", village: "Devgarh", people: 3, status: "Pending" },
    { id: "HH-032", household: "Household 032", village: "Lakshmi Nagar", people: 4, status: "Assistance Required" },
    { id: "HH-041", household: "Household 041", village: "Bhairavpur", people: 2, status: "Unknown" },
  ]);
  const [shelterRows, setShelterRows] = useState<ShelterModel[]>(shelters.map((s, i) => ({ ...s, water: i === 1 ? "Adequate" : "Low", food: "Adequate", medicine: i === 0 ? "Low" : "Adequate", blankets: "Adequate", accessible: true })));
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: "N-1", kind: "Risk update", message: "Risk scenario is a demonstration; review changing conditions.", time: "12:00 PM", read: false },
    { id: "N-2", kind: "Shelter", message: "Prototype resource inventory requires verification.", time: "11:48 AM", read: false },
  ]);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [reliefRequirements, setReliefRequirements] = useState<Record<string, unknown>[]>([]);
  const [communicationNodes, setCommunicationNodes] = useState<Record<string, unknown>[]>([]);
  const [rescueAssignments, setRescueAssignments] = useState<Record<string, unknown>[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<Record<string, unknown> | null>(null);
  const [impactSummary, setImpactSummary] = useState<Record<string, unknown> | null>(null);
  const [routeText, setRouteText] = useState("River road to Community Hall A");
  const [sosForm, setSosForm] = useState({ people: 2, location: "Rampur Village", medical: false, condition: "Flood water rising", battery: 45 });
  const [layers, setLayers] = useState<Record<string, boolean>>({ risk: true, flood: true, villages: true, roads: true, bridges: true, shelters: true, sos: true, teams: true, nodes: true, evacuation: true });
  const [formMessage, setFormMessage] = useState("");
  const [riskInputs, setRiskInputs] = useState({ rainfall: 38, forecastRainfall: 54, soilMoisture: 56, elevation: 1180, slope: 32, waterLevel: 50, historicalFrequency: 70, iotObservations: 18, terrainVulnerability: 80 });
  const [rulePrediction, setRulePrediction] = useState<RiskPrediction>(() => predictFloodRiskFallback(riskInputs));
  const logAction = (action: string, detail: string) => setAudit((rows) => [{ id: `A-${Date.now()}`, action, detail, time: new Date().toLocaleTimeString() }, ...rows]);
  const updateHousehold = async (record: EvacuationRecord, nextStatus: EvacuationRecord["status"]) => {
    setRecords((rows) => rows.map((row) => row.id === record.id ? { ...row, status: nextStatus } : row));
    try { const saved = await prototypeApi.updateHousehold(record.id, nextStatus); setRecords((rows) => rows.map((row) => row.id === record.id ? mapHousehold(saved) : row)); setApiOnline(true); } catch { /* keep local demo update */ }
    logAction("Evacuation status updated", `${record.id}: ${nextStatus}`);
  };
  const updateShelterOccupancy = async (shelter: ShelterModel) => {
    const occupants = Math.min(shelter.capacity, shelter.occupants + 10);
    setShelterRows((rows) => rows.map((row) => row.id === shelter.id ? { ...row, occupants } : row));
    try { const saved = await prototypeApi.updateShelter(shelter.id, { occupants }); setShelterRows((rows) => rows.map((row) => row.id === shelter.id ? mapShelter(saved) : row)); setApiOnline(true); } catch { /* keep local demo update */ }
    logAction("Shelter updated", `${shelter.name}; occupancy +10`);
  };
  const donateSimulated = async () => {
    const fallbackId = `TXN-SIM-${Date.now().toString(36).toUpperCase()}`;
    setDonations((rows) => [{ id: fallbackId, requirementId: "REQ-RAMPUR-WATER", amount: 500, transactionId: fallbackId, simulated: true }, ...rows]);
    try {
      const result = await prototypeApi.simulateDonation();
      const donation = { id: String(result.id), requirementId: "REQ-RAMPUR-WATER", amount: Number(result.amount || 500), transactionId: String(result.id), simulated: true as const };
      setDonations((rows) => [donation, ...rows.filter((row) => row.id !== fallbackId)]);
      setFormMessage(`Simulated transaction ${donation.transactionId}`); setApiOnline(true);
    } catch { setFormMessage(`Simulated transaction ${fallbackId} (local fallback)`); }
    logAction("Simulated donation", "INR 500 prototype allocation");
  };

  const scenario = { ...scenarios[scenarioIndex], ...scenarioOverrides };

  useEffect(() => {
    let active = true;
    const load = async () => {
      const results = await Promise.allSettled([
        prototypeApi.getSimulation(), prototypeApi.getIncidents(), prototypeApi.getSos(),
        prototypeApi.getShelters(), prototypeApi.getHouseholds(), prototypeApi.getAuditLogs(),
        prototypeApi.getDonations(), prototypeApi.getCommunicationNodes(), prototypeApi.getRoutes(),
        prototypeApi.getDashboardSummary(), prototypeApi.getImpact(), prototypeApi.getRequirements(), prototypeApi.getRescueAssignments(),
      ]);
      if (!active) return;
      const [sim, incidents, sos, shelterData, households, auditData, donationData, nodes, routes, summary, impact, requirements, assignments] = results;
      let connected = false;
      if (sim.status === "fulfilled") {
        connected = true;
        const stage = Math.max(0, Math.min(scenarios.length - 1, Number(sim.value.stage || 0)));
        setScenarioIndex(stage);
        setScenarioOverrides({ rainfallValue: Number(sim.value.rainfall), soil: Number(sim.value.soil_moisture), water: `${sim.value.water_level} m`, roads: Number(sim.value.affected_roads) });
      }
      if (incidents.status === "fulfilled") { connected = true; setIncidentRows(incidents.value.map(mapIncident)); }
      if (sos.status === "fulfilled") { connected = true; setSosAlerts(sos.value.map(mapSos)); }
      if (shelterData.status === "fulfilled") { connected = true; setShelterRows(shelterData.value.map(mapShelter)); }
      if (households.status === "fulfilled") { connected = true; setRecords(households.value.map(mapHousehold)); }
      if (auditData.status === "fulfilled") { connected = true; setAudit(auditData.value.map(mapAudit)); }
      if (nodes.status === "fulfilled") { connected = true; setCommunicationNodes(nodes.value); }
      if (routes.status === "fulfilled") connected = true;
      if (summary.status === "fulfilled") { connected = true; setDashboardSummary(summary.value); }
      if (impact.status === "fulfilled") { connected = true; setImpactSummary(impact.value); }
      if (requirements.status === "fulfilled") { connected = true; setReliefRequirements(requirements.value); }
      if (assignments.status === "fulfilled") { connected = true; setRescueAssignments(assignments.value); }
      if (donationData.status === "fulfilled") {
        connected = true;
        const transactions = Array.isArray(donationData.value.transactions) ? donationData.value.transactions as Record<string, unknown>[] : [];
        setDonations(transactions.map((d) => ({ id: String(d.id), requirementId: "prototype", amount: Number(d.amount || 0), transactionId: String(d.id), simulated: true as const })));
      }
      setApiOnline(connected);
    };
    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    void prototypeApi.predict({ ...riskInputs, iotObservations: networkOnline ? riskInputs.iotObservations : Math.min(riskInputs.iotObservations, 11) })
      .then((value) => { if (active) setRulePrediction(value); });
    return () => { active = false; };
  }, [riskInputs, networkOnline]);

  const navItems: {
    id: Page;
    label: string;
    icon: ReactNode;
  }[] = [
    { id: "overview", label: "Situation Overview", icon: <Gauge size={18} /> },
    { id: "prediction", label: "Flood Prediction", icon: <CloudRain size={18} /> },
    { id: "impact", label: "Impact Assessment", icon: <Waves size={18} /> },
    { id: "evacuation", label: "Evacuation Guidance", icon: <Route size={18} /> },
    { id: "preventive", label: "Preventive Evacuation", icon: <Users size={18} /> },
    { id: "incidents", label: "Incident Management", icon: <Siren size={18} /> },
    { id: "rescue", label: "Rescue Operator", icon: <Shield size={18} /> },
    { id: "shelters", label: "Shelters & Relief", icon: <Home size={18} /> },
    { id: "relief", label: "Relief & Donations", icon: <HeartPulse size={18} /> },
    { id: "citizen", label: "Citizen / SOS", icon: <MessageSquareWarning size={18} /> },
    { id: "simulation", label: "System Simulation", icon: <Activity size={18} /> },
    { id: "communication", label: "Communication Network", icon: <RadioTower size={18} /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={18} /> },
    { id: "layers", label: "Map Layers", icon: <Layers size={18} /> },
    { id: "audit", label: "Audit Logs", icon: <ClipboardList size={18} /> },
    { id: "admin", label: "Admin", icon: <Settings size={18} /> },
  ];

  const runScenario = async () => {
    const next = await prototypeApi.advanceScenario(scenarioIndex, scenarios);
    setScenarioIndex(next);
    try {
      const state = await prototypeApi.getSimulation();
      setScenarioOverrides({ rainfallValue: Number(state.rainfall), soil: Number(state.soil_moisture), water: `${state.water_level} m`, roads: Number(state.affected_roads) });
      setApiOnline(true);
    } catch { setScenarioOverrides({}); }
    setShelterRows((rows) => rows.map((s, i) => ({ ...s, occupants: Math.min(s.capacity, s.occupants + (next ? [30, 55, 20][i] : 0)) })));
    setNotifications((rows) => [{ id: `N-${Date.now()}`, kind: "Risk change", message: `Demonstration scenario advanced to ${scenarios[next].time} (${scenarios[next].risk}% risk).`, time: new Date().toLocaleTimeString(), read: false }, ...rows]);
    if (next > 0) setNetworkOnline(false);
    if (next === 2) setIncidentRows((rows) => rows.map((r, i) => i === 0 ? { ...r, status: "ASSIGNED", team: "Team Delta" } : r));
    logAction("Scenario advanced", `${scenarios[next].time}; risk ${scenarios[next].risk}%; affected ${scenarios[next].affected}; protected ${scenarios[next].evacuated}`);
  };

  const sendSOS = async () => {
    setSosSent(true);
    const id = `FL-${Date.now().toString().slice(-5)}`;
    const alert: SOSAlert = { id: `SOS-${id}`, ...sosForm, people: Number(sosForm.people), battery: Number(sosForm.battery), queued: !networkOnline, createdAt: new Date().toISOString() };
    setSosAlerts((rows) => [alert, ...rows]);
    setIncidentRows((rows) => [{ id, location: sosForm.location, people: Number(sosForm.people), condition: sosForm.condition, status: "NEW", medical: sosForm.medical }, ...rows]);
    try {
      const saved = await prototypeApi.sendSOS({ people_count: alert.people, location: alert.location, medical_emergency: alert.medical, battery: alert.battery, severity: alert.medical ? "CRITICAL" : "HIGH" });
      setSosAlerts((rows) => [mapSos(saved), ...rows.slice(1)]);
      setIncidentRows((await prototypeApi.getIncidents()).map(mapIncident));
      setApiOnline(true);
    } catch { /* keep the optimistic local prototype SOS and incident */ }
    setNotifications((rows) => [{ id: `N-${Date.now()}`, kind: "SOS", message: `SOS ${alert.id} created for ${sosForm.location}${alert.queued ? " and queued offline" : ""}.`, time: new Date().toLocaleTimeString(), read: false }, ...rows]);
    logAction("SOS created", `${alert.id}; ${sosForm.people} people; ${sosForm.location}; ${alert.queued ? "queued" : "forwarded in prototype"}`);
  };

  const resetScenario = async () => {
    const resetIndex = await prototypeApi.resetScenario();
    setScenarioIndex(resetIndex);
    setScenarioOverrides({});
    setRouteChanged(false);
    setSosSent(false);
    setNetworkOnline(true);
    setShelterRows(shelters.map((s, i) => ({ ...s, water: i === 1 ? "Adequate" : "Low", food: "Adequate", medicine: i === 0 ? "Low" : "Adequate", blankets: "Adequate", accessible: true })));
    logAction("Simulation reset", "Scenario and prototype network state returned to baseline");
  };

  const currentEvacuated = scenario.evacuated;
  const assistanceRequired = Math.max(0, 1240 - currentEvacuated);

  return (
    <div className={`app ${dark ? "theme-dark" : ""}`} data-theme={dark ? "dark" : "light"}>
      <style>{styles}</style>

      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Waves size={25} />
          </div>
          <div>
            <div className="brand-name">TERRAFLUX</div>
            <div className="brand-subtitle">Flood Resilience System</div>
          </div>
          <button
            aria-label="Close navigation"
            className="mobile-close"
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="system-status" aria-live="polite">
          <span className="status-dot" />
          {apiOnline ? "Prototype API connected" : "Demo fallback active"}
        </div>

        <div className="nav-section-title">OPERATIONS</div>
        <div className="prototype-ribbon">SIH 2026 ? SIH26192 ? PARALLAX</div>

        <nav>
          {navItems.map((item) => (
            <button
              key={item.id}
              aria-current={activePage === item.id ? "page" : undefined}
              className={`nav-item ${
                activePage === item.id ? "active" : ""
              }`}
              onClick={() => {
                setActivePage(item.id);
                setMobileOpen(false);
              }}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.id === "incidents" && (
                <span className="nav-count">12</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="network-box">
            <div className="network-icon">
              {networkOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
            </div>
            <div>
              <b>{networkOnline ? "Connected" : "Offline Mode"}</b>
              <span>
                {networkOnline
                  ? "Emergency network online"
                  : "Store-and-forward active"}
              </span>
            </div>
          </div>

          <button className="reset-button" onClick={resetScenario}>
            <RefreshCw size={16} />
            Reset Simulation
          </button>
        </div>
      </aside>

      <button className="mobile-sos-shortcut" aria-label="Open citizen SOS form" onClick={() => { setActivePage("citizen"); setMobileOpen(false); }}><Siren size={17} /> SOS</button>
      <main className="main">
        <header className="topbar">
          <button
            aria-label="Open navigation"
            className="menu-button"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={22} />
          </button>

          <div>
            <h1>
              {navItems.find((item) => item.id === activePage)?.label}
            </h1>
            <p>Western Himalayan Pilot Region • Control Centre</p>
          </div>

          <div className="topbar-actions">
            <button
              className={`network-toggle ${
                networkOnline ? "online" : "offline"
              }`}
              onClick={async () => {
                const nextOnline = !networkOnline;
                if (!nextOnline) { try { await prototypeApi.simulateOffline(); setApiOnline(true); } catch { /* simulated local offline fallback */ } }
                setNetworkOnline(nextOnline);
              }}
            >
              {networkOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
              {networkOnline ? "ONLINE" : "OFFLINE"}
            </button>

            <button className="icon-button theme-switch" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} onClick={() => setDark((v) => { localStorage.setItem("terraflux-theme", v ? "light" : "dark"); return !v; })}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button className="notification" aria-label={`Notifications, ${notifications.filter((n) => !n.read).length} unread`} onClick={() => { setNotifications((rows) => rows.map((n) => ({ ...n, read: true }))); setActivePage("notifications"); }}>
              <Bell size={19} /><span>{notifications.filter((n) => !n.read).length}</span>
            </button>
            <label className="role-select"><span className="sr-only">Select role</span><select value={role} onChange={(e) => { setRole(e.target.value as Role); localStorage.setItem("terraflux-role", e.target.value); }}><option>Citizen</option><option>Disaster Authority</option><option>Rescue Operator</option><option>Admin</option></select></label>
            <div className="profile-wrap"><button className="user profile-button" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}><div className="avatar"><UserCircle size={19} /></div><div><b>{role}</b><small>PARALLAX ? Prototype</small></div></button>{menuOpen && <div className="profile-menu"><button onClick={() => { setActivePage("admin"); setMenuOpen(false); }}>Profile & settings</button><button onClick={() => { setActivePage("signin"); setMenuOpen(false); }}>Sign in / switch account</button><button onClick={() => { setActivePage("create-account"); setMenuOpen(false); }}>Create account</button></div>}</div>
          </div>
        </header>

        <div className="content">
          {activePage === "overview" && (
            <>
              <section className="hero">
                <div>
                  <div className="eyebrow">
                    <span className="live-dot" />
                    LIVE DECISION SUPPORT
                  </div>
                  <h2>Flash Flood Situation Overview</h2>
                  <p>
                    Multi-source intelligence for prediction, impact
                    assessment, evacuation and emergency response.
                  </p>
                </div>

                <div className="scenario-control">
                  <div>
                    <span>SIMULATION SCENARIO</span>
                    <b>{scenario.time}</b>
                  </div>
                  <button onClick={runScenario}>
                    <Zap size={17} />
                    Run Next Scenario
                  </button>
                </div>
              </section>

              <section className="stats-grid">
                <StatCard
                  icon={<AlertTriangle size={21} />}
                  title="CRITICAL INCIDENTS"
                  value={Number(dashboardSummary?.critical_incidents ?? 12)}
                  subtitle="Prototype API summary"
                  danger
                />
                <StatCard
                  icon={<Siren size={21} />}
                  title="URGENT INCIDENTS"
                  value="27"
                  subtitle="Awaiting rescue assignment"
                />
                <StatCard
                  icon={<Gauge size={21} />}
                  title="MONITORING"
                  value="64"
                  subtitle="Active observations"
                />
                <StatCard
                  icon={<Home size={21} />}
                  title="SHELTER OCCUPANCY"
                  value="76%"
                  subtitle="1,120 / 1,470 capacity"
                />
                <StatCard
                  icon={<MessageSquareWarning size={21} />}
                  title="ACTIVE SOS"
                  value={Number(dashboardSummary?.active_sos ?? (sosSent ? 8 : 7)) + sosAlerts.length}
                  subtitle="Emergency requests"
                />
                <StatCard
                  icon={<Radio size={21} />}
                  title="EMERGENCY NODES"
                  value={communicationNodes.length || (networkOnline ? 18 : 11)}
                  subtitle="Connected gateways"
                />
              </section>

              <section className="dashboard-grid">
                <div className="panel map-panel">
                  <div className="panel-header">
                    <div>
                      <h3>Operational Risk Map</h3>
                      <span>
                        Flood extent • Villages • Roads • Shelters • SOS
                      </span>
                    </div>
                    <RiskBadge risk={scenario.risk} />
                  </div>

                  <div className="map-container">
                    <MapContainer
                      center={[30.1, 78.31]}
                      zoom={12}
                      scrollWheelZoom
                      style={{ height: "100%", width: "100%" }}
                    >
                      <MapCenter />

                      <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      {layers.flood && <Polygon
                        positions={floodPolygon}
                        pathOptions={{
                          color: "#dc2626",
                          fillColor: "#ef4444",
                          fillOpacity: scenario.risk / 300,
                        }}
                      />}

                      {layers.roads && roads.map((road, index) => (
                        <Polyline
                          key={index}
                          positions={road}
                          pathOptions={{
                            color:
                              index === 0 && scenario.roads > 0
                                ? "#dc2626"
                                : "#2563eb",
                            weight: 5,
                            dashArray:
                              index === 0 && scenario.roads > 0
                                ? "10 8"
                                : undefined,
                          }}
                        />
                      ))}

                      {layers.evacuation && routeChanged && (
                        <Polyline
                          positions={evacuationRoute}
                          pathOptions={{
                            color: "#16a34a",
                            weight: 7,
                          }}
                        />
                      )}

                      {layers.villages && villages.map((village) => (
                        <CircleMarker
                          key={village.name}
                          center={village.position}
                          radius={10}
                          pathOptions={{
                            color:
                              !layers.risk ? "#64748b" : village.risk >= 80
                                ? "#dc2626"
                                : village.risk >= 60
                                ? "#f59e0b"
                                : "#16a34a",
                            fillOpacity: 0.85,
                          }}
                        >
                          <Popup>
                            <b>{village.name}</b>
                            <br />
                            Risk: {village.risk}%
                            <br />
                            Population: {village.population}
                          </Popup>
                        </CircleMarker>
                      ))}

                      {layers.shelters && shelters.map((shelter) => (
                        <CircleMarker
                          key={shelter.id}
                          center={shelter.position}
                          radius={7}
                          pathOptions={{
                            color: "#2563eb",
                            fillColor: "#3b82f6",
                            fillOpacity: 1,
                          }}
                        >
                          <Popup>
                            <b>{shelter.name}</b>
                            <br />
                            Capacity: {shelter.capacity}
                            <br />
                            Occupants: {shelter.occupants}
                          </Popup>
                        </CircleMarker>
                      ))}

                      {layers.bridges && <CircleMarker center={[30.11, 78.325]} radius={5} pathOptions={{ color: "#a16207", fillColor: "#f59e0b", fillOpacity: 1 }}><Popup>Bridge B-02 - inspection status simulated</Popup></CircleMarker>}
                      {layers.sos && sosSent && <CircleMarker center={[30.1, 78.31]} radius={9} pathOptions={{ color: "#b91c1c", fillColor: "#ef4444", fillOpacity: 1 }}><Popup>Prototype SOS: {sosForm.location}</Popup></CircleMarker>}
                      {layers.teams && <CircleMarker center={[30.095, 78.33]} radius={6} pathOptions={{ color: "#166534", fillColor: "#22c55e", fillOpacity: 1 }}><Popup>Rescue team marker - simulated</Popup></CircleMarker>}
                      {layers.nodes && <CircleMarker
                        center={[30.105, 78.315]}
                        radius={6}
                        pathOptions={{
                          color: "#7c3aed",
                          fillColor: "#8b5cf6",
                          fillOpacity: 1,
                        }}
                      >
                        <Popup>
                          <b>Emergency Communication Node</b>
                          <br />
                          {networkOnline ? "Connected" : "Offline / Buffering"}
                        </Popup>
                      </CircleMarker>}
                    </MapContainer>

                    <div className="map-legend">
                      <div>
                        <i className="legend-danger" /> High risk
                      </div>
                      <div>
                        <i className="legend-road" /> Road
                      </div>
                      <div>
                        <i className="legend-shelter" /> Shelter
                      </div>
                      <div>
                        <i className="legend-node" /> Emergency node
                      </div>
                    </div>
                  </div>
                </div>

                <div className="right-column">
                  <div className="panel risk-panel">
                    <div className="panel-header">
                      <div>
                        <h3>Flood Risk Engine</h3>
                        <span>Multi-source assessment</span>
                      </div>
                      <CloudRain size={21} />
                    </div>

                    <div className="risk-score">
                      <div className="risk-number">{scenario.risk}%</div>
                      <div>
                        <b>Current Risk</b>
                        <span>
                          Confidence {scenario.confidence}%
                        </span>
                      </div>
                    </div>

                    <ProgressBar
                      value={scenario.risk}
                      label="Flood risk score"
                    />

                    <div className="factor-list">
                      <div>
                        <span>Rainfall</span>
                        <b>{scenario.rainfall}</b>
                      </div>
                      <div>
                        <span>Soil saturation</span>
                        <b>{scenario.soil}%</b>
                      </div>
                      <div>
                        <span>Water level</span>
                        <b>{scenario.water}</b>
                      </div>
                      <div>
                        <span>Terrain vulnerability</span>
                        <b>High</b>
                      </div>
                    </div>
                  </div>

                  <div className="panel simulation-panel">
                    <div className="panel-header">
                      <div>
                        <h3>Scenario Timeline</h3>
                        <span>Dynamic risk progression</span>
                      </div>
                      <button
                        className="icon-button"
                        onClick={runScenario}
                      >
                        <RefreshCw size={17} />
                      </button>
                    </div>

                    <div className="timeline">
                      {scenarios.map((item, index) => (
                        <button
                          key={item.time}
                          className={`timeline-item ${
                            index === scenarioIndex ? "selected" : ""
                          }`}
                          onClick={() => setScenarioIndex(index)}
                        >
                          <div className="timeline-dot" />
                          <div>
                            <b>{item.time}</b>
                            <span>
                              Risk {item.risk}% • {item.rainfall}
                            </span>
                          </div>
                          <ChevronRight size={16} />
                        </button>
                      ))}
                    </div>

                    <div className="change-box">
                      <TrendingUpIcon />
                      <div>
                        <b>
                          Risk increased{" "}
                          {scenarios[0].risk}% → {scenario.risk}%
                        </b>
                        <span>
                          Rainfall, soil saturation and water level are
                          contributing to the increase.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="bottom-grid">
                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h3>Impact Assessment</h3>
                      <span>Current simulated conditions</span>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setActivePage("impact")}
                    >
                      View details
                    </button>
                  </div>

                  <div className="impact-grid">
                    <div>
                      <span>Affected population</span>
                      <b>{scenario.affected.toLocaleString()}</b>
                    </div>
                    <div>
                      <span>Roads affected</span>
                      <b>{scenario.roads}</b>
                    </div>
                    <div>
                      <span>Villages isolated</span>
                      <b>{scenario.isolated}</b>
                    </div>
                    <div>
                      <span>Evacuated</span>
                      <b>{currentEvacuated.toLocaleString()}</b>
                    </div>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h3>Evacuation Guidance</h3>
                      <span>Latest accessible route</span>
                    </div>
                    <Navigation size={20} />
                  </div>

                  <div className="route-card">
                    <div className="route-icon">
                      <Route size={22} />
                    </div>
                    <div>
                      <b>
                        {routeChanged
                          ? "Alternative route recommended"
                          : "Shelter S-01 recommended"}
                      </b>
                      <span>
                        {routeChanged
                          ? "Original road affected • route recalculated"
                          : "2.8 km • accessible based on current simulation"}
                      </span>
                    </div>
                    <button
                      className="small-button"
                      onClick={async () => { const route = await prototypeApi.recalculateRoute(scenario.roads); setRouteChanged(true); setRouteText(route.route); logAction("Route recalculated", `${route.route}; accessibility assessment is indicative`); }}
                    >
                      Recalculate
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
{activePage === "prediction" && (
            <PageWrapper
              title="Flood Prediction"
              subtitle="Explainable multi-source flood-risk assessment"
            >
              <div className="prediction-layout">
                <div className="panel prediction-main">
                  <div className="prediction-header">
                    <div>
                      <div className="eyebrow">AI RISK ENGINE</div>
                      <h2>{scenario.risk}% Flood Risk</h2>
                      <p>
                        Current assessment for the Western Himalayan pilot
                        region.
                      </p>
                    </div>
                    <RiskBadge risk={scenario.risk} />
                  </div>

                  <div className="big-risk">
                    <div className="risk-circle">
                      <span>{scenario.risk}%</span>
                      <small>RISK</small>
                    </div>

                    <div className="risk-details">
                      <div className="confidence">
                        <span>Prediction confidence</span>
                        <b>{scenario.confidence}%</b>
                      </div>
                      <ProgressBar value={scenario.confidence} />
                      <p>
                        Risk score and prediction confidence are displayed
                        separately to support transparent decision-making.
                      </p>
                    </div>
                  </div>

                  <div className="source-grid">
                    <DataSource
                      icon={<CloudRain size={20} />}
                      title="Rainfall"
                      value={`${scenario.rainfallValue} mm`}
                      status={scenario.rainfall}
                    />
                    <DataSource
                      icon={<Droplets size={20} />}
                      title="Soil Moisture"
                      value={`${scenario.soil}%`}
                      status={
                        scenario.soil >= 80 ? "Saturated" : "Moderate"
                      }
                    />
                    <DataSource
                      icon={<Waves size={20} />}
                      title="Water Level"
                      value={scenario.water}
                      status="Rising"
                    />
                    <DataSource
                      icon={<Gauge size={20} />}
                      title="Terrain"
                      value="High"
                      status="Vulnerability"
                    />
                  </div>

                  <div className="explain-box">
                    <AlertTriangle size={20} />
                    <div>
                      <b>Why is the risk increasing?</b>
                      <ul>
                        <li>Rainfall intensity has increased.</li>
                        <li>Soil saturation is approaching critical levels.</li>
                        <li>Water level is rising rapidly.</li>
                        <li>Terrain has high flood vulnerability.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="prototype-note">
                    <b>Prototype model:</b> transparent deterministic
                    multi-source risk engine structured for future replacement
                    with a trained ML/DL model. This prototype does not claim
                    production ML accuracy.
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h3>Prediction Inputs</h3>
                      <span>Multi-source observations</span>
                    </div>
                    <Radio size={20} />
                  </div>

                  <div className="input-list">
                    <InputRow label="Rainfall intensity" value={`${scenario.rainfallValue} mm`} />
                    <InputRow label="Forecast rainfall" value="Extreme" />
                    <InputRow label="Soil moisture" value={`${scenario.soil}%`} />
                    <InputRow label="Elevation" value="1,180 m" />
                    <InputRow label="Slope" value="32°" />
                    <InputRow label="Historical floods" value="High frequency" />
                    <InputRow label="Water level" value={scenario.water} />
                    <InputRow label="IoT observations" value="18 active nodes" />
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Risk Evolution</h3>
                    <span>Scenario progression</span>
                  </div>
                  <button className="small-button" onClick={runScenario}>
                    Advance Scenario
                  </button>
                </div>

                <div className="risk-evolution">
                  {scenarios.map((item) => (
                    <div
                      key={item.time}
                      className={`evolution-card ${
                        item.time === scenario.time ? "selected" : ""
                      }`}
                    >
                      <span>{item.time}</span>
                      <strong>{item.risk}%</strong>
                      <RiskBadge risk={item.risk} />
                      <small>
                        {item.rainfall} rainfall • Soil {item.soil}%
                      </small>
                    </div>
                  ))}
                </div>
              </div>
            </PageWrapper>
          )}

          {activePage === "impact" && (
            <PageWrapper
              title="Impact Assessment"
              subtitle="Translate predicted flood conditions into operational impact"
            >
              <div className="stats-grid">
                <StatCard
                  icon={<Users size={21} />}
                  title="AFFECTED HOUSEHOLDS"
                  value={Number(impactSummary?.affected_households ?? Math.round(scenario.affected / 4)).toLocaleString()}
                  subtitle="Backend prototype impact estimate"
                  danger={scenario.risk >= 80}
                />
                <StatCard
                  icon={<Route size={21} />}
                  title="ROADS AFFECTED"
                  value={scenario.roads}
                  subtitle="Requires route assessment"
                />
                <StatCard
                  icon={<MapPin size={21} />}
                  title="ISOLATED VILLAGES"
                  value={scenario.isolated}
                  subtitle="Connectivity risk"
                />
                <StatCard
                  icon={<Home size={21} />}
                  title="PEOPLE EVACUATED"
                  value={scenario.evacuated.toLocaleString()}
                  subtitle="Current progress"
                />
              </div>

              <div className="two-column">
                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h3>Village-Level Impact</h3>
                      <span>Risk and population exposure</span>
                    </div>
                  </div>

                  <div className="table">
                    <div className="table-head">
                      <span>Village</span>
                      <span>Risk</span>
                      <span>Population</span>
                      <span>Status</span>
                    </div>

                    {villages.map((village) => (
                      <div className="table-row" key={village.name}>
                        <b>{village.name}</b>
                        <span>{village.risk}%</span>
                        <span>{village.population}</span>
                        <RiskBadge risk={village.risk} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h3>Infrastructure Impact</h3>
                      <span>Current scenario</span>
                    </div>
                  </div>

                  <div className="impact-list">
                    <ImpactItem
                      title="Road Network"
                      value={`${scenario.roads} affected`}
                      danger={scenario.roads > 0}
                    />
                    <ImpactItem
                      title="Bridges"
                      value={scenario.risk >= 70 ? "1 blocked" : "Operational"}
                      danger={scenario.risk >= 70}
                    />
                    <ImpactItem
                      title="Power"
                      value={scenario.risk >= 80 ? "At risk" : "Operational"}
                      danger={scenario.risk >= 80}
                    />
                    <ImpactItem
                      title="Communication"
                      value={networkOnline ? "Connected" : "Degraded"}
                      danger={!networkOnline}
                    />
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Impact Timeline</h3>
                    <span>How the situation changes over time</span>
                  </div>
                </div>

                <div className="timeline-horizontal">
                  {scenarios.map((item, index) => (
                    <div
                      className={`timeline-stage ${
                        index <= scenarioIndex ? "complete" : ""
                      }`}
                      key={item.time}
                    >
                      <div className="stage-dot" />
                      <b>{item.time}</b>
                      <span>Risk {item.risk}%</span>
                      <small>
                        {item.affected} affected • {item.roads} roads
                      </small>
                    </div>
                  ))}
                </div>
              </div>
            </PageWrapper>
          )}

          {activePage === "evacuation" && (
            <PageWrapper
              title="Evacuation Guidance"
              subtitle="Dynamic route and safe-zone guidance based on latest conditions"
            >
              <div className="evacuation-grid">
                <div className="panel map-panel">
                  <div className="panel-header">
                    <div>
                      <h3>Dynamic Evacuation Map</h3>
                      <span>Flood extent • blocked roads • shelters</span>
                    </div>
                    <button
                      className="small-button"
                      onClick={async () => { const route = await prototypeApi.recalculateRoute(scenario.roads); setRouteChanged(true); setRouteText(route.route); logAction("Route recalculated", `${route.route}; accessibility assessment is indicative`); }}
                    >
                      <RefreshCw size={15} />
                      Recalculate
                    </button>
                  </div>

                  <div className="map-container large">
                    <MapContainer
                      center={[30.1, 78.31]}
                      zoom={12}
                      scrollWheelZoom
                      style={{ height: "100%", width: "100%" }}
                    >
                      <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      {layers.flood && <Polygon
                        positions={floodPolygon}
                        pathOptions={{
                          color: "#dc2626",
                          fillColor: "#ef4444",
                          fillOpacity: 0.22,
                        }}
                      />}

                      {roads.map((road, index) => (
                        <Polyline
                          key={index}
                          positions={road}
                          pathOptions={{
                            color:
                              scenario.roads > index
                                ? "#dc2626"
                                : "#2563eb",
                            weight: 5,
                            dashArray:
                              scenario.roads > index ? "10 8" : undefined,
                          }}
                        />
                      ))}

                      <Polyline
                        positions={evacuationRoute}
                        pathOptions={{
                          color: "#16a34a",
                          weight: 7,
                        }}
                      />

                      {shelters.map((shelter) => (
                        <CircleMarker
                          key={shelter.id}
                          center={shelter.position}
                          radius={8}
                          pathOptions={{
                            color: "#2563eb",
                            fillColor: "#3b82f6",
                            fillOpacity: 1,
                          }}
                        >
                          <Popup>
                            <b>{shelter.name}</b>
                            <br />
                            Available:{" "}
                            {shelter.capacity - shelter.occupants}
                          </Popup>
                        </CircleMarker>
                      ))}
                    </MapContainer>
                  </div>
                </div>

                <div className="right-column">
                  <div className="panel">
                    <div className="panel-header">
                      <div>
                        <h3>Recommended Route</h3>
                        <span>Latest available conditions</span>
                      </div>
                      <Navigation size={20} />
                    </div>

                    <div className="route-summary">
                      <div className="route-status">
                        <CheckCircle2 size={20} />
                        <b>Accessible route identified</b>
                      </div>

                      <div className="route-stat">
                        <span>Destination</span>
                        <b>Community Hall A</b>
                      </div>
                      <div className="route-stat">
                        <span>Distance</span>
                        <b>2.8 km</b>
                      </div>
                      <div className="route-stat">
                        <span>Blocked roads</span>
                        <b>{scenario.roads}</b>
                      </div>
                    </div>

                    <div className="warning-box">
                      <AlertTriangle size={18} />
                      <span>
                        Route guidance is based on the latest simulated
                        conditions and does not guarantee safety.
                      </span>
                    </div>
                  </div>

                  <div className="panel">
                    <div className="panel-header">
                      <div>
                        <h3>Safe Zones</h3>
                        <span>Available shelters</span>
                      </div>
                    </div>

                    {shelters.map((shelter) => {
                      const available =
                        shelter.capacity - shelter.occupants;

                      return (
                        <div className="shelter-mini" key={shelter.id}>
                          <div className="shelter-icon">
                            <Home size={18} />
                          </div>
                          <div>
                            <b>{shelter.name}</b>
                            <span>
                              {available} places available
                            </span>
                          </div>
                          <span
                            className={
                              available < 100
                                ? "capacity danger-text"
                                : "capacity"
                            }
                          >
                            {Math.round(
                              (shelter.occupants / shelter.capacity) * 100
                            )}
                            %
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </PageWrapper>
          )}

          {activePage === "preventive" && (
            <PageWrapper
              title="Preventive Evacuation"
              subtitle="Prioritize assistance for people remaining in high-risk zones"
            >
              <div className="stats-grid">
                <StatCard
                  icon={<Users size={21} />}
                  title="PEOPLE IN RISK ZONES"
                  value="1,240"
                  subtitle="Current identified population"
                  danger
                />
                <StatCard
                  icon={<CheckCircle2 size={21} />}
                  title="EVACUATED"
                  value={currentEvacuated.toLocaleString()}
                  subtitle="Confirmed evacuation"
                />
                <StatCard
                  icon={<HeartPulse size={21} />}
                  title="ASSISTANCE REQUIRED"
                  value={assistanceRequired}
                  subtitle="Priority support"
                />
                <StatCard
                  icon={<AlertTriangle size={21} />}
                  title="PENDING VERIFICATION"
                  value="26"
                  subtitle="Status unknown"
                />
              </div>

              <div className="two-column">
                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h3>Evacuation Priority Zones</h3>
                      <span>Authority decision-support view</span>
                    </div>
                    <Shield size={20} />
                  </div>

                  <div className="zone-list">
                    <ZoneItem
                      title="Mandatory Evacuation"
                      population="127 people"
                      risk="91%"
                      className="critical"
                    />
                    <ZoneItem
                      title="Recommended Evacuation"
                      population="412 people"
                      risk="78%"
                      className="high"
                    />
                    <ZoneItem
                      title="Watch"
                      population="538 people"
                      risk="54%"
                      className="moderate"
                    />
                    <ZoneItem
                      title="Safe / Monitor"
                      population="163 people"
                      risk="31%"
                      className="safe"
                    />
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h3>Assistance Reasons</h3>
                      <span>Why evacuation may be pending</span>
                    </div>
                  </div>

                  <div className="reason-list">
                    <ReasonRow
                      icon={<Navigation size={17} />}
                      label="Transportation required"
                      count="43"
                    />
                    <ReasonRow
                      icon={<HeartPulse size={17} />}
                      label="Medical assistance"
                      count="31"
                    />
                    <ReasonRow
                      icon={<Users size={17} />}
                      label="Elderly / mobility support"
                      count="28"
                    />
                    <ReasonRow
                      icon={<WifiOff size={17} />}
                      label="Communication unavailable"
                      count="19"
                    />
                    <ReasonRow
                      icon={<Route size={17} />}
                      label="Route blocked"
                      count="17"
                    />
                  </div>
                </div>
              </div>

              <div className="panel privacy-panel">
                <Shield size={21} />
                <div>
                  <b>Human oversight & privacy</b>
                  <p>
                    AI prioritizes households for assistance; authorized
                    personnel make operational decisions. Household-level
                    information is restricted to authorized responders and
                    should be protected through role-based access and audit
                    logging.
                  </p>
                </div>
              </div>
            </PageWrapper>
          )}

          {activePage === "incidents" && (
            <PageWrapper
              title="Incident Management"
              subtitle="Coordinate SOS requests, incidents and rescue response"
            >
              <div className="incident-summary">
                <div className="severity-card critical">
                  <span>CRITICAL</span>
                  <b>12</b>
                  <small>Immediate response</small>
                </div>
                <div className="severity-card urgent">
                  <span>URGENT</span>
                  <b>27</b>
                  <small>Assignment required</small>
                </div>
                <div className="severity-card monitoring">
                  <span>MONITORING</span>
                  <b>64</b>
                  <small>Under observation</small>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Active Incidents</h3>
                    <span>Prioritized operational queue</span>
                  </div>
                  <button className="small-button">
                    <RefreshCw size={15} />
                    Refresh
                  </button>
                </div>

                <div className="incident-list">
                  <IncidentRow
                    id="#FL-1042"
                    location="Rampur Village"
                    people="4 people"
                    condition="Building partially flooded"
                    severity="CRITICAL"
                    medical
                    status="NEW"
                  />
                  <IncidentRow
                    id="#FL-1039"
                    location="Devgarh Road"
                    people="7 people"
                    condition="Road cut off"
                    severity="CRITICAL"
                    status="ASSIGNED"
                  />
                  <IncidentRow
                    id="#FL-1035"
                    location="Lakshmi Nagar"
                    people="3 people"
                    condition="Water entering homes"
                    severity="URGENT"
                    status="EN ROUTE"
                  />
                  <IncidentRow
                    id="#FL-1028"
                    location="Bhairavpur"
                    people="2 people"
                    condition="Medical assistance"
                    severity="URGENT"
                    medical
                    status="ASSIGNED"
                  />
                </div>
              </div>
            </PageWrapper>
          )}

          {activePage === "rescue" && (
            <PageWrapper
              title="Rescue Operator"
              subtitle="Dispatch and coordinate response teams"
            >
              <div className="stats-grid">
                <StatCard
                  icon={<Shield size={21} />}
                  title="ACTIVE TEAMS"
                  value="8"
                  subtitle="Available for dispatch"
                />
                <StatCard
                  icon={<Navigation size={21} />}
                  title="EN ROUTE"
                  value="5"
                  subtitle="Moving to incidents"
                />
                <StatCard
                  icon={<Siren size={21} />}
                  title="ASSIGNMENTS"
                  value={rescueAssignments.length || 19}
                  subtitle="Backend prototype assignments"
                />
                <StatCard
                  icon={<CheckCircle2 size={21} />}
                  title="RESCUED"
                  value="86"
                  subtitle="Current simulation"
                />
              </div>

              <div className="two-column">
                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h3>Rescue Teams</h3>
                      <span>Operational status</span>
                    </div>
                  </div>

                  <div className="team-list">
                    <TeamRow
                      name="Team Alpha"
                      members="6 responders"
                      location="Rampur"
                      status="EN ROUTE"
                    />
                    <TeamRow
                      name="Team Bravo"
                      members="5 responders"
                      location="Devgarh"
                      status="AVAILABLE"
                    />
                    <TeamRow
                      name="Team Charlie"
                      members="8 responders"
                      location="Lakshmi Nagar"
                      status="EN ROUTE"
                    />
                    <TeamRow
                      name="Team Delta"
                      members="4 responders"
                      location="Control Centre"
                      status="AVAILABLE"
                    />
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h3>Dispatch Priority</h3>
                      <span>Highest-risk active incidents</span>
                    </div>
                  </div>

                  <div className="dispatch-list">
                    <DispatchItem id="#FL-1042" priority="CRITICAL" eta="8 min" />
                    <DispatchItem id="#FL-1039" priority="CRITICAL" eta="12 min" />
                    <DispatchItem id="#FL-1035" priority="URGENT" eta="18 min" />
                  </div>
                </div>
              </div>
            </PageWrapper>
          )}

          {activePage === "shelters" && (
            <PageWrapper
              title="Shelters & Relief"
              subtitle="Monitor shelter capacity and urgent resource requirements"
            >
              <div className="stats-grid">
                <StatCard
                  icon={<Home size={21} />}
                  title="TOTAL CAPACITY"
                  value="1,470"
                  subtitle="Across active shelters"
                />
                <StatCard
                  icon={<Users size={21} />}
                  title="OCCUPANTS"
                  value="1,120"
                  subtitle="Current occupancy"
                />
                <StatCard
                  icon={<Gauge size={21} />}
                  title="OCCUPANCY"
                  value="76%"
                  subtitle="Overall shelter load"
                />
                <StatCard
                  icon={<AlertTriangle size={21} />}
                  title="URGENT SHORTAGES"
                  value="6"
                  subtitle="Resources requiring action"
                  danger
                />
              </div>

              <div className="shelter-grid">
                {shelters.map((shelter) => {
                  const occupancy = Math.round(
                    (shelter.occupants / shelter.capacity) * 100
                  );

                  return (
                    <div className="panel shelter-card" key={shelter.id}>
                      <div className="shelter-card-head">
                        <div className="shelter-icon large">
                          <Home size={22} />
                        </div>
                        <div>
                          <h3>{shelter.name}</h3>
                          <span>{shelter.id} • Active</span>
                        </div>
                      </div>

                      <div className="occupancy">
                        <div>
                          <span>Occupancy</span>
                          <b>
                            {shelter.occupants} / {shelter.capacity}
                          </b>
                        </div>
                        <ProgressBar value={occupancy} />
                      </div>

                      <div className="resource-list">
                        <ResourceRow
                          name="Water"
                          value="Critical"
                          danger
                        />
                        <ResourceRow name="Food" value="High" />
                        <ResourceRow
                          name="Medicine"
                          value="Critical"
                          danger
                        />
                        <ResourceRow name="Blankets" value="Medium" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </PageWrapper>
          )}

          {activePage === "relief" && (
            <PageWrapper
              title="Relief & Donations"
              subtitle="Connect verified needs with relief allocation"
            >
              <div className="relief-banner">
                <HeartPulse size={25} />
                <div>
                  <b>Verified Relief Requirements</b>
                  <span>
                    Requirements shown here are prototype data for demonstration
                    and are not real donation requests.
                  </span>
                </div>
              </div>

              <div className="two-column">
                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h3>Rampur Village</h3>
                      <span>Verified requirement</span>
                    </div>
                    <CheckCircle2 size={20} />
                  </div>

                  <div className="relief-stat">
                    <span>Affected population</span>
                    <b>1,240</b>
                  </div>

                  <ReliefNeed name="Water" required="4,500 L" progress={68} />
                  <ReliefNeed name="Food" required="1,800 kits" progress={52} />
                  <ReliefNeed name="Medical kits" required="75" progress={41} />
                  <ReliefNeed name="Blankets" required="500" progress={73} />
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h3>Impact Tracking</h3>
                      <span>Simulated relief allocation</span>
                    </div>
                  </div>

                  <div className="impact-tracking">
                    <div className="impact-number">₹1.24L</div>
                    <span>Simulated support allocated</span>

                    <div className="tracking-line">
                      <span>Verified requirement</span>
                      <b>100%</b>
                    </div>
                    <ProgressBar value={100} />

                    <div className="tracking-line">
                      <span>Allocation matched</span>
                      <b>72%</b>
                    </div>
                    <ProgressBar value={72} />
                  </div>

                  <button className="primary-button">
                    Simulate Donation Allocation
                  </button>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Relief Workflow</h3>
                    <span>From prediction to verified support</span>
                  </div>
                </div>

                <div className="workflow">
                  <WorkflowStep number="01" text="Flood Risk" />
                  <WorkflowStep number="02" text="Affected Village" />
                  <WorkflowStep number="03" text="Displaced Population" />
                  <WorkflowStep number="04" text="Shelter" />
                  <WorkflowStep number="05" text="Verified Need" />
                  <WorkflowStep number="06" text="Relief Support" />
                </div>
              </div>
            </PageWrapper>
          )}

          {activePage === "citizen" && (
            <PageWrapper
              title="Citizen / SOS"
              subtitle="Emergency request and low-connectivity communication"
            >
              <div className="citizen-layout">
                <div className="panel sos-panel">
                  <div className="sos-header">
                    <div className="sos-symbol">
                      <Siren size={34} />
                    </div>
                    <div>
                      <div className="eyebrow">EMERGENCY CHANNEL</div>
                      <h2>Emergency SOS</h2>
                      <p>
                        Send an emergency request to the disaster control
                        centre.
                      </p>
                    </div>
                  </div>

                  <div className="sos-fields"><label>People<input type="number" min="1" value={sosForm.people} onChange={(e) => setSosForm({ ...sosForm, people: Number(e.target.value) })} /></label><label>Location<input value={sosForm.location} onChange={(e) => setSosForm({ ...sosForm, location: e.target.value })} /></label><label>Condition<input value={sosForm.condition} onChange={(e) => setSosForm({ ...sosForm, condition: e.target.value })} /></label><label>Battery %<input type="number" min="0" max="100" value={sosForm.battery} onChange={(e) => setSosForm({ ...sosForm, battery: Number(e.target.value) })} /></label><label className="check-field"><input type="checkbox" checked={sosForm.medical} onChange={(e) => setSosForm({ ...sosForm, medical: e.target.checked })} /> Medical emergency</label></div><div className="citizen-details">
                    <div>
                      <span>Location</span>
                      <b>Village XYZ</b>
                    </div>
                    <div>
                      <span>People</span>
                      <b>4</b>
                    </div>
                    <div>
                      <span>Medical emergency</span>
                      <b>Yes</b>
                    </div>
                    <div>
                      <span>Battery</span>
                      <b>18%</b>
                    </div>
                  </div>

                  <button
                    className={`sos-button ${sosSent ? "sent" : ""}`}
                    onClick={sendSOS}
                    aria-label="Send simulated emergency SOS"
                  >
                    {sosSent ? (
                      <>
                        <CheckCircle2 size={24} />
                        SOS SENT
                      </>
                    ) : (
                      <>
                        <Siren size={24} />
                        SEND SOS
                      </>
                    )}
                  </button>

                  {sosSent && (
                    <div className="sos-confirmation">
                      <CheckCircle2 size={19} />
                      <div>
                        <b>SOS {sosAlerts[0]?.id || "created"} and incident created</b>
                        <span>
                          Your request has been added to the emergency
                          response queue.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <div>
                      <h3>Communication Status</h3>
                      <span>Low-connectivity emergency pathway</span>
                    </div>
                    {networkOnline ? (
                      <Wifi size={20} />
                    ) : (
                      <WifiOff size={20} />
                    )}
                  </div>

                  <div className="communication-flow">
                    <CommunicationStep
                      icon={<MapPin size={20} />}
                      title="Citizen Device"
                      text="Location + SOS information"
                      active
                    />
                    <ChevronRight />
                    <CommunicationStep
                      icon={<Radio size={20} />}
                      title="LoRa Gateway"
                      text="Low-connectivity relay"
                      active={!networkOnline}
                    />
                    <ChevronRight />
                    <CommunicationStep
                      icon={<Shield size={20} />}
                      title="Control Centre"
                      text="Incident created"
                      active={networkOnline}
                    />
                  </div>

                  <div className="offline-box">
                    <WifiOff size={20} />
                    <div>
                      <b>
                        {networkOnline
                          ? "Normal connectivity"
                          : "Offline / low-connectivity mode"}
                      </b>
                      <p>
                        {networkOnline
                          ? "SOS can be transmitted through the normal network."
                          : "SOS is stored locally and simulated as waiting for a gateway / store-and-forward path."}
                      </p>
                    </div>
                  </div>

                  <div className="technical-note">
                    <b>Prototype note:</b> LoRa communication is simulated.
                    Ordinary smartphone GPS/GNSS provides positioning but does
                    not itself provide satellite communication.
                  </div>
                </div>
              </div>
            </PageWrapper>
          )}
          {activePage === "prediction" && <div className="panel"><h3>Rule-based prototype estimate: {rulePrediction.score}% ? {rulePrediction.level}</h3><p className="prototype-note">Transparent deterministic calculation, not a trained production model. Confidence indicator: {rulePrediction.confidence}% (heuristic).</p><p>Contributing factors: {rulePrediction.factors.join(" ? ")}</p><div className="prediction-input-grid">{([ ["Rainfall (mm)", "rainfall", 0, 300], ["Forecast rainfall (mm)", "forecastRainfall", 0, 300], ["Soil moisture (%)", "soilMoisture", 0, 100], ["Elevation (m)", "elevation", 0, 5000], ["Slope (degrees)", "slope", 0, 90], ["Water level (prototype scale)", "waterLevel", 0, 100], ["Historical flood frequency", "historicalFrequency", 0, 100], ["IoT observation nodes", "iotObservations", 0, 50], ["Terrain vulnerability", "terrainVulnerability", 0, 100] ] as const).map(([label, key, min, max]) => <label key={key}>{label}<input type="number" min={min} max={max} value={riskInputs[key]} onChange={(e) => setRiskInputs((v) => ({ ...v, [key]: Math.max(min, Math.min(max, Number(e.target.value))) }))} /></label>)}</div><p>Scenario sequence remains fixed at 42% / 71% / 91% for comparability; the rule estimate responds to these inputs.</p></div>}
          {activePage === "impact" && <div className="panel"><div className="panel-header"><div><h3>Exposure by village</h3><span>Scenario data; illustrative, not live population data</span></div></div>{villages.map((v) => <div className="chart-row" key={v.name}><span>{v.name}</span><div className="progress"><div style={{ width: `${v.risk}%` }} /></div><b>{Math.round(v.population * scenario.risk / 100)} at risk</b></div>)}<p>Estimated households: {Math.round(scenario.affected / 4)} ? population at risk: {scenario.affected.toLocaleString()} ? roads: {scenario.roads} ? bridges: {scenario.roads ? 1 : 0} ? infrastructure: {scenario.isolated ? "1 village node isolated" : "monitoring"}</p><div className="network-state">{scenarios.map((item) => <span className="status-tag" key={item.time}>{item.time}: {item.affected} affected ? {item.evacuated} protected</span>)}</div></div>}
          {activePage === "preventive" && <PageWrapper title="Preventive Evacuation" subtitle="Household records are synthetic demonstration data"><div className="panel"><div className="table-head"><span>Household / zone</span><span>People</span><span>Status</span><span>Action</span></div>{records.map((r) => <div className="table-row" key={r.id}><b>{r.household} ? {r.village}</b><span>{r.people}</span><span className="status-tag">{r.status}</span><button className="small-button" onClick={() => { void updateHousehold(r, r.status === "Evacuated" ? "Pending" : "Evacuated"); }}>Update status</button><button className="small-button" onClick={() => { void prototypeApi.updateHousehold(r.id, "Assistance Required").then(() => setApiOnline(true)).catch(() => undefined); logAction("Responder dispatched", `Household ${r.id}, ${r.village}`); setNotifications((rows) => [{ id: `N-${Date.now()}`, kind: "Evacuation", message: `Responder dispatch simulated for ${r.id}.`, time: new Date().toLocaleTimeString(), read: false }, ...rows]); }}>Dispatch responder</button></div>)}</div></PageWrapper>}
          {(activePage === "incidents" || activePage === "rescue") && <div className="panel"><div className="panel-header"><div><h3>{activePage === "rescue" ? "Assigned incidents & teams" : "Live prototype incident queue"}</h3><span>Assignments and status updates affect this session state</span></div></div>{incidentRows.map((incident) => <div className="data-row" key={incident.id}><span className="status-tag">{incident.status}</span><b>#{incident.id} ? {incident.location} ? {incident.people} people</b><small>{incident.condition} {incident.team ? `? ${incident.team}` : "? unassigned"}</small><select aria-label={`Assign team to ${incident.id}`} value={incident.team || ""} onChange={(e) => { const team = e.target.value; setIncidentRows((rows) => rows.map((x) => x.id === incident.id ? { ...x, team: team || undefined, status: team ? "ASSIGNED" : "NEW" } : x)); if (team) void prototypeApi.assignIncident(incident.id, team).then((saved) => { setIncidentRows((rows) => rows.map((x) => x.id === incident.id ? mapIncident(saved) : x)); setApiOnline(true); }).catch(() => undefined); logAction("Incident assigned", `${incident.id}: ${team || "unassigned"}`); }}><option value="">Assign rescue team</option><option>Team Alpha</option><option>Team Bravo</option><option>Team Charlie</option><option>Team Delta</option></select><select aria-label={`Update incident status ${incident.id}`} value={incident.status} onChange={(e) => { const status = e.target.value as Incident["status"]; setIncidentRows((rows) => rows.map((x) => x.id === incident.id ? { ...x, status } : x)); void prototypeApi.updateIncident(incident.id, status).then((saved) => { setIncidentRows((rows) => rows.map((x) => x.id === incident.id ? mapIncident(saved) : x)); setApiOnline(true); }).catch(() => undefined); logAction("Incident status updated", `${incident.id}: ${status}`); }}><option>NEW</option><option>ASSIGNED</option><option>EN ROUTE</option><option>RESCUED</option><option>CLOSED</option></select><button className="small-button" onClick={() => { const team = incident.team || "Team Delta"; setIncidentRows((rows) => rows.map((x) => x.id === incident.id ? { ...x, team, status: "EN ROUTE" } : x)); void prototypeApi.dispatchRescue(team).then((result) => { setRescueAssignments((rows) => [result, ...rows]); setApiOnline(true); }).catch(() => undefined); logAction("Rescue dispatched", `${incident.id} dispatched; route guidance is indicative`); }}>Dispatch</button></div>)}</div>}
          {activePage === "shelters" && <div className="shelter-grid">{shelterRows.map((shelter) => <div className="panel" key={shelter.id}><h3>{shelter.name}</h3><p>Capacity {shelter.capacity} ? Occupancy {shelter.occupants} ? Space {shelter.capacity - shelter.occupants}</p><p>Water {shelter.water} ? Food {shelter.food} ? Medicine {shelter.medicine} ? Blankets {shelter.blankets} ? Accessible {shelter.accessible ? "Yes" : "Needs review"}</p><button className="small-button" onClick={() => { void updateShelterOccupancy(shelter); }}>Update occupancy +10</button><button className="small-button" onClick={async () => { setShelterRows((rows) => rows.map((x) => x.id === shelter.id ? { ...x, water: "Replenishment requested" } : x)); try { const saved = await prototypeApi.updateShelter(shelter.id, { water_status: "replenishment requested" }); setShelterRows((rows) => rows.map((x) => x.id === shelter.id ? mapShelter(saved) : x)); setApiOnline(true); } catch { /* local fallback */ } logAction("Shelter resources updated", `${shelter.name}; water replenishment requested`); }}>Request water</button></div>)}</div>}
          {activePage === "relief" && <div className="panel"><h3>Simulated donation allocation</h3><p>Prototype only; no payment or real donation is processed.</p><button className="primary-button" onClick={() => { void donateSimulated(); }}>Simulate ?500 donation</button>{reliefRequirements.map((need) => <div className="data-row" key={String(need.id)}><span className="status-tag">{String(need.priority || "verified")}</span><b>{String(need.item)} - {String(need.quantity)} at {String(need.location)}</b></div>)}{formMessage && <p role="status">{formMessage}</p>}{donations.map((d) => <div className="data-row" key={d.id}><span className="status-tag">SIMULATED</span><b>?{d.amount} ? {d.transactionId}</b></div>)}</div>}
          {activePage === "evacuation" && <div className="panel"><div className="panel-header"><div><h3>Route assessment</h3><span>Flood extent, blocked roads and shelter recommendation are scenario estimates.</span></div><button className="small-button" onClick={async () => { const result = await prototypeApi.recalculateRoute(scenario.roads); setRouteChanged(true); setRouteText(result.route); logAction("Route recalculated", `${result.route}; accessible ${result.accessible}; safety is not guaranteed`); }}>Recalculate route</button></div><p>{routeChanged ? routeText : "River road to Community Hall A"} ? {scenario.roads} blocked road(s) ? accessibility requires on-ground verification.</p></div>}
          {activePage === "simulation" && <PageWrapper title="System Simulation" subtitle="Deterministic prototype scenarios; no live agency or sensor feed"><div className="panel"><div className="panel-header"><div><h3>{scenario.time} ? {scenario.risk}% modeled risk</h3><span>Rain {scenario.rainfallValue} mm ? soil {scenario.soil}% ? water {scenario.water}</span></div><button className="primary-button" onClick={runScenario}>Run Next Scenario</button></div><div className="risk-evolution">{scenarios.map((s) => <div key={s.time} className={`evolution-card ${s.time === scenario.time ? "selected" : ""}`}><b>{s.time}</b><strong>{s.risk}%</strong><span>{s.rainfallValue} mm rain ? {s.soil}% soil</span></div>)}</div><p>Affected {scenario.affected} ? people protected {scenario.evacuated} ? blocked roads {scenario.roads} ? isolated villages {scenario.isolated}. Advancing updates prototype shelter, incident and network state too.</p><button className="small-button" onClick={resetScenario}>Reset demonstration</button></div></PageWrapper>}
          {activePage === "communication" && <PageWrapper title="Communication Network" subtitle="Prototype connectivity across terrestrial radio and gateway nodes"><div className="panel"><div className="panel-header"><div><h3>Message pathway</h3><span>LoRa is terrestrial radio; no direct satellite messaging is represented.</span></div><button className="small-button" onClick={() => { if (networkOnline) void prototypeApi.simulateOffline().then(() => setApiOnline(true)).catch(() => undefined); setNetworkOnline((v) => !v); setNotifications((rows) => [{ id: `N-${Date.now()}`, kind: "Network failure", message: networkOnline ? "Prototype network failure simulated; messages may queue." : "Gateway available; queued messages can be forwarded.", time: new Date().toLocaleTimeString(), read: false }, ...rows]); logAction("Network state changed", networkOnline ? "NETWORK FAILURE ? SOS QUEUED" : "GATEWAY AVAILABLE ? MESSAGE FORWARDED"); }}>{networkOnline ? "Simulate network failure" : "Restore gateway"}</button></div><div className="network-state">{(networkOnline ? ["ONLINE", "GATEWAY AVAILABLE", "MESSAGE FORWARDED"] : ["NETWORK FAILURE", "OFFLINE", "SOS QUEUED"]).map((x) => <span className="status-tag" key={x}>{x}</span>)}</div><p className="prototype-note">All connectivity states shown are simulated and do not represent an emergency-service connection.</p></div><div className="stats-grid"><StatCard icon={<RadioTower />} title="CONNECTED NODES" value={communicationNodes.filter((node) => String(node.status).toLowerCase() === "online").length || (networkOnline ? 3 : 1)} subtitle="Prototype gateway state" /><StatCard icon={<WifiOff />} title="OFFLINE NODES" value={communicationNodes.filter((node) => String(node.status).toLowerCase() !== "online").length || (networkOnline ? 0 : 2)} subtitle="Store and forward demonstration" /></div></PageWrapper>}
          {activePage === "notifications" && <PageWrapper title="Notifications" subtitle="Risk, roads, evacuation, SOS, shelters, relief and network events"><div className="panel"><div className="panel-header"><h3>Notification centre</h3><button className="small-button" onClick={() => setNotifications((rows) => rows.map((n) => ({ ...n, read: true })))}>Mark all read</button></div>{notifications.map((n) => <div className="data-row" key={n.id}><span className="status-tag">{n.kind}</span><b>{n.message}</b><small>{n.time} ? {n.read ? "Read" : "Unread"}</small></div>)}</div></PageWrapper>}
          {activePage === "layers" && <PageWrapper title="Map Layers" subtitle="Toggle overlays on the operational map"><div className="panel layer-grid">{Object.keys(layers).map((key) => <label className="layer-toggle" key={key}><input type="checkbox" checked={layers[key]} onChange={(e) => setLayers({ ...layers, [key]: e.target.checked })} />{key.replace(/^./, (c) => c.toUpperCase())}</label>)}</div><p className="prototype-note">Layer settings are available here; the base Leaflet map and scenario overlays remain active.</p></PageWrapper>}
          {activePage === "audit" && <PageWrapper title="Audit Logs" subtitle="Major prototype actions recorded locally for review"><div className="panel">{audit.length ? audit.map((a) => <div className="data-row" key={a.id}><span className="status-tag">{a.action}</span><b>{a.detail}</b><small>{a.time}</small></div>) : <p>No actions recorded yet. Simulation, SOS, dispatch and updates appear here.</p>}</div></PageWrapper>}
          {activePage === "admin" && <PageWrapper title="Administration" subtitle="Role and prototype settings"><div className="panel"><h3>Current role</h3><p>{role}</p><label>Switch role <select value={role} onChange={(e) => { setRole(e.target.value as Role); localStorage.setItem("terraflux-role", e.target.value); }}><option>Citizen</option><option>Disaster Authority</option><option>Rescue Operator</option><option>Admin</option></select></label><p className="prototype-note">Local demo only. Account and access management are not connected to an authentication service.</p></div></PageWrapper>}
          {(activePage === "signin" || activePage === "create-account") && <PageWrapper title={activePage === "signin" ? "Sign In" : "Create Account"} subtitle="Local demonstration profile; no credentials are transmitted"><form className="panel auth-form" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const selected = String(fd.get("role")) as Role; setRole(selected); localStorage.setItem("terraflux-role", selected); setFormMessage("Demo profile selected. No account was created or authenticated."); }}><label>Name<input name="name" placeholder="Your name" required /></label><label>Email<input type="email" name="email" placeholder="name@example.com" required /></label><label>Password<input type="password" name="password" minLength={6} required /></label><label>Role<select name="role" defaultValue={role}><option>Citizen</option><option>Disaster Authority</option><option>Rescue Operator</option><option>Admin</option></select></label><button className="primary-button" type="submit">{activePage === "signin" ? "Continue in demo" : "Create demo profile"}</button>{formMessage && <p role="status">{formMessage}</p>}</form></PageWrapper>}
        </div>
      </main>
    </div>
  );
}
function PageWrapper({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">TERRAFLUX OPERATIONS</div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </section>

      <div className="page-content">{children}</div>
    </>
  );
}

function DataSource({
  icon,
  title,
  value,
  status,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  status: string;
}) {
  return (
    <div className="data-source">
      <div className="data-source-icon">{icon}</div>
      <div>
        <span>{title}</span>
        <b>{value}</b>
        <small>{status}</small>
      </div>
    </div>
  );
}

function InputRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="input-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function ImpactItem({
  title,
  value,
  danger = false,
}: {
  title: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="impact-item">
      <div className={`impact-status ${danger ? "danger" : ""}`} />
      <div>
        <b>{title}</b>
        <span>{value}</span>
      </div>
    </div>
  );
}

function ZoneItem({
  title,
  population,
  risk,
  className,
}: {
  title: string;
  population: string;
  risk: string;
  className: string;
}) {
  return (
    <div className={`zone-item ${className}`}>
      <div className="zone-indicator" />
      <div>
        <b>{title}</b>
        <span>{population}</span>
      </div>
      <strong>{risk}</strong>
    </div>
  );
}

function ReasonRow({
  icon,
  label,
  count,
}: {
  icon: ReactNode;
  label: string;
  count: string;
}) {
  return (
    <div className="reason-row">
      <div className="reason-icon">{icon}</div>
      <span>{label}</span>
      <b>{count}</b>
    </div>
  );
}

function IncidentRow({
  id,
  location,
  people,
  condition,
  severity,
  medical = false,
  status,
}: {
  id: string;
  location: string;
  people: string;
  condition: string;
  severity: "CRITICAL" | "URGENT";
  medical?: boolean;
  status: string;
}) {
  return (
    <div className="incident-row">
      <div className={`incident-severity ${severity.toLowerCase()}`}>
        <AlertTriangle size={18} />
      </div>

      <div className="incident-info">
        <div className="incident-title">
          <b>{id}</b>
          <span className={`status-pill ${status.toLowerCase().replace(" ", "-")}`}>
            {status}
          </span>
        </div>

        <strong>{location}</strong>

        <span>
          {people} • {condition}
          {medical && " • Medical emergency"}
        </span>
      </div>

      <button className="outline-button">Open</button>
    </div>
  );
}

function TeamRow({
  name,
  members,
  location,
  status,
}: {
  name: string;
  members: string;
  location: string;
  status: string;
}) {
  return (
    <div className="team-row">
      <div className="team-avatar">
        <Shield size={18} />
      </div>

      <div className="team-info">
        <b>{name}</b>
        <span>{members}</span>
      </div>

      <div className="team-location">
        <MapPin size={14} />
        {location}
      </div>

      <span
        className={`team-status ${
          status === "AVAILABLE" ? "available" : "en-route"
        }`}
      >
        {status}
      </span>
    </div>
  );
}

function DispatchItem({
  id,
  priority,
  eta,
}: {
  id: string;
  priority: string;
  eta: string;
}) {
  return (
    <div className="dispatch-item">
      <div>
        <b>{id}</b>
        <span>{priority}</span>
      </div>

      <div className="eta">
        <Navigation size={15} />
        {eta}
      </div>
    </div>
  );
}

function ResourceRow({
  name,
  value,
  danger = false,
}: {
  name: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="resource-row">
      <span>{name}</span>
      <b className={danger ? "danger-text" : ""}>{value}</b>
    </div>
  );
}

function ReliefNeed({
  name,
  required,
  progress,
}: {
  name: string;
  required: string;
  progress: number;
}) {
  return (
    <div className="relief-need">
      <div className="relief-need-head">
        <div>
          <b>{name}</b>
          <span>Required: {required}</span>
        </div>
        <strong>{progress}%</strong>
      </div>
      <ProgressBar value={progress} />
    </div>
  );
}

function WorkflowStep({
  number,
  text,
}: {
  number: string;
  text: string;
}) {
  return (
    <div className="workflow-step">
      <span>{number}</span>
      <b>{text}</b>
    </div>
  );
}

function CommunicationStep({
  icon,
  title,
  text,
  active = false,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  active?: boolean;
}) {
  return (
    <div className={`communication-step ${active ? "active" : ""}`}>
      <div>{icon}</div>
      <b>{title}</b>
      <span>{text}</span>
    </div>
  );
}

function TrendingUpIcon() {
  return (
    <div className="trend-icon">
      <Zap size={18} />
    </div>
  );
}

const styles = `
* {
  box-sizing: border-box;
}

:root {
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  color: #172033;
  background: #f4f7fb;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

body {
  margin: 0;
  min-width: 320px;
  background: #f4f7fb;
}

button {
  font: inherit;
}

button,
a {
  -webkit-tap-highlight-color: transparent;
}

.app {
  min-height: 100vh;
  display: flex;
  background: #f4f7fb;
}

/* SIDEBAR */

.sidebar {
  width: 270px;
  min-height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 1000;
  background: #0b1220;
  color: #dce5f2;
  display: flex;
  flex-direction: column;
  padding: 20px 14px;
  overflow-y: auto;
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 5px 9px 20px;
}

.brand-mark {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, #0ea5e9, #2563eb);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.brand-name {
  color: white;
  font-weight: 800;
  letter-spacing: 1.2px;
  font-size: 18px;
}

.brand-subtitle {
  color: #8390a4;
  font-size: 10px;
  margin-top: 2px;
}

.mobile-close {
  display: none;
  margin-left: auto;
  border: 0;
  background: transparent;
  color: white;
}

.system-status {
  margin: 4px 8px 22px;
  border: 1px solid #26364d;
  border-radius: 9px;
  padding: 9px 11px;
  color: #9fb0c7;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot,
.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  display: inline-block;
  box-shadow: 0 0 0 4px rgba(34,197,94,.1);
}

.nav-section-title {
  font-size: 9px;
  letter-spacing: 1.4px;
  color: #66758b;
  padding: 0 10px 8px;
  font-weight: 800;
}

nav {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.nav-item {
  width: 100%;
  border: 0;
  background: transparent;
  color: #9caac0;
  border-radius: 8px;
  padding: 10px 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  cursor: pointer;
  font-size: 12px;
  transition: .18s ease;
}

.nav-item:hover {
  background: #151f31;
  color: white;
}

.nav-item.active {
  background: #123354;
  color: #55c7ff;
  box-shadow: inset 3px 0 0 #0ea5e9;
}

.nav-count {
  margin-left: auto;
  background: #dc2626;
  color: white;
  border-radius: 20px;
  padding: 2px 7px;
  font-size: 9px;
  font-weight: 800;
}

.sidebar-bottom {
  margin-top: auto;
  padding-top: 20px;
}

.network-box {
  display: flex;
  gap: 9px;
  padding: 10px;
  border-radius: 9px;
  background: #111b2b;
  border: 1px solid #223148;
}

.network-icon {
  color: #22c55e;
  display: flex;
  align-items: center;
}

.network-box b {
  display: block;
  color: #dbe6f4;
  font-size: 11px;
}

.network-box span {
  display: block;
  color: #718198;
  font-size: 9px;
  margin-top: 2px;
}

.reset-button {
  width: 100%;
  margin-top: 9px;
  border: 1px solid #26364d;
  background: transparent;
  color: #9ba9bd;
  border-radius: 8px;
  padding: 9px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 7px;
  font-size: 11px;
}

.reset-button:hover {
  color: white;
  border-color: #4a607d;
}

/* MAIN */

.main {
  margin-left: 270px;
  width: calc(100% - 270px);
  min-width: 0;
}

.topbar {
  height: 74px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  padding: 0 28px;
  gap: 15px;
  position: sticky;
  top: 0;
  z-index: 500;
}

.topbar h1 {
  margin: 0;
  font-size: 17px;
  color: #172033;
}

.topbar p {
  margin: 4px 0 0;
  color: #7b8799;
  font-size: 10px;
}

.menu-button {
  display: none;
  border: 0;
  background: transparent;
  color: #26354a;
}

.topbar-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 13px;
}

.network-toggle {
  border: 1px solid #d9e2ed;
  background: #f8fafc;
  border-radius: 20px;
  padding: 6px 10px;
  font-size: 9px;
  font-weight: 800;
  display: flex;
  gap: 6px;
  align-items: center;
  cursor: pointer;
}

.network-toggle.online {
  color: #15803d;
}

.network-toggle.offline {
  color: #dc2626;
}

.notification {
  position: relative;
  width: 35px;
  height: 35px;
  border: 1px solid #e1e7ef;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #58677d;
}

.notification span {
  position: absolute;
  right: -2px;
  top: -2px;
  background: #dc2626;
  color: white;
  font-size: 8px;
  min-width: 14px;
  height: 14px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user {
  display: flex;
  align-items: center;
  gap: 8px;
}

.avatar {
  width: 34px;
  height: 34px;
  background: #dbeafe;
  color: #1d4ed8;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 10px;
  font-weight: 800;
}

.user b {
  display: block;
  font-size: 10px;
}

.user small {
  color: #8793a5;
  font-size: 9px;
}

/* CONTENT */

.content {
  padding: 25px 28px 45px;
  max-width: 1700px;
  margin: auto;
}

.hero,
.page-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 22px;
}

.eyebrow {
  color: #0284c7;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 1.4px;
  display: flex;
  align-items: center;
  gap: 7px;
}

.hero h2,
.page-heading h2 {
  font-size: 25px;
  margin: 7px 0 5px;
  letter-spacing: -.4px;
}

.hero p,
.page-heading p {
  color: #718096;
  font-size: 12px;
  margin: 0;
  max-width: 700px;
}

.scenario-control {
  background: white;
  border: 1px solid #e1e8f0;
  border-radius: 11px;
  padding: 9px;
  display: flex;
  gap: 13px;
  align-items: center;
}

.scenario-control span {
  display: block;
  color: #8b98aa;
  font-size: 8px;
  letter-spacing: .8px;
}

.scenario-control b {
  font-size: 12px;
}

.scenario-control button,
.small-button,
.primary-button {
  border: 0;
  background: #0ea5e9;
  color: white;
  border-radius: 7px;
  padding: 9px 12px;
  cursor: pointer;
  font-size: 10px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 6px;
}

.scenario-control button:hover,
.small-button:hover,
.primary-button:hover {
  background: #0284c7;
}

/* CARDS */

.stats-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 11px;
  margin-bottom: 15px;
}

.stat-card {
  background: white;
  border: 1px solid #e3e9f1;
  border-radius: 11px;
  padding: 13px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.stat-card.danger {
  border-color: #fecaca;
}

.stat-icon {
  width: 33px;
  height: 33px;
  background: #eff6ff;
  color: #2563eb;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.stat-card.danger .stat-icon {
  background: #fef2f2;
  color: #dc2626;
}

.stat-title {
  font-size: 8px;
  color: #8491a4;
  font-weight: 800;
  letter-spacing: .5px;
}

.stat-value {
  font-size: 20px;
  line-height: 1.15;
  font-weight: 850;
  margin-top: 3px;
}

.stat-subtitle {
  color: #9aa5b4;
  font-size: 8px;
  margin-top: 3px;
}

/* PANELS */

.panel {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  min-width: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.panel-header h3 {
  margin: 0;
  font-size: 13px;
}

.panel-header span {
  display: block;
  color: #8793a5;
  font-size: 9px;
  margin-top: 3px;
}

.panel-header > svg {
  color: #6c7b90;
}

/* DASHBOARD */

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(300px, .9fr);
  gap: 15px;
}

.right-column {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.map-panel {
  padding-bottom: 10px;
}

.map-container {
  height: 445px;
  border-radius: 9px;
  overflow: hidden;
  position: relative;
}

.map-container.large {
  height: 570px;
}

.leaflet-container {
  font-family: inherit;
}

.map-legend {
  position: absolute;
  bottom: 12px;
  left: 12px;
  background: rgba(255,255,255,.96);
  padding: 8px 10px;
  border-radius: 8px;
  z-index: 400;
  box-shadow: 0 2px 10px rgba(0,0,0,.12);
  font-size: 9px;
}

.map-legend div {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 4px 0;
}

.map-legend i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}

.legend-danger {
  background: #dc2626;
}

.legend-road {
  background: #2563eb;
}

.legend-shelter {
  background: #3b82f6;
}

.legend-node {
  background: #7c3aed;
}

.risk-badge {
  display: inline-flex;
  padding: 4px 7px;
  border-radius: 5px;
  font-size: 8px;
  font-weight: 900;
}

.risk-critical {
  color: #b91c1c;
  background: #fee2e2;
}

.risk-high {
  color: #c2410c;
  background: #ffedd5;
}

.risk-moderate {
  color: #a16207;
  background: #fef9c3;
}

.risk-low {
  color: #15803d;
  background: #dcfce7;
}

/* RISK */

.risk-score {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-bottom: 15px;
}

.risk-number {
  font-size: 35px;
  font-weight: 900;
  color: #dc2626;
}

.risk-score b {
  display: block;
  font-size: 12px;
}

.risk-score span {
  display: block;
  color: #8b97a8;
  font-size: 9px;
  margin-top: 2px;
}

.progress-wrapper {
  width: 100%;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  color: #7d8999;
  font-size: 9px;
  margin-bottom: 5px;
}

.progress-label b {
  color: #27354a;
}

.progress {
  height: 7px;
  background: #edf1f6;
  border-radius: 20px;
  overflow: hidden;
}

.progress > div {
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #f59e0b, #ef4444);
  border-radius: inherit;
  transition: width .3s ease;
}

.factor-list {
  margin-top: 15px;
  border-top: 1px solid #edf1f5;
}

.factor-list div,
.input-row {
  display: flex;
  justify-content: space-between;
  padding: 9px 0;
  border-bottom: 1px solid #f0f3f7;
  font-size: 10px;
}

.factor-list span,
.input-row span {
  color: #758297;
}

.factor-list b,
.input-row b {
  color: #253247;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.timeline-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 7px;
  padding: 8px;
  text-align: left;
  cursor: pointer;
}

.timeline-item:hover,
.timeline-item.selected {
  background: #f5f9ff;
  border-color: #dbeafe;
}

.timeline-dot {
  width: 8px;
  height: 8px;
  background: #94a3b8;
  border-radius: 50%;
}

.timeline-item.selected .timeline-dot {
  background: #0ea5e9;
  box-shadow: 0 0 0 4px #e0f2fe;
}

.timeline-item div:nth-child(2) {
  flex: 1;
}

.timeline-item b {
  display: block;
  font-size: 10px;
}

.timeline-item span {
  display: block;
  font-size: 8px;
  color: #8b97a8;
  margin-top: 2px;
}

.timeline-item > svg {
  color: #a0acba;
}

.change-box {
  margin-top: 10px;
  padding: 10px;
  border-radius: 8px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  display: flex;
  gap: 9px;
}

.trend-icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  background: #ffedd5;
  color: #ea580c;
  border-radius: 7px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.change-box b {
  display: block;
  font-size: 9px;
  color: #9a3412;
}

.change-box span {
  display: block;
  color: #9a6a52;
  font-size: 8px;
  margin-top: 3px;
  line-height: 1.4;
}

/* BOTTOM */

.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-top: 15px;
}

.text-button {
  background: transparent;
  border: 0;
  color: #0284c7;
  font-size: 9px;
  cursor: pointer;
  font-weight: 800;
}

.impact-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.impact-grid div {
  background: #f8fafc;
  padding: 10px;
  border-radius: 8px;
}

.impact-grid span {
  display: block;
  color: #8290a3;
  font-size: 8px;
}

.impact-grid b {
  display: block;
  font-size: 16px;
  margin-top: 5px;
}

.route-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 9px;
  padding: 11px;
}

.route-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: #dcfce7;
  color: #16a34a;
  display: flex;
  align-items: center;
  justify-content: center;
}

.route-card > div:nth-child(2) {
  flex: 1;
}

.route-card b,
.route-card span {
  display: block;
}

.route-card b {
  font-size: 10px;
}

.route-card span {
  color: #718096;
  font-size: 8px;
  margin-top: 3px;
}

.icon-button {
  width: 30px;
  height: 30px;
  border: 1px solid #e1e7ef;
  background: white;
  border-radius: 7px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #65748a;
}

/* PAGE */

.page-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.prediction-layout {
  display: grid;
  grid-template-columns: 1.5fr .8fr;
  gap: 15px;
}

.prediction-header {
  display: flex;
  justify-content: space-between;
}

.prediction-header h2 {
  font-size: 25px;
  margin: 7px 0 4px;
}

.prediction-header p {
  color: #758297;
  font-size: 10px;
  margin: 0;
}

.big-risk {
  display: flex;
  align-items: center;
  gap: 25px;
  padding: 25px 0;
}

.risk-circle {
  width: 145px;
  height: 145px;
  border-radius: 50%;
  border: 12px solid #fee2e2;
  border-top-color: #ef4444;
  border-right-color: #f59e0b;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.risk-circle span {
  font-size: 32px;
  font-weight: 900;
  color: #dc2626;
}

.risk-circle small {
  color: #7c8798;
  font-size: 9px;
  font-weight: 800;
}

.risk-details {
  flex: 1;
}

.confidence {
  display: flex;
  justify-content: space-between;
  margin-bottom: 7px;
  font-size: 10px;
}

.confidence span {
  color: #748196;
}

.risk-details p {
  font-size: 9px;
  color: #8491a2;
  line-height: 1.5;
  margin-top: 10px;
}

.source-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 9px;
}

.data-source {
  padding: 11px;
  border: 1px solid #e7ecf2;
  border-radius: 9px;
  display: flex;
  gap: 8px;
}

.data-source-icon {
  color: #0284c7;
}

.data-source span,
.data-source b,
.data-source small {
  display: block;
}

.data-source span {
  color: #8491a3;
  font-size: 8px;
}

.data-source b {
  font-size: 13px;
  margin-top: 3px;
}

.data-source small {
  color: #16a34a;
  font-size: 8px;
  margin-top: 2px;
}

.explain-box {
  margin-top: 15px;
  padding: 12px;
  display: flex;
  gap: 10px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 9px;
  color: #9a3412;
}

.explain-box b {
  font-size: 10px;
}

.explain-box ul {
  margin: 7px 0 0;
  padding-left: 17px;
  font-size: 9px;
  line-height: 1.7;
}

.prototype-note,
.technical-note {
  margin-top: 12px;
  padding: 10px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e5eaf1;
  color: #718096;
  font-size: 8px;
  line-height: 1.5;
}

.prototype-note b,
.technical-note b {
  color: #475569;
}

.input-list {
  margin-top: 5px;
}

.risk-evolution {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.evolution-card {
  border: 1px solid #e4e9f0;
  padding: 14px;
  border-radius: 9px;
}

.evolution-card.selected {
  border-color: #7dd3fc;
  background: #f0f9ff;
}

.evolution-card > span,
.evolution-card > small {
  display: block;
  color: #8290a2;
  font-size: 8px;
}

.evolution-card strong {
  display: block;
  font-size: 24px;
  margin: 5px 0;
}

/* TWO COLUMN */

.two-column {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.table {
  width: 100%;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: 1.3fr .6fr .8fr .8fr;
  align-items: center;
  gap: 10px;
  padding: 10px 7px;
  border-bottom: 1px solid #edf1f5;
  font-size: 9px;
}

.table-head {
  color: #8a96a8;
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
}

.table-row b {
  font-size: 10px;
}

.impact-list {
  display: flex;
  flex-direction: column;
}

.impact-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 12px 3px;
  border-bottom: 1px solid #edf1f5;
}

.impact-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
}

.impact-status.danger {
  background: #ef4444;
}

.impact-item b,
.impact-item span {
  display: block;
}

.impact-item b {
  font-size: 10px;
}

.impact-item span {
  color: #7e8a9b;
  font-size: 8px;
  margin-top: 2px;
}

.timeline-horizontal {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  position: relative;
}

.timeline-stage {
  padding: 15px;
  border-top: 3px solid #dce3ec;
  position: relative;
}

.timeline-stage.complete {
  border-top-color: #0ea5e9;
}

.stage-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #cbd5e1;
  position: absolute;
  top: -8px;
}

.timeline-stage.complete .stage-dot {
  background: #0ea5e9;
}

.timeline-stage b,
.timeline-stage span,
.timeline-stage small {
  display: block;
}

.timeline-stage b {
  font-size: 11px;
}

.timeline-stage span {
  font-size: 10px;
  color: #2563eb;
  margin-top: 3px;
}

.timeline-stage small {
  color: #8a96a7;
  font-size: 8px;
  margin-top: 4px;
}

/* EVACUATION */

.evacuation-grid {
  display: grid;
  grid-template-columns: 1.6fr .8fr;
  gap: 15px;
}

.route-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.route-status {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #15803d;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  padding: 10px;
  border-radius: 8px;
  font-size: 10px;
}

.route-stat {
  display: flex;
  justify-content: space-between;
  padding: 9px 2px;
  border-bottom: 1px solid #edf1f5;
  font-size: 9px;
}

.route-stat span {
  color: #7b8799;
}

.warning-box {
  margin-top: 12px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
  border-radius: 8px;
  padding: 9px;
  display: flex;
  gap: 8px;
  font-size: 8px;
  line-height: 1.5;
}

.shelter-mini {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 0;
  border-bottom: 1px solid #edf1f5;
}

.shelter-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}

.shelter-icon.large {
  width: 40px;
  height: 40px;
}

.shelter-mini > div:nth-child(2) {
  flex: 1;
}

.shelter-mini b,
.shelter-mini span {
  display: block;
}

.shelter-mini b {
  font-size: 10px;
}

.shelter-mini span {
  color: #8793a5;
  font-size: 8px;
  margin-top: 2px;
}

.capacity {
  color: #15803d !important;
  font-weight: 800;
}

/* PREVENTIVE */

.zone-list,
.reason-list {
  display: flex;
  flex-direction: column;
}

.zone-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 7px;
  border-bottom: 1px solid #edf1f5;
}

.zone-indicator {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.zone-item.critical .zone-indicator {
  background: #dc2626;
}

.zone-item.high .zone-indicator {
  background: #f97316;
}

.zone-item.moderate .zone-indicator {
  background: #eab308;
}

.zone-item.safe .zone-indicator {
  background: #22c55e;
}

.zone-item > div:nth-child(2) {
  flex: 1;
}

.zone-item b,
.zone-item span {
  display: block;
}

.zone-item b {
  font-size: 10px;
}

.zone-item span {
  color: #8793a5;
  font-size: 8px;
  margin-top: 2px;
}

.zone-item strong {
  font-size: 11px;
}

.reason-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 2px;
  border-bottom: 1px solid #edf1f5;
}

.reason-icon {
  width: 29px;
  height: 29px;
  background: #f1f5f9;
  border-radius: 7px;
  color: #475569;
  display: flex;
  justify-content: center;
  align-items: center;
}

.reason-row span {
  flex: 1;
  font-size: 9px;
  color: #5d6b7f;
}

.reason-row b {
  font-size: 11px;
}

.privacy-panel {
  display: flex;
  gap: 10px;
  background: #f8fafc;
}

.privacy-panel > svg {
  color: #2563eb;
  flex-shrink: 0;
}

.privacy-panel b {
  font-size: 10px;
}

.privacy-panel p {
  margin: 4px 0 0;
  color: #778498;
  font-size: 8px;
  line-height: 1.5;
}

/* INCIDENTS */

.incident-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.severity-card {
  padding: 17px;
  border-radius: 10px;
  border: 1px solid;
}

.severity-card span,
.severity-card b,
.severity-card small {
  display: block;
}

.severity-card span {
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .8px;
}

.severity-card b {
  font-size: 27px;
  margin: 3px 0;
}

.severity-card small {
  font-size: 8px;
}

.severity-card.critical {
  background: #fef2f2;
  border-color: #fecaca;
  color: #b91c1c;
}

.severity-card.urgent {
  background: #fff7ed;
  border-color: #fed7aa;
  color: #c2410c;
}

.severity-card.monitoring {
  background: #f8fafc;
  border-color: #e2e8f0;
  color: #475569;
}

.incident-list {
  display: flex;
  flex-direction: column;
}

.incident-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 4px;
  border-bottom: 1px solid #edf1f5;
}

.incident-severity {
  width: 37px;
  height: 37px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.incident-severity.critical {
  background: #fee2e2;
  color: #dc2626;
}

.incident-severity.urgent {
  background: #ffedd5;
  color: #ea580c;
}

.incident-info {
  flex: 1;
}

.incident-title {
  display: flex;
  gap: 7px;
  align-items: center;
}

.incident-title b {
  font-size: 10px;
}

.incident-info > strong,
.incident-info > span {
  display: block;
}

.incident-info > strong {
  font-size: 10px;
  margin-top: 4px;
}

.incident-info > span {
  color: #8793a5;
  font-size: 8px;
  margin-top: 3px;
}

.status-pill,
.team-status {
  font-size: 7px;
  font-weight: 900;
  padding: 3px 6px;
  border-radius: 4px;
}

.status-pill.new {
  background: #fee2e2;
  color: #b91c1c;
}

.status-pill.assigned {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-pill.en-route {
  background: #fef3c7;
  color: #a16207;
}

.outline-button {
  background: white;
  border: 1px solid #dce3eb;
  color: #526176;
  padding: 7px 10px;
  border-radius: 6px;
  font-size: 8px;
  cursor: pointer;
}

/* RESCUE */

.team-list,
.dispatch-list {
  display: flex;
  flex-direction: column;
}

.team-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 3px;
  border-bottom: 1px solid #edf1f5;
}

.team-avatar {
  width: 35px;
  height: 35px;
  background: #eff6ff;
  color: #2563eb;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.team-info {
  flex: 1;
}

.team-info b,
.team-info span {
  display: block;
}

.team-info b {
  font-size: 10px;
}

.team-info span {
  color: #8793a5;
  font-size: 8px;
  margin-top: 2px;
}

.team-location {
  color: #768398;
  font-size: 8px;
  display: flex;
  align-items: center;
  gap: 3px;
}

.team-status.available {
  background: #dcfce7;
  color: #15803d;
}

.team-status.en-route {
  background: #fef3c7;
  color: #a16207;
}

.dispatch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 3px;
  border-bottom: 1px solid #edf1f5;
}

.dispatch-item b,
.dispatch-item span {
  display: block;
}

.dispatch-item b {
  font-size: 10px;
}

.dispatch-item span {
  color: #dc2626;
  font-size: 8px;
  font-weight: 800;
  margin-top: 3px;
}

.eta {
  color: #475569;
  font-size: 9px;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* SHELTERS */

.shelter-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.shelter-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.shelter-card-head h3 {
  margin: 0;
  font-size: 13px;
}

.shelter-card-head span {
  display: block;
  color: #8793a5;
  font-size: 8px;
  margin-top: 3px;
}

.occupancy {
  margin-top: 20px;
}

.occupancy > div:first-child {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 9px;
}

.occupancy span {
  color: #8290a2;
}

.resource-list {
  margin-top: 15px;
}

.resource-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #edf1f5;
  font-size: 9px;
}

.resource-row span {
  color: #718096;
}

.danger-text {
  color: #dc2626 !important;
}

/* RELIEF */

.relief-banner {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  padding: 12px 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #1d4ed8;
}

.relief-banner b,
.relief-banner span {
  display: block;
}

.relief-banner b {
  font-size: 10px;
}

.relief-banner span {
  font-size: 8px;
  color: #64748b;
  margin-top: 2px;
}

.relief-stat {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #edf1f5;
}

.relief-stat span {
  color: #7b8799;
  font-size: 9px;
}

.relief-stat b {
  font-size: 16px;
}

.relief-need {
  margin-top: 15px;
}

.relief-need-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.relief-need-head b,
.relief-need-head span {
  display: block;
}

.relief-need-head b {
  font-size: 9px;
}

.relief-need-head span {
  color: #8b97a7;
  font-size: 8px;
  margin-top: 2px;
}

.relief-need-head strong {
  font-size: 10px;
}

.impact-tracking {
  margin-bottom: 15px;
}

.impact-number {
  font-size: 28px;
  font-weight: 900;
}

.impact-tracking > span {
  color: #8591a3;
  font-size: 8px;
}

.tracking-line {
  display: flex;
  justify-content: space-between;
  margin-top: 15px;
  margin-bottom: 5px;
  font-size: 8px;
}

.tracking-line span {
  color: #758296;
}

/* WORKFLOW */

.workflow {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}

.workflow-step {
  border: 1px solid #e2e8f0;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
}

.workflow-step span,
.workflow-step b {
  display: block;
}

.workflow-step span {
  color: #0ea5e9;
  font-size: 8px;
  font-weight: 900;
}

.workflow-step b {
  font-size: 9px;
  margin-top: 4px;
}

/* CITIZEN */

.citizen-layout {
  display: grid;
  grid-template-columns: .9fr 1.1fr;
  gap: 15px;
}

.sos-header {
  display: flex;
  align-items: center;
  gap: 13px;
}

.sos-symbol {
  width: 58px;
  height: 58px;
  border-radius: 12px;
  background: #fee2e2;
  color: #dc2626;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sos-header h2 {
  margin: 4px 0;
  font-size: 21px;
}

.sos-header p {
  margin: 0;
  color: #7c899a;
  font-size: 9px;
}

.citizen-details {
  margin-top: 22px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.citizen-details div {
  background: #f8fafc;
  padding: 10px;
  border-radius: 7px;
}

.citizen-details span,
.citizen-details b {
  display: block;
}

.citizen-details span {
  color: #8591a3;
  font-size: 8px;
}

.citizen-details b {
  font-size: 10px;
  margin-top: 3px;
}

.sos-button {
  width: 100%;
  margin-top: 20px;
  height: 55px;
  border: 0;
  border-radius: 10px;
  background: #dc2626;
  color: white;
  font-weight: 900;
  letter-spacing: 1px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.sos-button:hover {
  background: #b91c1c;
}

.sos-button.sent {
  background: #16a34a;
}

.sos-confirmation {
  margin-top: 12px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #15803d;
  border-radius: 8px;
  padding: 10px;
  display: flex;
  gap: 8px;
}

.sos-confirmation b,
.sos-confirmation span {
  display: block;
}

.sos-confirmation b {
  font-size: 9px;
}

.sos-confirmation span {
  font-size: 8px;
  margin-top: 2px;
}

.communication-flow {
  display: flex;
  align-items: center;
  gap: 7px;
  overflow-x: auto;
  padding-bottom: 10px;
}

.communication-step {
  min-width: 125px;
  padding: 12px;
  border: 1px solid #e3e8ef;
  border-radius: 8px;
  text-align: center;
}

.communication-step > div {
  width: 34px;
  height: 34px;
  margin: auto;
  border-radius: 50%;
  background: #f1f5f9;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
}

.communication-step.active > div {
  background: #dbeafe;
  color: #2563eb;
}

.communication-step b,
.communication-step span {
  display: block;
}

.communication-step b {
  font-size: 9px;
  margin-top: 7px;
}

.communication-step span {
  color: #8793a5;
  font-size: 7px;
  margin-top: 3px;
}

.offline-box {
  margin-top: 17px;
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e3e8ef;
  display: flex;
  gap: 9px;
}

.offline-box > svg {
  color: #64748b;
  flex-shrink: 0;
}

.offline-box b,
.offline-box p {
  display: block;
}

.offline-box b {
  font-size: 9px;
}

.offline-box p {
  color: #7d899b;
  font-size: 8px;
  line-height: 1.5;
  margin: 3px 0 0;
}

/* RESPONSIVE */

@media (max-width: 1250px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .dashboard-grid,
  .prediction-layout,
  .evacuation-grid,
  .citizen-layout {
    grid-template-columns: 1fr;
  }

  .right-column {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .shelter-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .workflow {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform .2s ease;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .mobile-close,
  .menu-button {
    display: flex;
  }

  .main {
    margin-left: 0;
    width: 100%;
  }

  .topbar {
    padding: 0 15px;
  }

  .user {
    display: none;
  }

  .content {
    padding: 18px 15px 35px;
  }

  .hero {
    flex-direction: column;
    gap: 15px;
  }

  .scenario-control {
    width: 100%;
    justify-content: space-between;
  }

  .bottom-grid,
  .two-column {
    grid-template-columns: 1fr;
  }

  .right-column {
    display: flex;
  }
}

@media (max-width: 650px) {
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }

  .source-grid,
  .risk-evolution,
  .incident-summary,
  .shelter-grid {
    grid-template-columns: 1fr;
  }

  .impact-grid {
    grid-template-columns: 1fr 1fr;
  }

  .workflow {
    grid-template-columns: 1fr 1fr;
  }

  .topbar h1 {
    font-size: 14px;
  }

  .topbar p {
    display: none;
  }

  .network-toggle {
    padding: 6px;
  }

  .network-toggle {
    font-size: 0;
  }

  .network-toggle svg {
    width: 16px;
  }

  .hero h2,
  .page-heading h2 {
    font-size: 21px;
  }

  .map-container {
    height: 370px;
  }

  .map-container.large {
    height: 420px;
  }

  .big-risk {
    flex-direction: column;
    align-items: flex-start;
  }

  .table {
    overflow-x: auto;
  }

  .table-head,
  .table-row {
    min-width: 500px;
  }

  .timeline-horizontal {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .timeline-stage {
    border-top: 0;
    border-left: 3px solid #dce3ec;
  }

  .timeline-stage.complete {
    border-left-color: #0ea5e9;
  }

  .stage-dot {
    left: -8px;
    top: 15px;
  }

  .communication-flow {
    align-items: stretch;
  }

  .communication-flow > svg {
    display: none;
  }

  .communication-step {
    min-width: 105px;
  }
}
`;

export default App;

