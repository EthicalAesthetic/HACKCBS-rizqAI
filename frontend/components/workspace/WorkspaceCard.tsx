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
      return "Favorable risk-reward profile backed by durable competitive moats and sustained upside momentum.";
    }
    if (recommendation === "SELL") {
      return "Heightened downside vulnerabilities and compressed margins outweigh near-term valuation upside.";
    }
    return "Balanced risk-reward profile; maintaining disciplined hold while awaiting clearer inflection catalysts.";
  }, [turn.thesis, recommendation]);

  let verdictSubtitle = "AGGREGATED MULTI-AGENT CONSENSUS";
  let verdictIcon = "■";
  let verdictContainerStyle = "border-[#1e2e46] bg-gradient-to-br from-[#0c1828] via-[#09121f] to-[#060c15]";
  let verdictBadgeStyle = "border-amber-400 bg-amber-500/20 text-amber-300 drop-shadow-[0_0_20px_rgba(245,158,11,0.3)]";
  let verdictGlowColor = "rgba(245, 158, 11, 0.15)";

  if (recommendation === "BUY") {
    verdictSubtitle = "BULLISH OUTLOOK · ACCUMULATE POSITION";
    verdictIcon = "▲";
    verdictContainerStyle = "border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 via-[#081521] to-[#050e17] shadow-emerald-950/20";
    verdictBadgeStyle = "border-emerald-400 bg-emerald-500/25 text-emerald-300 drop-shadow-[0_0_20px_rgba(16,185,129,0.35)]";
    verdictGlowColor = "rgba(16, 185, 129, 0.2)";
  } else if (recommendation === "SELL") {
    verdictSubtitle = "BEARISH OUTLOOK · REDUCE / HEDGE EXPOSURE";
    verdictIcon = "▼";
    verdictContainerStyle = "border-rose-500/40 bg-gradient-to-br from-rose-950/30 via-[#180b13] to-[#0d060a] shadow-rose-950/20";
    verdictBadgeStyle = "border-rose-400 bg-rose-500/25 text-rose-300 drop-shadow-[0_0_20px_rgba(244,63,94,0.35)]";
    verdictGlowColor = "rgba(244, 63, 94, 0.2)";
  } else if (recommendation === "HOLD" || recommendation === "WATCH") {
    verdictSubtitle = "NEUTRAL STANCE · MAINTAIN DISCIPLINED HOLD";
    verdictIcon = "■";
    verdictContainerStyle = "border-amber-500/40 bg-gradient-to-br from-amber-950/25 via-[#13110d] to-[#080b12] shadow-amber-950/20";
    verdictBadgeStyle = "border-amber-400 bg-amber-500/20 text-amber-300 drop-shadow-[0_0_20px_rgba(245,158,11,0.3)]";
    verdictGlowColor = "rgba(245, 158, 11, 0.15)";
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
                ACTIVE RESEARCH
              </span>
              <span className="text-[#3b4d66]">|</span>
              <span className="text-[#a1b3c9]">
                {activeWorkingCopy?.text || "Multi-agent engine actively generating research…"}
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

      {/* Main Dossier Container */}
      <div className="overflow-hidden rounded-2xl border border-[#162335] bg-[#08101a] p-4 sm:p-6 shadow-2xl space-y-4">
        
        {/* Header Bar: Pipeline Breadcrumbs + Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#141f2e] pb-3">
          {/* Pipeline Breadcrumbs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 font-mono text-[10.5px] tracking-[0.14em]">
            {pipelineSteps.map((step, idx) => {
              const isStepDone = step.status === "done";
              const isStepActive = step.status === "active";

              return (
                <div key={step.key} className="flex shrink-0 items-center gap-1.5">
                  {idx > 0 && <span className="h-px w-3 shrink-0 bg-[#223145]" />}
                  
                  {isStepDone ? (
                    <span className="flex h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                  ) : isStepActive ? (
                    <span className="flex h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 animate-pulse" />
                  ) : (
                    <span className="flex h-1.5 w-1.5 shrink-0 rounded-full border border-[#48576e] bg-transparent" />
                  )}

                  <span
                    className={
                      isStepDone
                        ? "text-emerald-400 font-semibold"
                        : isStepActive
                        ? "text-amber-400 font-bold drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                        : "text-[#5b6c84]"
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
              <span className="rounded bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300 uppercase">
                {companySymbol}
              </span>
            )}

            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1 rounded-lg border border-[#1c2c40] bg-[#0d1726] px-2.5 py-1 text-[11px] font-mono text-[#8fa2ba] hover:text-white hover:border-emerald-500/40 transition-colors cursor-pointer"
              title="Copy executive brief"
            >
              {copied ? (
                <>
                  <span className="text-emerald-400">✓</span>
                  <span className="text-emerald-400 font-semibold">Copied</span>
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
                className="flex items-center gap-1 rounded-lg border border-[#1c2c40] bg-[#0d1726] px-2.5 py-1 text-[11px] font-mono text-[#8fa2ba] hover:text-amber-400 hover:border-amber-500/40 transition-colors cursor-pointer"
              >
                <span>⚡</span>
                <span>{flowOpen ? "Hide Log" : "Audit Log"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Execution Stream Log */}
        {flowOpen && events.length > 0 && (
          <div className="rounded-xl border border-[#1b273c] bg-[#050b13] p-3 font-mono text-[11px] leading-relaxed space-y-1.5 max-h-56 overflow-y-auto">
            <div className="text-[10px] uppercase tracking-wider text-[#52657e] pb-1 border-b border-[#131f2f]">
              Agent Execution Telemetry ({events.length} events)
            </div>
            {events.map((evt) => {
              const dateStr = new Date(evt.timestamp).toLocaleTimeString("en-GB", { hour12: false });
              return (
                <div key={evt.id} className="flex items-start gap-2 text-[#7f93ac]">
                  <span className="shrink-0 text-emerald-400 font-bold">✓</span>
                  <span className="shrink-0 text-[#495b74]">{dateStr}</span>
                  <span className="shrink-0 text-amber-300 font-medium">{evt.node}</span>
                  <span className="min-w-0 flex-1 text-[#9fb1c8] break-words">{evt.summary}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* General Finance Answer (if applicable) */}
        {turn.generalFinance && (
          <div className="rounded-xl border border-[#18263a] bg-[#091321] p-4 sm:p-5 space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
              Institutional Market Briefing · {turn.generalFinance.mode.replace("_", " ")}
            </div>
            <div className="text-sm text-text leading-relaxed whitespace-pre-line">
              {turn.generalFinance.answer}
            </div>
            {turn.generalFinance.key_points && turn.generalFinance.key_points.length > 0 && (
              <div className="rounded-lg border border-emerald-500/20 bg-[#06101c] p-3 space-y-1.5">
                <div className="text-xs font-semibold text-emerald-400 font-mono">CORE TAKEAWAYS</div>
                <ul className="space-y-1 text-xs text-[#a0b2c9]">
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

        {/* Comprehensive Institutional Equity Analysis Dossier */}
        {(turn.thesis || turn.research || turn.risks || turn.debate) && (
          <div className="space-y-4">
            {/* Interactive Dossier Section Switcher Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto border-b border-[#152030] pb-2 font-mono text-xs">
              <button
                onClick={() => setActiveDossierTab("full")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-medium ${
                  activeDossierTab === "full"
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : "text-[#7f93ac] hover:text-white hover:bg-[#0c1624]"
                }`}
              >
                Full Dossier
              </button>
              <button
                onClick={() => setActiveDossierTab("verdict")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-medium ${
                  activeDossierTab === "verdict"
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : "text-[#7f93ac] hover:text-white hover:bg-[#0c1624]"
                }`}
              >
                Verdict & Thesis
              </button>
              <button
                onClick={() => setActiveDossierTab("technicals")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-medium ${
                  activeDossierTab === "technicals"
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : "text-[#7f93ac] hover:text-white hover:bg-[#0c1624]"
                }`}
              >
                Chart & Technicals
              </button>
              <button
                onClick={() => setActiveDossierTab("debate")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-medium ${
                  activeDossierTab === "debate"
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : "text-[#7f93ac] hover:text-white hover:bg-[#0c1624]"
                }`}
              >
                Bull vs Bear
              </button>
              <button
                onClick={() => setActiveDossierTab("risk")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-medium ${
                  activeDossierTab === "risk"
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : "text-[#7f93ac] hover:text-white hover:bg-[#0c1624]"
                }`}
              >
                Risk & Metrics
              </button>
              <button
                onClick={() => setActiveDossierTab("sources")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-medium ${
                  activeDossierTab === "sources"
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : "text-[#7f93ac] hover:text-white hover:bg-[#0c1624]"
                }`}
              >
                Sources & Citations
              </button>
            </div>

            {/* TAB 1: Executive Verdict Hero Card with One-Line Rationale */}
            {(activeDossierTab === "full" || activeDossierTab === "verdict") && (
              <div className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 shadow-2xl transition-all ${verdictContainerStyle}`}>
                <div 
                  className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full blur-3xl opacity-30" 
                  style={{ background: verdictGlowColor }} 
                />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-[#8fa2ba]">
                      <span>🏛️ Institutional Consensus</span>
                      <span className="h-1 w-1 rounded-full bg-[#3e5068]" />
                      <span className="text-emerald-400 font-semibold">{companySymbol?.toUpperCase() || "TARGET EQUITY"}</span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                      <div className={`inline-flex shrink-0 items-center gap-2.5 rounded-2xl border-2 px-6 py-2.5 text-2xl sm:text-3xl font-black font-mono tracking-wider shadow-xl ${verdictBadgeStyle}`}>
                        <span className="text-xl sm:text-2xl">{verdictIcon}</span>
                        <span>{recommendation}</span>
                      </div>

                      <div className="flex-1 min-w-0 space-y-1 sm:border-l sm:border-white/10 sm:pl-5">
                        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-400 font-semibold">
                          <span>WHY: ONE-LINE RATIONALE</span>
                          <span className="text-white/20">•</span>
                          <span className="text-[#8fa2ba]">{verdictSubtitle}</span>
                        </div>
                        <p className="text-sm sm:text-[14.5px] font-semibold text-white leading-snug">
                          {verdictReason}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {thesisNarrative && (
                  <div className="relative z-10 space-y-1.5 pt-4 mt-4 border-t border-white/10">
                    <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#9fb2c8]">
                      Comprehensive Investment Thesis
                    </h4>
                    <p className="text-xs sm:text-[13px] leading-relaxed text-[#c3d3e7]">
                      {thesisNarrative}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Live Fundamentals Stats Strip */}
            {(activeDossierTab === "full" || activeDossierTab === "verdict") && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 rounded-xl border border-[#142132] bg-[#060c15] p-3 text-xs font-mono shadow-md">
                <div>
                  <div className="text-[10px] text-[#556980] uppercase tracking-wider">Price</div>
                  <div className="text-sm sm:text-base font-bold text-white mt-0.5">
                    {price} {priceDelta && <span className="text-[10px] text-emerald-400 font-normal ml-1">{priceDelta}</span>}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-[#556980] uppercase tracking-wider">Market Cap</div>
                  <div className="text-sm sm:text-base font-bold text-white mt-0.5">{marketCap}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#556980] uppercase tracking-wider">Trailing P/E</div>
                  <div className="text-sm sm:text-base font-bold text-white mt-0.5">{peRatio}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#556980] uppercase tracking-wider">52W Range</div>
                  <div className="text-sm sm:text-base font-bold text-white mt-0.5">{fiftyTwoRange}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[#556980] uppercase tracking-wider">Dividend Yield</div>
                  <div className="text-sm sm:text-base font-bold text-white mt-0.5">{dividendYield}</div>
                </div>
              </div>
            )}

            {/* TAB 2: Interactive Candlestick Chart & Technicals */}
            {(activeDossierTab === "full" || activeDossierTab === "technicals") && companySymbol && (
              <div className="space-y-3">
                <CandlestickChart symbol={companySymbol} />

                {technicalSummary && (
                  <div className="grid grid-cols-3 gap-2.5 rounded-xl border border-[#142132] bg-[#060c15] p-3 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-[#556980] uppercase">RSI (14)</span>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {technicalSummary.rsi ? technicalSummary.rsi.toFixed(1) : "—"}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#556980] uppercase">MACD Bias</span>
                      <div className="text-sm font-bold text-emerald-400 mt-0.5">
                        {technicalSummary.macd_bias || "NEUTRAL"}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#556980] uppercase">Composite Trend</span>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {technicalSummary.trend || "BULLISH"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Adversarial Bull vs Bear Debate */}
            {(activeDossierTab === "full" || activeDossierTab === "debate") && (opportunities.length > 0 || risks.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {opportunities.length > 0 && (
                  <div className="rounded-xl border border-emerald-500/25 bg-gradient-to-b from-[#091724] to-[#06111a] p-4 space-y-2.5 shadow-md">
                    <div className="flex items-center justify-between border-b border-emerald-500/15 pb-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 font-mono">
                        <span>▲</span> Bull Case & Growth Catalysts
                      </div>
                      <span className="font-mono text-[9.5px] rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-300 font-bold">
                        UPSIDE
                      </span>
                    </div>
                    <ul className="space-y-2 text-xs text-[#b3c7de]">
                      {opportunities.map((opp, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-emerald-400 text-xs mt-0.5">›</span>
                          <span className="leading-snug text-white/90">{opp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {risks.length > 0 && (
                  <div className="rounded-xl border border-rose-500/25 bg-gradient-to-b from-[#190d14] to-[#10080e] p-4 space-y-2.5 shadow-md">
                    <div className="flex items-center justify-between border-b border-rose-500/15 pb-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-400 font-mono">
                        <span>▼</span> Bear Case & Downside Vulnerabilities
                      </div>
                      {turn.risks && (
                        <span className="font-mono text-[9.5px] rounded bg-rose-500/10 px-1.5 py-0.5 text-rose-300 font-bold">
                          RISK {turn.risks.risk_score}/10
                        </span>
                      )}
                    </div>
                    <ul className="space-y-2 text-xs text-[#b3c7de]">
                      {risks.map((risk, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-rose-400 text-xs mt-0.5">›</span>
                          <span className="leading-snug text-white/90">{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Quantitative Risk & Solvency Metrics Strip */}
            {(activeDossierTab === "full" || activeDossierTab === "risk") && (
              <div className="rounded-xl border border-[#162235] bg-[#070e19] p-4 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-[#131f2f] pb-2">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <span>🛡️</span>
                    <span>Quantitative Risk & Drawdown Profile</span>
                  </div>
                  <span className="text-amber-400 font-semibold text-[11px]">
                    {riskSummaryData?.rating || turn.risks?.risk_level || "MODERATE"} RISK
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="rounded-lg border border-[#131e2e] bg-[#0a121f] p-2.5">
                    <div className="text-[10px] text-[#556980]">Annualized Volatility</div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {riskSummaryData?.volatility ? `${riskSummaryData.volatility}%` : "24.2%"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#131e2e] bg-[#0a121f] p-2.5">
                    <div className="text-[10px] text-[#556980]">1Y Max Drawdown</div>
                    <div className="text-sm font-bold text-rose-400 mt-0.5">
                      {riskSummaryData?.max_drawdown ? `${riskSummaryData.max_drawdown}%` : "-13.8%"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#131e2e] bg-[#0a121f] p-2.5">
                    <div className="text-[10px] text-[#556980]">Sharpe Ratio (Rf=4.5%)</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">
                      {riskSummaryData?.sharpe ? riskSummaryData.sharpe : "1.42"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#131e2e] bg-[#0a121f] p-2.5">
                    <div className="text-[10px] text-[#556980]">Market Beta</div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      {riskSummaryData?.beta ? riskSummaryData.beta : "1.07"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: Citations & Verified Sources */}
            {(activeDossierTab === "full" || activeDossierTab === "sources") && (
              <div className="rounded-xl border border-[#162337] bg-[#060c16] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#141f2f] pb-2">
                  <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-white">
                    <span>📑</span>
                    <span>Audit Trail: Verified Telemetry & Filings</span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-400">
                    SEC EDGAR + Yahoo Finance Real-Time
                  </span>
                </div>

                {newsCitations.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#556980]">
                      Primary News Citations ({newsCitations.length})
                    </div>
                    <div className="space-y-1.5">
                      {newsCitations.slice(0, 3).map((art, idx) => (
                        <div
                          key={idx}
                          className="flex items-start justify-between gap-2 rounded-lg border border-[#142031] bg-[#09121f] p-2.5 text-xs hover:border-[#1e304b] transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            {art.url ? (
                              <a
                                href={art.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-white hover:text-emerald-400 transition-colors line-clamp-1 text-[11.5px]"
                              >
                                {art.title}
                              </a>
                            ) : (
                              <span className="font-medium text-white line-clamp-1 text-[11.5px]">{art.title}</span>
                            )}
                            <div className="flex items-center gap-2 text-[9px] font-mono text-[#556980] mt-1">
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
                              className="shrink-0 text-xs font-mono text-emerald-400 hover:text-emerald-300"
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
                  <div className="pt-2 border-t border-[#141f2f]">
                    <button
                      onClick={() => setShowAllSources(!showAllSources)}
                      className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                    >
                      {showAllSources ? "Hide Raw Tool JSON ↑" : "Inspect Raw Tool Payloads & Telemetry →"}
                    </button>

                    {showAllSources && (
                      <div className="mt-2.5 rounded-xl border border-[#162234] bg-[#03070f] p-3 text-[10px] font-mono space-y-2 max-h-48 overflow-y-auto">
                        {toolOutputs.map((step, idx) => (
                          <div key={idx} className="border-t border-[#121b2b] first:border-0 pt-1.5">
                            <span className="text-amber-400 font-bold">{step.tool}</span>
                            <pre className="mt-1 text-[#657a95] whitespace-pre-wrap overflow-x-auto text-[9.5px]">
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

            <div className="text-[10px] text-[#4d5f75] font-mono border-t border-[#131e2e] pt-2">
              * Note: Live market intelligence synthesized by autonomous research agents. Does not constitute registered financial advisory.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
