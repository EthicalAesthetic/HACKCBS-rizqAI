"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import {
  checkHealth,
  createConversation,
  deleteConversation,
  getMessages,
  listConversations,
  resolveLatestConversationId,
  streamMessage,
  type StreamEvent,
} from "@/lib/api";
import type { AgentTask, AnalysisTurn, ConversationListItem } from "@/lib/types";
import { reconstructTurns } from "@/lib/parseHistory";
import { summarizeEvent } from "@/lib/streamLog";
import WorkspaceSidebar from "@/components/workspace/WorkspaceSidebar";
import WorkspaceRightPanel from "@/components/workspace/WorkspaceRightPanel";
import WorkspaceCard from "@/components/workspace/WorkspaceCard";
import WorkspaceInput from "@/components/workspace/WorkspaceInput";

const AGENT_TASK_VALUES: AgentTask[] = [
  "research_agent",
  "risk_agent",
  "debate_agent",
  "thesis_agent",
];

function newTurn(query: string): AnalysisTurn {
  return {
    id: crypto.randomUUID(),
    query,
    status: "streaming",
    error: null,
    guardrail: null,
    plan: null,
    research: null,
    risks: null,
    debate: null,
    thesis: null,
    generalFinance: null,
    completedTasks: [],
    events: [],
  };
}

function applyEvent(turn: AnalysisTurn, event: StreamEvent): AnalysisTurn {
  const { summary, success } = summarizeEvent(event);
  const turnWithLog: AnalysisTurn = {
    ...turn,
    events: [
      ...turn.events,
      { id: crypto.randomUUID(), node: event.node, timestamp: Date.now(), summary, success },
    ],
  };

  if (event.node === "done") {
    return turnWithLog.status === "error" ? turnWithLog : { ...turnWithLog, status: "done" };
  }

  if (event.node === "error") {
    return { ...turnWithLog, status: "error", error: event.error ?? "Something went wrong." };
  }

  const data = event.data;
  if (!data) return turnWithLog;

  const next: AnalysisTurn = { ...turnWithLog };

  if (data.guardrail) next.guardrail = data.guardrail;
  if (data.plan) next.plan = data.plan;
  if (data.research) next.research = data.research;
  if (data.risks) next.risks = data.risks;
  if (data.debate) next.debate = data.debate;
  if (data.thesis) next.thesis = data.thesis;
  if (data.general_finance) next.generalFinance = data.general_finance;

  if (data.success === false) {
    next.status = "error";
    next.error = data.error ?? "The desk encountered an error.";
    return next;
  }

  if (AGENT_TASK_VALUES.includes(event.node as AgentTask)) {
    const task = event.node as AgentTask;
    if (!next.completedTasks.includes(task)) {
      next.completedTasks = [...next.completedTasks, task];
    }
  }

  return next;
}

const PLAYBOOKS = [
  {
    category: "Equity Deep-Dive",
    ticker: "AAPL",
    label: "Apple Inc. Capital Return & Valuation",
    query: "Analyze Apple (AAPL) stock valuation, free cash flow and investment risks",
    tag: "FUNDAMENTALS",
  },
  {
    category: "Head-to-Head",
    ticker: "NVDA vs AMD",
    label: "NVIDIA vs AMD Growth & Margins",
    query: "Compare NVIDIA (NVDA) vs AMD growth potential, valuation multiples and risks",
    tag: "COMPARISON",
  },
  {
    category: "Risk & Drawdown",
    ticker: "TSLA",
    label: "Tesla Volatility, Sharpe & Drawdown",
    query: "Analyze Tesla (TSLA) risk profile: volatility, 1-year max drawdown and beta",
    tag: "QUANT RISK",
  },
  {
    category: "Financial Statements",
    ticker: "MSFT",
    label: "Microsoft 3-Statement Balance Sheet",
    query: "Analyze Microsoft (MSFT) financial statements: revenue, debt-to-equity and operating margins",
    tag: "SEC FILINGS",
  },
];

