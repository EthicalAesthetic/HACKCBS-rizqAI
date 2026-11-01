"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";

interface NavbarProps {
  onSwitchView?: (view: "terminal" | "overview") => void;
  activeView?: "terminal" | "overview";
}

export default function Navbar({ onSwitchView, activeView = "overview" }: NavbarProps) {
  const router = useRouter();
  const { user, openAuthModal, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLaunchApp = () => {
    if (onSwitchView) {
      onSwitchView("terminal");
    } else {
      router.push("/");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-black/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/20 bg-white/[0.06] text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="font-sans text-lg font-bold tracking-tight text-white">
            Rizq<span className="text-zinc-400">AI</span>
          </span>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-mono uppercase tracking-wider text-zinc-400">
          <a href="#home" className="hover:text-white transition-colors">
            Overview
          </a>
          <a href="#features" className="hover:text-white transition-colors">
            Intelligence
          </a>
          <a href="#how-it-works" className="hover:text-white transition-colors">
            Workflow
          </a>
          {onSwitchView && (
            <button
              onClick={() => onSwitchView("terminal")}
              className={`hover:text-white transition-colors cursor-pointer uppercase ${
                activeView === "terminal" ? "text-white font-bold" : ""
              }`}
            >
              Live Desk
            </button>
          )}
        </nav>

        {/* Right CTA / Auth controls */}
        <div className="flex items-center gap-3">
          {mounted && user ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-zinc-400 sm:inline-block max-w-[130px] truncate font-mono">
                {user.name || "Analyst"}
              </span>
              <button
                onClick={logout}
                className="hidden text-xs text-zinc-500 hover:text-white transition-colors sm:inline-block cursor-pointer font-mono"
              >
                Sign Out
              </button>
              <button
                onClick={handleLaunchApp}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all hover:bg-zinc-200 active:scale-95 cursor-pointer"
              >
                <span>Launch Terminal</span>
                <span className="font-mono">→</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => openAuthModal("login")}
                className="hidden px-3.5 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-white sm:inline-block cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => openAuthModal("signup")}
                className="hidden rounded-xl border border-white/[0.12] bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-zinc-200 transition-all hover:border-white/25 hover:text-white sm:inline-block cursor-pointer"
              >
                Sign Up
              </button>
              <button
                onClick={handleLaunchApp}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all hover:bg-zinc-200 active:scale-95 cursor-pointer"
              >
                <span>Launch Terminal</span>
                <span className="font-mono">→</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
