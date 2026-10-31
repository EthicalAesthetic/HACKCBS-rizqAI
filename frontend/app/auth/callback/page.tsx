"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { exchangeOAuthCode } from "@/lib/api";
import { useAuth } from "@/lib/authContext";

function AuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { establishSession } = useAuth();
  const didRun = useRef(false);

  useEffect(() => {
    // Guard against double-fire in React Strict Mode
    if (didRun.current) return;
    didRun.current = true;

    const code = params.get("code");
    const error = params.get("error");
    const errorDescription = params.get("error_description");

    // Supabase sends ?error=... when the user denies access
    if (error) {
      console.error("[auth/callback] OAuth error:", error, errorDescription);
      router.replace("/?auth_error=1");
      return;
    }

    if (!code) {
      router.replace("/");
      return;
    }

    // Retrieve the PKCE code_verifier that was stored in sessionStorage
    // when we initiated the OAuth flow via initiateOAuthFlow().
    const codeVerifier =
      typeof window !== "undefined"
        ? sessionStorage.getItem("rizqai_oauth_code_verifier")
        : null;

    // Clean up stored PKCE state
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("rizqai_oauth_code_verifier");
      sessionStorage.removeItem("rizqai_oauth_provider");
    }

    exchangeOAuthCode(code, codeVerifier)
      .then((data) => {
        if (data.access_token) {
          establishSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            user_id: data.user_id ?? "",
            email: data.email,
            name: data.name,
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

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#060b11]" />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
