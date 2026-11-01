"use client";

export default function HowItWorksSection() {
  const workflowSteps = [
    {
      stepNumber: "01",
      agent: "Screening & Entity Resolution",
      model: "Guardrail Agent",
      description: "Screens for query intent, safety compliance, ticker resolution, and conversation memory context.",
      icon: "◈",
    },
    {
      stepNumber: "02",
      agent: "Dynamic Plan Optimization",
      model: "Planner Agent",
      description: "Maps financial entities, evaluates prior research cache, and compiles task execution graph.",
      icon: "◇",
    },
    {
      stepNumber: "03",
      agent: "Fundamental & Market Research",
      model: "Research Agent",
      description: "Executes live market tools: quotes, 3-statement filings, technical indicators, and news feeds.",
      icon: "◆",
    },
    {
      stepNumber: "04",
      agent: "Quantitative Risk & Solvency",
      model: "Risk Assessment Desk",
      description: "Computes annualized historical volatility, 1-year max drawdown, Sharpe ratio, and debt solvency metrics.",
      icon: "◈",
    },
    {
      stepNumber: "05",
      agent: "Adversarial Bull vs Bear Debate",
      model: "Adversarial Synthesis",
      description: "Pits opposing analytical teams against each other to surface confirmation biases and hidden tail risks.",
      icon: "◇",
    },
    {
      stepNumber: "06",
      agent: "Consensus Investment Verdict",
      model: "Thesis Desk",
      description: "Issues final recommendation (BUY, HOLD, SELL), conviction metrics, and institutional thesis memo.",
      icon: "◆",
    },
  ];

  return (
    <section id="how-it-works" className="relative py-24 sm:py-32 border-t border-white/[0.08] bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Description */}
          <div className="lg:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.14] bg-white/[0.03] px-3.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-zinc-300">
              Agent Architecture
            </div>
            <h2 className="font-sans text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
              Sequential Multi-Agent Intelligence
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed pt-2 tracking-tight">
              From raw ticker inputs to an audited investment memo, RizqAI orchestrates
              specialized agent nodes across a deterministic state graph — ensuring
              repeatable, audited conclusions.
            </p>

            <div className="pt-6 hidden lg:block">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-white font-mono uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  Deterministic Graph Execution
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Every node communicates over a typed state contract. If any data tool encounters rate limits or anomalies, automatic fallback routines fail over across models seamlessly.
                </p>
              </div>
            </div>
          </div>

          {/* Right Interactive Pipeline Cards */}
          <div className="lg:col-span-7 space-y-3">
            {workflowSteps.map((step) => (
              <div
                key={step.agent}
                className="group relative flex items-start sm:items-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition-all duration-200 hover:border-white/25 hover:bg-white/[0.05] hover:translate-x-1"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-white font-mono text-xs font-bold">
                  {step.stepNumber}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white tracking-tight">
                      {step.agent}
                    </span>
                    <span className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 font-mono text-[9.5px] font-medium text-zinc-300">
                      {step.model}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
