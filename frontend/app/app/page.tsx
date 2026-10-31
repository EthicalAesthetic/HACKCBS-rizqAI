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

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    executeQuery(prompt);
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#070c14] text-text-muted">
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <span className="text-sm">Restoring workspace session…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#070c14] text-text-muted">
        <div className="text-center space-y-4 max-w-sm p-6 rounded-2xl border border-line-soft bg-[#0a101d] shadow-2xl">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-white">Connecting Analyst Workspace</h2>
          <p className="text-xs text-text-muted">Establishing live session with LangGraph & Supabase...</p>
          <div className="pt-2">
            <button
              onClick={() => login("demo@rizq.ai", "password123")}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-semibold text-ink hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
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
  const userName = user.name || "Analyst";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#070c14] text-foreground">
      <WorkspaceSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelect={handleSelectConversation}
        onNewAnalysis={handleNewAnalysis}
        onDelete={handleDeleteConversation}
        isOpenMobile={sidebarOpenMobile}
        onCloseMobile={() => setSidebarOpenMobile(false)}
      />

      {/* Center Chat Terminal */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#080d16] border-x border-[#152030]">
        {/* Mobile Header Bar */}
        <header className="flex lg:hidden items-center justify-between border-b border-[#152030] bg-[#070c14] px-4 py-3">
          <button
            onClick={() => setSidebarOpenMobile(true)}
            className="text-text-muted hover:text-white"
            aria-label="Open sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-display font-bold text-white text-sm">
            Rizq<span className="text-emerald-400">AI</span>
          </span>

          <button
            onClick={() => setRightPanelOpenMobile(true)}
            className="text-text-muted hover:text-white xl:hidden"
            aria-label="Open financial panel"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="15" y1="3" x2="15" y2="21" />
            </svg>
          </button>
        </header>

        {/* Scrollable Chat Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Welcome Greeting Banner */}
          <div className="relative overflow-hidden rounded-2xl border border-[#162234] bg-gradient-to-b from-[#0e1828]/80 to-[#080f1b]/90 p-6 text-center shadow-lg">
            <div className="pointer-events-none absolute inset-0 opacity-15">
              <svg width="100%" height="100%" viewBox="0 0 800 200" preserveAspectRatio="none">
                <path
                  d="M0,100 C150,180 350,20 500,80 C650,140 750,40 800,90 L800,200 L0,200 Z"
                  fill="url(#waveGrad)"
                />
                <defs>
                  <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="relative z-10 space-y-2">
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
                Welcome back, {userName} <span className="text-2xl">👋</span>
              </h2>
              <p className="text-xs sm:text-sm text-text-muted max-w-md mx-auto">
                Ask about any stock, financial statement, or macro trend for deep multi-agent research.
              </p>

              {/* Quick Prompt Chips */}
              <div className="pt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => handleQuickPrompt("Analyze Apple (AAPL) stock")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#1a283e] bg-[#0d1624] px-3.5 py-2 text-xs font-medium text-text hover:border-emerald-500/40 hover:text-emerald-300 hover:bg-[#121e32] transition-colors"
                >
                  <span></span> Analyze Apple (AAPL)
                </button>
                <button
                  onClick={() => handleQuickPrompt("Analyze Microsoft (MSFT) valuation and risks")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#1a283e] bg-[#0d1624] px-3.5 py-2 text-xs font-medium text-text hover:border-emerald-500/40 hover:text-emerald-300 hover:bg-[#121e32] transition-colors"
                >
                  <span>📊</span> Analyze Microsoft (MSFT)
                </button>
                <button
                  onClick={() => handleQuickPrompt("Compare NVIDIA (NVDA) growth potential vs risks")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#1a283e] bg-[#0d1624] px-3.5 py-2 text-xs font-medium text-text hover:border-emerald-500/40 hover:text-emerald-300 hover:bg-[#121e32] transition-colors"
                >
                  <span>⚡</span> NVIDIA (NVDA) Growth
                </button>
                <button
                  onClick={() => handleQuickPrompt("Explain options trading strategies for portfolio hedging")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#1a283e] bg-[#0d1624] px-3.5 py-2 text-xs font-medium text-text hover:border-emerald-500/40 hover:text-emerald-300 hover:bg-[#121e32] transition-colors"
                >
                  <span>💡</span> Explain Options Hedging
                </button>
              </div>
            </div>
          </div>

          {/* Chat Messages Stream */}
          {historyLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-xs text-text-faint">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-dot" />
              Loading research thread…
            </div>
          ) : turns.map((turn, index) => (
              <div key={turn.id || index} className="space-y-4 pt-2">
                {/* User Message (Stage Research Query) */}
                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-400 font-semibold pr-1">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] border border-emerald-500/40">
                      {index + 1}
                    </span>
                    <span>STAGE {index + 1} RESEARCH QUERY</span>
                  </div>
                  <div className="flex justify-end items-end gap-2.5 w-full">
                    <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-sm border border-[#1e304b] bg-[#101b2c] p-4 text-xs sm:text-sm text-white shadow-md">
                      <p className="leading-relaxed">{turn.query}</p>
                    </div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 text-xs font-bold text-white shadow-sm">
                      {userInitial}
                    </div>
                  </div>
                </div>

                {/* Multi-Agent Assistant Output & Next Stage */}
                <WorkspaceCard 
                  turn={turn} 
                  turnIndex={index}
                  isLatest={index === turns.length - 1}
                  onExecuteNextStage={(q) => executeQuery(q)}
                />
              </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Bottom Floating Query Input */}
        <div className="p-4 sm:p-5 bg-gradient-to-t from-[#070c14] via-[#070c14]/95 to-transparent">
          <WorkspaceInput
            value={input}
            onChange={setInput}
            onSubmit={() => executeQuery(input)}
            disabled={isStreaming}
          />
        </div>
      </div>

      {/* 3. Right Panel (News, Financials, Analysis) */}
      <WorkspaceRightPanel
        activeTurn={activeTurn}
        isOpenMobile={rightPanelOpenMobile}
        onCloseMobile={() => setRightPanelOpenMobile(false)}
      />
    </div>
  );
}
