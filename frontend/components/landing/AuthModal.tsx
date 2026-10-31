"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { initiateOAuthFlow } from "@/lib/api";

export default function AuthModal() {
  const router = useRouter();
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalMode,
    openAuthModal,
    login,
    signup,
    signupWithOtp,
  } = useAuth();

  // ── form state ──────────────────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<"form" | "otp">("form");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);

  const firstInputRef = useRef<HTMLInputElement>(null);

  // reset state whenever the modal opens/closes or mode changes
  useEffect(() => {
    if (isAuthModalOpen) {
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setName("");
      setOtp("");
      setError(null);
      setInfo(null);
      setStep("form");
      setLoading(false);
      setOauthLoading(null);
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [isAuthModalOpen, authModalMode]);

  // close on Escape
  useEffect(() => {
    if (!isAuthModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAuthModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  // ── handlers ─────────────────────────────────────────────────────────────────
  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (authModalMode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (authModalMode === "login") {
        await login(email, password);
        // modal closes via context, then redirect to dashboard
        router.push("/app");
      } else {
        const msg = await signup(email, password);
        if (msg) {
          // Backend asked for OTP verification — switch to OTP step
          setInfo(msg);
          setStep("otp");
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signupWithOtp(email, password, otp, name || email.split("@")[0]);
      // modal closes via context, then redirect to dashboard
      router.push("/app");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    setError(null);
    setOauthLoading(provider);
    try {
      // initiateOAuthFlow generates a PKCE verifier in the browser,
      // stores it in sessionStorage, then redirects to Supabase.
      await initiateOAuthFlow(provider);
      // Page will redirect — no need to reset oauthLoading
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to start ${provider} sign-in.`);
      setOauthLoading(null);
    }
  };

  // ── render ───────────────────────────────────────────────────────────────────
  const isLogin = authModalMode === "login";
  const title = isLogin ? "Welcome back" : step === "otp" ? "Verify your email" : "Create account";
  const subtitle = isLogin
    ? "Sign in to your RizqAI account"
    : step === "otp"
    ? "Enter the 6-digit code we sent to " + email
    : "Start your AI-powered research journey";

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
    >
      {/* Panel */}
      <div className="relative w-full max-w-md rounded-2xl border border-emerald-500/20 bg-[#0d1117] shadow-2xl shadow-emerald-500/10 p-8">
        {/* Close button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-text-muted hover:text-text transition-colors"
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h2 className="font-display text-xl font-bold text-white">{title}</h2>
          <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
        </div>

        {/* Error / Info banners */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}
        {info && !error && (
          <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
            {info}
          </div>
        )}

        {/* ── OTP verification step ── */}
        {step === "otp" ? (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted">
                Your name
              </label>
              <input
                ref={firstInputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aisha Khan"
                className="w-full rounded-lg border border-line-soft bg-[#060b11] px-3 py-2.5 text-sm text-text placeholder-text-faint outline-none transition focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30"
              />
            </div>

            {/* OTP */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-muted">
                Verification code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                required
                className="w-full rounded-lg border border-line-soft bg-[#060b11] px-3 py-2.5 text-sm text-text placeholder-text-faint outline-none transition focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 tracking-widest text-center"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full rounded-full bg-emerald-400 py-2.5 text-sm font-semibold text-ink transition-all hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verifying…" : "Verify & Create Account"}
            </button>

            <button
              type="button"
              onClick={() => { setStep("form"); setError(null); setInfo(null); }}
              className="w-full text-center text-xs text-text-muted hover:text-text transition-colors"
            >
              ← Back
            </button>
          </form>
        ) : (
          <>
            {/* ── OAuth buttons ── */}
            <div className="space-y-2">
              <button
                onClick={() => handleOAuth("google")}
                disabled={!!oauthLoading || loading}
                className="flex w-full items-center justify-center gap-2.5 rounded-full border border-line-soft bg-[#060b11] px-4 py-2.5 text-sm font-medium text-text transition-all hover:border-emerald-500/40 hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {oauthLoading === "google" ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                ) : (
                  /* Google "G" icon */
                  <svg width="17" height="17" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                )}
                Continue with Google
              </button>
            </div>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-line-soft" />
              <span className="text-xs text-text-faint">or</span>
              <div className="h-px flex-1 bg-line-soft" />
            </div>

            {/* ── Email + Password form ── */}
            <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-muted">
                  Email
                </label>
                <input
                  ref={firstInputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-line-soft bg-[#060b11] px-3 py-2.5 text-sm text-text placeholder-text-faint outline-none transition focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30"
                />
              </div>

              {/* Password */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-muted">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  className="w-full rounded-lg border border-line-soft bg-[#060b11] px-3 py-2.5 text-sm text-text placeholder-text-faint outline-none transition focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30"
                />
              </div>

              {/* Confirm Password (signup only) */}
              {!isLogin && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-text-muted">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-line-soft bg-[#060b11] px-3 py-2.5 text-sm text-text placeholder-text-faint outline-none transition focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !!oauthLoading}
                className="w-full rounded-full bg-emerald-400 py-2.5 text-sm font-semibold text-ink shadow-md shadow-emerald-400/20 transition-all hover:bg-emerald-300 hover:shadow-emerald-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? isLogin
                    ? "Signing in…"
                    : "Creating account…"
                  : isLogin
                  ? "Sign In"
                  : "Create Account"}
              </button>
            </form>
          </>
        )}

        {/* Switch mode */}
        {step === "form" && (
          <p className="mt-5 text-center text-xs text-text-muted">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => openAuthModal(isLogin ? "signup" : "login")}
              className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
