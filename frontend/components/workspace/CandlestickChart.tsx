"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchCandles, type CandleData, type CandleResponse } from "@/lib/api";

interface CandlestickChartProps {
  symbol?: string | null;
}

type Period = "1mo" | "3mo" | "6mo" | "1y";

export default function CandlestickChart({ symbol }: CandlestickChartProps) {
  const [period, setPeriod] = useState<Period>("3mo");
  const [data, setData] = useState<CandleResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hover state for interactive crosshair & inspection
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(600);

  // Resize observer to keep chart responsive
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]?.contentRect?.width) {
        setContainerWidth(Math.max(320, entries[0].contentRect.width));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch candle data when symbol or period changes
  useEffect(() => {
    if (!symbol) return;
    let isCancelled = false;
    setLoading(true);
    setError(null);

    fetchCandles(symbol, period)
      .then((res) => {
        if (isCancelled) return;
        if (!res || !res.candles || res.candles.length === 0) {
          setError(`No candlestick data available for ${symbol.toUpperCase()}`);
        } else {
          setData(res);
        }
      })
      .catch((err) => {
        if (isCancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load market candles");
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [symbol, period]);

  const candles = data?.candles || [];
  const summary = data?.summary;

  // Chart layout dimensions
  const height = 280;
  const padding = { top: 20, right: 62, bottom: 35, left: 10 };
  const pricePlotHeight = height * 0.68 - padding.top;
  const volumePlotTop = height * 0.72;
  const volumePlotHeight = height - volumePlotTop - padding.bottom;
  const plotWidth = Math.max(100, containerWidth - padding.left - padding.right);

  // Min and Max scales
  const { minPrice, maxPrice, maxVolume } = useMemo(() => {
    if (candles.length === 0) return { minPrice: 0, maxPrice: 100, maxVolume: 1 };
    let minP = Infinity;
    let maxP = -Infinity;
    let maxV = 0;

    for (const c of candles) {
      if (c.low < minP) minP = c.low;
      if (c.high > maxP) maxP = c.high;
      if (c.volume > maxV) maxV = c.volume;
    }

    // Add 2% breathing room to price bounds
    const pMargin = (maxP - minP) * 0.04 || 1;
    return {
      minPrice: Math.max(0, minP - pMargin),
      maxPrice: maxP + pMargin,
      maxVolume: maxV || 1,
    };
  }, [candles]);

  const priceRange = maxPrice - minPrice || 1;

  // Transform coordinates
  const getY = (val: number) => {
    return padding.top + (1 - (val - minPrice) / priceRange) * pricePlotHeight;
  };

  const getVolY = (vol: number) => {
    return volumePlotTop + (1 - vol / maxVolume) * volumePlotHeight;
  };

  const candleSpacing = candles.length > 0 ? plotWidth / candles.length : 10;
  const candleBarWidth = Math.max(2, Math.min(12, candleSpacing * 0.72));

  // Compute SMA polyline path
  const smaPoints = useMemo(() => {
    const points: string[] = [];
    candles.forEach((c, idx) => {
      if (c.sma20 != null) {
        const x = padding.left + idx * candleSpacing + candleSpacing / 2;
        const y = getY(c.sma20);
        points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
    });
    return points.join(" ");
  }, [candles, candleSpacing, minPrice, priceRange, padding.left, pricePlotHeight]);

  // Price grid steps (4 horizontal guide levels)
  const priceSteps = useMemo(() => {
    const steps = 4;
    const list: number[] = [];
    for (let i = 0; i <= steps; i++) {
      list.push(minPrice + (priceRange / steps) * i);
    }
    return list;
  }, [minPrice, priceRange]);

  // Active inspected candle (hovered or last)
  const activeCandle: CandleData | null =
    hoveredIndex != null && candles[hoveredIndex]
      ? candles[hoveredIndex]
      : candles[candles.length - 1] || null;

  const activeCandleChange = useMemo(() => {
    if (!activeCandle) return { diff: 0, pct: 0, isUp: true };
    const diff = activeCandle.close - activeCandle.open;
    const pct = activeCandle.open ? (diff / activeCandle.open) * 100 : 0;
    return {
      diff: Number(diff.toFixed(2)),
      pct: Number(pct.toFixed(2)),
      isUp: diff >= 0,
    };
  }, [activeCandle]);

  // Handle mouse move for crosshair
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || candles.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - padding.left;
    const idx = Math.floor(x / candleSpacing);
    if (idx >= 0 && idx < candles.length) {
      setHoveredIndex(idx);
    } else {
      setHoveredIndex(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  if (!symbol) return null;

  return (
    <div
      ref={containerRef}
      className="rounded-2xl border border-[#1b283e] bg-gradient-to-b from-[#0b1424] via-[#080f1b] to-[#060b14] p-4.5 sm:p-5 space-y-3.5 shadow-xl transition-all"
    >
      {/* 1. Header Bar: Symbol, Current Quote, Period Return & Timeframe Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#142032] pb-3">
        {/* Left: Ticker Info & Live Quote */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/30">
              📈
            </span>
            <div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-sm font-bold text-white tracking-wide">
                  {symbol.toUpperCase()}
                </span>
                <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 font-mono text-[9px] text-emerald-400">
                  Daily Candles
                </span>
              </div>
              <div className="text-[10px] text-text-faint font-mono">
                {summary ? `${summary.candle_count} Sessions · High $${summary.period_high.toFixed(2)} / Low $${summary.period_low.toFixed(2)}` : "Live Price Action"}
              </div>
            </div>
          </div>

          {/* Price & Period Delta */}
          {summary && (
            <div className="hidden sm:flex items-baseline gap-2 font-mono pl-3 border-l border-[#19263a]">
              <span className="text-base font-bold text-white">
                ${summary.latest_close.toFixed(2)}
              </span>
              <span
                className={`text-xs font-semibold ${
                  summary.period_change >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {summary.period_change >= 0 ? "+" : ""}
                {summary.period_change.toFixed(2)} ({summary.period_change_percent >= 0 ? "+" : ""}
                {summary.period_change_percent.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>

        {/* Right: Timeframe Selectors (1M, 3M, 6M, 1Y) */}
        <div className="flex items-center gap-1 rounded-xl border border-[#162234] bg-[#070d18] p-1 font-mono text-[11px]">
          {(["1mo", "3mo", "6mo", "1y"] as Period[]).map((t) => {
            const labelMap: Record<Period, string> = {
              "1mo": "1M",
              "3mo": "3M",
              "6mo": "6M",
              "1y": "1Y",
            };
            const isActive = period === t;
            return (
              <button
                key={t}
                onClick={() => setPeriod(t)}
                className={`rounded-lg px-2.5 py-1 font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-emerald-500 text-black shadow-sm"
                    : "text-text-muted hover:text-white hover:bg-white/5"
                }`}
              >
                {labelMap[t]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Interactive Tooltip HUD (Date, Open, High, Low, Close, Volume, SMA20) */}
      <div className="min-h-[24px] rounded-lg border border-[#152236] bg-[#050b14] px-3 py-1.5 font-mono text-[11px] flex flex-wrap items-center justify-between gap-2 text-text-muted">
        {activeCandle ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold">{activeCandle.date}</span>
              <span>•</span>
              <span>
                O: <span className="text-white">${activeCandle.open.toFixed(2)}</span>
              </span>
              <span>
                H: <span className="text-white">${activeCandle.high.toFixed(2)}</span>
              </span>
              <span>
                L: <span className="text-white">${activeCandle.low.toFixed(2)}</span>
              </span>
              <span>
                C: <span className="text-white">${activeCandle.close.toFixed(2)}</span>
              </span>
              <span
                className={`font-semibold ${
                  activeCandleChange.isUp ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                ({activeCandleChange.diff >= 0 ? "+" : ""}
                {activeCandleChange.diff} | {activeCandleChange.pct >= 0 ? "+" : ""}
                {activeCandleChange.pct}%)
              </span>
            </div>

            <div className="flex items-center gap-3 text-[10.5px]">
              {activeCandle.sma20 && (
                <span className="text-sky-400 font-semibold">
                  SMA(20): ${activeCandle.sma20.toFixed(2)}
                </span>
              )}
              <span className="text-text-faint">
                Vol: {(activeCandle.volume / 1_000_000).toFixed(1)}M
              </span>
            </div>
          </>
        ) : (
          <span className="text-text-faint italic">Hover over candlestick chart to inspect price action…</span>
        )}
      </div>

      {/* 3. SVG Candlestick Viewport */}
      <div className="relative overflow-hidden rounded-xl border border-[#142032] bg-[#040810]">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#040810]/70 backdrop-blur-[2px]">
            <div className="flex items-center gap-2 font-mono text-xs text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Fetching {symbol.toUpperCase()} candles…</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex h-56 flex-col items-center justify-center gap-2 font-mono text-xs text-rose-400">
            <span>⚠️ {error}</span>
            <button
              onClick={() => setPeriod(period)}
              className="rounded-lg border border-rose-500/30 px-3 py-1 text-[11px] text-white hover:bg-rose-500/10 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {!error && candles.length > 0 && (
          <svg
            ref={svgRef}
            width={containerWidth}
            height={height}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="cursor-crosshair select-none block"
          >
            <defs>
              <linearGradient id="volGradUp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="volGradDown" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* Horizontal Price Grid Lines & Labels */}
            {priceSteps.map((p, idx) => {
              const y = getY(p);
              return (
                <g key={idx}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={padding.left + plotWidth}
                    y2={y}
                    stroke="#142136"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padding.left + plotWidth + 6}
                    y={y + 3.5}
                    fill="#64748b"
                    fontSize="9.5"
                    fontFamily="monospace"
                  >
                    ${p.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* Volume Separator Line */}
            <line
              x1={padding.left}
              y1={volumePlotTop - 4}
              x2={padding.left + plotWidth}
              y2={volumePlotTop - 4}
              stroke="#142136"
              strokeWidth="1"
            />
            <text
              x={padding.left + plotWidth + 6}
              y={volumePlotTop + 8}
              fill="#475569"
              fontSize="8.5"
              fontFamily="monospace"
            >
              VOL
            </text>

            {/* Volume Bars */}
            {candles.map((c, idx) => {
              const isUp = c.close >= c.open;
              const x = padding.left + idx * candleSpacing + (candleSpacing - candleBarWidth) / 2;
              const y = getVolY(c.volume);
              const barH = height - padding.bottom - y;
              return (
                <rect
                  key={`vol-${idx}`}
                  x={x}
                  y={y}
                  width={candleBarWidth}
                  height={Math.max(1, barH)}
                  fill={isUp ? "url(#volGradUp)" : "url(#volGradDown)"}
                  rx="1"
                />
              );
            })}

            {/* Candlesticks (Wicks + Bodies) */}
            {candles.map((c, idx) => {
              const isUp = c.close >= c.open;
              const color = isUp ? "#10b981" : "#f43f5e";
              const centerX = padding.left + idx * candleSpacing + candleSpacing / 2;
              const bodyX = centerX - candleBarWidth / 2;

              const openY = getY(c.open);
              const closeY = getY(c.close);
              const highY = getY(c.high);
              const lowY = getY(c.low);

              const bodyTop = Math.min(openY, closeY);
              const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));

              const isHovered = hoveredIndex === idx;

              return (
                <g key={`candle-${idx}`} opacity={hoveredIndex != null && !isHovered ? 0.65 : 1}>
                  {/* Upper and Lower Wick */}
                  <line
                    x1={centerX}
                    y1={highY}
                    x2={centerX}
                    y2={lowY}
                    stroke={color}
                    strokeWidth="1.2"
                  />

                  {/* Candle Body */}
                  <rect
                    x={bodyX}
                    y={bodyTop}
                    width={candleBarWidth}
                    height={bodyHeight}
                    fill={color}
                    stroke={color}
                    strokeWidth="0.5"
                    rx="1"
                  />
                </g>
              );
            })}

            {/* 20-Day SMA Line */}
            {smaPoints && (
              <polyline
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={smaPoints}
                opacity="0.85"
              />
            )}

            {/* Interactive Crosshair when hovered */}
            {hoveredIndex != null && candles[hoveredIndex] && (
              <g pointerEvents="none">
                {/* Vertical Crosshair Line */}
                <line
                  x1={padding.left + hoveredIndex * candleSpacing + candleSpacing / 2}
                  y1={padding.top}
                  x2={padding.left + hoveredIndex * candleSpacing + candleSpacing / 2}
                  y2={height - padding.bottom}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity="0.75"
                />

                {/* Horizontal Price Crosshair Line */}
                <line
                  x1={padding.left}
                  y1={getY(candles[hoveredIndex].close)}
                  x2={padding.left + plotWidth}
                  y2={getY(candles[hoveredIndex].close)}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity="0.75"
                />

                {/* Cursor Price Tag on Right Axis */}
                <g transform={`translate(${padding.left + plotWidth + 2}, ${getY(candles[hoveredIndex].close) - 9})`}>
                  <rect
                    x="0"
                    y="0"
                    width="54"
                    height="18"
                    fill="#1e293b"
                    stroke="#38bdf8"
                    strokeWidth="0.8"
                    rx="3"
                  />
                  <text
                    x="27"
                    y="12"
                    textAnchor="middle"
                    fill="#38bdf8"
                    fontSize="9.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    ${candles[hoveredIndex].close.toFixed(2)}
                  </text>
                </g>
              </g>
            )}

            {/* Date Labels on X Axis (Sampled) */}
            {candles.map((c, idx) => {
              // Show label every ~6 candles
              const sampleInterval = Math.max(4, Math.floor(candles.length / 6));
              if (idx % sampleInterval !== 0 && idx !== candles.length - 1) return null;

              const x = padding.left + idx * candleSpacing + candleSpacing / 2;
              const dateParts = c.date.split("-");
              const label = `${dateParts[1]}/${dateParts[2]}`;

              return (
                <text
                  key={`lbl-${idx}`}
                  x={x}
                  y={height - 12}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="9.5"
                  fontFamily="monospace"
                >
                  {label}
                </text>
              );
            })}
          </svg>
        )}
      </div>

      {/* 4. Legend & Footnote */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 font-mono text-[10px] text-text-faint">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Bullish Candle</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            <span>Bearish Candle</span>
          </div>
          <div className="flex items-center gap-1.5 text-sky-400 font-semibold">
            <span className="h-0.5 w-3.5 bg-sky-400 rounded-full" />
            <span>20-Session SMA</span>
          </div>
        </div>

        <div className="text-text-muted">
          Source: Real-time Yahoo Finance OHLCV · Auto-updated
        </div>
      </div>
    </div>
  );
}
