"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  UserCog,
  Mail,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { sellersApi } from "@/lib/api";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import type { TranslationKey } from "@/lib/i18n";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type T = (key: TranslationKey) => string;

/* ---------- main component ---------- */

export function SellerSettings() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const changePwdMutation = useMutation({
    mutationFn: (data: { id: string; password: string }) =>
      sellersApi.changePassword(data.id, data.password),
    onSuccess: () => {
      toast.success(t("passwordChanged"));
      setPassword("");
      setConfirm("");
      setError("");
    },
    onError: (e: Error) => toast.error(e.message || t("failedChangePassword")),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (password.length < 6) {
      setError(t("passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("passwordsDoNotMatch"));
      return;
    }
    setError("");
    changePwdMutation.mutate({ id: user.id, password });
  };

  const displayName = user?.name || user?.email?.split("@")[0] || "—";

  return (
    <div className="space-y-6">
      {/* Gradient page header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-lg sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <h2 className="text-lg font-bold tracking-tight drop-shadow-sm sm:text-xl">
            {t("sellerSettings")}
          </h2>
          <p className="mt-0.5 text-sm text-emerald-50/80">
            {t("sellerSettingsSubtitle")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Account info card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <div className="grid size-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600">
                <UserCog className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{t("sellerAccountInfo")}</h3>
                <p className="text-xs text-muted-foreground">
                  {t("sellerSettingsSubtitle")}
                </p>
              </div>
            </div>

            <Separator className="my-5" />

            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="seller-name-display">
                  {t("sellerNameLabel")}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="seller-name-display"
                    value={displayName}
                    readOnly
                    disabled
                    className="bg-muted/40 font-medium"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="seller-email-display">
                  {t("sellerEmailLabel")}
                </Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="seller-email-display"
                    value={user?.email ?? ""}
                    readOnly
                    disabled
                    className="bg-muted/40"
                  />
                </div>
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <Label>{t("sellerRoleLabel")}</Label>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400">
                    {t("roleStaff")}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Change password card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
        >
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <div className="grid size-9 place-items-center rounded-xl bg-amber-500/15 text-amber-600">
                <KeyRound className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{t("changePassword")}</h3>
                <p className="text-xs text-muted-foreground">
                  {t("sellerPasswordHint")}
                </p>
              </div>
            </div>

            <Separator className="my-5" />

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">{t("newPassword")}</Label>
                <PasswordInput
                  id="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">{t("confirmPassword")}</Label>
                <PasswordInput
                  id="confirm-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••"
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}

              <Button
                type="submit"
                disabled={
                  changePwdMutation.isPending ||
                  !password ||
                  !confirm
                }
                className="w-full"
              >
                {changePwdMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {t("changePassword")}
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
