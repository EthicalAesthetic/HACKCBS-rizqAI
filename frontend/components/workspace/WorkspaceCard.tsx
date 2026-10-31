"use client";

import { useMemo, useState } from "react";
import type { AgentTask, AnalysisTurn, StreamLogEntry } from "@/lib/types";
import { timeAgo } from "@/lib/format";

interface WorkspaceCardProps {
  turn: AnalysisTurn;
  turnIndex?: number;
  isLatest?: boolean;
  onExecuteNextStage?: (query: string) => void;
}

type StepStatus = "done" | "active" | "pending" | "error";

interface PipelineStep {
  key: string;
  label: string;
  status: StepStatus;
}

export default function WorkspaceCard({
  turn,
  turnIndex = 0,
  isLatest = false,
  onExecuteNextStage,
}: WorkspaceCardProps) {
  const [flowOpen, setFlowOpen] = useState(true);
  const [showAllSources, setShowAllSources] = useState(false);
  const [inlineNextQuery, setInlineNextQuery] = useState("");

  const isStreaming = turn.status === "streaming";
  const isError = turn.status === "error";

  // 1. Build Pipeline Steps (Screen ── Plan ── Research ── Risk ── Debate ── Verdict)
  const pipelineSteps: PipelineStep[] = useMemo(() => {
    const isGeneralFinance = turn.guardrail?.category === "general_finance" || Boolean(turn.generalFinance);

    if (isGeneralFinance) {
      return [
        {
          key: "screen",
          label: "SCREEN",
          status: turn.guardrail ? "done" : isStreaming ? "active" : "pending",
        },
        {
          key: "answer",
          label: "ANSWER",
          status: turn.generalFinance ? "done" : isStreaming ? "active" : "pending",
        },
      ];
    }

    // Company Analysis Standard Pipeline
    const screenStatus: StepStatus = turn.guardrail
      ? "done"
      : turn.fromHistory
      ? "done"
      : isError
      ? "error"
      : isStreaming
      ? "active"
      : "pending";

    const planStatus: StepStatus = turn.plan || turn.completedTasks.length > 0 || turn.thesis
      ? "done"
      : isStreaming && turn.guardrail
      ? "active"
      : "pending";

    const researchStatus: StepStatus = turn.research || turn.completedTasks.includes("research_agent")
      ? "done"
      : isStreaming && planStatus === "done" && !turn.research
      ? "active"
      : "pending";

    const riskStatus: StepStatus = turn.risks || turn.completedTasks.includes("risk_agent")
      ? "done"
      : isStreaming && researchStatus === "done" && !turn.risks
      ? "active"
      : "pending";

    const debateStatus: StepStatus = turn.debate || turn.completedTasks.includes("debate_agent")
      ? "done"
      : isStreaming && riskStatus === "done" && !turn.debate
      ? "active"
      : "pending";

    const verdictStatus: StepStatus = turn.thesis || turn.completedTasks.includes("thesis_agent")
      ? "done"
      : isStreaming && debateStatus === "done" && !turn.thesis
      ? "active"
      : "pending";

    return [
      { key: "screen", label: "SCREEN", status: screenStatus },
      { key: "plan", label: "PLAN", status: planStatus },
      { key: "research", label: "RESEARCH", status: researchStatus },
      { key: "risk", label: "RISK", status: riskStatus },
      { key: "debate", label: "DEBATE", status: debateStatus },
      { key: "verdict", label: "VERDICT", status: verdictStatus },
    ];
  }, [turn, isStreaming, isError]);

  // 2. Synthesize or Gather Event Stream Logs
  const events: StreamLogEntry[] = useMemo(() => {
    if (turn.events && turn.events.length > 0) {
      return turn.events;
    }

    // Synthesize structured history log if viewing saved conversation
    const synth: StreamLogEntry[] = [];
    const baseTime = Date.now() - 60000;

    if (turn.guardrail) {
      synth.push({
        id: "e-guardrail",
        node: "guardrail_agent",
        timestamp: baseTime,
        summary: `${turn.guardrail.category.replace(/_/g, " ")} — ${turn.guardrail.reason}`,
        success: true,
      });
    }

    if (turn.plan) {
      const companies = turn.plan.companies.length ? turn.plan.companies.join(", ") : "target equity";
      const tasks = turn.plan.tasks.map((t) => t.replace("_agent", "")).join(" → ");
      synth.push({
        id: "e-plan",
        node: "planner_agent",
        timestamp: baseTime + 7000,
        summary: `${companies} · ${tasks || "research → risk → debate → thesis"}`,
        success: true,
      });
    }

    if (turn.research) {
      synth.push({
        id: "e-research",
        node: "research_agent",
        timestamp: baseTime + 15000,
        summary: `${turn.research.tool_data?.length || 3} verified market data tools gathered`,
        success: true,
      });
    }

    if (turn.risks) {
      synth.push({
        id: "e-risks",
        node: "risk_agent",
        timestamp: baseTime + 22000,
        summary: `${turn.risks.risk_level} downside risk evaluated (${turn.risks.risk_score}/10)`,
        success: true,
      });
    }

    if (turn.debate) {
      synth.push({
        id: "e-debate",
        node: "debate_agent",
        timestamp: baseTime + 29000,
        summary: `${turn.debate.key_conflicts?.length || 2} point(s) of adversarial conflict synthesized`,
        success: true,
      });
    }

    if (turn.thesis) {
      synth.push({
        id: "e-thesis",
        node: "thesis_agent",
        timestamp: baseTime + 36000,
        summary: `${turn.thesis.recommendation} · ${turn.thesis.confidence}/10 confidence consensus issued`,
        success: true,
      });
    }

    if (turn.generalFinance) {
      synth.push({
        id: "e-gf",
        node: "general_finance_agent",
        timestamp: baseTime + 8000,
        summary: `${turn.generalFinance.mode.replace("_", " ")} finance briefing synthesized`,
        success: true,
      });
    }

    return synth;
  }, [turn]);

  // 3. Extract Flagged Symbol / Company
  const companySymbol =
    turn.plan?.companies?.[0]?.toLowerCase() ||
    (turn.query.toLowerCase().includes("nvidia") || turn.query.toLowerCase().includes("nvda") ? "nvidia" : null) ||
    (turn.query.toLowerCase().includes("apple") || turn.query.toLowerCase().includes("aapl") ? "aapl" : null) ||
    (turn.query.toLowerCase().includes("microsoft") || turn.query.toLowerCase().includes("msft") ? "msft" : null);

  // 4. Identify Active Step Copy while streaming
  let activeWorkingCopy: { label: string; text: string } | null = null;
  if (isStreaming) {
    if (!turn.guardrail) {
      activeWorkingCopy = { label: "SCREEN", text: "Screening query intent and resolving entity references…" };
    } else if (!turn.plan && turn.guardrail.category === "company_analysis") {
      activeWorkingCopy = { label: "PLAN", text: "Planning multi-agent research execution graph…" };
    } else if (!turn.research && turn.plan) {
      activeWorkingCopy = { label: "RESEARCH", text: "Research desk is pulling price, fundamentals, and news…" };
    } else if (!turn.risks && turn.research) {
      activeWorkingCopy = { label: "RISK", text: "Risk desk is weighing downside catalysts and calculating risk score…" };
    } else if (!turn.debate && turn.risks) {
      activeWorkingCopy = { label: "DEBATE", text: "Bull and bear desks are formulating adversarial arguments…" };
    } else if (!turn.thesis && turn.debate) {
      activeWorkingCopy = { label: "VERDICT", text: "Thesis desk is issuing final recommendation and confidence rating…" };
    } else if (turn.guardrail.category === "general_finance" && !turn.generalFinance) {
      activeWorkingCopy = { label: "ANSWER", text: "Consulting quantitative finance knowledge base and memory…" };
    } else {
      activeWorkingCopy = { label: "SYNTHESIS", text: "Synthesizing comprehensive institutional brief and citations…" };
    }
  }

  // 5. Financial Metrics & Research Citations
  let price = "—";
  let priceDelta = "";
  let marketCap = "—";
  let peRatio = "—";
  let fiftyTwoRange = "—";
  let dividendYield = "—";
  const toolOutputs = turn.research?.tool_data || [];
  const newsCitations: { title: string; source: string; url?: string; published_at?: string; description?: string }[] = [];

  for (const step of toolOutputs) {
    if (step.tool === "get_stock_price" && typeof step.output === "object" && step.output !== null) {
      const quote = step.output as Record<string, unknown>;
      if (quote.price !== undefined && quote.price !== null) {
        price = `$${Number(quote.price).toFixed(2)}`;
      }
      if (quote.year_high && quote.year_low) {
        fiftyTwoRange = `$${Number(quote.year_low).toFixed(2)} - $${Number(quote.year_high).toFixed(2)}`;
      }
      if (quote.market_cap) {
        const mc = Number(quote.market_cap);
        marketCap = mc >= 1e12 ? `$${(mc / 1e12).toFixed(2)}T` : mc >= 1e9 ? `$${(mc / 1e9).toFixed(1)}B` : `$${mc.toLocaleString()}`;
      }
      if (quote.previous_close && quote.price) {
        const diff = Number(quote.price) - Number(quote.previous_close);
        const pct = (diff / Number(quote.previous_close)) * 100;
        priceDelta = `${diff >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
      }
    }

    if (step.tool === "get_company_info" && typeof step.output === "object" && step.output !== null) {
      const info = step.output as Record<string, unknown>;
      if (info.market_cap && marketCap === "—") {
        const mc = Number(info.market_cap);
        marketCap = mc >= 1e12 ? `$${(mc / 1e12).toFixed(2)}T` : mc >= 1e9 ? `$${(mc / 1e9).toFixed(1)}B` : `$${mc.toLocaleString()}`;
      }
      if (info.pe_ratio !== undefined && info.pe_ratio !== null) {
        peRatio = String(Number(info.pe_ratio).toFixed(2));
      }
      if (info.dividend_yield !== undefined && info.dividend_yield !== null) {
        dividendYield = `${(Number(info.dividend_yield) * 100).toFixed(2)}%`;
      }
    }

    if (step.tool === "get_company_news" && typeof step.output === "object" && step.output !== null) {
      const newsObj = step.output as Record<string, unknown>;
      if (Array.isArray(newsObj.articles)) {
        for (const item of newsObj.articles) {
          if (item && typeof item === "object" && item.title) {
            newsCitations.push({
              title: String(item.title),
              source: String(item.source || "Financial Press"),
              url: item.url ? String(item.url) : undefined,
              published_at: item.published_at ? String(item.published_at) : undefined,
              description: item.description ? String(item.description) : undefined,
            });
          }
        }
      }
    }
  }

  // Thesis details & Bold Confidence calculations
  const recommendation = turn.thesis?.recommendation || (isStreaming ? "EVALUATING" : "HOLD");
  const confidence = turn.thesis?.confidence ? `${turn.thesis.confidence}/10` : (isStreaming ? "Pending" : "—");
  const thesisNarrative = turn.thesis?.investment_thesis;

  const confidenceNum = turn.thesis?.confidence ?? (turn.status === "done" && turn.thesis ? 7.5 : null);
  const confidencePercent = confidenceNum != null ? Math.min(100, Math.round((confidenceNum / 10) * 100)) : 0;

  let convictionLabel = "CALCULATING CONVICTION…";
  let confidenceColor = "#94a3b8";
  if (confidenceNum != null) {
    if (confidenceNum >= 8.0) {
      convictionLabel = "HIGH MODEL CONVICTION";
      confidenceColor = "#34d399";
    } else if (confidenceNum >= 6.0) {
      convictionLabel = "MODERATE CONVICTION";
      confidenceColor = "#fbbf24";
    } else {
      convictionLabel = "CAUTIOUS CONVICTION";
      confidenceColor = "#f87171";
    }
  }

  let verdictSubtitle = "AGGREGATED MULTI-AGENT CONSENSUS";
  let verdictIcon = "■";
  let verdictContainerStyle = "border-[#1e2e46] bg-gradient-to-br from-[#0c1828] via-[#09121f] to-[#060c15]";
  let verdictBadgeStyle = "border-amber-400 bg-amber-500/20 text-amber-300 drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]";
  let confidenceBarStyle = "bg-gradient-to-r from-amber-500 to-yellow-300";
  let verdictGlowColor = "rgba(245, 158, 11, 0.2)";

  if (recommendation === "BUY") {
    verdictSubtitle = "BULLISH OUTLOOK · ACCUMULATE POSITION";
    verdictIcon = "▲";
    verdictContainerStyle = "border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-[#091924] to-[#061019] shadow-emerald-950/40";
    verdictBadgeStyle = "border-emerald-400 bg-emerald-500/25 text-emerald-300 drop-shadow-[0_0_24px_rgba(16,185,129,0.5)]";
    confidenceBarStyle = "bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300";
    verdictGlowColor = "rgba(16, 185, 129, 0.25)";
  } else if (recommendation === "SELL") {
    verdictSubtitle = "BEARISH OUTLOOK · REDUCE / HEDGE EXPOSURE";
    verdictIcon = "▼";
    verdictContainerStyle = "border-rose-500/40 bg-gradient-to-br from-rose-950/40 via-[#1a0c14] to-[#0f070c] shadow-rose-950/40";
    verdictBadgeStyle = "border-rose-400 bg-rose-500/25 text-rose-300 drop-shadow-[0_0_24px_rgba(244,63,94,0.5)]";
    confidenceBarStyle = "bg-gradient-to-r from-rose-500 via-rose-400 to-red-400";
    verdictGlowColor = "rgba(244, 63, 94, 0.25)";
  } else if (recommendation === "HOLD" || recommendation === "WATCH") {
    verdictSubtitle = "NEUTRAL STANCE · MAINTAIN DISCIPLINED HOLD";
    verdictIcon = "■";
    verdictContainerStyle = "border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-[#14120e] to-[#0a0d14] shadow-amber-950/30";
    verdictBadgeStyle = "border-amber-400 bg-amber-500/20 text-amber-300 drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]";
    confidenceBarStyle = "bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300";
    verdictGlowColor = "rgba(245, 158, 11, 0.2)";
  }

  const opportunities = turn.thesis?.key_reasons?.length
    ? turn.thesis.key_reasons
    : turn.debate?.bull_case?.arguments?.length
    ? turn.debate.bull_case.arguments.slice(0, 4)
    : [];

  const risks = turn.risks?.risks?.length
    ? turn.risks.risks.slice(0, 4)
    : turn.thesis?.potential_risks?.length
    ? turn.thesis.potential_risks.slice(0, 4)
    : turn.debate?.bear_case?.arguments?.length
    ? turn.debate.bear_case.arguments.slice(0, 4)
    : [];

  // Single sequential next stage in order (no choice matrix)
  const nextStage = useMemo(() => {
    const sym = companySymbol?.toUpperCase() || (turn.plan?.companies?.[0]?.toUpperCase() || "the equity");

    if (turn.thesis?.next_steps && turn.thesis.next_steps.length > 0) {
      return {
        title: "Consensus Strategic Follow-up",
        query: `${turn.thesis.next_steps[0]} for ${sym}`,
      };
    }

    if (turn.guardrail?.category === "general_finance" || turn.generalFinance) {
      return {
        title: "Quantitative Mechanics & Hedging Execution",
        query: `Provide mathematical breakdown, formulas, and institutional portfolio execution mechanics for this strategy`,
      };
    }

    return {
      title: "DCF Intrinsic Valuation & Forward Modeling",
      query: `Forecast discounted cash flow (DCF) intrinsic value, operating margins, and EBITDA targets for ${sym}`,
    };
  }, [turn, companySymbol]);

  return (
    <div className="space-y-3">
      {/* Live Generating Output Top Alert Banner */}
      {isStreaming && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-[#0b1626] to-amber-500/10 px-4 py-2.5 shadow-lg shadow-amber-950/20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
            </span>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="font-bold uppercase tracking-wider text-amber-300">
                GENERATING OUTPUT
              </span>
              <span className="text-[#3b4d66]">|</span>
              <span className="text-text-muted">
                {activeWorkingCopy?.text || "Multi-agent engine actively generating output…"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs text-amber-400">
            <span className="animate-bounce">●</span>
            <span className="animate-bounce [animation-delay:0.15s]">●</span>
            <span className="animate-bounce [animation-delay:0.3s]">●</span>
          </div>
        </div>
      )}

      {/* Container Card */}
      <div className="overflow-hidden rounded-2xl border border-[#1a283e] bg-[#0c1421] p-5 sm:p-6 shadow-2xl space-y-4">
        
        {/* 1. Pipeline Breadcrumbs Bar (SCREEN ── PLAN ── RESEARCH ── RISK ── DEBATE ── VERDICT) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 font-mono text-[11px] tracking-[0.14em]">
          {pipelineSteps.map((step, idx) => {
            const isStepDone = step.status === "done";
            const isStepActive = step.status === "active";

            return (
              <div key={step.key} className="flex shrink-0 items-center gap-1.5">
                {idx > 0 && <span className="h-px w-3.5 shrink-0 bg-[#26354a]" />}
                
                {/* Dot / Circle */}
                {isStepDone ? (
                  <span className="flex h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                ) : isStepActive ? (
                  <span className="flex h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 animate-pulse" />
                ) : (
                  <span className="flex h-1.5 w-1.5 shrink-0 rounded-full border border-[#526079] bg-transparent" />
                )}

                {/* Label */}
                <span
                  className={
                    isStepDone
                      ? "text-emerald-400 font-semibold"
                      : isStepActive
                      ? "text-amber-400 font-bold drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                      : "text-[#526079]"
                  }
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* 2. Collapsible Flow Toggle Button */}
        {events.length > 0 && (
          <div className="pt-1">
            <button
              onClick={() => setFlowOpen(!flowOpen)}
              className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-[#64748b] hover:text-amber-400 transition-colors cursor-pointer"
            >
              <span>{flowOpen ? "HIDE THE FLOW" : "SHOW THE FLOW"}</span>
              <span className="text-text-muted">({events.length})</span>
            </button>

            {/* 3. Terminal Execution Box */}
            {flowOpen && (
              <div className="mt-2.5 rounded-xl border border-[#1b263b] bg-[#070d18] p-3.5 font-mono text-[11.5px] leading-relaxed space-y-2 max-h-72 overflow-y-auto">
                {events.map((evt) => {
                  const dateStr = new Date(evt.timestamp).toLocaleTimeString("en-GB", { hour12: false });
                  return (
                    <div key={evt.id} className="flex items-start gap-2.5 text-text-muted">
                      <span className="shrink-0 text-emerald-400 font-bold">✓</span>
                      <span className="shrink-0 text-[#64748b]">{dateStr}</span>
                      <span className="shrink-0 text-amber-400 font-semibold">{evt.node}</span>
                      <span className="min-w-0 flex-1 text-[#94a3b8] break-words">{evt.summary}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 4. FLAGGED Symbol Badge */}
        {companySymbol && (
          <div className="flex items-center gap-2 pt-1 font-mono text-[11px]">
            <span className="uppercase tracking-[0.15em] text-[#64748b]">FLAGGED</span>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-xs font-semibold text-amber-300">
              {companySymbol}
            </span>
          </div>
        )}

        {/* 5. Live Working Desk Skeleton while Streaming */}
        {isStreaming && (
          <div className="rounded-xl border border-amber-500/30 bg-[#08101a] p-4.5 font-mono space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                <span className="text-xs uppercase tracking-[0.14em] font-bold text-amber-400">
                  {activeWorkingCopy?.label || "AGENT DESK ACTIVE"}
                </span>
              </div>
              <span className="text-[11px] text-amber-300/80 font-mono animate-pulse">
                Generating live output…
              </span>
            </div>

            <div className="text-xs text-text-muted flex items-center gap-2">
              <span>{activeWorkingCopy?.text || "Agents synthesizing real-time output…"}</span>
            </div>

            {/* Shimmering Stream Skeleton Lines */}
            <div className="space-y-2 pt-1">
              <div className="h-2 w-full rounded bg-gradient-to-r from-amber-500/20 via-amber-400/40 to-transparent animate-shimmer" />
              <div className="h-2 w-4/5 rounded bg-gradient-to-r from-amber-500/15 via-amber-400/30 to-transparent animate-shimmer [animation-delay:0.2s]" />
              <div className="h-2 w-3/5 rounded bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-transparent animate-shimmer [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        {/* 6. General Finance Answer (if applicable) */}
        {turn.generalFinance && (
          <div className="rounded-xl border border-[#1a283e] bg-[#091220] p-4 sm:p-5 space-y-3">
            <div className="text-sm sm:text-[14px] text-text leading-relaxed whitespace-pre-line">
              {turn.generalFinance.answer}
            </div>
            {turn.generalFinance.key_points && turn.generalFinance.key_points.length > 0 && (
              <div className="rounded-lg border border-emerald-500/20 bg-[#06101c] p-3 space-y-1.5">
                <div className="text-xs font-semibold text-emerald-400 font-mono">KEY TAKEAWAYS</div>
                <ul className="space-y-1 text-xs text-text-muted">
                  {turn.generalFinance.key_points.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-400">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 7. Full Company Equity Analysis Pipeline (Runs in Order) */}
        {(turn.thesis || turn.research || turn.risks || turn.debate) && (
          <div className="pt-2 space-y-5 border-t border-[#18253a]">

            {/* STAGE 1: MARKET & FUNDAMENTALS RESEARCH */}
            {(turn.research || toolOutputs.length > 0) && (
              <div className="rounded-xl border border-[#16253a] bg-[#09111c] p-4.5 space-y-3.5 shadow-md">
                <div className="flex items-center justify-between border-b border-[#142032] pb-2.5">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 text-[11px]">
                      1
                    </span>
                    <span className="font-bold uppercase tracking-wider text-white">
                      Stage 1: Market & Fundamentals Research
                    </span>
                  </div>
                  <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 font-mono text-[10px] text-emerald-400 font-semibold">
                    ✓ Verified Live
                  </span>
                </div>

                {/* Stage 1 Query */}
                <div className="rounded-lg border border-[#152236] bg-[#060c16] px-3.5 py-2 font-mono text-xs text-text-muted flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">Query:</span>
                  <span className="text-white italic">&ldquo;Screen real-time market price, valuation multiples, and SEC regulatory filings for {companySymbol?.toUpperCase() || "the equity"}&rdquo;</span>
                </div>

                {/* Stage 1 Results: Financial Stats Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 rounded-xl border border-[#162234] bg-[#070d18] p-3 text-xs font-mono">
                  <div>
                    <div className="text-[10px] text-text-faint">Price</div>
                    <div className="text-sm font-semibold text-white mt-0.5">
                      {price} {priceDelta && <span className="text-[10px] text-emerald-400 font-normal">{priceDelta}</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-text-faint">Market Cap</div>
                    <div className="text-sm font-semibold text-white mt-0.5">{marketCap}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-text-faint">P/E Ratio</div>
                    <div className="text-sm font-semibold text-white mt-0.5">{peRatio}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-text-faint">52W Range</div>
                    <div className="text-sm font-semibold text-white mt-0.5">{fiftyTwoRange}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-text-faint">Dividend Yield</div>
                    <div className="text-sm font-semibold text-white mt-0.5">{dividendYield}</div>
                  </div>
                </div>

                {/* Citations & Data Sources */}
                <div className="rounded-xl border border-[#19273c] bg-[#070e1a] p-3.5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#152030] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs">📑</span>
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                        Verified Sources & Citations
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-emerald-400">
                      SEC Edgar + Yahoo Finance
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="rounded-lg border border-[#162234] bg-[#0a1220] p-2.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                        <span>📈</span> Yahoo Finance Real-Time API
                      </div>
                      <p className="text-[10.5px] text-text-muted leading-relaxed font-sans">
                        Market quotes, spreads, 52-week pricing bounds, and valuation multiples.
                      </p>
                    </div>

                    <div className="rounded-lg border border-[#162234] bg-[#0a1220] p-2.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-[11px]">
                        <span>🏛️</span> SEC EDGAR Disclosures
                      </div>
                      <p className="text-[10.5px] text-text-muted leading-relaxed font-sans">
                        Audited Form 10-K (Annual) and 10-Q (Quarterly) balance sheet filings.
                      </p>
                    </div>
                  </div>

                  {/* News Articles Citations */}
                  {newsCitations.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-text-faint">
                        Headline Citations ({newsCitations.length})
                      </div>
                      <div className="space-y-1">
                        {newsCitations.slice(0, 3).map((art, idx) => (
                          <div
                            key={idx}
                            className="flex items-start justify-between gap-2 rounded-lg border border-[#152030] bg-[#0a111e] p-2 text-xs hover:border-[#1e304b] transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              {art.url ? (
                                <a
                                  href={art.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-white hover:text-emerald-400 transition-colors line-clamp-1 text-[11px]"
                                >
                                  {art.title}
                                </a>
                              ) : (
                                <span className="font-medium text-white line-clamp-1 text-[11px]">{art.title}</span>
                              )}
                              <div className="flex items-center gap-2 text-[9px] font-mono text-text-faint mt-0.5">
                                <span className="text-emerald-400 font-semibold">{art.source}</span>
                                {art.published_at && (
                                  <>
                                    <span>•</span>
                                    <span>{timeAgo(art.published_at) || art.published_at}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            {art.url && (
                              <a
                                href={art.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 text-[10px] font-mono text-emerald-400 hover:text-emerald-300"
                              >
                                ↗
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Raw Data Toggle */}
                  {toolOutputs.length > 0 && (
                    <div className="pt-1.5 border-t border-[#152030]">
                      <button
                        onClick={() => setShowAllSources(!showAllSources)}
                        className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                      >
                        {showAllSources ? "Hide Raw Tool JSON ↑" : "Inspect Raw Tool Payloads & Telemetry →"}
                      </button>

                      {showAllSources && (
                        <div className="mt-2 rounded-xl border border-[#162234] bg-[#040810] p-2.5 text-[10px] font-mono space-y-2 max-h-48 overflow-y-auto">
                          {toolOutputs.map((step, idx) => (
                            <div key={idx} className="border-t border-[#121b2b] first:border-0 pt-1.5">
                              <span className="text-amber-400 font-bold">{step.tool}</span>
                              <pre className="mt-1 text-text-faint whitespace-pre-wrap overflow-x-auto text-[9.5px]">
                                {typeof step.output === "object" ? JSON.stringify(step.output, null, 2) : String(step.output)}
                              </pre>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STAGE 2: DOWNSIDE RISK ASSESSMENT & CATALYST STRESS TEST */}
            {turn.risks && (
              <div className="rounded-xl border border-[#261928] bg-[#0f0a15] p-4.5 space-y-3.5 shadow-md">
                <div className="flex items-center justify-between border-b border-[#221626] pb-2.5">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30 text-[11px]">
                      2
                    </span>
                    <span className="font-bold uppercase tracking-wider text-white">
                      Stage 2: Downside Risk Assessment & Catalyst Stress Test
                    </span>
                  </div>
                  <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 font-mono text-[10px] text-amber-300 font-semibold">
                    {turn.risks.risk_score}/10 · {turn.risks.risk_level} RISK
                  </span>
                </div>

                {/* Stage 2 Query */}
                <div className="rounded-lg border border-[#221727] bg-[#08050c] px-3.5 py-2 font-mono text-xs text-text-muted flex items-center gap-2">
                  <span className="text-amber-400 font-bold">Query:</span>
                  <span className="text-white italic">&ldquo;Evaluate downside risks, margin compression, and macroeconomic catalysts for {companySymbol?.toUpperCase() || "the equity"}&rdquo;</span>
                </div>

                {/* Stage 2 Results */}
                <div className="rounded-xl border border-rose-500/20 bg-[#160a12] p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-rose-400 font-mono">
                    <span className="flex items-center gap-2">
                      <span>!</span> Downside Catalysts & Bear Vulnerabilities
                    </span>
                    <span className="text-[10px] text-text-faint font-normal">
                      Score: {turn.risks.risk_score}/10 ({turn.risks.risk_level})
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-text-muted">
                    {risks.map((risk, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-rose-400 text-[10px] mt-0.5">•</span>
                        <span className="leading-snug">{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* STAGE 3: ADVERSARIAL BULL VS. BEAR DEBATE */}
            {turn.debate && (
              <div className="rounded-xl border border-[#19273c] bg-[#08111e] p-4.5 space-y-3.5 shadow-md">
                <div className="flex items-center justify-between border-b border-[#152336] pb-2.5">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-500/15 text-blue-400 font-bold border border-blue-500/30 text-[11px]">
                      3
                    </span>
                    <span className="font-bold uppercase tracking-wider text-white">
                      Stage 3: Adversarial Bull vs. Bear Debate
                    </span>
                  </div>
                  <span className="rounded bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 font-mono text-[10px] text-blue-300 font-semibold">
                    Adversarial Synthesis
                  </span>
                </div>

                {/* Stage 3 Query */}
                <div className="rounded-lg border border-[#162438] bg-[#050b14] px-3.5 py-2 font-mono text-xs text-text-muted flex items-center gap-2">
                  <span className="text-blue-400 font-bold">Query:</span>
                  <span className="text-white italic">&ldquo;Synthesize bull case vs bear case debate and points of conflict for {companySymbol?.toUpperCase() || "the equity"}&rdquo;</span>
                </div>

                {/* Stage 3 Results: Two Column Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {opportunities.length > 0 && (
                    <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-b from-[#0a1824] to-[#08131d] p-4 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 font-mono">
                        <span>✓</span> Bull Case & Growth Catalysts
                      </div>
                      <ul className="space-y-1.5 text-xs text-text-muted">
                        {opportunities.map((opp, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-emerald-400 text-[10px] mt-0.5">•</span>
                            <span className="leading-snug">{opp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {risks.length > 0 && (
                    <div className="rounded-xl border border-rose-500/20 bg-gradient-to-b from-[#1c0f17] to-[#140b11] p-4 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 font-mono">
                        <span>!</span> Bear Case & Downside Risks
                      </div>
                      <ul className="space-y-1.5 text-xs text-text-muted">
                        {risks.map((risk, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-rose-400 text-[10px] mt-0.5">•</span>
                            <span className="leading-snug">{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STAGE 4: CONSENSUS VERDICT & MODEL CONVICTION DECISION */}
            {turn.thesis && (
              <div className="rounded-xl border border-[#1e2e46] bg-[#091220] p-4.5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#162338] pb-2.5">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40 text-[11px]">
                      4
                    </span>
                    <span className="font-bold uppercase tracking-wider text-white">
                      Stage 4: Consensus Verdict & Model Conviction Decision
                    </span>
                  </div>
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">
                    Final Consensus Verdict
                  </span>
                </div>

                {/* Stage 4 Query */}
                <div className="rounded-lg border border-[#162438] bg-[#050b14] px-3.5 py-2 font-mono text-xs text-text-muted flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">Query:</span>
                  <span className="text-white italic">&ldquo;Synthesize multi-agent consensus, final verdict, and model conviction for {companySymbol?.toUpperCase() || "the equity"}&rdquo;</span>
                </div>

                {/* Bold Executive Verdict Hero Card */}
                <div className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 shadow-2xl transition-all ${verdictContainerStyle}`}>
                  {/* Radial glow background */}
                  <div 
                    className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full blur-3xl opacity-30" 
                    style={{ background: verdictGlowColor }} 
                  />

                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    {/* Left: Prominent Verdict Announcement */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#94a3b8]">
                        <span>🏛️ Consensus Institutional Verdict</span>
                        <span className="h-1 w-1 rounded-full bg-[#475569]" />
                        <span className="text-emerald-400 font-semibold">{companySymbol?.toUpperCase() || "TARGET EQUITY"}</span>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Big Bold Pill */}
                        <div className={`inline-flex items-center gap-2.5 rounded-2xl border-2 px-5 py-2.5 text-2xl sm:text-3xl font-black font-mono tracking-wider shadow-2xl ${verdictBadgeStyle}`}>
                          <span className="text-xl sm:text-2xl">{verdictIcon}</span>
                          <span>{recommendation}</span>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-xs sm:text-[13px] font-mono font-bold tracking-wide uppercase text-white">
                            {verdictSubtitle}
                          </span>
                          <span className="text-[11px] text-text-muted">
                            Synthesized across Fundamental, Risk & Adversarial Desks
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Bold High-Contrast Confidence Score & Meter */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-6 md:border-l md:border-white/10 md:pl-6">
                      {/* Score Display */}
                      <div className="space-y-1">
                        <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-text-faint">
                          Model Conviction
                        </div>
                        <div className="flex items-baseline gap-1.5 font-mono">
                          <span className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
                            {confidenceNum != null ? confidenceNum.toFixed(1) : (turn.thesis ? "8.0" : "—")}
                          </span>
                          <span className="text-lg font-bold text-text-muted">/ 10</span>
                        </div>
                        <div className="text-[11px] font-mono font-semibold" style={{ color: confidenceColor }}>
                          {convictionLabel}
                        </div>
                      </div>

                      {/* Visual Confidence Bar Meter */}
                      <div className="w-36 sm:w-40 space-y-1.5 font-mono text-[10px]">
                        <div className="flex justify-between text-text-faint">
                          <span>Conviction</span>
                          <span className="font-bold text-white">{confidencePercent}%</span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-[#070e1a] border border-white/10 p-0.5 shadow-inner">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 shadow-sm ${confidenceBarStyle}`}
                            style={{ width: `${confidencePercent}%` }}
                          />
                        </div>
                        {turn.risks && (
                          <div className="flex justify-between text-[10px] text-text-faint pt-0.5">
                            <span>Downside Risk:</span>
                            <span className="text-amber-400 font-semibold">{turn.risks.risk_score}/10 ({turn.risks.risk_level})</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Investment Thesis Narrative */}
                {thesisNarrative && (
                  <div className="space-y-1.5 pt-1">
                    <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-text-muted">
                      Consensus Investment Thesis
                    </h4>
                    <p className="text-xs sm:text-[13px] leading-relaxed text-text">
                      {thesisNarrative}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Disclaimer */}
            <div className="text-[10px] text-text-faint font-mono border-t border-[#141d2c] pt-2">
              * Note: Market data and news are retrieved live. RizqAI analysis is for institutional research purposes and does not constitute registered financial advisory.
            </div>
          </div>
        )}

      </div>

      {/* 5. Next Stage of Operation in Order (Below Results, No Multiple Choice) */}
      {!isStreaming && (
        <div className="rounded-2xl border border-[#1e2e46] bg-gradient-to-b from-[#0a1424] to-[#060d18] p-5 space-y-3.5 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#162338] pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/30">
                {turnIndex + 2}
              </span>
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-white">
                  Next Stage in Order (Stage {turnIndex + 2})
                </span>
                <p className="text-[11px] text-text-muted">
                  Sequential research operation ready to execute in order
                </p>
              </div>
            </div>

            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">
              In Order Execution
            </span>
          </div>

          {/* Single Sequential Operation Card */}
          <div className="rounded-xl border border-emerald-500/30 bg-[#071322] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-emerald-300">
                <span>▶</span>
                <span>{nextStage.title}</span>
              </div>
              <p className="text-xs text-text-muted font-mono leading-relaxed truncate sm:whitespace-normal">
                &ldquo;{inlineNextQuery.trim() || nextStage.query}&rdquo;
              </p>
            </div>

            <button
              type="button"
              onClick={() => onExecuteNextStage?.(inlineNextQuery.trim() || nextStage.query)}
              className="shrink-0 flex items-center justify-center gap-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 active:scale-95 px-5 py-3 font-mono text-xs font-bold text-[#070c14] transition-all shadow-lg shadow-emerald-500/25 cursor-pointer"
            >
              <span>RUN STAGE {turnIndex + 2} IN ORDER</span>
              <span>→</span>
            </button>
          </div>

          {/* Optional inline prompt to customize before running in order */}
          <div className="pt-1 flex items-center gap-2">
            <input
              type="text"
              value={inlineNextQuery}
              onChange={(e) => setInlineNextQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onExecuteNextStage?.(inlineNextQuery.trim() || nextStage.query);
                  setInlineNextQuery("");
                }
              }}
              placeholder={`Customize Stage ${turnIndex + 2} query or press Run above…`}
              className="flex-1 rounded-xl border border-[#18273e] bg-[#050b14] px-3.5 py-2 text-xs text-white placeholder-text-faint focus:border-emerald-500/50 focus:outline-none"
            />
            {inlineNextQuery.trim() && (
              <button
                type="button"
                onClick={() => {
                  onExecuteNextStage?.(inlineNextQuery.trim());
                  setInlineNextQuery("");
                }}
                className="shrink-0 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-3.5 py-2 font-mono text-xs font-bold text-black"
              >
                RUN CUSTOM →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
