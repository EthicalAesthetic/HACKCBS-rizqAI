"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";
import { useAuth } from "@/lib/authContext";

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { establishSession } = useAuth();
  const didRun = useRef(false);

  useEffect(() => {
    // Guard against double-fire in React Strict Mode
    if (didRun.current) return;
    didRun.current = true;

    const code = params.get("code");
    if (!code) {
      router.replace("/");
      return;
    }

    fetch(`${API_BASE_URL}/auth/callback?code=${encodeURIComponent(code)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (data.access_token) {
          // Use establishSession so React state is updated immediately —
          // the workspace auth guard reads from context, not just localStorage.
          establishSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            user_id: data.user_id ?? "",
            email: data.email,
          });
        }
        router.replace("/app");
      })
      .catch((err) => {
        console.error("[auth/callback] token exchange failed:", err);
        router.replace("/?auth_error=1");
      });
  }, [params, router, establishSession]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#060b11]">
      <div className="text-center space-y-3">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
        <p className="text-sm text-text-muted">Completing sign in…</p>
      </div>
    </div>
  );
}