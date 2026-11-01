"use client";

import { useState } from "react";
import type { AnalysisTurn } from "@/lib/types";

interface WorkspaceRightPanelProps {
  activeTurn?: AnalysisTurn | null;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

interface NewsArticle {
  title?: string | null;
  source?: string | null;
  url?: string | null;
  published_at?: string | null;
  description?: string | null;
}

export default function WorkspaceRightPanel({
  activeTurn,
  isOpenMobile,
  onCloseMobile,
}: WorkspaceRightPanelProps) {
  const [activeTab, setActiveTab] = useState<"Financials" | "Technicals" | "News" | "Debate">("Financials");

  const planCompany = activeTurn?.plan?.companies?.[0];
  const researchData = activeTurn?.research;
  const toolOutputs = researchData?.tool_data || [];

  let companyName = planCompany || (activeTurn?.query ? "Target Equity" : "Market Overview");
  let exchangePrice = "—";
  let description = "Submit an analysis query to stream live financial data and agent consensus.";
  let marketCap = "—";
  let peRatio = "—";
  let forwardPe = "—";
  let fiftyTwoHigh = "—";
  let fiftyTwoLow = "—";
  let dividendYield = "—";
  let beta = "—";
  let eps = "—";
  let sector = "—";
  let industry = "—";

  // Tool metrics
  let rsiValue = "—";
  let macdBias = "—";
  let volatilityPct = "—";
  let maxDrawdownPct = "—";
  let sharpeRatio = "—";
  let analystTarget = "—";
  let analystConsensus = "—";

  const newsArticles: NewsArticle[] = [];

  for (const step of toolOutputs) {
    if (step.tool === "get_company_info" && typeof step.output === "object" && step.output !== null) {
      const info = step.output as Record<string, unknown>;
      if (info.name) companyName = String(info.name);
      if (info.summary) description = String(info.summary).slice(0, 240) + "…";
      if (info.sector) sector = String(info.sector);
      if (info.industry) industry = String(info.industry);
      if (info.market_cap) {
        const mc = Number(info.market_cap);
        marketCap = mc >= 1e12 ? `$${(mc / 1e12).toFixed(2)}T` : mc >= 1e9 ? `$${(mc / 1e9).toFixed(1)}B` : `$${mc.toLocaleString()}`;
      }
      if (info.pe_ratio !== undefined && info.pe_ratio !== null) peRatio = String(Number(info.pe_ratio).toFixed(2));
      if (info.forward_pe !== undefined && info.forward_pe !== null) forwardPe = String(Number(info.forward_pe).toFixed(2));
      if (info["52_week_high"] || info.fiftyTwoWeekHigh) fiftyTwoHigh = `$${info["52_week_high"] || info.fiftyTwoWeekHigh}`;
      if (info["52_week_low"] || info.fiftyTwoWeekLow) fiftyTwoLow = `$${info["52_week_low"] || info.fiftyTwoWeekLow}`;
      if (info.dividend_yield !== undefined && info.dividend_yield !== null) dividendYield = `${(Number(info.dividend_yield) * 100).toFixed(2)}%`;
      if (info.beta !== undefined && info.beta !== null) beta = String(Number(info.beta).toFixed(2));
      if (info.eps !== undefined && info.eps !== null) eps = `$${Number(info.eps).toFixed(2)}`;
    }
    if (step.tool === "get_stock_price" && typeof step.output === "object" && step.output !== null) {
      const quote = step.output as Record<string, unknown>;
      if (quote.price !== undefined && quote.price !== null) {
        exchangePrice = `${quote.currency || "USD"} · $${quote.price}`;
      }
      if (quote.year_high && fiftyTwoHigh === "—") fiftyTwoHigh = `$${quote.year_high}`;
      if (quote.year_low && fiftyTwoLow === "—") fiftyTwoLow = `$${quote.year_low}`;
    }
    if (step.tool === "get_technical_indicators" && typeof step.output === "object" && step.output !== null) {
      const tech = step.output as Record<string, unknown>;
      const rsiObj = tech.rsi as Record<string, unknown> | undefined;
      const macdObj = tech.macd as Record<string, unknown> | undefined;
      if (typeof rsiObj?.value === "number") rsiValue = `${rsiObj.value.toFixed(1)} (${rsiObj.status || ""})`;
      if (typeof macdObj?.status === "string") macdBias = macdObj.status;
    }
    if (step.tool === "get_risk_analysis" && typeof step.output === "object" && step.output !== null) {
      const rk = step.output as Record<string, unknown>;
      if (typeof rk.annualized_volatility_pct === "number") volatilityPct = `${rk.annualized_volatility_pct}%`;
      if (typeof rk.max_drawdown_1y_pct === "number") maxDrawdownPct = `${rk.max_drawdown_1y_pct}%`;
      if (typeof rk.sharpe_ratio === "number") sharpeRatio = String(rk.sharpe_ratio);
      if (typeof rk.beta === "number" && beta === "—") beta = String(rk.beta);
    }
    if (step.tool === "get_analyst_recommendations" && typeof step.output === "object" && step.output !== null) {
      const ar = step.output as Record<string, unknown>;
      if (ar.consensus_rating) analystConsensus = String(ar.consensus_rating).toUpperCase();
      if (ar.target_mean_price) analystTarget = `$${ar.target_mean_price} (${ar.upside_potential_pct || 0}% upside)`;
    }
    if (step.tool === "get_company_news" && typeof step.output === "object" && step.output !== null) {
      const newsOutput = step.output as Record<string, unknown>;
      if (Array.isArray(newsOutput.articles)) {
        for (const art of newsOutput.articles) {
          if (art && typeof art === "object") {
            newsArticles.push(art as NewsArticle);
          }
        }
      }
    }
  }

  const symbolIcon = (planCompany || companyName || "•").slice(0, 1).toUpperCase();

  const content = (
    <div className="flex h-full flex-col justify-between p-4 bg-black border-l border-white/[0.08] text-white overflow-y-auto select-none">
      <div className="space-y-4">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-mono font-medium uppercase tracking-wider text-zinc-300">
              Intelligence Panel
            </span>
          </div>

          {activeTurn?.status === "streaming" ? (
            <span className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.06] px-2.5 py-0.5 font-mono text-[9.5px] font-medium text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
              STREAMING
            </span>
          ) : (
            <span className="font-mono text-[9.5px] text-zinc-500">
              {activeTurn ? "Active Feed" : "Standby"}
            </span>
          )}
        </div>

        {/* Tab Navigation: Financials / Technicals / News / Debate */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-1 font-mono text-[11px]">
          {(["Financials", "Technicals", "News", "Debate"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 px-1 transition-all duration-150 cursor-pointer ${
                activeTab === tab
                  ? "border-b-2 border-white text-white font-bold"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Company Card Header */}
        <div className="space-y-2.5 border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/[0.06] text-white font-mono font-bold text-xs shadow-sm">
              {symbolIcon}
            </div>
            <div className="min-w-0 flex-1 truncate">
              <h4 className="text-xs sm:text-sm font-bold text-white truncate tracking-tight">{companyName}</h4>
              <p className="text-[11px] font-mono text-zinc-300 font-semibold">{exchangePrice}</p>
            </div>
          </div>
          {sector !== "—" && (
            <div className="flex gap-1.5 text-[9.5px] font-mono text-zinc-500">
              <span>{sector}</span>
              <span>•</span>
              <span>{industry}</span>
            </div>
          )}
          <p className="text-[11.5px] text-zinc-400 leading-relaxed line-clamp-3">
            {description}
          </p>
        </div>

        {/* TAB 1: Financials */}
        {activeTab === "Financials" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 space-y-2.5">
              <div className="font-mono text-[9.5px] uppercase tracking-wider text-zinc-500 pb-1.5 border-b border-white/[0.06]">
                Valuation Multiples
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Market Cap</span>
                  <span className="text-white font-semibold">{marketCap}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Trailing P/E</span>
                  <span className="text-white font-semibold">{peRatio}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Forward P/E</span>
                  <span className="text-white font-semibold">{forwardPe}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">EPS (TTM)</span>
                  <span className="text-white font-semibold">{eps}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">52W Range</span>
                  <span className="text-white font-semibold">{fiftyTwoHigh} / {fiftyTwoLow}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Dividend Yield</span>
                  <span className="text-white font-semibold">{dividendYield}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Beta</span>
                  <span className="text-white font-semibold">{beta}</span>
                </div>
                {analystConsensus !== "—" && (
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                    <span className="text-zinc-400">Analyst Target</span>
                    <span className="text-white font-bold">{analystTarget}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Technicals & Quantitative Risk */}
        {activeTab === "Technicals" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 space-y-2.5 font-mono text-xs">
              <div className="text-[9.5px] uppercase tracking-wider text-zinc-500 pb-1.5 border-b border-white/[0.06]">
                Technicals & Risk
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">RSI (14-Day)</span>
                  <span className="text-white font-bold">{rsiValue}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">MACD Bias</span>
                  <span className="text-white font-semibold">{macdBias}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Annual Volatility</span>
                  <span className="text-white font-semibold">{volatilityPct}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">1Y Max Drawdown</span>
                  <span className="text-zinc-300 font-semibold">{maxDrawdownPct}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Sharpe Ratio</span>
                  <span className="text-white font-semibold">{sharpeRatio}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: News */}
        {activeTab === "News" && (
          <div className="space-y-2.5">
            <div className="font-mono text-[9.5px] uppercase tracking-wider text-zinc-500">
              News Citations ({newsArticles.length})
            </div>

            {newsArticles.length > 0 ? (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {newsArticles.map((article, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 space-y-1 transition-all hover:border-white/20 hover:bg-white/[0.05]"
                  >
                    <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono">
                      <span className="text-zinc-300 font-semibold">{article.source || "Financial Press"}</span>
                      {article.published_at && (
                        <span>{new Date(article.published_at).toLocaleDateString()}</span>
                      )}
                    </div>
                    {article.url ? (
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11.5px] font-semibold text-white hover:text-zinc-200 transition-colors line-clamp-2 block leading-snug"
                      >
                        {article.title || "Untitled Article"} ↗
                      </a>
                    ) : (
                      <p className="text-[11.5px] font-semibold text-white line-clamp-2 leading-snug">
                        {article.title || "Untitled Article"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-center">
                <p className="text-xs text-zinc-500">
                  {activeTurn ? "No external news items returned for this query." : "Run a query to populate headlines."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Debate */}
        {activeTab === "Debate" && (
          <div className="space-y-2.5">
            {activeTurn?.thesis ? (
              <div className="space-y-2.5">
                <div className="rounded-xl border border-white/[0.14] bg-white/[0.03] p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between font-mono text-[9.5px] uppercase text-zinc-400">
                    <span>Consensus Verdict</span>
                    <span className="text-white font-bold tracking-wider">{activeTurn.thesis.recommendation}</span>
                  </div>
                  {activeTurn.thesis.key_reasons?.[0] && (
                    <p className="text-[11px] text-zinc-300 leading-relaxed pt-1.5 border-t border-white/[0.06]">
                      {activeTurn.thesis.key_reasons[0]}
                    </p>
                  )}
                </div>

                {activeTurn.debate && (
                  <div className="space-y-2">
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 text-xs space-y-1">
                      <div className="font-semibold text-white text-[11px] font-mono tracking-wide">Bull Case Synthesis</div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        {activeTurn.debate.bull_case?.summary || "Favorable market positioning."}
                      </p>
                    </div>

                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 text-xs space-y-1">
                      <div className="font-semibold text-zinc-300 text-[11px] font-mono tracking-wide">Bear Case Risks</div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        {activeTurn.debate.bear_case?.summary || "Downside risks identified."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-center">
                <p className="text-xs text-zinc-500">
                  Run an equity analysis to populate adversarial bull vs bear scenarios.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-80 shrink-0 xl:block h-full">
        {content}
      </aside>

      {isOpenMobile && (
        <div className="fixed inset-0 z-40 xl:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={onCloseMobile}
          />
          <aside className="fixed inset-y-0 right-0 w-80 z-50 shadow-2xl">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
