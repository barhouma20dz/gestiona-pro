"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Store as StoreIcon,
  ShieldCheck,
  Clock,
  Ban,
  TrendingUp,
  KeyRound,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Sparkles,
  Lock,
  Zap,
  CalendarPlus,
} from "lucide-react";

import { adminApi, shopApi } from "@/lib/api";
import type {
  AdminStats,
  AdminStore,
  LicenseKey,
  SubscriptionPlan,
} from "@/lib/types";
import { formatMoney, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import type { TranslationKey } from "@/lib/i18n";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type T = (key: TranslationKey) => string;

const PLAN_OPTIONS: SubscriptionPlan[] = ["MONTHLY", "QUARTERLY", "YEARLY"];

function planLabel(plan: SubscriptionPlan, t: T): string {
  if (plan === "MONTHLY") return t("planMonthly");
  if (plan === "QUARTERLY") return t("planQuarterly");
  return t("planYearly");
}

function daysBetween(a: Date, b: Date): number {
  return Math.max(0, Math.ceil((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000)));
}

function licenseStatusBadge(status: LicenseKey["status"], t: T) {
  switch (status) {
    case "UNUSED":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400">
          {t("licenseStatusUnused")}
        </Badge>
      );
    case "USED":
      return (
        <Badge className="bg-teal-500/15 text-teal-700 border-teal-500/30 dark:text-teal-400">
          {t("licenseStatusUsed")}
        </Badge>
      );
    case "EXPIRED":
      return (
        <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400">
          {t("licenseStatusExpired")}
        </Badge>
      );
    default:
      return (
        <Badge className="bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400">
          {t("licenseStatusCancelled")}
        </Badge>
      );
  }
}

function storeStatusBadge(status: AdminStore["status"], t: T) {
  if (status === "SUSPENDED") {
    return (
      <Badge className="bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400">
        {t("storeStatusSuspended")}
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400">
      {t("storeStatusActive")}
    </Badge>
  );
}

function subStatusBadge(status: string, t: T) {
  const s = status?.toLowerCase();
  if (s === "active") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400">
        {t("subscriptionActive")}
      </Badge>
    );
  }
  if (s === "trial") {
    return (
      <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400">
        {t("trialActive")}
      </Badge>
    );
  }
  if (s === "expired") {
    return (
      <Badge className="bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400">
        {t("subscriptionExpired")}
      </Badge>
    );
  }
  return (
    <Badge variant="outline">{status ?? "—"}</Badge>
  );
}

