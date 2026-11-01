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

  // form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");

  // UI state
  const [step, setStep] = useState<"form" | "otp">("form");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);

  const firstInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!isAuthModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAuthModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (authModalMode === "login") {
      setLoading(true);
      try {
        await login(email, password);
        closeAuthModal();
        router.push("/app");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to sign in.");
      } finally {
        setLoading(false);
      }
    } else {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      setLoading(true);
      try {
        const nextStep = await signup(email, password);
        if (nextStep === "otp_required") {
          setStep("otp");
          setInfo("We sent a 6-digit verification code to " + email);
        } else {
          closeAuthModal();
          router.push("/app");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to create account.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (otp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      await signupWithOtp(email, password, otp.trim(), name.trim());
      closeAuthModal();
      router.push("/app");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    setError(null);
    setOauthLoading(provider);
    try {
      await initiateOAuthFlow(provider);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to start ${provider} sign-in.`);
      setOauthLoading(null);
    }
  };

  const isLogin = authModalMode === "login";
  const title = isLogin ? "Institutional Access" : step === "otp" ? "Verify Email" : "Create Desk Account";
  const subtitle = isLogin
    ? "Authenticate your session to sync multi-agent research."
    : step === "otp"
    ? `Enter the 6-digit code sent to ${email}`
    : "Deploy autonomous financial intelligence models.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-white/[0.12] bg-zinc-950 shadow-[0_20px_60px_rgba(0,0,0,0.9)] p-7 sm:p-8">
        {/* Close button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 text-zinc-500 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/[0.06] text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h2 className="font-sans text-xl font-bold tracking-tight text-white">{title}</h2>
          <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>
        </div>

        {/* Error / Info banners */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
            {error}
          </div>
        )}
        {info && !error && (
          <div className="mb-4 rounded-xl border border-white/20 bg-white/[0.06] px-3.5 py-2.5 text-xs text-zinc-200">
            {info}
          </div>
        )}

        {/* OTP verification step */}
        {step === "otp" ? (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Your full name
              </label>
              <input
                ref={firstInputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Marcus Vance"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-white/30"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
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
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-white/30 tracking-widest text-center font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full rounded-xl bg-white text-black py-2.5 text-sm font-semibold hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? "Verifying…" : "Verify & Complete Setup"}
            </button>

            <button
              type="button"
              onClick={() => { setStep("form"); setError(null); setInfo(null); }}
              className="w-full text-center text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              ← Back to form
            </button>
          </form>
        ) : (
          <>
            {/* OAuth buttons */}
            <div className="space-y-2.5">
              <button
                onClick={() => handleOAuth("google")}
                disabled={!!oauthLoading || loading}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white transition-all hover:border-white/25 hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {oauthLoading === "google" ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
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
              <div className="h-px flex-1 bg-white/[0.08]" />
              <span className="text-xs text-zinc-500 font-mono">or email</span>
              <div className="h-px flex-1 bg-white/[0.08]" />
            </div>

            {/* Email + Password form */}
            <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Email
                </label>
                <input
                  ref={firstInputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@firm.com"
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-white/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-white/30"
                />
              </div>

              {!isLogin && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-white/30"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !!oauthLoading}
                className="w-full rounded-xl bg-white text-black py-2.5 text-sm font-semibold shadow-lg hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading
                  ? isLogin
                    ? "Authenticating…"
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
          <p className="mt-5 text-center text-xs text-zinc-500">
            {isLogin ? "Need a desk account? " : "Already registered? "}
            <button
              onClick={() => openAuthModal(isLogin ? "signup" : "login")}
              className="font-medium text-white hover:underline underline-offset-4 transition-colors cursor-pointer"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
