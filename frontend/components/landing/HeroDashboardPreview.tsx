"use client";

interface HeroDashboardPreviewProps {
  onLaunchTerminal?: () => void;
}

export default function HeroDashboardPreview({ onLaunchTerminal }: HeroDashboardPreviewProps) {
  return (
    <div className="relative mx-auto w-full max-w-6xl">
      {/* Ambient background glow — subtle white highlight */}
      <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-white/[0.03] opacity-60 blur-2xl" />

      {/* Terminal Glass Container */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.12] bg-black p-4 sm:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
        {/* Top window chrome */}
        <div className="mb-5 flex items-center justify-between border-b border-white/[0.08] pb-3.5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <span className="ml-2 font-mono text-[11px] text-zinc-500">rizqai-terminal.equity.internal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 font-mono text-[10px] text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              Autonomous Engine Active
            </span>
          </div>
        </div>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 text-left">
          {/* Left Mini Sidebar */}
          <div className="hidden lg:col-span-3 lg:flex lg:flex-col justify-between border-r border-white/[0.08] pr-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white font-semibold text-xs tracking-tight">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/20 bg-white/[0.08] text-white text-xs">
                  ◈
                </div>
                RizqAI Desk
              </div>

              <div className="space-y-1 text-xs">
                <button
                  onClick={onLaunchTerminal}
                  className="w-full flex items-center justify-between rounded-xl bg-white text-black px-3 py-2 font-semibold text-xs shadow-sm cursor-pointer"
                >
                  <span>+ New Session</span>
                  <span className="font-mono text-[10px]">⌘K</span>
                </button>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-zinc-400 font-mono text-[11px]">
                  <span>AAPL Equity Dossier</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-zinc-500 font-mono text-[11px]">
                  <span>NVDA vs AMD Multiples</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-[10px] font-mono text-zinc-400 space-y-1">
              <div className="font-semibold text-white">Consensus Active</div>
              <div>6 Specialist Agent Desks</div>
            </div>
          </div>

          {/* Center Main Stage */}
          <div className="lg:col-span-9 space-y-4">
            {/* Mock Search Prompt */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
              <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.1] bg-black px-3.5 py-2 text-xs text-white font-mono">
                <span className="text-zinc-500">›_</span>
                <span className="flex-1 truncate">Analyze Apple (AAPL) - valuation multiples, bull vs bear consensus, and verdict</span>
                <span className="rounded bg-white text-black px-2 py-0.5 text-[10px] font-bold">↵</span>
              </div>
            </div>

            {/* AAPL Financial Snapshot Card */}
            <div className="rounded-xl border border-white/[0.1] bg-white/[0.02] p-5 space-y-4">
              {/* Ticker Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/[0.08] text-white font-mono font-bold text-sm">
                    AAPL
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-base tracking-tight">Apple Inc.</h3>
                      <span className="rounded bg-white/[0.06] border border-white/10 px-1.5 py-0.2 font-mono text-[9px] text-zinc-400">NASDAQ: AAPL</span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl font-bold text-white font-mono tracking-tight">$248.50</span>
                      <span className="text-xs font-mono font-semibold text-emerald-400">
                        +2.36% (+$5.72)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Simulated Sparkline */}
                <div className="w-28 sm:w-36 h-10">
                  <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                    <polyline
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2"
                      points="0,32 20,28 35,30 50,22 65,24 80,14 100,8"
                    />
                  </svg>
                </div>
              </div>

              {/* Multiples Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                  <div className="text-[10px] text-zinc-500 uppercase">Market Cap</div>
                  <div className="text-sm font-bold text-white mt-0.5">$3.78T</div>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                  <div className="text-[10px] text-zinc-500 uppercase">Trailing P/E</div>
                  <div className="text-sm font-bold text-white mt-0.5">34.2x</div>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                  <div className="text-[10px] text-zinc-500 uppercase">Sharpe Ratio</div>
                  <div className="text-sm font-bold text-white mt-0.5">1.68</div>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                  <div className="text-[10px] text-zinc-500 uppercase">1Y Drawdown</div>
                  <div className="text-sm font-bold text-zinc-300 mt-0.5">-9.4%</div>
                </div>
              </div>

              {/* Adversarial Consensus Mini-Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between font-mono text-[10px] text-zinc-300 font-semibold">
                    <span>▲ BULL THESIS</span>
                    <span className="text-[9px] text-zinc-500">SERVICES + AI MOAT</span>
                  </div>
                  <p className="text-[11.5px] text-zinc-400 leading-relaxed">
                    Services revenue acceleration and high-margin recurring subscriptions mitigate cyclical hardware upgrade fluctuations.
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between font-mono text-[10px] text-zinc-400 font-semibold">
                    <span>▼ BEAR RISKS</span>
                    <span className="text-[9px] text-zinc-500">VALUATION PREMIUM</span>
                  </div>
                  <p className="text-[11.5px] text-zinc-400 leading-relaxed">
                    Trading at 34x trailing earnings leaves limited safety margin against potential Greater China softness or antitrust rulings.
                  </p>
                </div>
              </div>

              {/* Executive Verdict Stamp Banner */}
              <div className="rounded-xl border border-white/[0.14] bg-white/[0.03] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Multi-Agent Final Verdict</div>
                  <div className="text-xs sm:text-sm font-semibold text-white tracking-tight">
                    BUY · Resilient Capital Return & Services Margin Expansion
                  </div>
                </div>

                <div className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/20 bg-white/[0.08] px-4 py-1.5 font-mono text-sm font-black tracking-wider text-white">
                  <span>STRONG BUY</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
