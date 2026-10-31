"use client";

import { Suspense, useState } from "react";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import TrustLogos from "@/components/landing/TrustLogos";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import Footer from "@/components/landing/Footer";
import AuthModal from "@/components/landing/AuthDialog";

export default function LandingPage() {
  const [authError, setAuthError] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("auth_error")
  );

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#060b11] text-foreground selection:bg-emerald-500/30 selection:text-emerald-200">
      <Navbar />
      <main>
        <HeroSection />
        <TrustLogos />
        <FeaturesSection />
        <HowItWorksSection />
      </main>
      <Footer />
      {authError && (
        <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-lg border border-red-500/30 bg-red-950/90 px-4 py-3 text-sm text-red-200 shadow-xl">
          Google sign-in failed: {authError}
          <button
            type="button"
            className="ml-3 text-red-300 underline"
            onClick={() => setAuthError(null)}
          >
            Dismiss
          </button>
        </div>
      )}
      <Suspense fallback={null}>
        <AuthModal />
      </Suspense>
    </div>
  );
}
