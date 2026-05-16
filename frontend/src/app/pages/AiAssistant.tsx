import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiUrl } from "../../lib/apiUrl";
import type { ComparePlansSimulationSnapshot } from "./ComparePlans";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  messageId: string;
  role: ChatRole;
  content: string;
};

type ChatDisclaimer = {
  text: string;
  version: string;
};

type ChatContext = {
  currentView?: string;
  source?: string;
  userInputs?: Record<string, unknown>;
  currentPlan?: Record<string, unknown>;
  simulationSummary?: Record<string, unknown>;
  selectedPlans?: Array<Record<string, unknown>>;
};

type AiAssistantLocationState = {
  comparePlansReturn?: ComparePlansSimulationSnapshot;
  chatContext?: ChatContext;
};

type CreateSessionResponse = {
  sessionId: string;
  disclaimer: ChatDisclaimer;
};

type SubmitMessageResponse = {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  providerMode: string;
  errorCode?: string;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | T
    | { message?: string; detail?: { message?: string } }
    | null;

  if (!response.ok) {
    const message =
      (payload as { detail?: { message?: string } } | null)?.detail?.message ||
      (payload as { message?: string } | null)?.message ||
      "The AI assistant is unavailable right now.";
    throw new Error(message);
  }

  return payload as T;
}

function formatCurrency(value: unknown): string | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return `$${Math.round(value).toLocaleString()}`;
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ChatMessage>;
  return (
    typeof candidate.messageId === "string" &&
    (candidate.role === "user" || candidate.role === "assistant") &&
    typeof candidate.content === "string"
  );
}

function assertSubmitMessageResponse(payload: unknown): SubmitMessageResponse {
  if (!payload || typeof payload !== "object") {
    throw new Error("The chatbot response could not be read. Please retry.");
  }

  const candidate = payload as Partial<SubmitMessageResponse>;
  if (
    !isChatMessage(candidate.userMessage) ||
    !isChatMessage(candidate.assistantMessage)
  ) {
    throw new Error("The chatbot response could not be read. Please retry.");
  }
  return candidate as SubmitMessageResponse;
}

