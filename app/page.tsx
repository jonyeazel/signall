"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Play, X, Copy, Check, ChevronRight, Square, Activity } from "lucide-react";
import {
  ENVIRONMENTS,
  ENV_GROUPS,
  getScores,
  type EnvScore,
} from "./shared";

// --- Gold accent ---
const GOLD = "#C9A96E";
const GOLD_DIM = "rgba(201, 169, 110, 0.25)";

// --- Light palette (default) ---
const t = {
  bg: "#F5F3EF",
  surface: "#FFFFFF",
  border: "#E4E0DA",
  borderActive: "#C8C4BC",
  textPrimary: "#191919",
  textSecondary: "#6B6B68",
  textTertiary: "#9B9B98",
  accent: "#E05A00",
  panelBg: "#ECEAE4",
};

const API_URL = "https://jonyeazel-cognitive-primitives-bandit.hf.space";

// --- Avatar ---
function Avatar({ index }: { index: number }) {
  return (
    <div
      style={{
        width: "28px",
        height: "28px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "-0.02em",
        background: "#E05A00",
        color: "#fff",
        flexShrink: 0,
      }}
    >
      {String(index + 1).padStart(2, "0")}
    </div>
  );
}

export default function Home() {
  const [scores, setScores] = useState<Record<string, EnvScore>>({});
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [expandedResult, setExpandedResult] = useState<{ efficiency: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [trainOpen, setTrainOpen] = useState(false);
  const [tryResult, setTryResult] = useState<Record<string, string>>({});

  // --- Carousel state ---
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // --- Theater state ---
  type TheaterState = "idle" | "training" | "complete";
  const [theaterState, setTheaterState] = useState<TheaterState>("idle");
  const [theaterCardIndex, setTheaterCardIndex] = useState(0);
  const [currentRunScore, setCurrentRunScore] = useState<number | null>(null);
  const [runningTally, setRunningTally] = useState({ completed: 0, totalEfficiency: 0 });
  const [theaterScores, setTheaterScores] = useState<(number | null)[]>(Array(ENVIRONMENTS.length).fill(null));

  // --- Training drawer state ---
  type HFEpisode = { episode: number; efficiency: number; reward: number };
  type HFLog = { total_episodes: number; total_steps: number; sessions: number; best_efficiency: number; avg_recent_efficiency: number; uptime_seconds: number; recent_episodes: HFEpisode[] };
  type TrainResult = { episode: number; totalReward: number; efficiency: number };
  type TrainAgent = { estimates: number[]; pullCounts: number[]; totalRewards: number[]; epsilon: number };

  const [hfLog, setHfLog] = useState<HFLog | null>(null);
  const [hfStatus, setHfStatus] = useState<"loading" | "live" | "offline">("loading");
  const [trainRunning, setTrainRunning] = useState(false);
  const [trainResults, setTrainResults] = useState<TrainResult[]>([]);
  const [trainAgent, setTrainAgent] = useState<TrainAgent>({ estimates: Array(6).fill(0), pullCounts: Array(6).fill(0), totalRewards: Array(6).fill(0), epsilon: 1.0 });
  const [trainMeans] = useState(() => { const m = [3.2, 5.8, 7.1, 4.5, 6.3, 2.9]; for (let i = m.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [m[i], m[j]] = [m[j], m[i]]; } return m; });
  const [trainVariances] = useState(() => Array.from({ length: 6 }, () => 1.5 + Math.random() * 2));
  const trainRunRef = useRef(false);
  const trainAgentRef = useRef<TrainAgent>({ estimates: Array(6).fill(0), pullCounts: Array(6).fill(0), totalRewards: Array(6).fill(0), epsilon: 1.0 });
  const [tryLoading, setTryLoading] = useState<string | null>(null);

  const tryEndpoint = useCallback(async (id: string, method: string, path: string, body?: object) => {
    setTryLoading(id);
    try {
      const opts: RequestInit = { method };
      if (body) {
        opts.headers = { "Content-Type": "application/json" };
        opts.body = JSON.stringify(body);
      }
      const r = await fetch(`${API_URL}${path}`, opts);
      const data = await r.json();
      setTryResult((prev) => ({ ...prev, [id]: JSON.stringify(data, null, 2) }));
    } catch (err) {
      setTryResult((prev) => ({ ...prev, [id]: `Error: ${err}` }));
    }
    setTryLoading(null);
  }, []);

  const copyEndpoint = useCallback(() => {
    navigator.clipboard.writeText(API_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  useEffect(() => {
    setScores(getScores());
  }, []);

  const closeExpanded = useCallback(() => {
    setExpandedCard(null);
    setExpandedResult(null);
    setScores(getScores());
  }, []);

  // Carousel scroll tracking
  const handleCarouselScroll = useCallback(() => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const cardWidth = 338; // 280 + 16 gap
    const scrollCenter = container.scrollLeft + container.clientWidth / 2;
    const paddingOffset = container.clientWidth / 2 - 161;
    const newIndex = Math.round((scrollCenter - paddingOffset) / cardWidth);
    const clamped = Math.max(0, Math.min(ENVIRONMENTS.length - 1, newIndex));
    if (clamped !== activeCardIndex) setActiveCardIndex(clamped);
  }, [activeCardIndex]);

  // Scroll carousel to specific index
  const scrollToCard = useCallback((index: number) => {
    if (!carouselRef.current) return;
    const cardWidth = 338;
    const paddingOffset = carouselRef.current.clientWidth / 2 - 161;
    carouselRef.current.scrollTo({ left: index * cardWidth - paddingOffset + 161, behavior: "smooth" });
  }, []);

  // Start training theater
  const startTheater = useCallback(() => {
    setTheaterState("training");
    setTheaterCardIndex(0);
    setRunningTally({ completed: 0, totalEfficiency: 0 });
    setCurrentRunScore(null);
    setTheaterScores(Array(ENVIRONMENTS.length).fill(null));
    setTrainOpen(true); // Auto-open training analytics during theater
    setDocsOpen(false);
    scrollToCard(0);
  }, [scrollToCard]);

  // Listen for postMessage from iframe (episode completion)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== "episodeComplete") return;
      const efficiency = Math.min(100, Math.max(0, Math.round(event.data.efficiency ?? 0)));
      setScores(getScores());

      // Theater mode — auto-advance
      if (theaterState === "training") {
        setCurrentRunScore(efficiency);
        // Store this environment's score
        setTheaterScores(prev => {
          const next = [...prev];
          next[theaterCardIndex] = efficiency;
          return next;
        });
        setTimeout(() => {
          setRunningTally(prev => ({
            completed: prev.completed + 1,
            totalEfficiency: prev.totalEfficiency + efficiency,
          }));
          if (theaterCardIndex < ENVIRONMENTS.length - 1) {
            const next = theaterCardIndex + 1;
            setTheaterCardIndex(next);
            setCurrentRunScore(null);
            scrollToCard(next);
          } else {
            // Show completion summary — close drawer, don't auto-dismiss
            setTheaterState("complete");
            setTrainOpen(false);
            setScores(getScores());
          }
        }, 1500);
      }

      // Individual card expanded — show results panel
      if (expandedCard !== null && theaterState === "idle") {
        setExpandedResult({ efficiency });
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [theaterState, theaterCardIndex, scrollToCard, expandedCard]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeExpanded();
        setDocsOpen(false);
        setTrainOpen(false);
        if (theaterState !== "idle") { setTheaterState("idle"); setCurrentRunScore(null); }
      }
      if (expandedCard === null && theaterState === "idle" && !e.metaKey && !e.ctrlKey) {
        if (e.key === "ArrowRight") { scrollToCard(Math.min(activeCardIndex + 1, ENVIRONMENTS.length - 1)); }
        if (e.key === "ArrowLeft") { scrollToCard(Math.max(activeCardIndex - 1, 0)); }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [expandedCard, closeExpanded, theaterState, activeCardIndex, scrollToCard]);

  // HuggingFace polling
  useEffect(() => {
    async function fetchHF() {
      try {
        const r = await fetch(`${API_URL}/training-log`);
        if (r.ok) { setHfLog(await r.json()); setHfStatus("live"); } else setHfStatus("offline");
      } catch { setHfStatus("offline"); }
    }
    fetchHF();
    const iv = setInterval(fetchHF, 8000);
    return () => clearInterval(iv);
  }, []);

  // Local training loop
  const startTrain = useCallback(() => {
    const fresh = { estimates: Array(6).fill(0), pullCounts: Array(6).fill(0), totalRewards: Array(6).fill(0), epsilon: 1.0 };
    trainAgentRef.current = fresh;
    setTrainAgent(fresh);
    setTrainResults([]);
    setTrainRunning(true);
    trainRunRef.current = true;
  }, []);

  const stopTrain = useCallback(() => { setTrainRunning(false); trainRunRef.current = false; }, []);

  useEffect(() => {
    if (!trainRunning) return;
    let ep = 0;
    const step = () => {
      if (!trainRunRef.current || ep >= 80) { setTrainRunning(false); trainRunRef.current = false; return; }
      const a = { ...trainAgentRef.current, estimates: [...trainAgentRef.current.estimates], pullCounts: [...trainAgentRef.current.pullCounts], totalRewards: [...trainAgentRef.current.totalRewards], epsilon: Math.max(0.05, 1.0 - ep * 0.02) };
      let reward = 0;
      for (let r = 0; r < 25; r++) {
        const choice = Math.random() < a.epsilon ? Math.floor(Math.random() * 6) : a.estimates.indexOf(Math.max(...a.estimates));
        let u1 = 0, u2 = 0; while (u1 === 0) u1 = Math.random(); while (u2 === 0) u2 = Math.random();
        const val = trainMeans[choice] + Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * Math.sqrt(trainVariances[choice]);
        reward += val; a.pullCounts[choice]++; a.totalRewards[choice] += val; a.estimates[choice] = a.totalRewards[choice] / a.pullCounts[choice];
      }
      trainAgentRef.current = a; setTrainAgent({ ...a });
      setTrainResults(prev => [...prev, { episode: ep + 1, totalReward: reward, efficiency: Math.round((reward / (Math.max(...trainMeans) * 25)) * 100) }]);
      ep++; setTimeout(step, 60);
    };
    step();
  }, [trainRunning, trainMeans, trainVariances]);

  return (
    <>
    <div
      style={{
        position: "fixed",
        inset: "12px",
        background: t.bg,
        borderRadius: "24px",
        border: `1px solid ${GOLD_DIM}`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Overlay */}
      <div
        className={`card-overlay ${expandedCard !== null ? "card-overlay-visible" : ""}`}
        onClick={closeExpanded}
        style={{ background: "rgba(0,0,0,0.4)" }}
      />

      {/* Expanded card — unified training view */}
      {expandedCard !== null && (() => {
        const xEnv = ENVIRONMENTS[expandedCard];
        const xGroup = ENV_GROUPS.find((g) => g.envs.includes(xEnv));
        const embedUrl = `${xEnv.path}?embed=true&agent=true`;

        return (
          <div className="slide-card-expanded" style={{ animation: "card-scale-up 150ms ease-out forwards" }}>
            <div style={{
              width: "100%", height: "100%", background: t.bg, borderRadius: "24px",
              border: `1px solid ${GOLD}`, display: "flex", flexDirection: "column",
              overflow: "hidden", position: "relative",
            }}>
              {/* Gold trim */}
              <div style={{ position: "absolute", top: 0, left: "24px", right: "24px", height: "1px", background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, zIndex: 1 }} />

              {/* Header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "16px 24px", borderBottom: `1px solid ${t.border}`, flexShrink: 0,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Avatar index={expandedCard} />
                  <span style={{ fontSize: "14px", fontWeight: 600, color: t.textPrimary }}>{xEnv.name}</span>
                  <span style={{ fontSize: "11px", color: t.border }}>/</span>
                  <span style={{ fontSize: "10px", color: GOLD, letterSpacing: "0.04em", textTransform: "uppercase" }}>{xGroup?.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {expandedResult && (
                    <span style={{ fontSize: "13px", fontWeight: 600, color: t.accent }}>{expandedResult.efficiency}%</span>
                  )}
                  <button onClick={closeExpanded} style={{ background: "none", border: "none", color: t.textTertiary, padding: "4px" }}>
                    <X size={18} strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Game + Results panel */}
              <div style={{ flex: 1, display: "flex", position: "relative", overflow: "hidden" }}>
                {/* Game iframe — always running */}
                <iframe
                  src={embedUrl}
                  style={{
                    flex: 1,
                    border: "none",
                    borderRadius: "0 0 24px 24px",
                    transition: "margin-right 150ms ease-out",
                    marginRight: expandedResult ? "280px" : "0",
                  }}
                />

                {/* Results panel — slides in from right */}
                <div style={{
                  position: "absolute",
                  top: 0,
                  right: expandedResult ? 0 : "-280px",
                  bottom: 0,
                  width: "280px",
                  background: t.surface,
                  borderLeft: `1px solid ${t.border}`,
                  borderRadius: "0 0 24px 0",
                  transition: "right 150ms ease-out",
                  display: "flex",
                  flexDirection: "column",
                  padding: "24px",
                  overflow: "auto",
                }}>
                  {expandedResult && (
                    <>
                      {/* Score */}
                      <div style={{ marginBottom: "24px" }}>
                        <div style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: t.textTertiary, marginBottom: "8px" }}>Efficiency</div>
                        <div style={{ fontSize: "48px", fontWeight: 600, color: t.accent, letterSpacing: "-0.03em", lineHeight: 1 }}>{expandedResult.efficiency}%</div>
                      </div>

                      {/* Capability */}
                      <div style={{ fontSize: "13px", color: t.textSecondary, lineHeight: 1.5, marginBottom: "20px" }}>
                        {xEnv.capability}
                      </div>

                      {/* Use cases */}
                      <div style={{ marginBottom: "20px" }}>
                        <div style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: t.textTertiary, marginBottom: "8px" }}>Applications</div>
                        {xEnv.useCases.map((uc, j) => (
                          <div key={j} style={{ fontSize: "12px", color: t.textSecondary, lineHeight: 1.5, padding: "6px 0", borderBottom: j < 2 ? `1px solid ${t.border}` : "none" }}>
                            {uc}
                          </div>
                        ))}
                      </div>

                      {/* Domain badges */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "24px" }}>
                        {xEnv.domains.map((d) => (
                          <span key={d} style={{ fontSize: "10px", color: t.textSecondary, background: t.bg, padding: "4px 8px", borderRadius: "6px", border: `1px solid ${t.border}` }}>{d}</span>
                        ))}
                      </div>

                      {/* Train again */}
                      <button
                        onClick={() => {
                          setExpandedResult(null);
                          setExpandedCard(null);
                          setTimeout(() => setExpandedCard(expandedCard), 50);
                        }}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "8px",
                          height: "40px", padding: "0 20px", background: t.accent, color: "#fff",
                          border: "none", borderRadius: "12px", fontSize: "12px", fontWeight: 500,
                          fontFamily: "inherit", marginTop: "auto",
                        }}
                      >
                        <Play size={12} strokeWidth={2} />
                        Train again
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- Theater overlay --- */}
      {theaterState === "training" && (
        <>
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 99 }}
            onClick={() => { setTheaterState("idle"); setCurrentRunScore(null); }}
          />
          <div className="slide-card-expanded">
            <div style={{ width: "100%", height: "100%", background: t.bg, borderRadius: "24px", border: `1px solid ${GOLD_DIM}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Avatar index={theaterCardIndex} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: t.textPrimary }}>{ENVIRONMENTS[theaterCardIndex]?.name}</span>
                  <span style={{ fontSize: "11px", color: t.border }}>/</span>
                  <span style={{ fontSize: "10px", color: GOLD, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    {ENV_GROUPS.find(g => g.envs.includes(ENVIRONMENTS[theaterCardIndex]))?.label}
                  </span>
                  <span style={{ fontSize: "10px", color: t.textTertiary, marginLeft: "8px" }}>
                    {theaterCardIndex + 1} / {ENVIRONMENTS.length}
                  </span>
                </div>
                <button onClick={() => { setTheaterState("idle"); setCurrentRunScore(null); }} style={{ background: "none", border: "none", color: t.textTertiary, padding: "4px" }}>
                  <X size={18} strokeWidth={1.5} />
                </button>
              </div>
              <iframe
                src={`${ENVIRONMENTS[theaterCardIndex]?.path}?embed=true&agent=true`}
                style={{ flex: 1, border: "none", borderRadius: "0 0 24px 24px" }}
              />
            </div>
          </div>
        </>
      )}

      {/* --- Theater completion summary --- */}
      {theaterState === "complete" && (() => {
        const completedScores = theaterScores.map(s => s !== null ? Math.min(100, Math.max(0, s)) : null);
        const validScores = completedScores.filter((s): s is number => s !== null);
        const avgScore = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;
        const maxScore = validScores.length > 0 ? Math.max(...validScores) : 0;
        const minScore = validScores.length > 0 ? Math.min(...validScores) : 0;
        const mastered = validScores.filter(s => s >= 80).length;

        return (
          <>
            <div
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99 }}
              onClick={() => { setTheaterState("idle"); }}
            />
            <div className="slide-card-expanded" style={{ animation: "card-scale-up 150ms ease-out forwards" }}>
              <div style={{
                width: "100%", height: "100%", background: t.surface, borderRadius: "24px",
                border: `1px solid ${GOLD}`, padding: "48px",
                display: "flex", flexDirection: "column", position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", top: 0, left: "48px", right: "48px", height: "2px", background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
                <button onClick={() => setTheaterState("idle")} style={{ position: "absolute", top: "24px", right: "24px", background: "none", border: "none", color: t.textTertiary, padding: "8px" }}>
                  <X size={20} strokeWidth={1.5} />
                </button>

                {/* Top: Generalist Score */}
                <div style={{ textAlign: "center", marginBottom: "32px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: GOLD, marginBottom: "8px" }}>Generalist Score</div>
                  <div style={{ fontSize: "64px", fontWeight: 600, color: t.accent, letterSpacing: "-0.03em", lineHeight: 1 }}>{avgScore}%</div>
                  <div style={{ fontSize: "13px", color: t.textSecondary, marginTop: "8px" }}>
                    {mastered}/10 skills mastered · Best {maxScore}% · Lowest {minScore}%
                  </div>
                </div>

                {/* Bar chart of all 10 scores */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "140px", marginBottom: "8px" }}>
                    {ENVIRONMENTS.map((env, i) => {
                      const score = completedScores[i] ?? 0;
                      const capped = Math.min(100, Math.max(0, score));
                      const barHeight = Math.max(4, (capped / 100) * 140);
                      return (
                        <div key={env.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                          <div style={{ fontSize: "11px", fontWeight: 600, color: capped >= 80 ? t.accent : capped >= 50 ? t.textPrimary : t.textTertiary }}>{capped}%</div>
                          <div style={{
                            width: "100%", maxWidth: "48px", height: `${barHeight}px`, borderRadius: "6px 6px 0 0",
                            background: capped >= 80 ? t.accent : capped >= 50 ? GOLD : t.border,
                          }} />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {ENVIRONMENTS.map((env, i) => {
                      const group = ENV_GROUPS.find(g => g.envs.includes(env));
                      return (
                        <div key={env.id} style={{ flex: 1, textAlign: "center", overflow: "hidden" }}>
                          <div style={{ fontSize: "9px", fontWeight: 500, color: t.textSecondary, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                            {env.name.split(" ")[0]}
                          </div>
                          <div style={{ fontSize: "7px", color: GOLD, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                            {group?.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom: Verdict */}
                <div style={{ textAlign: "center", marginTop: "24px" }}>
                  <div style={{ fontSize: "15px", color: t.textSecondary, lineHeight: 1.6, maxWidth: "480px", margin: "0 auto" }}>
                    {avgScore >= 80
                      ? "This agent operates across all 10 cognitive primitives. It negotiates, predicts, debugs, and plans autonomously."
                      : avgScore >= 60
                        ? "Strong cross-domain performance. The agent handles most cognitive challenges with room to grow."
                        : "Training in progress. Each run improves the agent's generalist capabilities across domains."}
                  </div>
                  <button onClick={() => { setTheaterState("idle"); }} style={{ display: "inline-flex", alignItems: "center", gap: "8px", height: "44px", padding: "0 24px", background: t.accent, color: "#fff", border: "none", borderRadius: "16px", fontSize: "13px", fontWeight: 500, fontFamily: "inherit", marginTop: "20px", cursor: "pointer" }}>
                    Done
                  </button>
                </div>

                <div style={{ position: "absolute", bottom: 0, left: "48px", right: "48px", height: "2px", background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
              </div>
            </div>
          </>
        );
      })()}

      {/* --- Main content --- */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 32px 0", overflow: "hidden" }}>
        {/* Content: headline + body + cards */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "24px", minHeight: 0 }}>
          {/* Hero */}
          <div style={{ textAlign: "center", maxWidth: "640px" }}>
            <h1 style={{ fontSize: "38px", fontWeight: 600, color: t.textPrimary, letterSpacing: "-0.03em", lineHeight: 1.15, margin: "0 0 12px 0" }}>
              The best agents are <span style={{ color: t.accent }}>generalists</span>.
            </h1>
            <p style={{ fontSize: "15px", lineHeight: 1.6, color: t.textSecondary, margin: 0 }}>
              Specialist agents break the moment a problem crosses domains. Generalists don&apos;t, because they learned the skills underneath every domain. These are the 10 that matter.
            </p>
          </div>

          {/* Carousel */}
          <div
            ref={carouselRef}
            className="carousel-scroll"
            onScroll={handleCarouselScroll}
            style={{
              display: "flex",
              gap: "16px",
              overflowX: "scroll",
              scrollSnapType: "x mandatory",
              scrollBehavior: "smooth",
              padding: "0 calc(50% - 161px)",
              width: "100%",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {ENVIRONMENTS.map((env, i) => {
              const group = ENV_GROUPS.find((g) => g.envs.includes(env));
              const isActive = activeCardIndex === i;
              return (
                <div
                  key={env.id}
                  onClick={() => setExpandedCard(i)}
                  style={{
                    flexShrink: 0,
                    width: "322px",
                    height: "322px",
                    background: t.surface,
                    border: `1px solid ${isActive ? GOLD : t.border}`,
                    borderRadius: "16px",
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    scrollSnapAlign: "center",
                    transform: isActive ? "scale(1)" : "scale(0.92)",
                    opacity: isActive ? 1 : 0.5,
                    transition: "transform 150ms ease-out, opacity 150ms ease-out, border-color 150ms ease-out",
                    position: "relative",
                  }}
                >
                  <div style={{ position: "absolute", top: 0, left: "24px", right: "24px", height: "1px", background: `linear-gradient(90deg, transparent, ${isActive ? GOLD : GOLD_DIM}, transparent)` }} />
                  {/* Top-left */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                      <Avatar index={i} />
                      <div>
                        <div style={{ fontSize: "15px", fontWeight: 600, color: t.textPrimary, letterSpacing: "-0.01em" }}>{env.name}</div>
                        <div style={{ fontSize: "10px", color: GOLD, letterSpacing: "0.04em", textTransform: "uppercase" }}>{group?.label}</div>
                      </div>
                    </div>
                  </div>
                  {/* Bottom-left */}
                  <div>
                    <div style={{ fontSize: "13px", color: t.textSecondary, lineHeight: 1.5, marginBottom: "12px" }}>
                      {env.capability}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {env.domains.map((d) => (
                        <span key={d} style={{ fontSize: "9px", color: t.textSecondary, background: t.panelBg, padding: "3px 8px", borderRadius: "6px", letterSpacing: "0.02em" }}>{d}</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Carousel position dots */}
          <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginTop: "16px" }}>
            {ENVIRONMENTS.map((_, i) => (
              <div
                key={i}
                onClick={() => scrollToCard(i)}
                style={{
                  width: activeCardIndex === i ? "16px" : "6px",
                  height: "6px",
                  borderRadius: "3px",
                  background: activeCardIndex === i ? t.accent : t.border,
                  cursor: "pointer",
                  transition: "all 150ms ease-out",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* --- Dock: brand + API endpoint + CTA --- */}
      <div style={{ flexShrink: 0, padding: "0 32px 20px", display: "flex", justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: t.panelBg,
            border: `1px solid ${GOLD_DIM}`,
            borderRadius: "20px",
            padding: "6px 8px",
            maxWidth: "760px",
            width: "100%",
          }}
        >
          {/* Logo pill */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 12px", height: "36px", borderRadius: "14px", background: t.surface, flexShrink: 0, border: `1px solid ${GOLD_DIM}` }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: t.accent }}>[~]</span>
            <span style={{ fontSize: "11px", fontWeight: 600, color: t.textSecondary }}>Signall</span>
          </div>

          <div style={{ width: "1px", height: "20px", background: GOLD_DIM, margin: "0 6px", flexShrink: 0 }} />

          {/* API endpoint — inline, always visible */}
          <button
            onClick={copyEndpoint}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              height: "36px",
              padding: "0 12px",
              borderRadius: "10px",
              background: t.surface,
              border: `1px solid ${t.border}`,
              color: t.textTertiary,
              fontSize: "11px",
              fontFamily: "var(--font-mono, monospace)",
              textAlign: "left",
              overflow: "hidden",
              minWidth: 0,
            }}
          >
            <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#4ADE80", flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {API_URL.replace("https://", "")}
            </span>
            {copied ? <Check size={12} strokeWidth={2} style={{ color: "#4ADE80", flexShrink: 0 }} /> : <Copy size={12} strokeWidth={1.5} style={{ flexShrink: 0 }} />}
          </button>

          {/* Docs button */}
          <button
            onClick={() => { setDocsOpen((d) => !d); setTrainOpen(false); }}
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              height: "36px", padding: "0 12px", borderRadius: "10px",
              background: docsOpen ? t.accent : t.surface,
              border: `1px solid ${docsOpen ? t.accent : t.border}`,
              color: docsOpen ? "#fff" : t.textSecondary,
              fontSize: "11px", fontWeight: 500, flexShrink: 0,
            }}
          >
            Docs
          </button>

          {/* Live score with mini bar chart or Train toggle */}
          {theaterState !== "idle" ? (
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              height: "36px", padding: "0 14px", borderRadius: "10px",
              background: t.surface, border: `1px solid ${GOLD_DIM}`,
              minWidth: "200px", flexShrink: 0,
            }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: t.accent, animation: "score-pulse 1.5s infinite", flexShrink: 0 }} />
              <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "20px", flexShrink: 0 }}>
                {theaterScores.map((score, i) => (
                  <div key={i} style={{
                    width: "4px",
                    height: score !== null ? `${Math.max(3, (score / 100) * 20)}px` : "3px",
                    borderRadius: "1px",
                    background: score !== null ? (score >= 80 ? t.accent : GOLD) : t.border,
                    transition: "height 150ms ease-out",
                  }} />
                ))}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "10px", fontWeight: 600, color: t.textPrimary, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {theaterState === "complete" ? "Complete" : ENVIRONMENTS[theaterCardIndex]?.name}
                </div>
                <div style={{ fontSize: "9px", color: t.textTertiary }}>
                  {theaterState === "complete"
                    ? `${Math.round(runningTally.totalEfficiency / Math.max(runningTally.completed, 1))}% avg`
                    : `${currentRunScore !== null ? `${currentRunScore}%` : "training..."} · ${runningTally.completed}/10`
                  }
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setTrainOpen((d) => !d); setDocsOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: "4px",
                height: "36px", padding: "0 12px", borderRadius: "10px",
                background: trainOpen ? t.accent : t.surface,
                border: `1px solid ${trainOpen ? t.accent : t.border}`,
                color: trainOpen ? "#fff" : t.textSecondary,
                fontSize: "11px", fontWeight: 500, flexShrink: 0,
              }}
            >
              <Activity size={12} strokeWidth={1.5} />
              Stats
            </button>
          )}

          <div style={{ width: "1px", height: "20px", background: GOLD_DIM, margin: "0 6px", flexShrink: 0 }} />

          {/* CTA */}
          <button
            onClick={() => {
              if (theaterState === "idle") { startTheater(); }
              else { setTheaterState("idle"); setCurrentRunScore(null); }
            }}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 16px", height: "36px", borderRadius: "14px", background: t.accent, color: "#fff", fontSize: "12px", fontWeight: 500, border: "none", flexShrink: 0, fontFamily: "inherit" }}
          >
            {theaterState === "idle" ? <Play size={12} strokeWidth={2} /> : <Square size={12} strokeWidth={2} />}
            {theaterState === "idle" ? "Train Agent" : "Stop"}
          </button>
        </div>
      </div>

    </div>

      {/* --- API Docs Drawer (outside viewport panel) --- */}
      <div className={`docs-drawer ${docsOpen ? "docs-drawer-open" : ""}`}>
        <div style={{
          height: "100%",
          background: t.surface,
          borderRadius: "20px",
          border: `1px solid ${GOLD_DIM}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Drawer header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: `1px solid ${t.border}`,
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#4ADE80" }} />
              <span style={{ fontSize: "13px", fontWeight: 600, color: t.textPrimary }}>API Reference</span>
              <span style={{ fontSize: "10px", color: "#8B7A52", letterSpacing: "0.04em", fontWeight: 500 }}>OPENENV 1.0</span>
            </div>
            <button onClick={() => setDocsOpen(false)} style={{ background: "none", border: "none", color: t.textTertiary, padding: "4px" }}>
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          {/* Drawer content */}
          <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
            {/* Endpoint */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: t.textSecondary, marginBottom: "6px" }}>Base URL</div>
              <button
                onClick={copyEndpoint}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 12px", background: "#F5F3EF", border: `1px solid ${t.border}`, borderRadius: "10px",
                  color: "#3D3D3A", fontSize: "11px", fontFamily: "var(--font-mono, monospace)", textAlign: "left",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{API_URL}</span>
                {copied ? <Check size={12} strokeWidth={2} style={{ color: "#4ADE80", flexShrink: 0 }} /> : <Copy size={12} strokeWidth={1.5} style={{ flexShrink: 0 }} />}
              </button>
            </div>

            {/* Validation badge */}
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "10px 14px", borderRadius: "10px",
              background: "rgba(74, 222, 128, 0.06)", border: "1px solid rgba(74, 222, 128, 0.15)",
              marginBottom: "24px",
            }}>
              <Check size={12} strokeWidth={2} style={{ color: "#22A55B" }} />
              <span style={{ fontSize: "11px", color: "#22A55B", fontWeight: 500 }}>OpenEnv Validated · 6/6</span>
            </div>

            {/* Endpoints */}
            {[
              {
                id: "reset",
                method: "POST",
                path: "/reset",
                desc: "Start a new episode. Returns initial observation with round count and score.",
                example: {},
                tryFn: () => tryEndpoint("reset", "POST", "/reset", {}),
              },
              {
                id: "step",
                method: "POST",
                path: "/step",
                desc: "Pull arm 0–5. Returns reward, running score, and done flag after 25 rounds.",
                example: { action: { source_id: 3 } },
                tryFn: () => tryEndpoint("step", "POST", "/step", { action: { source_id: Math.floor(Math.random() * 6) } }),
              },
              {
                id: "state",
                method: "GET",
                path: "/state",
                desc: "Returns episode ID and step count for the current session.",
                tryFn: () => tryEndpoint("state", "GET", "/state"),
              },
              {
                id: "schema",
                method: "GET",
                path: "/schema",
                desc: "Returns typed schemas for BanditAction and BanditObservation.",
                tryFn: () => tryEndpoint("schema", "GET", "/schema"),
              },
              {
                id: "mcp",
                method: "POST",
                path: "/mcp",
                desc: "Model Context Protocol. Any LLM can discover and call environment tools.",
                example: { jsonrpc: "2.0", method: "tools/list", id: 1 },
                tryFn: () => tryEndpoint("mcp", "POST", "/mcp", { jsonrpc: "2.0", method: "tools/list", id: 1 }),
              },
              {
                id: "health",
                method: "GET",
                path: "/health",
                desc: "Returns healthy when the environment is running and accepting connections.",
                tryFn: () => tryEndpoint("health", "GET", "/health"),
              },
            ].map((ep, epIdx) => (
              <div key={ep.id} style={{ paddingBottom: "20px", marginBottom: "20px", borderBottom: epIdx < 5 ? `1px solid ${t.border}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{
                    fontSize: "9px", fontWeight: 700, letterSpacing: "0.04em",
                    padding: "2px 6px", borderRadius: "4px",
                    background: ep.method === "POST" ? "rgba(224, 90, 0, 0.1)" : "rgba(34, 165, 91, 0.1)",
                    color: ep.method === "POST" ? t.accent : "#1A7A40",
                  }}>
                    {ep.method}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: t.textPrimary, fontFamily: "var(--font-mono, monospace)" }}>
                    {ep.path}
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: t.textSecondary, marginBottom: "8px" }}>{ep.desc}</div>

                {ep.example && (
                  <pre style={{
                    fontSize: "10px", lineHeight: 1.5, color: "#3D3D3A",
                    background: "#F5F3EF", border: `1px solid ${t.border}`, borderRadius: "8px",
                    padding: "10px 12px", margin: "0 0 8px 0", overflow: "auto",
                    fontFamily: "var(--font-mono, monospace)",
                  }}>
                    {JSON.stringify(ep.example, null, 2)}
                  </pre>
                )}

                <button
                  onClick={ep.tryFn}
                  disabled={tryLoading === ep.id}
                  style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    height: "28px", padding: "0 10px", borderRadius: "6px",
                    background: "transparent", border: `1px solid ${t.border}`,
                    color: tryLoading === ep.id ? t.textTertiary : t.accent,
                    fontSize: "10px", fontWeight: 600,
                  }}
                >
                  {tryLoading === ep.id ? "Loading..." : <>Try it <ChevronRight size={10} strokeWidth={2} /></>}
                </button>

                {tryResult[ep.id] && (
                  <pre style={{
                    fontSize: "10px", lineHeight: 1.4, color: "#1A6B3A",
                    background: "rgba(34, 165, 91, 0.06)", border: "1px solid rgba(34, 165, 91, 0.18)",
                    borderRadius: "8px", padding: "10px 12px", margin: "8px 0 0 0",
                    overflow: "auto", maxHeight: "120px",
                    fontFamily: "var(--font-mono, monospace)",
                  }}>
                    {tryResult[ep.id]}
                  </pre>
                )}
              </div>
            ))}

            {/* Quick start */}
            <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: "20px", marginTop: "8px" }}>
              <div style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: GOLD, marginBottom: "10px" }}>Quick Start</div>
              <pre style={{
                fontSize: "10px", lineHeight: 1.6, color: "#3D3D3A",
                background: "#F5F3EF", border: `1px solid ${t.border}`, borderRadius: "8px",
                padding: "14px 16px", margin: 0, overflow: "auto",
                fontFamily: "var(--font-mono, monospace)",
              }}>
{`from openenv.core import GenericEnvClient

async with GenericEnvClient(
    base_url="${API_URL}"
) as client:
    obs = await client.reset()
    for _ in range(25):
        result = await client.step(
            {"source_id": best_arm}
        )
        print(result.reward)`}
              </pre>
            </div>

            {/* LLM Training */}
            <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: "20px", marginTop: "20px" }}>
              <div style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: GOLD, marginBottom: "10px" }}>LLM Fine-tuning</div>
              <div style={{ fontSize: "11px", color: t.textSecondary, marginBottom: "12px", lineHeight: 1.5 }}>
                Train a language model to play this environment using GRPO reinforcement learning. The model receives live rewards from this API during training.
              </div>
              <div style={{
                display: "flex", flexDirection: "column", gap: "8px",
                padding: "14px 16px", background: "#F5F3EF", border: `1px solid ${t.border}`, borderRadius: "10px",
                marginBottom: "12px",
              }}>
                {[
                  { label: "Model", value: "Qwen2.5-0.5B-Instruct" },
                  { label: "Method", value: "Unsloth LoRA + TRL GRPO" },
                  { label: "Reward", value: "Live MCP → normalized [0, 1]" },
                  { label: "Runtime", value: "Colab free tier (T4 GPU)" },
                ].map((row) => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "10px", color: t.textTertiary }}>{row.label}</span>
                    <span style={{ fontSize: "10px", fontWeight: 500, color: t.textPrimary }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <pre style={{
                fontSize: "10px", lineHeight: 1.6, color: "#3D3D3A",
                background: "#F5F3EF", border: `1px solid ${t.border}`, borderRadius: "8px",
                padding: "14px 16px", margin: 0, overflow: "auto",
                fontFamily: "var(--font-mono, monospace)",
              }}>
{`from unsloth import FastLanguageModel
from trl import GRPOConfig, GRPOTrainer

model, tok = FastLanguageModel.from_pretrained(
    "unsloth/Qwen2.5-0.5B-Instruct-bnb-4bit",
    max_seq_length=512, load_in_4bit=True,
)
model = FastLanguageModel.get_peft_model(
    model, r=8, lora_alpha=16,
    use_gradient_checkpointing="unsloth",
)

async def reward_func(completions, **kw):
    # Calls live HF Space MCP for each action
    return [pull_arm(parse(c)) for c in completions]

trainer = GRPOTrainer(
    model=model, processing_class=tok,
    reward_funcs=[format_reward, reward_func],
    args=GRPOConfig(
        num_generations=4, beta=0.0,
        max_completion_length=64,
    ),
    train_dataset=prompts,
)
trainer.train()`}
              </pre>
              <div style={{ fontSize: "10px", color: t.textTertiary, marginTop: "10px", lineHeight: 1.4 }}>
                Full notebook: <span style={{ fontFamily: "var(--font-mono, monospace)", color: t.textSecondary }}>train_llm_agent.ipynb</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- Training Drawer --- */}
      <div className={`train-drawer ${trainOpen ? "train-drawer-open" : ""}`}>
        <div style={{ height: "100%", background: t.surface, borderRadius: "20px", border: `1px solid ${GOLD_DIM}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: hfStatus === "live" ? "#22A55B" : hfStatus === "loading" ? t.textTertiary : t.accent }} />
              <span style={{ fontSize: "13px", fontWeight: 600, color: t.textPrimary }}>Training</span>
              <span style={{ fontSize: "10px", color: t.textTertiary }}>
                {hfStatus === "live" ? "HuggingFace connected" : hfStatus === "loading" ? "connecting..." : "offline"}
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {!trainRunning ? (
                <button onClick={startTrain} style={{ display: "flex", alignItems: "center", gap: "4px", height: "28px", padding: "0 10px", borderRadius: "8px", background: t.accent, color: "#fff", border: "none", fontSize: "10px", fontWeight: 600 }}>
                  <Play size={10} strokeWidth={2} /> Train
                </button>
              ) : (
                <button onClick={stopTrain} style={{ display: "flex", alignItems: "center", gap: "4px", height: "28px", padding: "0 10px", borderRadius: "8px", background: "transparent", color: t.textSecondary, border: `1px solid ${t.border}`, fontSize: "10px", fontWeight: 600 }}>
                  <Square size={10} strokeWidth={2} /> Stop
                </button>
              )}
              <button onClick={() => setTrainOpen(false)} style={{ background: "none", border: "none", color: t.textTertiary, padding: "4px" }}>
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Content */}
          {(() => {
            // Compute all metrics once
            const isLive = hfLog && !trainRunning;
            const episodes = isLive ? hfLog.total_episodes : trainResults.length;
            const steps = isLive ? hfLog.total_steps : trainResults.length * 25;
            const bestEff = isLive ? hfLog.best_efficiency : (trainResults.length > 0 ? Math.max(...trainResults.map(r => r.efficiency)) : 0);
            const avgEff = isLive ? hfLog.avg_recent_efficiency : (trainResults.length >= 5 ? Math.round(trainResults.slice(-5).reduce((s, r) => s + r.efficiency, 0) / 5) : (trainResults[trainResults.length - 1]?.efficiency ?? 0));
            const totalPulls = trainAgent.pullCounts.reduce((a, b) => a + b, 0);
            const epsilon = trainAgent.epsilon;
            const bestArmIdx = trainMeans.indexOf(Math.max(...trainMeans));
            const bestArmEst = trainAgent.estimates[bestArmIdx];
            const bestArmTrue = trainMeans[bestArmIdx];
            const convergenceGap = bestArmEst > 0 ? Math.abs(bestArmEst - bestArmTrue) : bestArmTrue;
            const exploitRate = totalPulls > 0 ? Math.round((trainAgent.pullCounts[bestArmIdx] / totalPulls) * 100) : 0;

            // Chart data
            const hfEff = hfLog?.recent_episodes.map(e => e.efficiency) ?? [];
            const localEff = trainResults.map(r => r.efficiency);
            const showLoc = trainRunning || (trainResults.length > 0 && hfEff.length === 0);
            const chartData = showLoc ? localEff : hfEff;
            const chartLabel = showLoc ? "Local" : "HuggingFace";

            // Episode data
            const hfEps = hfLog?.recent_episodes ?? [];
            const episodeList = showLoc ? trainResults.slice(-6).reverse() : hfEps.slice(-6).reverse();

            const mc = (label: string, value: string | number, desc: string, isAccent?: boolean) => (
              <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: "10px", padding: "14px", aspectRatio: "1", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ fontSize: "8px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: t.textTertiary }}>{label}</div>
                <div style={{ fontSize: "24px", fontWeight: 600, color: isAccent ? t.accent : t.textPrimary, letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: "9px", color: t.textTertiary, lineHeight: 1.3 }}>{desc}</div>
              </div>
            );

            return (
              <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
                {/* Primary metrics — 2x2 grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                  {mc("Episodes", episodes, "Complete training runs")}
                  {mc("Best Score", `${bestEff}%`, "Highest single-episode efficiency", true)}
                  {mc("Avg Recent", `${avgEff}%`, "Moving average of last 5 runs")}
                  {mc("Total Steps", steps.toLocaleString(), "Individual decisions the agent made")}
                </div>

                {/* Agent intelligence metrics — 2x2 grid */}
                {totalPulls > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                    {mc("Exploit Rate", `${exploitRate}%`, "How often agent picks its best option")}
                    {mc("Convergence", convergenceGap < 0.5 ? "Locked" : `Δ${convergenceGap.toFixed(1)}`, convergenceGap < 0.5 ? "Agent found the true best arm" : "Gap between estimate and reality")}
                    {mc("Epsilon", epsilon.toFixed(2), epsilon > 0.5 ? "Still exploring broadly" : epsilon > 0.1 ? "Narrowing down choices" : "Committed to best option")}
                    {mc("Sessions", isLive ? `${hfLog.sessions}` : "1", "Unique agents that have connected")}
                  </div>
                )}

                {/* Learning curve */}
                {chartData.length > 0 ? (
                  <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: "10px", padding: "12px 14px", marginBottom: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "8px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: t.textTertiary }}>Learning Curve</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: showLoc ? t.textTertiary : "#22A55B" }} />
                        <span style={{ fontSize: "8px", color: t.textTertiary }}>{chartLabel}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: "9px", color: t.textTertiary, marginBottom: "6px", lineHeight: 1.4 }}>
                      Score over time. A line going up means the agent is improving. Flat at the top means it mastered the skill.
                    </div>
                    {(() => {
                      const w = 380, h = 90, pl = 28, pr = 8, pt = 4, pb = 14, cw = w - pl - pr, ch = h - pt - pb;
                      const pts = chartData.map((eff, i) => `${pl + (i / Math.max(chartData.length - 1, 1)) * cw},${pt + ch - (Math.min(eff, 100) / 100) * ch}`);
                      const avg: string[] = [];
                      for (let i = 0; i < chartData.length; i++) {
                        const sl = chartData.slice(Math.max(0, i - 4), i + 1);
                        avg.push(`${pl + (i / Math.max(chartData.length - 1, 1)) * cw},${pt + ch - (Math.min(sl.reduce((s, v) => s + v, 0) / sl.length, 100) / 100) * ch}`);
                      }
                      return (
                        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto" }}>
                          {[0, 50, 100].map(v => { const y = pt + ch - (v / 100) * ch; return <g key={v}><line x1={pl} y1={y} x2={w - pr} y2={y} stroke={t.border} strokeWidth={0.5} /><text x={pl - 4} y={y + 3} textAnchor="end" fill={t.textTertiary} fontSize={7}>{v}</text></g>; })}
                          <polyline points={pts.join(" ")} fill="none" stroke={t.accent} strokeWidth={1} opacity={0.2} />
                          {avg.length > 1 && <polyline points={avg.join(" ")} fill="none" stroke={t.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
                        </svg>
                      );
                    })()}
                  </div>
                ) : (
                  <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: "10px", padding: "24px 16px", textAlign: "center", color: t.textTertiary, fontSize: "11px", marginBottom: "12px" }}>
                    Press Train or run <span style={{ fontFamily: "var(--font-mono)", color: t.textSecondary }}>train_agent.py</span>
                  </div>
                )}

                {/* Agent knowledge — arm estimates */}
                {totalPulls > 0 && (
                  <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: "10px", padding: "12px 14px", marginBottom: "12px" }}>
                    <div style={{ fontSize: "8px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: t.textTertiary, marginBottom: "4px" }}>
                      Accuracy per option
                    </div>
                    <div style={{ fontSize: "9px", color: t.textTertiary, marginBottom: "8px", lineHeight: 1.4 }}>
                      6 options exist. Each bar shows how close the agent&apos;s guess (dark) is to the real value (light). Closer = smarter.
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {trainMeans.map((trueMean, i) => {
                        const est = trainAgent.estimates[i];
                        const isBest = i === bestArmIdx;
                        const pulls = trainAgent.pullCounts[i];
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "9px", fontWeight: 600, color: isBest ? t.accent : t.textTertiary, width: "10px" }}>{String.fromCharCode(65 + i)}</span>
                            <div style={{ flex: 1, position: "relative", height: "8px" }}>
                              <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${Math.min(100, trueMean / 10 * 100)}%`, background: t.border, borderRadius: "2px" }} />
                              <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${Math.min(100, est / 10 * 100)}%`, background: isBest ? t.accent : t.textTertiary, borderRadius: "2px", opacity: 0.7 }} />
                            </div>
                            <span style={{ fontSize: "8px", color: t.textSecondary, width: "48px", textAlign: "right" }}>
                              {pulls > 0 ? est.toFixed(1) : "—"}/{trueMean.toFixed(1)}
                            </span>
                            <span style={{ fontSize: "7px", color: t.textTertiary, width: "24px", textAlign: "right" }}>
                              {pulls}×
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recent runs */}
                {episodeList.length > 0 && (
                  <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: "10px", padding: "12px 14px" }}>
                    <div style={{ fontSize: "8px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: t.textTertiary, marginBottom: "4px" }}>Score history</div>
                    <div style={{ fontSize: "9px", color: t.textTertiary, marginBottom: "6px", lineHeight: 1.4 }}>
                      Each bar is one complete game. Higher % = the agent made better decisions. A rising trend means it&apos;s learning.
                    </div>
                    {episodeList.map((ep, i) => {
                      const eff = "efficiency" in ep ? ep.efficiency : 0;
                      const epNum = "episode" in ep ? ep.episode : i;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "3px 0" }}>
                          <span style={{ fontSize: "9px", color: t.textTertiary, width: "18px", flexShrink: 0 }}>{epNum}</span>
                          <div style={{ flex: 1, height: "4px", background: t.border, borderRadius: "2px", overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(eff, 100)}%`, height: "100%", background: t.accent, borderRadius: "2px" }} />
                          </div>
                          <span style={{ fontSize: "10px", fontWeight: 500, color: t.textPrimary, width: "28px", textAlign: "right", flexShrink: 0 }}>{eff}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* LLM Fine-tuning */}
                <div style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: "10px", padding: "12px 14px" }}>
                  <div style={{ fontSize: "8px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: t.textTertiary, marginBottom: "4px" }}>LLM fine-tuning</div>
                  <div style={{ fontSize: "9px", color: t.textTertiary, marginBottom: "8px", lineHeight: 1.4 }}>
                    Beyond epsilon-greedy: fine-tune a language model on this environment using reinforcement learning from live API rewards.
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {[
                      { label: "Model", value: "Qwen2.5-0.5B" },
                      { label: "LoRA", value: "Unsloth (4-bit, r=8)" },
                      { label: "Trainer", value: "TRL GRPOTrainer" },
                      { label: "Reward", value: "Live HF Space MCP" },
                      { label: "Runtime", value: "Colab free tier (T4)" },
                    ].map((row) => (
                      <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "9px", color: t.textTertiary }}>{row.label}</span>
                        <span style={{ fontSize: "9px", fontWeight: 500, color: t.textPrimary }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{
                    marginTop: "10px", paddingTop: "8px", borderTop: `1px solid ${t.border}`,
                    fontSize: "9px", color: t.textTertiary, lineHeight: 1.4,
                  }}>
                    <span style={{ fontFamily: "var(--font-mono, monospace)", color: t.textSecondary, fontSize: "9px" }}>train_llm_agent.ipynb</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
}
