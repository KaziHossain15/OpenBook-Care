import { useEffect, useLayoutEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CoverageEligibilityCallouts } from "../components/CoverageEligibilityCallouts";
import {
  DEFAULT_PREFERENCES,
  deserializePreferences,
  type UserPreferences,
} from "../models/UserPreferences";
import { apiUrl } from "../../lib/apiUrl";

function loadStoredPreferences(): UserPreferences {
  try {
    const raw = sessionStorage.getItem("userPreferences");
    if (raw) return deserializePreferences(raw);
  } catch {
    /* ignore */
  }
  return DEFAULT_PREFERENCES;
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Copays {
  primary: number;
  specialist: number;
  rx: string;
}

interface Plan {
  planId: string;
  planType: string;
  name: string;
  provider: string;
  premium: number;
  deductible: number;
  oopMax: number;
  networkSize: string;
  copays: Copays;
  features: string[];
  gradient: string;
  accent: string;
  riskDrivers: string[];
}

// ── Static data ──────────────────────────────────────────────────────────────

const STATIC_PLANS: Plan[] = [
  {
    planId: "p1", planType: "Basic",
    name: "HealthFirst Essential", provider: "HealthFirst",
    premium: 295, deductible: 3000, oopMax: 8500,
    networkSize: "15,000+ providers",
    copays: { primary: 40, specialist: 80, rx: "$20/$60/$100" },
    features: ["Telehealth", "Preventive care", "Emergency services", "Lab work"],
    gradient: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
    accent: "#6366f1",
    riskDrivers: ["High deductible", "Moderate network"],
  },
  {
    planId: "p2", planType: "Silver",
    name: "United Health Silver", provider: "UnitedHealth",
    premium: 425, deductible: 1500, oopMax: 6000,
    networkSize: "28,000+ providers",
    copays: { primary: 25, specialist: 50, rx: "$10/$40/$80" },
    features: ["Telehealth", "Preventive care", "Emergency services", "Lab work", "Mental health"],
    gradient: "linear-gradient(135deg, #0EA5E9 0%, #6366F1 100%)",
    accent: "#0ea5e9",
    riskDrivers: ["Moderate premium", "Large network"],
  },
  {
    planId: "p3", planType: "Gold",
    name: "BlueCross Gold Plus", provider: "BlueCross",
    premium: 580, deductible: 500, oopMax: 3500,
    networkSize: "40,000+ providers",
    copays: { primary: 15, specialist: 35, rx: "$5/$25/$50" },
    features: ["Telehealth", "Preventive care", "Emergency services", "Lab work", "Mental health", "Dental & Vision"],
    gradient: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
    accent: "#f59e0b",
    riskDrivers: ["High premium", "Low out-of-pocket risk"],
  },
];

const DEPENDENT_MULTIPLIERS: Record<number, number> = { 0: 1.0, 1: 1.28, 2: 1.52, 3: 1.75 };
const DEPENDENT_LABELS: Record<number, string> = {
  0: "No additional dependents", 1: "+ 1 dependent",
  2: "+ 2 dependents", 3: "+ 3 dependents",
};

const fmt = (n: number) => "$" + Math.round(n).toLocaleString();

// Scoped styles — only the range input overrides and the spinner animation.
// The global reset that was in the original file has been removed to avoid
// wiping the rest of the site's styles.
const SCOPED_STYLE = `
  @keyframes cp-spin { to { transform: rotate(360deg); } }
  .cp-range { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; border-radius: 3px; background: #e5e7eb; outline: none; cursor: pointer; }
  .cp-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #1a1a2e; cursor: pointer; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
`;

// ── Sub-components ───────────────────────────────────────────────────────────

interface DonutSegment { value: number; color: string; }

function DonutChart({ segments }: { segments: DonutSegment[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 60, cx = 80, cy = 80, sw = 28;
  const circ = 2 * Math.PI * r;
  let cum = 0;
  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      {segments.map((seg, i) => {
        const frac = seg.value / total;
        const offset = circ * (1 - cum);
        const dash = circ * frac;
        cum += frac;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth={sw}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={offset}
            style={{ transform: "rotate(-90deg)", transformOrigin: "80px 80px" }}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={r - sw / 2 - 2} fill="#fff" />
    </svg>
  );
}

interface PlanCardProps {
  plan: Plan;
  multiplier: number;
  isCenter: boolean;
  onViewDetail: () => void;
}

function PlanCard({ plan, multiplier, isCenter, onViewDetail }: PlanCardProps) {
  const adj = (v: number) => Math.round(v * multiplier);
  return (
    <div style={{
      transform: isCenter ? "scale(1)" : "scale(0.93)",
      opacity: isCenter ? 1 : 0.6,
      transition: "all 0.35s cubic-bezier(0.34,1.56,0.64,1)",
      minWidth: 340, maxWidth: 380, width: "100%", borderRadius: 20,
      background: "#fff",
      boxShadow: isCenter ? "0 24px 60px rgba(79,70,229,0.18), 0 4px 16px rgba(0,0,0,0.08)" : "0 4px 20px rgba(0,0,0,0.06)",
      overflow: "hidden", cursor: isCenter ? "default" : "pointer",
      flexShrink: 0, position: "relative", zIndex: isCenter ? 2 : 1,
    }}>
      {/* Header */}
      <div style={{ background: plan.gradient, padding: "28px 28px 24px", position: "relative" }}>
        <span style={{
          position: "absolute", top: 18, right: 18,
          background: "rgba(255,255,255,0.22)", backdropFilter: "blur(8px)",
          color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
          padding: "4px 12px", borderRadius: 20, textTransform: "uppercase",
        }}>{plan.planType}</span>
        <div style={{ color: "#fff", fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>{plan.name}</div>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4, fontWeight: 500 }}>{plan.provider}</div>
      </div>

      {/* Premium + Deductible */}
      <div style={{ display: "flex", borderBottom: "1px solid #f1f1f5", padding: "12px 12px 0", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0, padding: "16px 18px", background: "#eef2ff", borderRadius: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6, minHeight: 20 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#6366f1", letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Monthly Premium</span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: "#1a1a2e", letterSpacing: "0", whiteSpace: "nowrap" }}>{fmt(adj(plan.premium))}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: "16px 18px", background: "#fffbeb", borderRadius: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, minHeight: 20 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" style={{ flexShrink: 0 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#d97706", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Deductible</span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: "#1a1a2e", letterSpacing: "0", whiteSpace: "nowrap" }}>{fmt(adj(plan.deductible))}</div>
        </div>
      </div>

      {/* OOP Max */}
      <div style={{ padding: "0 12px 12px", marginTop: 8 }}>
        <div style={{ padding: "16px 18px", borderRadius: 12, background: "#f5f3ff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" style={{ flexShrink: 0 }}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.06em", textTransform: "uppercase" }}>Out-of-Pocket Maximum</span>
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: "#1a1a2e", letterSpacing: "0", whiteSpace: "nowrap" }}>{fmt(adj(plan.oopMax))}</div>
        </div>
      </div>

      {/* Copays */}
      <div style={{ padding: "16px 22px 8px", borderBottom: "1px solid #f1f1f5" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>Network Size</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{plan.networkSize}</span>
        </div>
        {[
          { icon: "👤", label: "Primary Care Copay", value: fmt(plan.copays.primary) },
          { icon: "🩺", label: "Specialist Copay", value: fmt(plan.copays.specialist) },
          { icon: "💊", label: "Prescription Coverage", value: plan.copays.rx },
        ].map(({ icon, label, value }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid #f8f8fa" }}>
            <span style={{ fontSize: 13, color: "#6b7280", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12 }}>{icon}</span>{label}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Features */}
      <div style={{ padding: "16px 22px 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", marginBottom: 12 }}>Key Features</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 8px" }}>
          {plan.features.map((f) => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={plan.accent} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              {f}
            </div>
          ))}
        </div>
      </div>

      {isCenter && (
        <div style={{ padding: "0 22px 22px" }}>
          <button onClick={onViewDetail}
            style={{ width: "100%", padding: "14px", background: "#0f0f1a", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = plan.accent)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#0f0f1a")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            View Detailed Simulation
          </button>
        </div>
      )}
    </div>
  );
}

interface NavButtonProps {
  onClick: () => void;
  disabled: boolean;
  side: "left" | "right";
  children: React.ReactNode;
}

function NavButton({ onClick, disabled, side, children }: NavButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      position: "absolute", [side]: 0, top: "50%", transform: "translateY(-60%)", zIndex: 100,
      width: 40, height: 40, borderRadius: "50%", background: "#fff", border: "1.5px solid #e5e7eb",
      cursor: disabled ? "not-allowed" : "pointer",
      boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
      display: "flex", alignItems: "center", justifyContent: "center",
      opacity: disabled ? 0.3 : 1, transition: "opacity 0.2s",
      padding: 0, lineHeight: 1, overflow: "hidden",
    }}>
      {children}
    </button>
  );
}

// ── Main page component ──────────────────────────────────────────────────────

// GRASP: Controller
// ComparePlans owns all state for the compare + detail views and delegates
// rendering to the sub-components above. Navigation calls are isolated here.

/** Serialized when opening AI assistant so return navigation can reopen the simulation. */
export interface ComparePlansSimulationSnapshot {
  activeIndex: number;
  dependents: number;
  primaryVisits: number;
  specialistVisits: number;
  prescriptions: number;
  erVisits: number;
}

export function ComparePlans() {
  const navigate = useNavigate();
  const location = useLocation();

  const [preferences] = useState<UserPreferences>(loadStoredPreferences);

  const [plans, setPlans] = useState<Plan[]>(STATIC_PLANS);

  useEffect(() => {
    const region = preferences.zipCode ?? "";
    fetch(apiUrl(`/api/plans?zip=${encodeURIComponent(region)}`))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Plan[]>;
      })
      .then(setPlans)
      .catch(() => {
        // CMS API unavailable — keep STATIC_PLANS already in state
      });
  }, [preferences.zipCode]);

  const [activeIndex, setActiveIndex] = useState(1);
  const [dependents, setDependents] = useState(0);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [primaryVisits, setPrimaryVisits] = useState(4);
  const [specialistVisits, setSpecialistVisits] = useState(2);
  const [prescriptions, setPrescriptions] = useState(3);
  const [erVisits, setErVisits] = useState(0);

  const multiplier = DEPENDENT_MULTIPLIERS[dependents];
  const plan = plans[activeIndex];

  const handleDependentChange = (val: string) => {
    const n = Number(val);
    if (n === dependents) return;
    setIsRecalculating(true);
    setTimeout(() => { setDependents(n); setIsRecalculating(false); }, 600);
  };

  // Detail page cost calculations
  const annualPremium = Math.round(plan.premium * 12 * multiplier);
  const primaryCost = primaryVisits * plan.copays.primary;
  const specialistCost = specialistVisits * plan.copays.specialist;
  const rxCost = prescriptions * 360;
  const erCost = erVisits * 800;
  const estimatedOOP = Math.min(primaryCost + specialistCost + rxCost + erCost, Math.round(plan.oopMax * multiplier));
  const totalAnnual = annualPremium + estimatedOOP;
  const monthlyAvg = Math.round(totalAnnual / 12);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "instant" });

  useLayoutEffect(() => {
    const restore = (
      location.state as { restoreSimulation?: ComparePlansSimulationSnapshot } | null
    )?.restoreSimulation;
    if (!restore) return;

    const maxPlan = plans.length - 1;
    setActiveIndex(Math.min(Math.max(0, restore.activeIndex), maxPlan));
    setDependents(Math.min(3, Math.max(0, restore.dependents)));
    setPrimaryVisits(restore.primaryVisits);
    setSpecialistVisits(restore.specialistVisits);
    setPrescriptions(restore.prescriptions);
    setErVisits(restore.erVisits);
    setShowDetail(true);
    window.scrollTo({ top: 0, behavior: "instant" });
    navigate(".", { replace: true, state: {} });
  }, [location.key, location.state, navigate]);

  // ── Detail / Cost Simulation view ─────────────────────────────────────────
  if (showDetail) {
    return (
      <div style={{ fontFamily: "'DM Sans','Helvetica Neue',sans-serif", minHeight: "100vh", width: "100%", background: "linear-gradient(160deg,#eef2ff 0%,#f7f7fb 60%)", padding: "24px 24px 40px", boxSizing: "border-box" }}>
        <style>{SCOPED_STYLE}</style>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          {/* Top bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
            <button onClick={() => { setShowDetail(false); scrollToTop(); }} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#6b7280", padding: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              Back to Comparison
            </button>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#9ca3af", letterSpacing: "0.04em" }}>Step 3 of 3</div>
          </div>

          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: "#1a1a2e", letterSpacing: "-0.03em" }}>Cost Simulation</h1>
            <p style={{ fontSize: 15, color: "#6b7280", marginTop: 6 }}>Estimate your annual healthcare costs with {plan.name}</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

            {/* LEFT */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Plan summary */}
              <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
                <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f1f5" }}>
                  <div style={{ fontWeight: 800, fontSize: 17, color: "#1a1a2e" }}>{plan.name}</div>
                  <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 3 }}>{plan.provider} · {plan.planType} Coverage</div>
                </div>
                <div style={{ display: "flex", padding: "12px 12px 0", gap: 8 }}>
                  <div style={{ flex: 1, padding: "16px 20px", background: "#eef2ff", borderRadius: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, whiteSpace: "nowrap" }}>Monthly Premium</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#1a1a2e" }}>{fmt(plan.premium * multiplier)}</div>
                  </div>
                  <div style={{ flex: 1, padding: "16px 20px", background: "#fffbeb", borderRadius: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, whiteSpace: "nowrap" }}>Deductible</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#1a1a2e" }}>{fmt(plan.deductible * multiplier)}</div>
                  </div>
                </div>
                <div style={{ padding: "8px 12px 12px" }}>
                  <div style={{ padding: "16px 20px", background: "#f5f3ff", borderRadius: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Out-of-Pocket Maximum</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#1a1a2e" }}>{fmt(plan.oopMax * multiplier)}</div>
                  </div>
                </div>
              </div>

              {/* Donut breakdown */}
              <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#1a1a2e", marginBottom: 4 }}>Annual Cost Breakdown</div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>Estimated total healthcare expenses</div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                  <DonutChart segments={[
                    { value: annualPremium, color: "#6366f1" },
                    { value: Math.round(plan.deductible * 0.5 * multiplier), color: "#f59e0b" },
                    { value: estimatedOOP, color: "#a78bfa" },
                  ]} />
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
                  {([ ["#6366f1","Annual Premium"],["#f59e0b","Deductible"],["#a78bfa","Out-of-Pocket Costs"] ] as [string,string][]).map(([color, label]) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151" }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
                      {label}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTop: "1px solid #f1f1f5" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>Total Estimated Annual Cost</span>
                  <span style={{ fontSize: 22, fontWeight: 900, color: "#1a1a2e" }}>{fmt(totalAnnual)}</span>
                </div>
                <div style={{ marginTop: 12, padding: "12px 14px", background: "#eef2ff", borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" style={{ marginTop: 1, flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span style={{ fontSize: 12, color: "#4338ca", lineHeight: 1.5 }}>This is an estimate based on your expected healthcare usage. Actual costs may vary.</span>
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Sliders */}
              <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#1a1a2e", marginBottom: 4 }}>Simulate Your Healthcare Usage</div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 24 }}>Adjust the sliders to estimate your annual healthcare costs</div>
                {([
                  { label: "Primary Care Doctor Visits", value: primaryVisits, set: setPrimaryVisits, max: 20, unit: "visits", cost: fmt(primaryVisits * plan.copays.primary), note: `$${plan.copays.primary} copay per visit` },
                  { label: "Specialist Visits", value: specialistVisits, set: setSpecialistVisits, max: 12, unit: "visits", cost: fmt(specialistVisits * plan.copays.specialist), note: `$${plan.copays.specialist} copay per visit` },
                  { label: "Monthly Prescriptions", value: prescriptions, set: setPrescriptions, max: 10, unit: "medications", cost: fmt(prescriptions * 360), note: "Estimated annual cost" },
                  { label: "Emergency Room Visits", value: erVisits, set: setErVisits, max: 5, unit: "visits", cost: fmt(erVisits * 800), note: "Estimated cost" },
                ] as { label: string; value: number; set: (v: number) => void; max: number; unit: string; cost: string; note: string }[]).map(({ label, value, set, max, unit, cost, note }) => (
                  <div key={label} style={{ marginBottom: 22 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>{label}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>{value} {unit}</span>
                    </div>
                    <input className="cp-range" type="range" min={0} max={max} value={value} onChange={(e) => set(Number(e.target.value))} />
                    <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>Estimated cost: {cost} ({note})</div>
                  </div>
                ))}
              </div>

              {/* Cost summary */}
              <div style={{ background: "#f0fdf4", borderRadius: 16, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: "1px solid #bbf7d0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                  <span style={{ fontWeight: 800, fontSize: 16, color: "#1a1a2e" }}>Cost Summary</span>
                </div>
                {[
                  { label: "Annual Premiums", value: fmt(annualPremium) },
                  { label: "Estimated Out-of-Pocket", value: fmt(estimatedOOP) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #dcfce7" }}>
                    <span style={{ fontSize: 14, color: "#374151" }}>{label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>{value}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0 8px" }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "#1a1a2e" }}>Total Annual Cost</span>
                  <span style={{ fontSize: 24, fontWeight: 900, color: "#16a34a" }}>{fmt(totalAnnual)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "#6b7280" }}>Monthly Average</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{fmt(monthlyAvg)}</span>
                </div>
              </div>

              {/* CTA buttons */}
              <button
                type="button"
                onClick={() => {
                  const comparePlansReturn: ComparePlansSimulationSnapshot = {
                    activeIndex,
                    dependents,
                    primaryVisits,
                    specialistVisits,
                    prescriptions,
                    erVisits,
                  };
                  navigate("/ai-assistant", {
                    state: {
                      comparePlansReturn,
                      chatContext: {
                        currentView: "cost-simulation",
                        source: "compare-plans",
                        userInputs: {
                          age: preferences.age,
                          income: preferences.income,
                          zipCode: preferences.zipCode,
                          familySize: preferences.familySize,
                          employmentStatus: preferences.employmentStatus,
                          riskTolerance: preferences.riskTolerance,
                          dependents,
                          primaryVisits,
                          specialistVisits,
                          prescriptions,
                          erVisits,
                        },
                        currentPlan: {
                          name: plan.name,
                          provider: plan.provider,
                          planType: plan.planType,
                          premium: Math.round(plan.premium * multiplier),
                          deductible: Math.round(plan.deductible * multiplier),
                          oopMax: Math.round(plan.oopMax * multiplier),
                          primaryCopay: plan.copays.primary,
                          specialistCopay: plan.copays.specialist,
                          prescriptionCoverage: plan.copays.rx,
                        },
                        simulationSummary: {
                          annualPremium,
                          estimatedOutOfPocket: estimatedOOP,
                          totalAnnualCost: totalAnnual,
                          monthlyAverage: monthlyAvg,
                        },
                        selectedPlans: plans.map((candidate) => ({
                          name: candidate.name,
                          estimatedYearlyCostMin: Math.round(
                            candidate.premium * 12 * multiplier,
                          ),
                          estimatedYearlyCostMax: Math.round(
                            candidate.premium * 12 * multiplier +
                              candidate.oopMax * multiplier,
                          ),
                        })),
                      },
                    },
                  });
                }}
                style={{ width: "100%", padding: 16, background: "#0f0f1a", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Talk to AI Assistant
              </button>
              <button onClick={() => setShowDetail(false)} style={{ width: "100%", padding: 16, background: "#fff", color: "#1a1a2e", border: "1.5px solid #e5e7eb", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                Compare Other Plans
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Compare Plans view ────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'DM Sans','Helvetica Neue',sans-serif", minHeight: "100vh", width: "100%", background: "linear-gradient(160deg,#eef2ff 0%,#f7f7fb 60%)", padding: "24px 16px 40px", boxSizing: "border-box" }}>
      <style>{SCOPED_STYLE}</style>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <button
            onClick={() => navigate("/")}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#6b7280", padding: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Back
          </button>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#9ca3af", letterSpacing: "0.04em" }}>Step 2 of 3</div>
        </div>

        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 34, fontWeight: 900, color: "#1a1a2e", letterSpacing: "-0.03em" }}>Compare Plans Side-by-Side</h1>
          <p style={{ fontSize: 15, color: "#6b7280", marginTop: 8 }}>Swipe through plans to find the best value for your needs</p>
        </div>

        <CoverageEligibilityCallouts
          preferences={preferences}
          className="mb-6 max-w-[720px] mx-auto text-left"
        />

        {/* Simulate Changes */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 28, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span style={{ fontWeight: 800, fontSize: 15, color: "#1a1a2e" }}>Simulate Changes</span>
          </div>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px 28px" }}>See how costs change when adding dependents</p>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Add Additional Dependents</div>
          <div style={{ position: "relative" }}>
            <select value={dependents} onChange={(e) => handleDependentChange(e.target.value)}
              style={{ width: "100%", padding: "12px 40px 12px 16px", border: "1.5px solid #e5e7eb", borderRadius: 10, fontSize: 14, fontWeight: 500, color: "#1a1a2e", background: "#fff", appearance: "none", cursor: "pointer", outline: "none", fontFamily: "inherit" }}>
              {Object.entries(DEPENDENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <svg style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        {isRecalculating && (
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#ede9fe", padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, color: "#7c3aed" }}>
              <div style={{ width: 12, height: 12, border: "2px solid #c4b5fd", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "cp-spin 0.6s linear infinite" }} />
              Recalculating estimates…
            </div>
          </div>
        )}

        {/* Carousel */}
        <div style={{ position: "relative", paddingLeft: 48, paddingRight: 48, overflow: "visible" }}>
          <div style={{ overflow: "visible" }}>
            <div style={{ display: "flex", gap: 20, justifyContent: "center", alignItems: "flex-start", padding: "12px 0 24px" }}>
              {plans.map((p, i) => (
                <div key={p.planId} onClick={() => i !== activeIndex && setActiveIndex(i)} style={{ flexShrink: 0 }}>
                  <PlanCard plan={p} multiplier={multiplier} isCenter={i === activeIndex} onViewDetail={() => { setShowDetail(true); scrollToTop(); }} />
                </div>
              ))}
            </div>
          </div>

          <NavButton onClick={() => setActiveIndex((i) => Math.max(0, i - 1))} disabled={activeIndex === 0} side="left">
            <span style={{ fontSize: 16, lineHeight: 1, color: "#374151", fontWeight: 900, userSelect: "none", display: "block" }}>❮</span>
          </NavButton>
          <NavButton onClick={() => setActiveIndex((i) => Math.min(plans.length - 1, i + 1))} disabled={activeIndex === plans.length - 1} side="right">
            <span style={{ fontSize: 16, lineHeight: 1, color: "#374151", fontWeight: 900, userSelect: "none", display: "block" }}>❯</span>
          </NavButton>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 4 }}>
          {plans.map((_, i) => (
            <button key={i} onClick={() => setActiveIndex(i)} style={{ width: i === activeIndex ? 24 : 8, height: 8, borderRadius: 4, background: i === activeIndex ? plans[i].accent : "#d1d5db", border: "none", padding: 0, cursor: "pointer", transition: "all 0.3s ease" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
