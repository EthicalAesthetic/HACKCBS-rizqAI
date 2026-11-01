"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import HeroDashboardPreview from "./HeroDashboardPreview";

interface HeroSectionProps {
  onLaunchTerminal?: () => void;
}

export default function HeroSection({ onLaunchTerminal }: HeroSectionProps) {
  const router = useRouter();
  const { user, openAuthModal } = useAuth();

  const handleStartResearching = () => {
    if (onLaunchTerminal) {
      onLaunchTerminal();
    } else if (user) {
      router.push("/app");
    } else {
      openAuthModal("signup");
    }
  };

  const handleScrollToWorkflow = () => {
    const el = document.getElementById("how-it-works");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="home" className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 overflow-hidden bg-black text-white">
      {/* Background ambient lighting — subtle monochromatic glow */}
      <div className="pointer-events-none absolute left-1/2 -top-40 -translate-x-1/2 h-[500px] w-[900px] rounded-full bg-gradient-to-b from-white/[0.04] via-white/[0.01] to-transparent blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Top Feature Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.14] bg-white/[0.03] px-4 py-1.5 text-xs font-mono uppercase tracking-[0.16em] text-zinc-300 mb-8 backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          <span>Autonomous Multi-Agent Equity Intelligence</span>
        </div>

        {/* Main Title */}
        <h1 className="font-sans text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.08] max-w-4xl mx-auto">
          Institutional Research. <br />
          <span className="text-zinc-400">
            Engineered Without Bias.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-zinc-400 leading-relaxed tracking-tight">
          An autonomous multi-agent research desk that screens filings, models
          financial statements, stress-tests quantitative downside risk, and debates
          adversarial Bull vs Bear theses on any public equity.
        </p>

        {/* CTAs */}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={handleStartResearching}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-semibold text-black shadow-[0_0_25px_rgba(255,255,255,0.18)] transition-all hover:bg-zinc-200 active:scale-95 cursor-pointer"
          >
            <span>Launch Research Desk</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={handleScrollToWorkflow}
            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.03] px-6 py-3 text-sm font-medium text-white transition-all hover:border-white/25 hover:bg-white/[0.06] cursor-pointer"
          >
            <span>Explore Architecture</span>
            <span className="font-mono text-zinc-400">↓</span>
          </button>
        </div>

        {/* Capabilities Pill Strip */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 font-mono text-[11px] text-zinc-400">
          <div className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5">
            <span className="text-white">◈</span> Real-Time OHLCV Feeds
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5">
            <span className="text-white">◈</span> 3-Statement SEC EDGAR
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5">
            <span className="text-white">◈</span> Adversarial Bull/Bear Debate
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5">
            <span className="text-white">◈</span> Quant Drawdown & Sharpe
          </div>
        </div>

        {/* Hero Live Interface Demonstration */}
        <div className="mt-14">
          <HeroDashboardPreview onLaunchTerminal={handleStartResearching} />
        </div>
      </div>
    </section>
  );
}