export default function WorkspacePage() {
  const router = useRouter();
  const { user, login, isLoading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [turns, setTurns] = useState<AnalysisTurn[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);
  const [rightPanelOpenMobile, setRightPanelOpenMobile] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasAutoSelectedRef = useRef(false);

  const refreshConversations = useCallback(async () => {
    try {
      const list = await listConversations();
      setConversations(list);
    } catch {
      // Ignore unauthorized or network errors during refresh
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      login("demo@rizq.ai", "password123").catch(() => {});
    }
  }, [authLoading, user, login]);

  useEffect(() => {
    if (user) {
      checkHealth().catch(() => {});
      listConversations()
        .then((list) => {
          setConversations(list);
          if (list.length > 0 && !hasAutoSelectedRef.current && !activeConversationId) {
            hasAutoSelectedRef.current = true;
            handleSelectConversation(list[0].id);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  // Global Keyboard Shortcuts (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        handleNewAnalysis();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleNewAnalysis() {
    setSidebarOpenMobile(false);
    setInput("");
    try {
      const newConv = await createConversation("New Analysis");
      setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== newConv.id)]);
      setActiveConversationId(newConv.id);
      setTurns([]);
    } catch {
      setActiveConversationId(crypto.randomUUID());
      setTurns([]);
    }
  }

  async function handleSelectConversation(id: string) {
    setSidebarOpenMobile(false);
    if (id === activeConversationId) return;

    setActiveConversationId(id);
    setHistoryLoading(true);

    try {
      const messages = await getMessages(id);
      setTurns(reconstructTurns(messages));
    } catch {
      setTurns([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleDeleteConversation(id: string) {
    try {
      await deleteConversation(id);
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setTurns([]);
      }
      await refreshConversations();
    } catch {
      // Non-fatal
    }
  }

  const executeQuery = async (queryText: string) => {
    const query = queryText.trim();
    if (!query || isStreaming) return;

    const turn = newTurn(query);
    const startingConversationId = activeConversationId;
    setTurns((prev) => [...prev, turn]);
    setInput("");
    setIsStreaming(true);

    try {
      await streamMessage(query, startingConversationId, (event) => {
        setTurns((prev) => prev.map((t) => (t.id === turn.id ? applyEvent(t, event) : t)));
      });
      if (!startingConversationId) {
        try {
          const resolvedId = await resolveLatestConversationId();
          if (resolvedId) setActiveConversationId(resolvedId);
        } catch {
          // Non-fatal
        }
      }
      await refreshConversations();
    } catch (err) {
      setTurns((prev) =>
        prev.map((t) =>
          t.id === turn.id
            ? {
                ...t,
                status: "error",
                error: err instanceof Error ? err.message : "Network error.",
              }
            : t
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleLaunchPlaybook = (query: string) => {
    setInput(query);
    executeQuery(query);
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#060b13] text-[#70849c]">
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <span className="text-xs font-mono">Restoring institutional workspace session…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#060b13] text-text-muted">
        <div className="text-center space-y-4 max-w-sm p-6 rounded-2xl border border-[#162234] bg-[#09111c] shadow-2xl">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-white">Connecting Analyst Terminal</h2>
          <p className="text-xs text-text-muted">Establishing live session with LangGraph & Supabase...</p>
          <div className="pt-2">
            <button
              onClick={() => login("demo@rizq.ai", "password123")}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-semibold text-black hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
            >
              <span>⚡</span> Connect to Workspace
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeTurn = turns.length > 0 ? turns[turns.length - 1] : null;
  const userInitial = (user.name || "A").slice(0, 1).toUpperCase();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#060b13] text-foreground">
      <WorkspaceSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelect={handleSelectConversation}
        onNewAnalysis={handleNewAnalysis}
        onDelete={handleDeleteConversation}
        isOpenMobile={sidebarOpenMobile}
        onCloseMobile={() => setSidebarOpenMobile(false)}
      />

      {/* Center Intelligence Terminal */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#070d17] border-x border-[#141f2e]">
        {/* Top Market Bar & Mobile Navigation */}
        <header className="flex items-center justify-between border-b border-[#131f2f] bg-[#050b13] px-3 sm:px-5 py-2">
          {/* Mobile hamburger */}
          <div className="flex lg:hidden items-center gap-2.5">
            <button
              onClick={() => setSidebarOpenMobile(true)}
              className="p-1 text-[#70849c] hover:text-white"
              aria-label="Open sidebar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <span className="font-display font-bold text-white text-xs">
              Rizq<span className="text-emerald-400">AI</span>
            </span>
          </div>

          {/* Desktop Market Indices Ribbon */}
          <div className="hidden lg:flex items-center gap-5 font-mono text-[11px] overflow-x-auto">
            <div className="flex items-center gap-1.5 text-[#8fa2ba]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="font-semibold text-white">S&P 500</span>
              <span className="text-[#a4b6cb]">5,864.67</span>
              <span className="text-emerald-400 font-semibold">+0.41%</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#8fa2ba]">
              <span className="font-semibold text-white">NASDAQ</span>
              <span className="text-[#a4b6cb]">18,518.61</span>
              <span className="text-emerald-400 font-semibold">+0.56%</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#8fa2ba]">
              <span className="font-semibold text-white">US 10Y</span>
              <span className="text-[#a4b6cb]">4.28%</span>
              <span className="text-emerald-400 font-semibold">-1.8 bps</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#8fa2ba]">
              <span className="font-semibold text-white">CBOE VIX</span>
              <span className="text-[#a4b6cb]">15.34</span>
              <span className="text-emerald-400 font-semibold">-3.2%</span>
            </div>
          </div>

          {/* Right Header Status */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>DESK ACTIVE</span>
            </div>

            <button
              onClick={() => setRightPanelOpenMobile(true)}
              className="p-1 text-[#70849c] hover:text-white xl:hidden"
              aria-label="Open financial panel"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
            </button>
          </div>
        </header>

        {/* Scrollable Research Terminal Area */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-8 py-5 space-y-5">
          {/* Empty State / Terminal Launchpad */}
          {turns.length === 0 && !historyLoading && (
            <div className="space-y-5 py-4">
              {/* Terminal Title Block */}
              <div className="rounded-2xl border border-[#162335] bg-[#08111c] p-5 sm:p-7 shadow-xl space-y-2">
                <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-400">
                  <span>◈</span>
                  <span>Institutional Research Desk</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Autonomous Multi-Agent Equity Intelligence
                </h1>
                <p className="text-xs sm:text-[13px] text-[#8fa2ba] max-w-2xl leading-relaxed">
                  Real-time market feeds, 3-statement balance sheets, RSI & MACD technical indicators, 
                  quantitative risk metrics, and adversarial Bull/Bear debate consensus.
                </p>
              </div>

              {/* Research Playbooks Grid */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between font-mono text-[11px] text-[#556980] px-1">
                  <span>SELECT AN ANALYTICAL PLAYBOOK OR QUERY DIRECTLY BELOW</span>
                  <span>4 PRESETS</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PLAYBOOKS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleLaunchPlaybook(p.query)}
                      className="group flex flex-col justify-between rounded-xl border border-[#152233] bg-[#070e18] p-4 text-left transition-all hover:border-emerald-500/40 hover:bg-[#0c1626] cursor-pointer shadow-sm"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="rounded bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-emerald-300">
                            {p.ticker}
                          </span>
                          <span className="font-mono text-[9px] uppercase tracking-wider text-[#556980] group-hover:text-emerald-400/80 transition-colors">
                            {p.tag}
                          </span>
                        </div>
                        <h3 className="text-xs sm:text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                          {p.label}
                        </h3>
                        <p className="text-[11px] text-[#70849c] line-clamp-2 leading-relaxed">
                          {p.query}
                        </p>
                      </div>

                      <div className="pt-3 flex items-center gap-1 font-mono text-[10px] text-emerald-400 group-hover:translate-x-1 transition-transform">
                        <span>Launch Multi-Agent Analysis</span>
                        <span>→</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Chat Messages Stream */}
          {historyLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-xs text-[#556980] font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-dot" />
              Loading research thread telemetry…
            </div>
          ) : (
            turns.map((turn, index) => (
              <div key={turn.id || index} className="space-y-4 pt-1">
                {/* User Message */}
                <div className="flex justify-end items-end gap-2.5 w-full">
                  <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-sm border border-[#18263a] bg-[#0c1626] p-3.5 sm:p-4 text-xs sm:text-sm text-white shadow-md">
                    <p className="leading-relaxed">{turn.query}</p>
                  </div>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 text-xs font-bold text-white shadow-sm">
                    {userInitial}
                  </div>
                </div>

                {/* Multi-Agent Assistant Output */}
                <WorkspaceCard turn={turn} />
              </div>
            ))
          )}

          <div ref={bottomRef} />
        </div>

        {/* Bottom Floating Command Bar */}
        <div className="p-3 sm:p-4 bg-gradient-to-t from-[#060b13] via-[#060b13]/95 to-transparent">
          <WorkspaceInput
            value={input}
            onChange={setInput}
            onSubmit={() => executeQuery(input)}
            disabled={isStreaming}
          />
        </div>
      </div>

      {/* 3. Right Panel (News, Financials, Technicals) */}
      <WorkspaceRightPanel
        activeTurn={activeTurn}
        isOpenMobile={rightPanelOpenMobile}
        onCloseMobile={() => setRightPanelOpenMobile(false)}
      />
    </div>
  );
}