export function AiAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

  const routeState = (location.state as AiAssistantLocationState | null) ?? null;
  const returnSnapshot = routeState?.comparePlansReturn;
  const chatContext = routeState?.chatContext ?? {};

  const currentPlanName =
    typeof chatContext.currentPlan?.name === "string"
      ? chatContext.currentPlan.name
      : "your selected plan";
  const totalAnnualCost = formatCurrency(
    chatContext.simulationSummary?.totalAnnualCost,
  );
  const monthlyAverage = formatCurrency(
    chatContext.simulationSummary?.monthlyAverage,
  );

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState<ChatDisclaimer | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isDisclaimerAcknowledged, setIsDisclaimerAcknowledged] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [providerMode, setProviderMode] = useState<string>("pending");

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  useEffect(() => {
    let cancelled = false;

    async function createSession() {
      setIsSessionLoading(true);
      setSessionError(null);

      try {
        const payload = await parseResponse<CreateSessionResponse>(
          await fetch(apiUrl("/api/chat/session"), { method: "POST" }),
        );

        if (cancelled) return;

        setSessionId(payload.sessionId);
        setDisclaimer(payload.disclaimer);
      } catch (error) {
        if (cancelled) return;
        setSessionError(
          error instanceof Error
            ? error.message
            : "Could not start the AI assistant.",
        );
      } finally {
        if (!cancelled) {
          setIsSessionLoading(false);
        }
      }
    }

    createSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function acknowledgeDisclaimer() {
    if (!sessionId || isAcknowledging) return;

    setIsAcknowledging(true);
    setSendError(null);

    try {
      await parseResponse(
        await fetch(
          apiUrl(`/api/chat/${sessionId}/acknowledge-disclaimer`),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ acknowledged: true }),
          },
        ),
      );
      setIsDisclaimerAcknowledged(true);
    } catch (error) {
      setSendError(
        error instanceof Error
          ? error.message
          : "Could not acknowledge the disclaimer.",
      );
    } finally {
      setIsAcknowledging(false);
    }
  }

  async function sendMessage(messageOverride?: string) {
    const content = (messageOverride ?? draft).trim();
    if (!content || !sessionId || !isDisclaimerAcknowledged || isSending) return;

    setIsSending(true);
    setSendError(null);

    try {
      const payload = assertSubmitMessageResponse(
        await parseResponse<SubmitMessageResponse>(
          await fetch(apiUrl(`/api/chat/${sessionId}/messages`), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: content,
              context: chatContext,
            }),
          }),
        ),
      );

      setMessages((prev) => [
        ...prev,
        payload.userMessage,
        payload.assistantMessage,
      ]);
      setProviderMode(payload.providerMode);
      setDraft("");

      if (payload.errorCode === "UNSAFE_REQUEST_BLOCKED") {
        setSendError(
          "The assistant did not answer that as a medical question. It gave a safety redirect instead.",
        );
      }
    } catch (error) {
      setSendError(
        error instanceof Error
          ? error.message
          : "The chatbot response could not be generated. Please retry.",
      );
    } finally {
      setIsSending(false);
    }
  }

  const goBack = () => {
    if (returnSnapshot) {
      navigate("/compare-plans", {
        state: { restoreSimulation: returnSnapshot },
      });
      return;
    }
    navigate("/compare-plans");
  };

  return (
    <div
      style={{
        fontFamily: "'DM Sans','Helvetica Neue',sans-serif",
        minHeight: "100vh",
        width: "100%",
        background:
          "radial-gradient(circle at top left, rgba(14,165,233,0.12), transparent 30%), linear-gradient(160deg,#eef6ff 0%,#f7f7fb 58%,#eefaf4 100%)",
        padding: "24px 24px 40px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={goBack}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 700,
              color: "#4b5563",
              padding: 0,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Cost Simulation
          </button>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#ffffffcc",
              border: "1px solid #dbeafe",
              borderRadius: 999,
              padding: "8px 14px",
              color: "#1e3a8a",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <span>AI Assistant</span>
            <span style={{ color: "#93c5fd" }}>•</span>
            <span>
              {providerMode === "anthropic"
                ? "Live API"
                : providerMode === "mock"
                  ? "Mock mode"
                  : "Starting"}
            </span>
          </div>
        </div>

        <div
          className="grid items-start gap-5 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]"
        >
          <aside
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 24,
              boxShadow: "0 20px 50px rgba(15,23,42,0.08)",
              border: "1px solid rgba(148,163,184,0.18)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#0ea5e9",
                marginBottom: 10,
              }}
            >
              Current simulation
            </div>
            <h1
              style={{
                fontSize: 28,
                lineHeight: 1.05,
                fontWeight: 900,
                letterSpacing: "-0.04em",
                color: "#0f172a",
                margin: "0 0 12px",
              }}
            >
              Ask about {currentPlanName}
            </h1>
            <p
              style={{
                color: "#64748b",
                fontSize: 14,
                lineHeight: 1.6,
                margin: "0 0 18px",
              }}
            >
              Ask about cost tradeoffs, insurance terms, your current estimate,
              or what parts of the simulation are most uncertain.
            </p>

            <div
              style={{
                display: "grid",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  background: "#eff6ff",
                  borderRadius: 14,
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: "#2563eb",
                    marginBottom: 6,
                  }}
                >
                  Estimated annual cost
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 900,
                    color: "#0f172a",
                  }}
                >
                  {totalAnnualCost ?? "Unavailable"}
                </div>
              </div>

              <div
                style={{
                  background: "#f0fdf4",
                  borderRadius: 14,
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: "#15803d",
                    marginBottom: 6,
                  }}
                >
                  Monthly average
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 900,
                    color: "#0f172a",
                  }}
                >
                  {monthlyAverage ?? "Unavailable"}
                </div>
              </div>
            </div>

            <div
              style={{
                borderRadius: 16,
                padding: 16,
                background: "#fff7ed",
                border: "1px solid #fed7aa",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#c2410c",
                  marginBottom: 8,
                }}
              >
                NOT MEDICAL ADVICE
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#7c2d12",
                  lineHeight: 1.6,
                }}
              >
                {disclaimer?.text ??
                  "This assistant provides educational insurance guidance only."}
              </div>
            </div>
          </aside>

          <section
            style={{
              background: "#fff",
              borderRadius: 20,
              boxShadow: "0 20px 50px rgba(15,23,42,0.08)",
              border: "1px solid rgba(148,163,184,0.18)",
              minHeight: 720,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "22px 24px 18px",
                borderBottom: "1px solid #e5e7eb",
                background:
                  "linear-gradient(180deg, rgba(239,246,255,0.95) 0%, rgba(255,255,255,0.95) 100%)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 900,
                      letterSpacing: "-0.04em",
                      color: "#0f172a",
                    }}
                  >
                    OpenBook Care Assistant
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: "#64748b",
                      marginTop: 4,
                    }}
                  >
                    Ask about healthcare costs, plan tradeoffs, and insurance
                    terminology.
                  </div>
                </div>
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 999,
                    background: isDisclaimerAcknowledged ? "#dcfce7" : "#fef3c7",
                    color: isDisclaimerAcknowledged ? "#166534" : "#92400e",
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {isDisclaimerAcknowledged
                    ? "Disclaimer acknowledged"
                    : "Acknowledge disclaimer to chat"}
                </div>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                padding: 24,
                overflowY: "auto",
                background:
                  "linear-gradient(180deg, rgba(248,250,252,0.8) 0%, rgba(255,255,255,1) 26%)",
              }}
            >
              {isSessionLoading ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 320,
                    color: "#64748b",
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                >
                  Starting chat session...
                </div>
              ) : sessionError ? (
                <div
                  style={{
                    maxWidth: 520,
                    margin: "48px auto 0",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: 18,
                    padding: 24,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#991b1b",
                      marginBottom: 10,
                    }}
                  >
                    Could not start the AI assistant
                  </div>
                  <p
                    style={{
                      margin: "0 0 18px",
                      color: "#7f1d1d",
                      lineHeight: 1.6,
                    }}
                  >
                    {sessionError}
                  </p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    style={{
                      padding: "12px 16px",
                      background: "#991b1b",
                      color: "#fff",
                      border: "none",
                      borderRadius: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Retry
                  </button>
                </div>
              ) : !isDisclaimerAcknowledged ? (
                <div
                  style={{
                    maxWidth: 640,
                    margin: "36px auto 0",
                    background: "#fff",
                    border: "1px solid #fde68a",
                    borderRadius: 20,
                    padding: 28,
                    boxShadow: "0 16px 40px rgba(15,23,42,0.06)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#b45309",
                      marginBottom: 10,
                    }}
                  >
                    Before you continue
                  </div>
                  <h2
                    style={{
                      fontSize: 28,
                      fontWeight: 900,
                      letterSpacing: "-0.04em",
                      color: "#111827",
                      margin: "0 0 10px",
                    }}
                  >
                    Acknowledge the disclaimer
                  </h2>
                  <p
                    style={{
                      fontSize: 15,
                      color: "#4b5563",
                      lineHeight: 1.7,
                      margin: "0 0 20px",
                    }}
                  >
                    {disclaimer?.text ??
                      "NOT MEDICAL ADVICE. The assistant provides educational guidance only."}
                  </p>
                  <button
                    type="button"
                    onClick={acknowledgeDisclaimer}
                    disabled={isAcknowledging}
                    style={{
                      width: "100%",
                      padding: 15,
                      background: isAcknowledging ? "#94a3b8" : "#0f172a",
                      color: "#fff",
                      border: "none",
                      borderRadius: 14,
                      fontSize: 15,
                      fontWeight: 800,
                      cursor: isAcknowledging ? "wait" : "pointer",
                    }}
                  >
                    {isAcknowledging
                      ? "Saving acknowledgement..."
                      : "I understand"}
                  </button>
                </div>
              ) : (
                <>
                  {messages.length === 0 && (
                    <div
                      style={{
                        maxWidth: 720,
                        margin: "0 auto 20px",
                        padding: 22,
                        borderRadius: 18,
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: "#1d4ed8",
                          marginBottom: 8,
                        }}
                      >
                        Suggested questions
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gap: 10,
                        }}
                      >
                        {[
                          `What does the deductible mean for ${currentPlanName}?`,
                          "Why might this plan be a good fit for my cost simulation?",
                          "What part of this estimate is most uncertain?",
                        ].map((question) => (
                          <button
                            key={question}
                            type="button"
                            onClick={() => setDraft(question)}
                            style={{
                              textAlign: "left",
                              border: "1px solid #dbeafe",
                              background: "#fff",
                              color: "#0f172a",
                              borderRadius: 12,
                              padding: "12px 14px",
                              fontSize: 14,
                              cursor: "pointer",
                            }}
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "grid", gap: 14 }}>
                    {messages.map((message) => {
                      const isUser = message.role === "user";
                      return (
                        <div
                          key={message.messageId}
                          style={{
                            display: "flex",
                            justifyContent: isUser ? "flex-end" : "flex-start",
                          }}
                        >
                          <div
                            style={{
                              maxWidth: "78%",
                              padding: "14px 16px",
                              borderRadius: 18,
                              background: isUser ? "#0f172a" : "#f8fafc",
                              color: isUser ? "#fff" : "#0f172a",
                              border: isUser
                                ? "none"
                                : "1px solid rgba(148,163,184,0.24)",
                              boxShadow: isUser
                                ? "0 12px 30px rgba(15,23,42,0.18)"
                                : "0 8px 24px rgba(15,23,42,0.06)",
                              whiteSpace: "pre-wrap",
                              lineHeight: 1.6,
                              fontSize: 14,
                            }}
                          >
                            {message.content}
                          </div>
                        </div>
                      );
                    })}

                    {isSending && (
                      <div style={{ display: "flex", justifyContent: "flex-start" }}>
                        <div
                          style={{
                            maxWidth: "78%",
                            padding: "14px 16px",
                            borderRadius: 18,
                            background: "#f8fafc",
                            color: "#475569",
                            border: "1px solid rgba(148,163,184,0.24)",
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                        >
                          Thinking...
                        </div>
                      </div>
                    )}
                    <div ref={endOfMessagesRef} />
                  </div>
                </>
              )}
            </div>

            <div
              style={{
                borderTop: "1px solid #e5e7eb",
                padding: 20,
                background: "#fff",
              }}
            >
              {sendError && (
                <div
                  style={{
                    marginBottom: 14,
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "#fff7ed",
                    border: "1px solid #fdba74",
                    color: "#9a3412",
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}
                >
                  {sendError}
                </div>
              )}

              <div
                className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end"
              >
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                  disabled={
                    isSessionLoading ||
                    !!sessionError ||
                    !isDisclaimerAcknowledged ||
                    isSending
                  }
                  placeholder={
                    isDisclaimerAcknowledged
                      ? "Ask a question about your costs, coverage, or plan tradeoffs..."
                      : "Acknowledge the disclaimer to start chatting."
                  }
                  rows={3}
                  style={{
                    flex: 1,
                    resize: "none",
                    borderRadius: 16,
                    border: "1.5px solid #cbd5e1",
                    padding: "14px 16px",
                    fontFamily: "inherit",
                    fontSize: 14,
                    lineHeight: 1.5,
                    outline: "none",
                    color: "#0f172a",
                    background:
                      isDisclaimerAcknowledged && !sessionError
                        ? "#fff"
                        : "#f8fafc",
                  }}
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={
                    !draft.trim() ||
                    isSessionLoading ||
                    !!sessionError ||
                    !isDisclaimerAcknowledged ||
                    isSending
                  }
                  style={{
                    minWidth: 120,
                    padding: "14px 18px",
                    borderRadius: 16,
                    border: "none",
                    background:
                      !draft.trim() ||
                      isSessionLoading ||
                      !!sessionError ||
                      !isDisclaimerAcknowledged ||
                      isSending
                        ? "#94a3b8"
                        : "#0f172a",
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: 800,
                    cursor:
                      !draft.trim() ||
                      isSessionLoading ||
                      !!sessionError ||
                      !isDisclaimerAcknowledged ||
                      isSending
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {isSending ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
