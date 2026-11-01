"use client";

export default function FeaturesSection() {
  const features = [
    {
      title: "Real-Time Market Feeds",
      description: "Live tick quotes, 52-week ranges, trading volumes, and dynamic valuation multiples.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
    {
      title: "Autonomous Agent Desks",
      description: "Specialized planner, research, risk, and debate agents collaborating concurrently.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
    {
      title: "Adversarial Bull vs Bear",
      description: "Rigorous adversarial thesis stress-testing to expose blind spots and critical downside risks.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
        </svg>
      ),
    },
    {
      title: "Quantitative Risk & Sharpe",
      description: "Annualized historical volatility, maximum 1-year drawdown, and risk-adjusted return ratios.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    {
      title: "Audited SEC Filings",
      description: "Every statement backed by verified 10-K / 10-Q SEC EDGAR filings and live market wires.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    {
      title: "Streaming SSE Telemetry",
      description: "Sub-second token streaming and transparent step-by-step pipeline audit trails.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
    },
  ];

  return (
    <section id="features" className="relative py-24 sm:py-32 bg-black text-white border-t border-white/[0.08]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column Heading */}
          <div className="lg:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.14] bg-white/[0.03] px-3.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-zinc-300">
              Platform Features
            </div>
            <h2 className="font-sans text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
              Institutional Rigor. Zero Cognitive Bias.
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed pt-2 tracking-tight">
              RizqAI combines live financial data tools, mathematical risk models,
              and adversarial multi-agent debate to produce objective,
              transparent equity intelligence in seconds.
            </p>
          </div>

          {/* Right Column Grid */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition-all duration-200 hover:border-white/25 hover:bg-white/[0.05] shadow-sm glow-card"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-white mb-4 transition-transform duration-200 group-hover:scale-105">
                  {feature.icon}
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight group-hover:text-zinc-100 transition-colors">
                  {feature.title}
                </h3>
                <p className="mt-2 text-xs sm:text-[13px] text-zinc-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
