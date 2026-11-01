import Link from "next/link";

interface FooterProps {
  onLaunchTerminal?: () => void;
}

export default function Footer({ onLaunchTerminal }: FooterProps) {
  return (
    <footer id="about" className="border-t border-white/[0.08] bg-black py-14 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-10 border-b border-white/[0.08]">
          {/* Brand */}
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/20 bg-white/[0.06] text-white">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="font-sans text-lg font-bold tracking-tight text-white">
                Rizq<span className="text-zinc-400">AI</span>
              </span>
            </Link>
            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
              Autonomous multi-agent financial intelligence and research engine. Institutional clarity engineered without bias.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap items-center gap-8 text-xs font-mono uppercase tracking-wider text-zinc-400">
            <a href="#home" className="hover:text-white transition-colors">Overview</a>
            <a href="#features" className="hover:text-white transition-colors">Intelligence</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">Workflow</a>
            {onLaunchTerminal ? (
              <button
                onClick={onLaunchTerminal}
                className="text-white hover:text-zinc-300 font-semibold transition-colors cursor-pointer"
              >
                Launch Terminal →
              </button>
            ) : (
              <Link href="/app" className="text-white hover:text-zinc-300 font-semibold transition-colors">
                Launch Terminal →
              </Link>
            )}
          </div>
        </div>

        {/* Disclaimer & Copyright */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500 font-mono">
          <p className="max-w-2xl leading-relaxed">
            <span className="font-medium text-zinc-400">Disclaimer:</span> RizqAI is an autonomous financial research synthesis engine designed for institutional modeling and informational evaluation. Synthesized outputs do not constitute registered investment or tax advice.
          </p>
          <div className="shrink-0 text-zinc-500">
            © {new Date().getFullYear()} RizqAI Systems. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
