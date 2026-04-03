import { useLocation, useNavigate } from "react-router-dom";
import type { ComparePlansSimulationSnapshot } from "./ComparePlans";

type AiAssistantLocationState = {
  comparePlansReturn?: ComparePlansSimulationSnapshot;
};

export function AiAssistantComingSoon() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnSnapshot = (location.state as AiAssistantLocationState | null)
    ?.comparePlansReturn;

  return (
    <div
      style={{
        fontFamily: "'DM Sans','Helvetica Neue',sans-serif",
        minHeight: "100vh",
        width: "100%",
        background: "linear-gradient(160deg,#eef2ff 0%,#f7f7fb 60%)",
        padding: "24px 24px 40px",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "40px 32px",
            boxShadow:
              "0 24px 60px rgba(79,70,229,0.12), 0 4px 16px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#6366f1",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            AI assistant
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: "#1a1a2e",
              letterSpacing: "-0.03em",
              margin: "0 0 12px",
            }}
          >
            Coming soon
          </h1>
          <p style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.6, margin: "0 0 28px" }}>
            We&apos;re building a conversational guide to help you choose and
            understand coverage. Check back shortly.
          </p>
          <button
            type="button"
            onClick={() => {
              if (returnSnapshot) {
                navigate("/compare-plans", {
                  state: { restoreSimulation: returnSnapshot },
                });
              } else {
                navigate("/compare-plans");
              }
            }}
            style={{
              width: "100%",
              padding: 14,
              background: "#0f0f1a",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
