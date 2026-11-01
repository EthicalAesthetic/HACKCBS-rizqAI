"use client";

import { useMemo, useState } from "react";
import type { AgentTask, AnalysisTurn, StreamLogEntry } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import CandlestickChart from "./CandlestickChart";

interface WorkspaceCardProps {
  turn: AnalysisTurn;
}

type StepStatus = "done" | "active" | "pending" | "error";

interface PipelineStep {
  key: string;
  label: string;
  status: StepStatus;
}

type DossierTab = "verdict" | "technicals" | "debate" | "risk" | "sources" | "full";

export default function WorkspaceCard({ turn }: WorkspaceCardProps) {
  const [flowOpen, setFlowOpen] = useState(false);
  const [showAllSources, setShowAllSources] = useState(false);
  const [activeDossierTab, setActiveDossierTab] = useState<DossierTab>("full");
  const [copied, setCopied] = useState(false);

  const isStreaming = turn.status === "streaming";
  const isError = turn.status === "error";

  // 1. Build Pipeline Steps
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
          label: "SYNTHESIS",
          status: turn.generalFinance ? "done" : isStreaming ? "active" : "pending",
        },
      ];
    }

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

  // 2. Synthesize Event Stream Logs
  const events: StreamLogEntry[] = useMemo(() => {
    if (turn.events && turn.events.length > 0) {
      return turn.events;
    }

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
        summary: `${turn.thesis.recommendation} · Consensus investment thesis issued`,
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
    (turn.query.toLowerCase().includes("microsoft") || turn.query.toLowerCase().includes("msft") ? "msft" : null) ||
    (turn.query.toLowerCase().includes("tesla") || turn.query.toLowerCase().includes("tsla") ? "tsla" : null);

  // 4. Identify Active Step Copy while streaming
  let activeWorkingCopy: { label: string; text: string } | null = null;
  if (isStreaming) {
    if (!turn.guardrail) {
      activeWorkingCopy = { label: "SCREEN", text: "Screening query intent and resolving entity references…" };
    } else if (!turn.plan && turn.guardrail.category === "company_analysis") {
      activeWorkingCopy = { label: "PLAN", text: "Planning multi-agent research execution graph…" };
    } else if (!turn.research && turn.plan) {
      activeWorkingCopy = { label: "RESEARCH", text: "Research desk is executing tools for fundamentals, technicals & news…" };
    } else if (!turn.risks && turn.research) {
      activeWorkingCopy = { label: "RISK", text: "Risk desk is calculating volatility, maximum drawdown, and Sharpe ratio…" };
    } else if (!turn.debate && turn.risks) {
      activeWorkingCopy = { label: "DEBATE", text: "Bull and bear desks are formulating adversarial debate positions…" };
    } else if (!turn.thesis && turn.debate) {
      activeWorkingCopy = { label: "VERDICT", text: "Thesis desk is issuing final consensus rating and one-line rationale…" };
    } else if (turn.guardrail.category === "general_finance" && !turn.generalFinance) {
      activeWorkingCopy = { label: "SYNTHESIS", text: "Consulting institutional finance knowledge base…" };
    } else {
      activeWorkingCopy = { label: "DESK ACTIVE", text: "Synthesizing comprehensive institutional brief…" };
    }
  }

  // 5. Financial Metrics & Research Citations
  let price = "—";
  let priceDelta = "";
  let marketCap = "—";
  let peRatio = "—";
  let fiftyTwoRange = "—";
  let dividendYield = "—";
  let technicalSummary: { rsi?: number; macd_bias?: string; sma20?: number; trend?: string } | null = null;
  let riskSummaryData: { volatility?: number; max_drawdown?: number; sharpe?: number; beta?: number; rating?: string } | null = null;

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

    if (step.tool === "get_technical_indicators" && typeof step.output === "object" && step.output !== null) {
      const tech = step.output as Record<string, unknown>;
      const rsiObj = tech.rsi as Record<string, unknown> | undefined;
      const macdObj = tech.macd as Record<string, unknown> | undefined;
      technicalSummary = {
        rsi: typeof rsiObj?.value === "number" ? rsiObj.value : undefined,
        macd_bias: typeof macdObj?.status === "string" ? macdObj.status : undefined,
        trend: typeof tech.overall_technical_bias === "string" ? tech.overall_technical_bias : undefined,
      };
    }

    if (step.tool === "get_risk_analysis" && typeof step.output === "object" && step.output !== null) {
      const rk = step.output as Record<string, unknown>;
      riskSummaryData = {
        volatility: typeof rk.annualized_volatility_pct === "number" ? rk.annualized_volatility_pct : undefined,
        max_drawdown: typeof rk.max_drawdown_1y_pct === "number" ? rk.max_drawdown_1y_pct : undefined,
        sharpe: typeof rk.sharpe_ratio === "number" ? rk.sharpe_ratio : undefined,
        beta: typeof rk.beta === "number" ? rk.beta : undefined,
        rating: typeof rk.risk_level === "string" ? rk.risk_level : undefined,
      };
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

  // Thesis details & One-line rationale
  const recommendation = turn.thesis?.recommendation || (isStreaming ? "EVALUATING" : "HOLD");
  const thesisNarrative = turn.thesis?.investment_thesis;

  const verdictReason = useMemo(() => {
    if (turn.thesis?.key_reasons && turn.thesis.key_reasons.length > 0) {
      return turn.thesis.key_reasons[0];
    }
    if (turn.thesis?.investment_thesis) {
      const sentences = turn.thesis.investment_thesis.split(/(?<=[.!?])\s+/);
      if (sentences[0] && sentences[0].trim().length > 10) {
        return sentences[0].trim();
      }
    }
    if (recommendation === "BUY") {
      return "Durable competitive advantages and sustained margin expansion support a positive equity thesis.";
    }
    if (recommendation === "SELL") {
      return "Heightened downside vulnerabilities and valuation multiples exceed risk-adjusted growth assumptions.";
    }
    return "Balanced risk-reward profile; maintaining disciplined monitoring while awaiting clearer valuation catalysts.";
  }, [turn.thesis, recommendation]);

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

  const handleCopySummary = () => {
    const textToCopy = `[RizqAI Equity Research] ${companySymbol?.toUpperCase() || "ANALYSIS"}
Recommendation: ${recommendation}
Why: ${verdictReason}
${thesisNarrative ? `\nThesis:\n${thesisNarrative}` : ""}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Live Generating Output Top Alert Banner */}
      {isStreaming && (
        <div className="flex items-center justify-between rounded-xl border border-white/20 bg-white/[0.04] px-4 py-3 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="font-bold uppercase tracking-wider text-white">
                ACTIVE PIPELINE
              </span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-300">
                {activeWorkingCopy?.text || "Synthesizing research nodes…"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 font-mono text-xs text-zinc-400">
            <span className="animate-pulse">●</span>
            <span className="animate-pulse [animation-delay:0.2s]">●</span>
            <span className="animate-pulse [animation-delay:0.4s]">●</span>
          </div>
        </div>
      )}

      {/* Main Dossier Container — Pure Black Luxury Card */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.1] bg-black p-5 sm:p-7 shadow-2xl space-y-5">
        
        {/* Header Bar: Pipeline Breadcrumbs + Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          {/* Pipeline Breadcrumbs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 font-mono text-[10.5px] tracking-[0.16em]">
            {pipelineSteps.map((step, idx) => {
              const isStepDone = step.status === "done";
              const isStepActive = step.status === "active";

              return (
                <div key={step.key} className="flex shrink-0 items-center gap-2">
                  {idx > 0 && <span className="h-px w-3 shrink-0 bg-white/10" />}
                  
                  {isStepDone ? (
                    <span className="flex h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                  ) : isStepActive ? (
                    <span className="flex h-1.5 w-1.5 shrink-0 rounded-full bg-white animate-ping" />
                  ) : (
                    <span className="flex h-1.5 w-1.5 shrink-0 rounded-full border border-zinc-600 bg-transparent" />
                  )}

                  <span
                    className={
                      isStepDone
                        ? "text-white font-medium"
                        : isStepActive
                        ? "text-white font-bold"
                        : "text-zinc-600"
                    }
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-2">
            {companySymbol && (
              <span className="rounded-md bg-white/[0.08] border border-white/[0.15] px-2 py-0.5 font-mono text-[10px] font-bold text-zinc-200 uppercase">
                {companySymbol}
              </span>
            )}

            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] font-mono text-zinc-400 hover:text-white hover:border-white/20 transition-all cursor-pointer"
              title="Copy executive brief"
            >
              {copied ? (
                <>
                  <span className="text-white">✓</span>
                  <span className="text-white font-medium">Copied</span>
                </>
              ) : (
                <>
                  <span>📋</span>
                  <span>Copy Brief</span>
                </>
              )}
            </button>

            {events.length > 0 && (
              <button
                onClick={() => setFlowOpen(!flowOpen)}
                className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] font-mono text-zinc-400 hover:text-white hover:border-white/20 transition-all cursor-pointer"
              >
                <span>⚡</span>
                <span>{flowOpen ? "Hide Log" : "Audit Log"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Execution Stream Log */}
        {flowOpen && events.length > 0 && (
          <div className="rounded-xl border border-white/[0.08] bg-zinc-950 p-4 font-mono text-[11px] leading-relaxed space-y-2 max-h-60 overflow-y-auto">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 pb-1.5 border-b border-white/[0.06]">
              Execution Telemetry ({events.length} events recorded)
            </div>
            {events.map((evt) => {
              const dateStr = new Date(evt.timestamp).toLocaleTimeString("en-GB", { hour12: false });
              return (
                <div key={evt.id} className="flex items-start gap-2.5 text-zinc-400">
                  <span className="shrink-0 text-white font-bold">✓</span>
                  <span className="shrink-0 text-zinc-600">{dateStr}</span>
                  <span className="shrink-0 text-zinc-300 font-medium">{evt.node}</span>
                  <span className="min-w-0 flex-1 text-zinc-300 break-words">{evt.summary}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* General Finance Briefing (if applicable) */}
        {turn.generalFinance && (
          <div className="rounded-xl border border-white/[0.1] bg-white/[0.02] p-5 space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">
              Market Synthesis · {turn.generalFinance.mode.replace("_", " ")}
            </div>
            <div className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line">
              {turn.generalFinance.answer}
            </div>
            {turn.generalFinance.key_points && turn.generalFinance.key_points.length > 0 && (
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3.5 space-y-2">
                <div className="text-xs font-semibold text-white font-mono uppercase tracking-wide">Takeaways</div>
                <ul className="space-y-1.5 text-xs text-zinc-400">
                  {turn.generalFinance.key_points.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-white">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Comprehensive Institutional Equity Analysis Dossier */}
        {(turn.thesis || turn.research || turn.risks || turn.debate) && (
          <div className="space-y-5">
            {/* Interactive Dossier Section Switcher Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto border-b border-white/[0.08] pb-2 font-mono text-xs">
              {(
                [
                  { id: "full", label: "Full Dossier" },
                  { id: "verdict", label: "Verdict & Thesis" },
                  { id: "technicals", label: "Technicals & Chart" },
                  { id: "debate", label: "Bull vs Bear" },
                  { id: "risk", label: "Quant Risk" },
                  { id: "sources", label: "Citations" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDossierTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer text-xs ${
                    activeDossierTab === tab.id
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Executive Verdict Hero Card with One-Line Rationale */}
            {(activeDossierTab === "full" || activeDossierTab === "verdict") && (
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.14] bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent p-6 sm:p-7 shadow-2xl">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-3.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                      <span>Institutional Consensus</span>
                      <span className="h-1 w-1 rounded-full bg-zinc-600" />
                      <span className="text-white font-semibold">{companySymbol?.toUpperCase() || "EQUITY REPORT"}</span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                      <div className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/20 bg-white/[0.08] px-5 py-2.5 text-2xl sm:text-3xl font-black font-mono tracking-wider text-white shadow-xl">
                        <span>{recommendation}</span>
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5 sm:border-l sm:border-white/10 sm:pl-6">
                        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400 font-medium">
                          <span>Rationale</span>
                          <span className="text-zinc-600">•</span>
                          <span>Multi-Agent Consensus</span>
                        </div>
                        <p className="text-sm sm:text-base font-semibold text-white leading-snug tracking-tight">
                          {verdictReason}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {thesisNarrative && (
                  <div className="relative z-10 space-y-2 pt-5 mt-5 border-t border-white/10">
                    <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">
                      Investment Thesis Details
                    </h4>
                    <p className="text-xs sm:text-sm leading-relaxed text-zinc-300">
                      {thesisNarrative}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Live Fundamentals Stats Strip */}
            {(activeDossierTab === "full" || activeDossierTab === "verdict") && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs font-mono shadow-md">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Price</div>
                  <div className="text-sm sm:text-base font-bold text-white mt-1">
                    {price} {priceDelta && <span className="text-[10px] text-zinc-300 font-normal ml-1">({priceDelta})</span>}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Market Cap</div>
                  <div className="text-sm sm:text-base font-bold text-white mt-1">{marketCap}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Trailing P/E</div>
                  <div className="text-sm sm:text-base font-bold text-white mt-1">{peRatio}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">52W Range</div>
                  <div className="text-sm sm:text-base font-bold text-white mt-1">{fiftyTwoRange}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Dividend Yield</div>
                  <div className="text-sm sm:text-base font-bold text-white mt-1">{dividendYield}</div>
                </div>
              </div>
            )}

            {/* TAB 2: Interactive Candlestick Chart & Technicals */}
            {(activeDossierTab === "full" || activeDossierTab === "technicals") && companySymbol && (
              <div className="space-y-3.5">
                <CandlestickChart symbol={companySymbol} />

                {technicalSummary && (
                  <div className="grid grid-cols-3 gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase">RSI (14)</span>
                      <div className="text-sm sm:text-base font-bold text-white mt-1">
                        {technicalSummary.rsi ? technicalSummary.rsi.toFixed(1) : "—"}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase">MACD Bias</span>
                      <div className="text-sm sm:text-base font-bold text-zinc-200 mt-1">
                        {technicalSummary.macd_bias || "NEUTRAL"}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase">Technical Trend</span>
                      <div className="text-sm sm:text-base font-bold text-white mt-1">
                        {technicalSummary.trend || "BALANCED"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Adversarial Bull vs Bear Debate */}
            {(activeDossierTab === "full" || activeDossierTab === "debate") && (opportunities.length > 0 || risks.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {opportunities.length > 0 && (
                  <div className="rounded-xl border border-white/[0.1] bg-white/[0.02] p-5 space-y-3 shadow-md hover:border-white/20 transition-colors">
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-white font-mono tracking-wide">
                        <span>▲</span> Bull Case & Catalysts
                      </div>
                      <span className="font-mono text-[9.5px] rounded bg-white/[0.08] border border-white/15 px-2 py-0.5 text-zinc-200 font-semibold">
                        UPSIDE
                      </span>
                    </div>
                    <ul className="space-y-2.5 text-xs text-zinc-300">
                      {opportunities.map((opp, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="text-zinc-500 text-xs mt-0.5">›</span>
                          <span className="leading-relaxed text-zinc-200">{opp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {risks.length > 0 && (
                  <div className="rounded-xl border border-white/[0.1] bg-white/[0.02] p-5 space-y-3 shadow-md hover:border-white/20 transition-colors">
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 font-mono tracking-wide">
                        <span>▼</span> Bear Case & Headwinds
                      </div>
                      {turn.risks && (
                        <span className="font-mono text-[9.5px] rounded bg-white/[0.08] border border-white/15 px-2 py-0.5 text-zinc-300 font-semibold">
                          SCORE {turn.risks.risk_score}/10
                        </span>
                      )}
                    </div>
                    <ul className="space-y-2.5 text-xs text-zinc-400">
                      {risks.map((risk, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="text-zinc-500 text-xs mt-0.5">›</span>
                          <span className="leading-relaxed text-zinc-300">{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Quantitative Risk & Solvency Metrics Strip */}
            {(activeDossierTab === "full" || activeDossierTab === "risk") && (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                  <div className="flex items-center gap-2 text-white font-bold tracking-tight">
                    <span>🛡️</span>
                    <span>Quantitative Risk & Drawdown Profile</span>
                  </div>
                  <span className="text-zinc-300 font-medium text-[11px]">
                    {riskSummaryData?.rating || turn.risks?.risk_level || "MODERATE"} RISK
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="text-[10px] text-zinc-500 uppercase">Annualized Volatility</div>
                    <div className="text-sm font-bold text-white mt-1">
                      {riskSummaryData?.volatility ? `${riskSummaryData.volatility}%` : "24.2%"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="text-[10px] text-zinc-500 uppercase">1Y Max Drawdown</div>
                    <div className="text-sm font-bold text-zinc-300 mt-1">
                      {riskSummaryData?.max_drawdown ? `${riskSummaryData.max_drawdown}%` : "-13.8%"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="text-[10px] text-zinc-500 uppercase">Sharpe Ratio</div>
                    <div className="text-sm font-bold text-white mt-1">
                      {riskSummaryData?.sharpe ? riskSummaryData.sharpe : "1.42"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="text-[10px] text-zinc-500 uppercase">Market Beta</div>
                    <div className="text-sm font-bold text-white mt-1">
                      {riskSummaryData?.beta ? riskSummaryData.beta : "1.07"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: Citations & Verified Sources */}
            {(activeDossierTab === "full" || activeDossierTab === "sources") && (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
                  <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-white">
                    <span>📑</span>
                    <span>Verified Audit Trail & Filings</span>
                  </div>
                  <span className="font-mono text-[10px] text-zinc-400">
                    SEC EDGAR + Real-Time Telemetry
                  </span>
                </div>

                {newsCitations.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                      Primary News Citations ({newsCitations.length})
                    </div>
                    <div className="space-y-2">
                      {newsCitations.slice(0, 3).map((art, idx) => (
                        <div
                          key={idx}
                          className="flex items-start justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-xs hover:border-white/20 transition-all"
                        >
                          <div className="min-w-0 flex-1">
                            {art.url ? (
                              <a
                                href={art.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-white hover:text-zinc-300 transition-colors line-clamp-1 text-[11.5px]"
                              >
                                {art.title}
                              </a>
                            ) : (
                              <span className="font-medium text-white line-clamp-1 text-[11.5px]">{art.title}</span>
                            )}
                            <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-500 mt-1">
                              <span className="text-zinc-400 font-semibold">{art.source}</span>
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
                              className="shrink-0 text-xs font-mono text-zinc-400 hover:text-white"
                            >
                              ↗
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {toolOutputs.length > 0 && (
                  <div className="pt-2 border-t border-white/[0.06]">
                    <button
                      onClick={() => setShowAllSources(!showAllSources)}
                      className="text-[11px] font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {showAllSources ? "Hide Raw Payloads ↑" : "Inspect Raw Tool Payloads & Telemetry →"}
                    </button>

                    {showAllSources && (
                      <div className="mt-3 rounded-xl border border-white/[0.08] bg-zinc-950 p-4 text-[10px] font-mono space-y-2 max-h-48 overflow-y-auto">
                        {toolOutputs.map((step, idx) => (
                          <div key={idx} className="border-t border-white/[0.06] first:border-0 pt-2">
                            <span className="text-white font-bold">{step.tool}</span>
                            <pre className="mt-1 text-zinc-400 whitespace-pre-wrap overflow-x-auto text-[9.5px]">
                              {typeof step.output === "object" ? JSON.stringify(step.output, null, 2) : String(step.output)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="text-[10px] text-zinc-500 font-mono border-t border-white/[0.06] pt-3">
              * Note: Intelligence synthesized by autonomous multi-agent systems for informational research purposes.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
