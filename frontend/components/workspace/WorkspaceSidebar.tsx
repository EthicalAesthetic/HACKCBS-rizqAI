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
    <div className="flex h-full flex-col justify-between p-3.5 bg-black border-r border-white/[0.08] text-white select-none">
      <div className="flex flex-col min-h-0 flex-1 space-y-4">
        {/* Brand Header */}
        <div className="pt-1 px-1">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/[0.06] text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-sans text-[15px] font-bold tracking-tight text-white">
                  Rizq<span className="text-zinc-400">AI</span>
                </span>
                <span className="rounded border border-white/15 bg-white/[0.05] px-1 py-0.2 font-mono text-[8.5px] font-medium uppercase tracking-wider text-zinc-300">
                  DESK
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 tracking-tight font-mono">
                Multi-Agent Intelligence
              </p>
            </div>
          </Link>
        </div>

        {/* New Analysis Primary Button — High Contrast Monochromatic */}
        <button
          onClick={onNewAnalysis}
          className="flex w-full items-center justify-between rounded-xl bg-white hover:bg-zinc-200 py-2.5 px-3.5 text-xs font-semibold text-black shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-200 active:scale-[0.98] group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="tracking-tight">New Analysis</span>
          </div>
          <span className="rounded bg-black/10 border border-black/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-zinc-800">
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
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 pl-7 text-[11px] text-white placeholder-zinc-500 focus:border-white/30 focus:outline-none transition-colors"
          />
          <svg
            className="absolute left-2 top-2 text-zinc-500"
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
              className="absolute right-2 top-1.5 text-[10px] text-zinc-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Conversation Sessions List */}
        <div className="flex-1 min-h-0 flex flex-col pt-1">
          <div className="flex items-center justify-between px-1.5 pb-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            <span>Research Threads</span>
            <span className="text-[9.5px] text-zinc-300 font-mono">
              {filteredConversations.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((c) => {
                const active = c.id === activeConversationId;
                const tickerMatch = (c.title || "").match(/\b([A-Z]{1,5})\b/);
                const ticker = tickerMatch ? tickerMatch[1] : null;

                return (
                  <div
                    key={c.id}
                    className={`group relative flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-all duration-150 cursor-pointer ${
                      active
                        ? "bg-white/[0.08] text-white font-medium border border-white/[0.16] shadow-sm"
                        : "text-zinc-400 hover:bg-white/[0.04] hover:text-white border border-transparent"
                    }`}
                  >
                    <button
                      onClick={() => onSelect(c.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      {ticker ? (
                        <span className="shrink-0 rounded bg-white/[0.08] border border-white/[0.14] px-1.5 py-0.5 font-mono text-[9px] font-semibold text-zinc-200">
                          {ticker}
                        </span>
                      ) : (
                        <span className="shrink-0 text-zinc-500 text-xs">◈</span>
                      )}
                      <div className="min-w-0 flex-1 truncate">
                        <div className="truncate text-[11.5px] leading-tight text-zinc-100">
                          {c.title}
                        </div>
                        <div className="text-[9.5px] text-zinc-500 font-mono mt-0.5">
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
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-white transition-opacity ml-1 rounded hover:bg-white/10"
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
              <div className="px-2 py-8 text-center">
                <p className="text-[11px] text-zinc-500">
                  {filterQuery ? "No matching sessions found." : "No research sessions yet."}
                </p>
                <button
                  onClick={onNewAnalysis}
                  className="mt-2 text-[10.5px] font-mono text-zinc-400 hover:text-white underline underline-offset-4"
                >
                  Start first analysis →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Monochromatic Telemetry Dock */}
      <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-2 text-xs">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 font-mono text-[10px]">
          <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            <span>FEED ONLINE</span>
          </div>
          <span className="text-zinc-500">12ms latency</span>
        </div>

        <div className="space-y-1 font-mono text-[10px] text-zinc-400">
          <div className="flex justify-between">
            <span>Research Desk</span>
            <span className="text-zinc-200">Active</span>
          </div>
          <div className="flex justify-between">
            <span>Synthesis Engine</span>
            <span className="text-zinc-200">Autonomous</span>
          </div>
          <div className="flex justify-between">
            <span>Data Security</span>
            <span className="text-zinc-400">End-to-End</span>
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
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
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
