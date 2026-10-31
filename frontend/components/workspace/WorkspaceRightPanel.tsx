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

  // New tool metrics
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
    <div className="flex h-full flex-col justify-between p-3.5 bg-[#060b13] border-l border-[#141f2e] text-text overflow-y-auto select-none">
      <div className="space-y-3.5">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#141f2e]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-dot" />
            <span className="text-xs font-mono font-semibold text-white">Live Intelligence Terminal</span>
          </div>

          {activeTurn?.status === "streaming" ? (
            <span className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[9.5px] font-semibold text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              STREAMING
            </span>
          ) : (
            <span className="font-mono text-[9.5px] text-[#4d5f75]">
              {activeTurn ? "Active Query" : "Standby"}
            </span>
          )}
        </div>

        {/* Tab Navigation: Financials / Technicals / News / Debate */}
        <div className="flex items-center justify-between border-b border-[#141f2e] pb-1 text-[11px] font-mono">
          {(["Financials", "Technicals", "News", "Debate"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-1.5 px-1.5 transition-colors cursor-pointer ${
                activeTab === tab
                  ? "border-b-2 border-emerald-400 text-emerald-400 font-bold"
                  : "text-[#6b809a] hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Company Card Header */}
        <div className="space-y-2 border-b border-[#141f2e] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white font-black text-xs bg-emerald-600 shadow-sm">
              {symbolIcon}
            </div>
            <div className="min-w-0 flex-1 truncate">
              <h4 className="text-xs sm:text-sm font-bold text-white truncate leading-tight">{companyName}</h4>
              <p className="text-[10.5px] font-mono text-emerald-400 font-semibold">{exchangePrice}</p>
            </div>
          </div>
          {sector !== "—" && (
            <div className="flex gap-1.5 text-[9.5px] font-mono text-[#556980]">
              <span>{sector}</span>
              <span>•</span>
              <span>{industry}</span>
            </div>
          )}
          <p className="text-[11.5px] text-[#8fa2ba] leading-relaxed line-clamp-3">
            {description}
          </p>
        </div>

        {/* TAB 1: Financials */}
        {activeTab === "Financials" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-[#142031] bg-[#08101a] p-3 space-y-2">
              <div className="font-mono text-[9.5px] uppercase tracking-wider text-[#556980] pb-1 border-b border-[#141f2e]">
                Fundamental Multiples & Valuation
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[#70849c]">Market Cap</span>
                  <span className="text-white font-semibold">{marketCap}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#70849c]">Trailing P/E</span>
                  <span className="text-white font-semibold">{peRatio}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#70849c]">Forward P/E</span>
                  <span className="text-white font-semibold">{forwardPe}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#70849c]">EPS (TTM)</span>
                  <span className="text-white font-semibold">{eps}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#70849c]">52W Range</span>
                  <span className="text-white font-semibold">{fiftyTwoHigh} / {fiftyTwoLow}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#70849c]">Dividend Yield</span>
                  <span className="text-white font-semibold">{dividendYield}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#70849c]">Beta</span>
                  <span className="text-white font-semibold">{beta}</span>
                </div>
                {analystConsensus !== "—" && (
                  <div className="flex items-center justify-between pt-1 border-t border-[#141f2e]">
                    <span className="text-emerald-400">Analyst Target</span>
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
            <div className="rounded-xl border border-[#142031] bg-[#08101a] p-3 space-y-2.5 font-mono text-xs">
              <div className="text-[9.5px] uppercase tracking-wider text-[#556980] pb-1 border-b border-[#141f2e]">
                Technical Momentum & Volatility
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#70849c]">RSI (14-Day)</span>
                  <span className="text-white font-bold">{rsiValue}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#70849c]">MACD Signal</span>
                  <span className="text-emerald-400 font-bold">{macdBias}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#70849c]">Annual Volatility</span>
                  <span className="text-white font-semibold">{volatilityPct}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#70849c]">1Y Max Drawdown</span>
                  <span className="text-rose-400 font-semibold">{maxDrawdownPct}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#70849c]">Sharpe Ratio</span>
                  <span className="text-emerald-400 font-semibold">{sharpeRatio}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: News */}
        {activeTab === "News" && (
          <div className="space-y-2.5">
            <div className="font-mono text-[9.5px] uppercase tracking-wider text-[#556980]">
              Audited News Citations ({newsArticles.length})
            </div>

            {newsArticles.length > 0 ? (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {newsArticles.map((article, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-[#152030] bg-[#080f1a] p-2.5 space-y-1 transition-colors hover:border-emerald-500/30"
                  >
                    <div className="flex items-center justify-between text-[9px] text-[#556980] font-mono">
                      <span className="text-emerald-400 font-semibold">{article.source || "Financial Press"}</span>
                      {article.published_at && (
                        <span>{new Date(article.published_at).toLocaleDateString()}</span>
                      )}
                    </div>
                    {article.url ? (
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11.5px] font-semibold text-white hover:text-emerald-300 transition-colors line-clamp-2 block leading-snug"
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
              <div className="rounded-xl border border-[#142031] bg-[#08101a] p-4 text-center">
                <p className="text-xs text-[#70849c]">
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
                <div className="rounded-xl border border-emerald-500/30 bg-[#081625] p-3 space-y-1">
                  <div className="flex items-center justify-between font-mono text-[9.5px] uppercase text-[#6f849e]">
                    <span>Consensus Verdict</span>
                    <span className="text-emerald-400 font-bold">{activeTurn.thesis.recommendation}</span>
                  </div>
                  {activeTurn.thesis.key_reasons?.[0] && (
                    <p className="text-[11px] text-[#c0d2e8] leading-relaxed pt-1 border-t border-white/5">
                      {activeTurn.thesis.key_reasons[0]}
                    </p>
                  )}
                </div>

                {activeTurn.debate && (
                  <div className="space-y-2">
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-2.5 text-xs">
                      <div className="font-semibold text-emerald-400 mb-1 text-[11px] font-mono">Bull Case Thesis</div>
                      <p className="text-[11px] text-emerald-100/90 leading-relaxed">
                        {activeTurn.debate.bull_case?.summary || "Favorable market positioning."}
                      </p>
                    </div>

                    <div className="rounded-lg border border-rose-500/20 bg-rose-950/20 p-2.5 text-xs">
                      <div className="font-semibold text-rose-400 mb-1 text-[11px] font-mono">Bear Case Risks</div>
                      <p className="text-[11px] text-rose-100/90 leading-relaxed">
                        {activeTurn.debate.bear_case?.summary || "Downside risks identified."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-[#142031] bg-[#08101a] p-4 text-center">
                <p className="text-xs text-[#70849c]">
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
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
