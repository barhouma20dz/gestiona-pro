"use client";

import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Mail,
  Lock,
  Store as StoreIcon,
  Phone,
  Tag,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/i18n";

type Mode = "login" | "register";

const BUSINESS_TYPES: { value: string; key: TranslationKey }[] = [
  { value: "Grocery", key: "authBusinessGrocery" },
  { value: "Electronics", key: "authBusinessElectronics" },
  { value: "Clothing", key: "authBusinessClothing" },
  { value: "Pharmacy", key: "authBusinessPharmacy" },
  { value: "Restaurant", key: "authBusinessRestaurant" },
  { value: "Bakery", key: "authBusinessBakery" },
  { value: "Hardware", key: "authBusinessHardware" },
  { value: "Other", key: "authBusinessOther" },
];

function BrandLogo() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        initial={{ scale: 0.7, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className="relative grid h-16 w-16 place-items-center rounded-2xl bg-white/15 backdrop-blur-md ring-1 ring-white/30 shadow-xl"
      >
        <span className="text-3xl font-black text-white drop-shadow-sm">S</span>
        <span className="absolute -inset-1 -z-10 rounded-2xl bg-emerald-400/30 blur-xl" />
      </motion.div>
      <div className="text-center">
        <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-sm">
          {t("appName")}
        </h1>
        <p className="text-sm text-white/80">{t("authTagline")}</p>
      </div>
    </div>
  );
}

function ModeToggle({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/10 p-1 ring-1 ring-white/15 backdrop-blur">
      <button
        type="button"
        onClick={() => setMode("login")}
        className={cn(
          "rounded-lg px-3 py-2 text-sm font-semibold transition-all",
          mode === "login"
            ? "bg-white text-emerald-700 shadow-md"
            : "text-white/80 hover:text-white"
        )}
      >
        {t("authLogin")}
      </button>
      <button
        type="button"
        onClick={() => setMode("register")}
        className={cn(
          "rounded-lg px-3 py-2 text-sm font-semibold transition-all",
          mode === "register"
            ? "bg-white text-emerald-700 shadow-md"
            : "text-white/80 hover:text-white"
        )}
      >
        {t("authRegister")}
      </button>
    </div>
  );
}

function FieldIcon({ icon: Icon }: { icon: typeof Mail }) {
  return (
    <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-gray-500">
      <Icon className="h-4 w-4" />
    </div>
  );
}

