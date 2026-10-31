"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ConversationListItem } from "@/lib/types";
import { timeAgo } from "@/lib/format";

interface WorkspaceSidebarProps {
  conversations: ConversationListItem[];
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onNewAnalysis: () => void;
  onDelete?: (id: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export default function WorkspaceSidebar({
  conversations,
  activeConversationId,
  onSelect,
  onNewAnalysis,
  onDelete,
  isOpenMobile,
  onCloseMobile,
}: WorkspaceSidebarProps) {
  const [filterQuery, setFilterQuery] = useState("");

  const filteredConversations = useMemo(() => {
    if (!filterQuery.trim()) return conversations;
    const q = filterQuery.toLowerCase();
    return conversations.filter((c) => (c.title || "").toLowerCase().includes(q));
  }, [conversations, filterQuery]);

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between p-3.5 bg-[#060b13] border-r border-[#141f2e] text-text select-none">
      <div className="flex flex-col min-h-0 flex-1 space-y-4">
        {/* Brand Header */}
        <div className="pt-1 px-1">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-sm shadow-emerald-500/20 transition-transform group-hover:scale-105">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-base font-bold tracking-tight text-white">
                  Rizq<span className="text-emerald-400">AI</span>
                </span>
                <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1 py-0.2 font-mono text-[9px] font-semibold text-emerald-300">
                  DESK v2
                </span>
              </div>
              <p className="text-[10px] text-text-faint tracking-tight font-mono">
                Institutional Equity Research
              </p>
            </div>
          </Link>
        </div>

        {/* New Analysis Primary Button */}
        <button
          onClick={onNewAnalysis}
          className="flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 py-2.5 px-3.5 text-xs font-bold text-[#060b13] shadow-md shadow-emerald-500/25 transition-all hover:brightness-110 active:scale-[0.99] group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Analysis</span>
          </div>
          <span className="rounded bg-black/20 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-[#060b13]/80">
            ⌘K
          </span>
        </button>

        {/* Filter / Search past sessions */}
        <div className="relative">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter research threads…"
            className="w-full rounded-lg border border-[#162335] bg-[#0a121e] px-2.5 py-1.5 pl-7 text-[11px] text-white placeholder-[#495b74] focus:border-emerald-500/50 focus:outline-none transition-colors"
          />
          <svg
            className="absolute left-2 top-2 text-[#495b74]"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {filterQuery && (
            <button
              onClick={() => setFilterQuery("")}
              className="absolute right-2 top-1.5 text-[10px] text-text-faint hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Conversation Sessions List */}
        <div className="flex-1 min-h-0 flex flex-col pt-1">
          <div className="flex items-center justify-between px-1.5 pb-2 font-mono text-[10px] uppercase tracking-wider text-text-faint">
            <span>Research Sessions</span>
            <span className="text-[9.5px] text-emerald-400/80 font-semibold">
              {filteredConversations.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((c) => {
                const active = c.id === activeConversationId;
                // Detect ticker pattern in title
                const tickerMatch = (c.title || "").match(/\b([A-Z]{1,5})\b/);
                const ticker = tickerMatch ? tickerMatch[1] : null;

                return (
                  <div
                    key={c.id}
                    className={`group relative flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-all cursor-pointer ${
                      active
                        ? "bg-[#0e1a2b] text-white font-medium border border-emerald-500/30 shadow-sm"
                        : "text-[#8ea0b7] hover:bg-[#0a1320] hover:text-white border border-transparent"
                    }`}
                  >
                    <button
                      onClick={() => onSelect(c.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      {ticker ? (
                        <span className="shrink-0 rounded bg-emerald-500/15 border border-emerald-500/30 px-1 py-0.5 font-mono text-[9px] font-bold text-emerald-300">
                          {ticker}
                        </span>
                      ) : (
                        <span className="shrink-0 text-text-faint text-xs">◈</span>
                      )}
                      <div className="min-w-0 flex-1 truncate">
                        <div className="truncate text-[11.5px] leading-tight text-white/90">
                          {c.title}
                        </div>
                        <div className="text-[9.5px] text-[#4d6077] font-mono mt-0.5">
                          {timeAgo(c.updated_at)}
                        </div>
                      </div>
                    </button>

                    {onDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(c.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[#4d6077] hover:text-rose-400 transition-opacity ml-1 rounded hover:bg-rose-500/10"
                        title="Delete research thread"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="px-2 py-6 text-center">
                <p className="text-[11px] text-[#556980]">
                  {filterQuery ? "No matching sessions found." : "No research sessions yet."}
                </p>
                <button
                  onClick={onNewAnalysis}
                  className="mt-2 text-[10.5px] font-mono text-emerald-400 hover:text-emerald-300 underline"
                >
                  Start first analysis →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Institutional Telemetry & Session Dock */}
      <div className="mt-3 rounded-xl border border-[#162234] bg-[#09111c] p-3 space-y-2 text-xs">
        <div className="flex items-center justify-between border-b border-[#131f2e] pb-2 font-mono text-[10px]">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span>US MARKETS FEED</span>
          </div>
          <span className="text-[#495b74]">18ms latency</span>
        </div>

        <div className="space-y-1 font-mono text-[10px] text-[#70849c]">
          <div className="flex justify-between">
            <span>Research Nodes</span>
            <span className="text-white font-medium">9 Live Tools</span>
          </div>
          <div className="flex justify-between">
            <span>Agent Pipeline</span>
            <span className="text-emerald-300 font-medium">4 Desks Active</span>
          </div>
          <div className="flex justify-between">
            <span>Data Security</span>
            <span className="text-[#94a3b8]">Airgapped Keys</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Column */}
      <aside className="hidden w-64 shrink-0 lg:block h-full">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <aside className="fixed inset-y-0 left-0 w-64 z-50 shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