export function AdminDashboard() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { data: shop } = useQuery({
    queryKey: ["shop"],
    queryFn: shopApi.get,
  });
  const currency = shop?.currency ?? "دج";

  const [plan, setPlan] = useState<SubscriptionPlan>("MONTHLY");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [subDialogStore, setSubDialogStore] = useState<AdminStore | null>(null);
  const [subDuration, setSubDuration] = useState<number>(30);
  const [subCustomDays, setSubCustomDays] = useState<string>("");
  const [subPlan, setSubPlan] = useState<string>("MONTHLY");

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: adminApi.stats,
  });
  const { data: stores = [], isLoading: storesLoading } = useQuery({
    queryKey: ["admin", "stores"],
    queryFn: adminApi.stores,
  });
  const { data: licenses = [], isLoading: licensesLoading } = useQuery({
    queryKey: ["admin", "licenses"],
    queryFn: adminApi.licenses,
  });

  const generateMutation = useMutation({
    mutationFn: (p: SubscriptionPlan) => adminApi.generateLicense(p),
    onSuccess: () => {
      toast.success(t("licenseCreated"));
      qc.invalidateQueries({ queryKey: ["admin", "licenses"] });
    },
    onError: (e: Error) =>
      toast.error(e.message || t("failedGenerateLicense")),
  });

  const toggleStoreMutation = useMutation({
    mutationFn: (id: string) => adminApi.suspendStore(id),
    onSuccess: (data) => {
      toast.success(
        data.status === "SUSPENDED" ? t("storeSuspended") : t("storeReactivated")
      );
      qc.invalidateQueries({ queryKey: ["admin", "stores"] });
    },
    onError: (e: Error) =>
      toast.error(e.message || t("failedToggleStore")),
  });

  const activateSubMutation = useMutation({
    mutationFn: ({ id, days, plan }: { id: string; days: number; plan: string }) =>
      adminApi.activateSubscription(id, days, plan),
    onSuccess: () => {
      toast.success(t("subActivatedSuccess"));
      qc.invalidateQueries({ queryKey: ["admin", "stores"] });
      setSubDialogStore(null);
      setSubCustomDays("");
    },
    onError: (e: Error) =>
      toast.error(e.message || t("failedToggleStore")),
  });

  const handleActivateSub = () => {
    if (!subDialogStore) return;
    const days = subDuration === 0 ? Number(subCustomDays) || 30 : subDuration;
    activateSubMutation.mutate({
      id: subDialogStore.id,
      days,
      plan: subPlan,
    });
  };

  const handleCopy = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      toast.success(t("copiedToClipboard"));
      window.setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      toast.error(t("failedCopy"));
    }
  };

  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: t("totalStores"),
        value: String(stats.totalStores),
        icon: StoreIcon,
        tint: "bg-emerald-500/15 text-emerald-600",
      },
      {
        label: t("activeSubscriptions"),
        value: String(stats.activeSubscriptions),
        icon: ShieldCheck,
        tint: "bg-emerald-500/15 text-emerald-600",
      },
      {
        label: t("trialStores"),
        value: String(stats.trialSubscriptions),
        icon: Clock,
        tint: "bg-amber-500/15 text-amber-600",
      },
      {
        label: t("expiredOrSuspended"),
        value: String(stats.expiredSubscriptions + stats.suspendedStores),
        icon: Ban,
        tint: "bg-red-500/15 text-red-600",
      },
      {
        label: t("estimatedRevenue"),
        value: formatMoney(stats.estimatedMonthlyRevenue, currency),
        icon: TrendingUp,
        tint: "bg-emerald-500/15 text-emerald-600",
      },
    ] as const;
  }, [stats, t, currency]);

  return (
    <div className="space-y-6">
      {/* Gradient page header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-lg sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight drop-shadow-sm sm:text-xl">
              {t("adminDashboard")}
            </h2>
            <p className="mt-0.5 text-sm text-emerald-50/80">
              {t("adminSubtitle")}
            </p>
          </div>
          <Button
            onClick={() => {
              qc.invalidateQueries({ queryKey: ["admin"] });
            }}
            className="bg-white text-emerald-700 shadow-md hover:bg-emerald-50"
          >
            <RefreshCw className="h-4 w-4" />
            {t("refresh")}
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      {statsLoading ? (
        <Card className="gap-0 p-0">
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("loadingAdminData")}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {statCards.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.25 }}
              >
                <Card className="gap-0 p-4 sm:p-5 h-full">
                  <div className="flex flex-col gap-2">
                    <div
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-xl",
                        s.tint
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {s.label}
                    </p>
                    <p className="text-lg font-bold tracking-tight sm:text-xl">
                      {s.value}
                    </p>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* License generator */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.25 }}
      >
        <Card className="gap-0 p-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              {t("licenseGenerator")}
            </CardTitle>
            <CardDescription>
              {t("adminSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="space-y-1.5 sm:flex-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {t("selectPlan")}
                </label>
                <Select
                  value={plan}
                  onValueChange={(v) => setPlan(v as SubscriptionPlan)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {planLabel(p, t)} · {p === "MONTHLY" ? "30" : p === "QUARTERLY" ? "90" : "365"} {t("day")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => generateMutation.mutate(plan)}
                disabled={generateMutation.isPending}
                className="w-full sm:w-auto"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {t("generateKey")}
              </Button>
            </div>

            {/* Newly generated key highlight */}
            {generateMutation.data && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      {t("licenseCreated")}
                    </p>
                    <p className="mt-1 font-mono text-lg font-bold tracking-wider break-all">
                      {generateMutation.data.key}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {planLabel(generateMutation.data.plan, t)} ·{" "}
                      {generateMutation.data.durationDays} {t("day")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(generateMutation.data!.key)}
                    className="shrink-0"
                  >
                    {copiedKey === generateMutation.data.key ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {t("copyKey")}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Recent keys list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{t("recentLicenses")}</p>
                <span className="text-xs text-muted-foreground">
                  {licenses.length}
                </span>
              </div>
              {licensesLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("loadingAdminData")}
                </div>
              ) : licenses.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                  {t("noLicensesYet")}
                  <p className="mt-1 text-xs">{t("noLicensesDesc")}</p>
                </div>
              ) : (
                <ul className="max-h-80 divide-y overflow-y-auto rounded-lg border scrollbar-emerald">
                  {licenses.slice(0, 20).map((k) => (
                    <li
                      key={k.id}
                      className="flex flex-wrap items-center justify-between gap-2 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold break-all">
                            {k.key}
                          </span>
                          {licenseStatusBadge(k.status as LicenseKey["status"], t)}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {planLabel(k.plan as SubscriptionPlan, t)} ·{" "}
                          {k.durationDays} {t("day")} ·{" "}
                          {formatDate(k.createdAt)}
                        </p>
                        {k.status === "USED" && k.store?.name && (
                          <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                            {t("usedByStore")}:{" "}
                            <span className="font-medium">{k.store.name}</span>
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => handleCopy(k.key)}
                        aria-label={t("copyKey")}
                      >
                        {copiedKey === k.key ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stores table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.25 }}
      >
        <Card className="gap-0 p-0">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <StoreIcon className="h-4 w-4 text-primary" />
              {t("stores")}
              <Badge variant="secondary" className="ms-1 tabular-nums">
                {stores.length}
              </Badge>
            </CardTitle>
          </CardHeader>

          {/* Desktop / tablet table */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-6">{t("supplierName")}</TableHead>
                  <TableHead>{t("storeStatus")}</TableHead>
                  <TableHead>{t("subStatus")}</TableHead>
                  <TableHead>{t("subPlan")}</TableHead>
                  <TableHead className="text-center">{t("daysLeftInStore")}</TableHead>
                  <TableHead className="text-center">{t("productsCount")}</TableHead>
                  <TableHead className="text-center">{t("salesCount")}</TableHead>
                  <TableHead className="pr-6 text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {storesLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("loadingStores")}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : stores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                      {t("noSuppliersYet")}
                    </TableCell>
                  </TableRow>
                ) : (
                  stores.map((s) => {
                    const days = s.subscription?.endDate
                      ? daysBetween(new Date(s.subscription.endDate), new Date())
                      : 0;
                    return (
                      <TableRow
                        key={s.id}
                        className="group transition-colors hover:bg-emerald-500/5"
                      >
                        <TableCell className="pl-6 py-3.5">
                          <div className="flex flex-col">
                            <span className="font-medium">{s.name}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {s.email || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{storeStatusBadge(s.status, t)}</TableCell>
                        <TableCell>
                          {s.subscription
                            ? subStatusBadge(s.subscription.status, t)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {s.subscription
                              ? planLabel(
                                  s.subscription.plan as SubscriptionPlan,
                                  t
                                )
                              : "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {s.subscription ? (
                            <span
                              className={cn(
                                "font-semibold tabular-nums",
                                days === 0
                                  ? "text-red-600"
                                  : days <= 7
                                    ? "text-amber-600"
                                    : "text-emerald-600"
                              )}
                            >
                              {days}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {s.counts.products}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {s.counts.sales}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSubDialogStore(s);
                                setSubDuration(30);
                                setSubCustomDays("");
                                setSubPlan(s.subscription?.plan || "MONTHLY");
                              }}
                              className="border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                              title={t("activateSubscription")}
                            >
                              <Zap className="h-3.5 w-3.5" />
                              <span className="hidden xl:inline">{t("activateSubscription")}</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={toggleStoreMutation.isPending}
                              onClick={() => toggleStoreMutation.mutate(s.id)}
                              className={cn(
                                s.status === "SUSPENDED"
                                  ? "border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                                  : "border-red-500/40 text-red-700 hover:bg-red-500/10 dark:text-red-400"
                              )}
                            >
                              {s.status === "SUSPENDED" ? (
                                <>
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  {t("activateStore")}
                                </>
                              ) : (
                                <>
                                  <Ban className="h-3.5 w-3.5" />
                                  {t("suspendStore")}
                                </>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile card list */}
          <div className="block lg:hidden">
            {storesLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("loadingStores")}
              </div>
            ) : stores.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {t("noSuppliersYet")}
              </div>
            ) : (
              <ul className="divide-y">
                {stores.map((s) => {
                  const days = s.subscription?.endDate
                    ? daysBetween(new Date(s.subscription.endDate), new Date())
                    : 0;
                  return (
                    <li key={s.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{s.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {s.email || "—"}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {storeStatusBadge(s.status, t)}
                            {s.subscription &&
                              subStatusBadge(s.subscription.status, t)}
                            {s.subscription && (
                              <Badge variant="outline">
                                {planLabel(
                                  s.subscription.plan as SubscriptionPlan,
                                  t
                                )}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                            <span>
                              {t("productsCount")}:{" "}
                              <span className="font-semibold text-foreground">
                                {s.counts.products}
                              </span>
                            </span>
                            <span>
                              {t("salesCount")}:{" "}
                              <span className="font-semibold text-foreground">
                                {s.counts.sales}
                              </span>
                            </span>
                            {s.subscription && (
                              <span>
                                {t("daysLeftInStore")}:{" "}
                                <span
                                  className={cn(
                                    "font-semibold",
                                    days === 0
                                      ? "text-red-600"
                                      : days <= 7
                                        ? "text-amber-600"
                                        : "text-emerald-600"
                                  )}
                                >
                                  {days}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={toggleStoreMutation.isPending}
                          onClick={() => toggleStoreMutation.mutate(s.id)}
                          className={cn(
                            "shrink-0",
                            s.status === "SUSPENDED"
                              ? "border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                              : "border-red-500/40 text-red-700 hover:bg-red-500/10 dark:text-red-400"
                          )}
                        >
                          {s.status === "SUSPENDED" ? (
                            <ShieldCheck className="h-3.5 w-3.5" />
                          ) : (
                            <Ban className="h-3.5 w-3.5" />
                          )}
                          {s.status === "SUSPENDED"
                            ? t("activateStore")
                            : t("suspendStore")}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Activate Subscription Dialog */}
      <Dialog open={!!subDialogStore} onOpenChange={(o) => !o && setSubDialogStore(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-600" />
              {t("activateSubscription")}
            </DialogTitle>
            <DialogDescription>
              {t("activateSubDesc")}
              {subDialogStore && (
                <span className="mt-1 block font-medium text-foreground">
                  {subDialogStore.name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current subscription info */}
            {subDialogStore?.subscription && (
              <div className="rounded-lg border bg-muted/30 p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("currentEndDate")}</span>
                  <span className="font-medium">
                    {formatDate(subDialogStore.subscription.endDate)}
                  </span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">{t("subStatus")}</span>
                  <span className={cn(
                    "font-medium",
                    subDialogStore.subscription.status === "ACTIVE"
                      ? "text-emerald-600"
                      : subDialogStore.subscription.status === "TRIAL"
                      ? "text-amber-600"
                      : "text-red-600"
                  )}>
                    {subDialogStore.subscription.status}
                  </span>
                </div>
              </div>
            )}

            {/* Duration selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("selectDuration")}</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { val: 30, label: t("days30") },
                  { val: 90, label: t("days90") },
                  { val: 365, label: t("days365") },
                  { val: 0, label: t("customDays") },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    onClick={() => setSubDuration(opt.val)}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-xs font-medium transition-all",
                      subDuration === opt.val
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom days input */}
            {subDuration === 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="custom-days">{t("enterCustomDays")}</Label>
                <Input
                  id="custom-days"
                  type="number"
                  min={1}
                  value={subCustomDays}
                  onChange={(e) => setSubCustomDays(e.target.value)}
                  placeholder="e.g. 60"
                  className="tabular-nums"
                />
              </div>
            )}

            {/* Plan selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("subscriptionPlan")}</Label>
              <Select value={subPlan} onValueChange={setSubPlan}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">{t("monthlyPlan")}</SelectItem>
                  <SelectItem value="QUARTERLY">{t("quarterlyPlan")}</SelectItem>
                  <SelectItem value="YEARLY">{t("yearlyPlan")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSubDialogStore(null)}>
              {t("close")}
            </Button>
            <Button
              onClick={handleActivateSub}
              disabled={
                activateSubMutation.isPending ||
                (subDuration === 0 && !subCustomDays.trim())
              }
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {activateSubMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarPlus className="h-4 w-4" />
              )}
              {activateSubMutation.isPending
                ? t("subActivating")
                : t("extendSubscription")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- access guard placeholder ---------- */

export function AdminAccessDenied() {
  const { t } = useLanguage();
  return (
    <div className="mx-auto w-full max-w-md">
      <Card className="gap-0 p-0">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="grid size-14 place-items-center rounded-full bg-red-500/10 text-red-600">
            <Lock className="h-6 w-6" />
          </div>
          <p className="text-base font-semibold">{t("adminAccessDenied")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