export function AuthScreen() {
  const { t, isRTL } = useLanguage();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [businessType, setBusinessType] = useState("Grocery");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "login") {
      if (!email.trim() || !password) {
        setError(t("authMissingFields"));
        return;
      }
    } else {
      if (!storeName.trim() || !email.trim() || !password || !phone.trim()) {
        setError(t("authMissingFields"));
        return;
      }
      if (password.length < 6) {
        setError(t("authWeakPassword"));
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register({
          storeName: storeName.trim(),
          businessType,
          phone: phone.trim(),
          email: email.trim(),
          password,
        });
      }
    } catch (err) {
      // Log the raw error so real causes are visible in the console
      console.error("[AuthScreen] submit failed:", err);
      const msg = err instanceof Error ? err.message : "";
      const lower = msg.toLowerCase();
      // Map server messages to localized strings
      if (
        lower.includes("failed to fetch") ||
        lower.includes("networkerror") ||
        lower.includes("network error") ||
        lower.includes("load failed")
      ) {
        setError(t("authNetworkError"));
      } else if (
        lower.includes("invalid") ||
        lower.includes("credentials")
      ) {
        setError(t("authInvalidCredentials"));
      } else if (lower.includes("suspended")) {
        setError(t("authStoreSuspended"));
      } else if (
        lower.includes("already") ||
        lower.includes("registered")
      ) {
        setError(t("authEmailExists"));
      } else if (lower.includes("password must be")) {
        setError(t("authWeakPassword"));
      } else if (lower.includes("missing")) {
        setError(t("authMissingFields"));
      } else {
        setError(t("authGenericError"));
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setError(null);
    setMode(next);
  };

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800"
    >
      {/* Decorative blurred orbs */}
      <div className="pointer-events-none absolute -top-32 -start-32 h-96 w-96 rounded-full bg-emerald-400/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -end-24 h-[28rem] w-[28rem] rounded-full bg-teal-300/25 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 end-1/4 h-72 w-72 rounded-full bg-emerald-200/20 blur-3xl" />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="mb-6">
            <BrandLogo />
          </div>

          {/* Card */}
          <div className="rounded-3xl bg-white/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl">
            <div className="p-6 sm:p-8">
              {/* Heading */}
              <div className="mb-6 text-center">
                <h2 className="text-xl font-bold text-black">
                  {mode === "login" ? t("authWelcomeBack") : t("authCreateAccount")}
                </h2>
                {mode === "register" && (
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                    <Sparkles className="h-3.5 w-3.5" />
                    {t("authTrialBadge")}
                  </span>
                )}
              </div>

              {/* Mode toggle */}
              <ModeToggle mode={mode} setMode={switchMode} />

              {/* Form */}
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <AnimatePresence mode="popLayout" initial={false}>
                  {mode === "register" && (
                    <motion.div
                      key="storeName"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-1.5 overflow-hidden"
                    >
                      <Label htmlFor="storeName" className="text-sm font-medium text-black">
                        {t("authStoreName")}
                      </Label>
                      <div className="relative">
                        <FieldIcon icon={StoreIcon} />
                        <Input
                          id="storeName"
                          type="text"
                          autoComplete="organization"
                          value={storeName}
                          onChange={(e) => setStoreName(e.target.value)}
                          placeholder={t("authStoreName")}
                          className="ps-9 text-black placeholder:text-gray-400"
                          disabled={loading}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="popLayout" initial={false}>
                  {mode === "register" && (
                    <motion.div
                      key="businessType"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-1.5 overflow-hidden"
                    >
                      <Label htmlFor="businessType" className="text-sm font-medium text-black">
                        {t("authBusinessType")}
                      </Label>
                      <Select
                        value={businessType}
                        onValueChange={setBusinessType}
                        disabled={loading}
                      >
                        <SelectTrigger id="businessType" className="w-full">
                          <SelectValue placeholder={t("authSelectBusinessType")} />
                        </SelectTrigger>
                        <SelectContent>
                          {BUSINESS_TYPES.map((bt) => (
                            <SelectItem key={bt.value} value={bt.value}>
                              <span className="flex items-center gap-2">
                                <Tag className="h-3.5 w-3.5 opacity-60" />
                                {t(bt.key)}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="popLayout" initial={false}>
                  {mode === "register" && (
                    <motion.div
                      key="phone"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-1.5 overflow-hidden"
                    >
                      <Label htmlFor="phone" className="text-sm font-medium text-black">
                        {t("authPhone")}
                      </Label>
                      <div className="relative">
                        <FieldIcon icon={Phone} />
                        <Input
                          id="phone"
                          type="tel"
                          autoComplete="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder={t("authPhone")}
                          className="ps-9 text-black placeholder:text-gray-400"
                          disabled={loading}
                          dir="ltr"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-black">
                    {t("authEmail")}
                  </Label>
                  <div className="relative">
                    <FieldIcon icon={Mail} />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="ps-9 text-black placeholder:text-gray-400"
                      disabled={loading}
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium text-black">
                    {t("authPassword")}
                  </Label>
                  <div className="relative">
                    <FieldIcon icon={Lock} />
                    <Input
                      id="password"
                      type="password"
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="ps-9 text-black placeholder:text-gray-400"
                      disabled={loading}
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      role="alert"
                      className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 hover:from-emerald-700 hover:to-teal-700"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {mode === "login" ? t("authSigningIn") : t("authCreating")}
                    </>
                  ) : (
                    <>
                      {mode === "login" ? t("authSignIn") : t("authCreateStore")}
                      <ArrowRight
                        className={cn(
                          "h-4 w-4 transition-transform group-hover:translate-x-0.5",
                          isRTL && "rotate-180 group-hover:-translate-x-0.5"
                        )}
                      />
                    </>
                  )}
                </Button>

                {/* Toggle link */}
                <div className="pt-2 text-center text-sm text-gray-700">
                  {mode === "login" ? (
                    <>
                      {t("authNoAccount")}{" "}
                      <button
                        type="button"
                        onClick={() => switchMode("register")}
                        className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                      >
                        {t("authSignUpHere")}
                      </button>
                    </>
                  ) : (
                    <>
                      {t("authHaveAccount")}{" "}
                      <button
                        type="button"
                        onClick={() => switchMode("login")}
                        className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                      >
                        {t("authSignInHere")}
                      </button>
                    </>
                  )}
                </div>
              </form>

              {/* Trial features hint in register mode */}
              {mode === "register" && (
                <p className="mt-5 text-center text-xs text-gray-600">
                  {t("authTrialFeatures")}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
