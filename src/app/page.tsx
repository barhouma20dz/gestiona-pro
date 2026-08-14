"use client";

import { AuthProvider, useAuth } from "@/lib/auth-context";
import { AuthScreen } from "@/components/auth-screen";
import { AppShell } from "@/components/app-shell";
import { useLanguage } from "@/lib/language-context";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

function LoadingScreen() {
  const { t } = useLanguage();
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800">
      <div className="pointer-events-none absolute -top-32 -start-32 h-96 w-96 rounded-full bg-emerald-400/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -end-24 h-[28rem] w-[28rem] rounded-full bg-teal-300/25 blur-3xl" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 flex flex-col items-center gap-4"
      >
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur-md">
          <span className="text-3xl font-black text-white drop-shadow-sm">S</span>
        </div>
        <div className="flex items-center gap-2 text-white">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">{t("loading")}</span>
        </div>
      </motion.div>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <AuthScreen />;
  return <AppShell />;
}

export default function Home() {
  // LanguageProvider is already mounted in src/app/layout.tsx and wraps the
  // whole app, so useLanguage() is available throughout (AuthScreen, AppShell,
  // LoadingScreen). AuthProvider is nested here so the auth context reaches
  // both the gate (this page) and the AppShell downstream.
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
