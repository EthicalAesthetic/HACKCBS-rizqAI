"use client";

import { useRef, useEffect } from "react";

interface WorkspaceInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export default function WorkspaceInput({
  value,
  onChange,
  onSubmit,
  disabled,
}: WorkspaceInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSubmit();
      }
    }
  };

  const handleAppendMod = (mod: string) => {
    if (!value.trim()) {
      onChange(mod + " ");
    } else {
      onChange(value.trim() + " " + mod);
    }
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full space-y-2.5">
      {/* Quick Modifier Chips */}
      <div className="hidden sm:flex items-center gap-2 overflow-x-auto font-mono text-[10.5px]">
        <span className="text-zinc-500 text-[10px] uppercase tracking-wider shrink-0">Command Presets:</span>
        <button
          type="button"
          onClick={() => handleAppendMod("Compare valuation multiples and growth of")}
          className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-zinc-400 hover:text-white hover:border-white/20 hover:bg-white/[0.06] transition-all shrink-0 cursor-pointer"
        >
          + Compare Multiples
        </button>
        <button
          type="button"
          onClick={() => handleAppendMod("technicals RSI MACD and moving averages for")}
          className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-zinc-400 hover:text-white hover:border-white/20 hover:bg-white/[0.06] transition-all shrink-0 cursor-pointer"
        >
          + Technicals (RSI/MACD)
        </button>
        <button
          type="button"
          onClick={() => handleAppendMod("volatility Sharpe ratio and maximum drawdown for")}
          className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-zinc-400 hover:text-white hover:border-white/20 hover:bg-white/[0.06] transition-all shrink-0 cursor-pointer"
        >
          + Quant Risk & Drawdown
        </button>
        <button
          type="button"
          onClick={() => handleAppendMod("financial statements balance sheet and free cash flow of")}
          className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-zinc-400 hover:text-white hover:border-white/20 hover:bg-white/[0.06] transition-all shrink-0 cursor-pointer"
        >
          + 3-Statement Financials
        </button>
      </div>

      {/* Main Terminal Command Input — Luxury Monochromatic Glass */}
      <div className="relative flex items-center gap-3 rounded-2xl border border-white/[0.12] bg-zinc-950/80 px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl focus-within:border-white/30 focus-within:ring-1 focus-within:ring-white/10 transition-all duration-200">
        {/* Terminal Prompt Glyph */}
        <div className="flex items-center font-mono text-zinc-400 font-bold text-xs select-none">
          <span>›_</span>
        </div>

        {/* Input Text Box */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={
            disabled
              ? "Multi-agent research pipeline is active… synthesizing findings"
              : "Enter ticker or research query (e.g., NVDA vs AMD, AAPL financial statements)..."
          }
          className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none disabled:opacity-50 font-sans tracking-tight"
        />

        {/* Enter key badge / Working state */}
        <div className="flex items-center gap-2">
          {!disabled && value.trim() && (
            <span className="hidden sm:inline font-mono text-[10px] text-zinc-500">
              Press ↵
            </span>
          )}

          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
            className={`flex shrink-0 items-center justify-center transition-all duration-200 cursor-pointer ${
              disabled
                ? "h-8 px-3 rounded-xl bg-white/[0.06] border border-white/15 text-zinc-300 font-mono text-xs font-medium gap-2 cursor-not-allowed"
                : "h-8 w-8 rounded-xl bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.15)] active:scale-95 disabled:opacity-20 disabled:pointer-events-none"
            }`}
          >
            {disabled ? (
              <>
                <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span className="text-[10.5px]">Synthesizing</span>
              </>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
