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
    <div className="relative w-full space-y-2">
      {/* Quick Modifier Chips */}
      <div className="hidden sm:flex items-center gap-2 overflow-x-auto font-mono text-[10.5px]">
        <span className="text-[#4f647d] text-[10px] uppercase tracking-wider shrink-0">Command Presets:</span>
        <button
          type="button"
          onClick={() => handleAppendMod("Compare valuation multiples and growth of")}
          className="rounded border border-[#162335] bg-[#09111c] px-2 py-0.5 text-[#8fa2ba] hover:text-emerald-300 hover:border-emerald-500/40 transition-colors shrink-0"
        >
          + Compare
        </button>
        <button
          type="button"
          onClick={() => handleAppendMod("technicals RSI MACD and moving averages for")}
          className="rounded border border-[#162335] bg-[#09111c] px-2 py-0.5 text-[#8fa2ba] hover:text-emerald-300 hover:border-emerald-500/40 transition-colors shrink-0"
        >
          + Technicals
        </button>
        <button
          type="button"
          onClick={() => handleAppendMod("volatility Sharpe ratio and maximum drawdown for")}
          className="rounded border border-[#162335] bg-[#09111c] px-2 py-0.5 text-[#8fa2ba] hover:text-emerald-300 hover:border-emerald-500/40 transition-colors shrink-0"
        >
          + Quant Risk
        </button>
        <button
          type="button"
          onClick={() => handleAppendMod("financial statements balance sheet and free cash flow of")}
          className="rounded border border-[#162335] bg-[#09111c] px-2 py-0.5 text-[#8fa2ba] hover:text-emerald-300 hover:border-emerald-500/40 transition-colors shrink-0"
        >
          + 3-Statements
        </button>
      </div>

      {/* Main Terminal Command Input */}
      <div className="relative flex items-center gap-2.5 rounded-xl border border-[#172538] bg-[#09111c]/95 px-3.5 py-2.5 shadow-2xl shadow-black/70 backdrop-blur-xl focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/25 transition-all">
        {/* Terminal Prompt Glyph */}
        <div className="flex h-7 items-center px-1 font-mono text-emerald-400 font-bold text-xs select-none">
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
          placeholder={disabled ? "Multi-agent research pipeline is active… synthesizing findings" : "Enter ticker or research query (e.g., NVDA vs AMD, AAPL financial statements)..."}
          className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-[#50637b] focus:outline-none disabled:opacity-50 font-sans"
        />

        {/* Enter key badge / Working state */}
        <div className="flex items-center gap-2">
          {!disabled && value.trim() && (
            <span className="hidden sm:inline font-mono text-[10px] text-[#50637b]">
              Press ↵
            </span>
          )}

          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
            className={`flex shrink-0 items-center justify-center transition-all cursor-pointer ${
              disabled
                ? "h-8 px-3 rounded-lg bg-[#111c2c] border border-amber-500/30 text-amber-300 font-mono text-xs font-semibold gap-1.5 cursor-not-allowed"
                : "h-8 w-8 rounded-lg bg-emerald-400 text-[#060b13] shadow-md shadow-emerald-400/20 hover:bg-emerald-300 active:scale-95 disabled:opacity-20 disabled:pointer-events-none"
            }`}
          >
            {disabled ? (
              <>
                <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
                <span className="text-[11px]">Executing</span>
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
