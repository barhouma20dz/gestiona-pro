"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  UserCog,
  Mail,
  Loader2,
  BarChart3,
  Wallet,
  Receipt,
  TrendingUp,
  Users,
  KeyRound,
} from "lucide-react";

import { sellersApi, shopApi } from "@/lib/api";
import type { Seller, NewSeller, SellerEarnings } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import type { TranslationKey } from "@/lib/i18n";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AnimatedNumber } from "@/components/animated-number";

type T = (key: TranslationKey) => string;

/* ---------- helpers ---------- */

function initialsOf(name: string | null): string {
  if (!name) return "S";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  const first = parts[0][0] ?? "";
  const second = parts.length > 1 ? parts[1][0] ?? "" : "";
  return (first + second).toUpperCase() || "S";
}

/* ---------- form state ---------- */

interface SellerForm {
  name: string;
  email: string;
  password: string;
}

const emptyForm: SellerForm = { name: "", email: "", password: "" };

function toForm(s: Seller): SellerForm {
  return { name: s.name ?? "", email: s.email, password: "" };
}

/* ---------- main component ---------- */

export function SellerManagement() {
  const { t } = useLanguage();
  const qc = useQueryClient();

  const { data: sellers = [], isLoading } = useQuery({
    queryKey: ["sellers"],
    queryFn: sellersApi.list,
  });
  const { data: shop } = useQuery({
    queryKey: ["shop"],
    queryFn: shopApi.get,
  });
  const currency = shop?.currency ?? "دج";

  // Form dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Seller | null>(null);
  const [form, setForm] = useState<SellerForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof SellerForm, string>>>({});

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Seller | null>(null);

  // Earnings dialog state
  const [earningsTarget, setEarningsTarget] = useState<Seller | null>(null);

  // Change password dialog
  const [pwdTarget, setPwdTarget] = useState<Seller | null>(null);
  const [pwdValue, setPwdValue] = useState("");
  const [pwdError, setPwdError] = useState<string>("");

  /* Derived stats */
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalSales = 0;
    sellers.forEach((s) => {
      totalRevenue += s.totalRevenue ?? 0;
      totalProfit += s.totalProfit ?? 0;
      totalSales += s.totalSales ?? 0;
    });
    return {
      totalSellers: sellers.length,
      totalRevenue,
      totalProfit,
      totalSales,
    };
  }, [sellers]);

  /* Mutations */
  const createMutation = useMutation({
    mutationFn: (data: NewSeller) => sellersApi.create(data),
    onSuccess: () => {
      toast.success(t("sellerAdded"));
      qc.invalidateQueries({ queryKey: ["sellers"] });
      setFormOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || t("failedAddSeller")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ name: string; email: string }> }) =>
      sellersApi.update(id, data),
    onSuccess: () => {
      toast.success(t("sellerUpdated"));
      qc.invalidateQueries({ queryKey: ["sellers"] });
      setFormOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || t("failedUpdateSeller")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sellersApi.delete(id),
    onSuccess: () => {
      toast.success(t("sellerDeleted"));
      qc.invalidateQueries({ queryKey: ["sellers"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message || t("failedDeleteSeller")),
  });

  const changePwdMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      sellersApi.changePassword(id, password),
    onSuccess: () => {
      toast.success(t("passwordChanged"));
      setPwdTarget(null);
      setPwdValue("");
      setPwdError("");
    },
    onError: (e: Error) => toast.error(e.message || t("failedChangePassword")),
  });

  /* Form handlers */
  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (s: Seller) => {
    setEditing(s);
    setForm(toForm(s));
    setFormErrors({});
    setFormOpen(true);
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof SellerForm, string>> = {};
    if (!form.name.trim()) errs.name = t("nameRequired");
    if (!form.email.trim()) errs.email = t("emailExistsSeller");
    if (!editing) {
      if (form.password.length < 6) errs.password = t("passwordTooShort");
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (editing) {
      const payload: Partial<{ name: string; email: string }> = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
      };
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      const payload: NewSeller = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      };
      createMutation.mutate(payload);
    }
  };

  const submitChangePwd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwdTarget) return;
    if (pwdValue.length < 6) {
      setPwdError(t("passwordTooShort"));
      return;
    }
    changePwdMutation.mutate({ id: pwdTarget.id, password: pwdValue });
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  /* Stat cards */
  const statCards = [
    {
      label: t("totalSellers"),
      value: String(stats.totalSellers),
      icon: Users,
      tint: "bg-emerald-500/15 text-emerald-600",
    },
    {
      label: t("totalSales"),
      value: String(stats.totalSales),
      icon: Receipt,
      tint: "bg-amber-500/15 text-amber-600",
    },
    {
      label: t("totalRevenue"),
      value: formatMoney(stats.totalRevenue, currency),
      icon: Wallet,
      tint: "bg-emerald-500/15 text-emerald-600",
    },
    {
      label: t("totalProfit"),
      value: formatMoney(stats.totalProfit, currency),
      icon: TrendingUp,
      tint: "bg-emerald-500/15 text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Gradient page header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-lg sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight drop-shadow-sm sm:text-xl">
              {t("sellerManagement")}
            </h2>
            <p className="mt-0.5 text-sm text-emerald-50/80">
              {stats.totalSellers} {t("sellerManagementSubtitle").toLowerCase()}
            </p>
          </div>
          <Button
            onClick={openAdd}
            className="bg-card text-primary shadow-md hover:bg-primary/10"
          >
            <Plus className="h-4 w-4" />
            {t("addSeller")}
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.25 }}
            >
              <Card className="gap-0 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      {s.label}
                    </p>
                    <p className="mt-1 text-lg font-bold tracking-tight sm:text-xl">
                      {s.value}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-xl",
                      s.tint
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Sellers table card */}
      <Card className="gap-0 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
          <h2 className="text-sm font-semibold">
            {t("sellersReport")}{" "}
            <span className="text-muted-foreground">({sellers.length})</span>
          </h2>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-6">{t("sellerName")}</TableHead>
                <TableHead>{t("sellerEmail")}</TableHead>
                <TableHead className="text-center">{t("totalSales")}</TableHead>
                <TableHead className="text-right">{t("totalRevenue")}</TableHead>
                <TableHead className="text-right">{t("totalProfit")}</TableHead>
                <TableHead className="pr-6 text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("loading")}
                    </div>
                  </TableCell>
                </TableRow>
              ) : sellers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <EmptySellers onAdd={openAdd} t={t} />
                  </TableCell>
                </TableRow>
              ) : (
                sellers.map((s) => (
                  <TableRow
                    key={s.id}
                    className="group transition-colors hover:bg-emerald-500/5"
                  >
                    <TableCell className="pl-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold">
                          {initialsOf(s.name)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium transition-colors group-hover:text-primary">
                            {s.name || "—"}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {t("roleStaff")}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{s.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="tabular-nums">
                        {s.totalSales ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatMoney(s.totalRevenue ?? 0, currency)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatMoney(s.totalProfit ?? 0, currency)}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEarningsTarget(s)}
                          aria-label={`${t("earnings")} ${s.name ?? ""}`}
                          title={t("earnings")}
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setPwdTarget(s);
                            setPwdValue("");
                            setPwdError("");
                          }}
                          aria-label={`${t("changePassword")} ${s.name ?? ""}`}
                          title={t("changePassword")}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(s)}
                          aria-label={`${t("edit")} ${s.name ?? ""}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300"
                          onClick={() => setDeleteTarget(s)}
                          aria-label={`${t("delete")} ${s.name ?? ""}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile card list */}
        <div className="block md:hidden">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loading")}
            </div>
          ) : sellers.length === 0 ? (
            <div className="px-4 py-12">
              <EmptySellers onAdd={openAdd} t={t} />
            </div>
          ) : (
            <ul className="divide-y">
              {sellers.map((s) => (
                <li key={s.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold">
                          {initialsOf(s.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{s.name || "—"}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {s.email}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="tabular-nums">
                          {s.totalSales ?? 0} {t("totalSales")}
                        </Badge>
                        <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400 tabular-nums">
                          {formatMoney(s.totalRevenue ?? 0, currency)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEarningsTarget(s)}
                          aria-label={t("earnings")}
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(s)}
                          aria-label={t("edit")}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-red-600 dark:text-red-400"
                          onClick={() => setDeleteTarget(s)}
                          aria-label={t("delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* Add/Edit Seller dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("editSeller") : t("addSeller")}
            </DialogTitle>
            <DialogDescription>{t("sellerManagementSubtitle")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="seller-name">{t("sellerName")}</Label>
              <Input
                id="seller-name"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder={t("sellerName")}
                autoFocus
              />
              {formErrors.name && (
                <p className="text-xs text-red-500">{formErrors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="seller-email">{t("sellerEmail")}</Label>
              <Input
                id="seller-email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                placeholder="seller@example.com"
              />
              {formErrors.email && (
                <p className="text-xs text-red-500">{formErrors.email}</p>
              )}
            </div>

            {!editing && (
              <div className="space-y-1.5">
                <Label htmlFor="seller-password">{t("sellerPassword")}</Label>
                <Input
                  id="seller-password"
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="••••••"
                />
                <p className="text-[11px] text-muted-foreground">
                  {t("sellerPasswordHint")}
                </p>
                {formErrors.password && (
                  <p className="text-xs text-red-500">{formErrors.password}</p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={saving}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? t("saveChanges") : t("addSeller")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Earnings dialog */}
      <EarningsDialog
        seller={earningsTarget}
        onClose={() => setEarningsTarget(null)}
        currency={currency}
        t={t}
      />

      {/* Change password dialog */}
      <Dialog
        open={pwdTarget !== null}
        onOpenChange={(o) => {
          if (!o) {
            setPwdTarget(null);
            setPwdValue("");
            setPwdError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("changePassword")}</DialogTitle>
            <DialogDescription>
              {pwdTarget?.name ?? pwdTarget?.email}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitChangePwd} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="seller-new-pwd">{t("newPassword")}</Label>
              <Input
                id="seller-new-pwd"
                type="password"
                value={pwdValue}
                onChange={(e) => setPwdValue(e.target.value)}
                placeholder="••••••"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                {t("sellerPasswordHint")}
              </p>
              {pwdError && (
                <p className="text-xs text-red-500">{pwdError}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPwdTarget(null);
                  setPwdValue("");
                  setPwdError("");
                }}
                disabled={changePwdMutation.isPending}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={changePwdMutation.isPending}>
                {changePwdMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {t("changePassword")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteSeller")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteSellerConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------- Empty state ---------- */

function EmptySellers({ onAdd, t }: { onAdd: () => void; t: T }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
        <UserCog className="h-7 w-7" />
      </div>
      <div>
        <p className="font-medium">{t("noSellers")}</p>
        <p className="text-sm text-muted-foreground">{t("noSellersDesc")}</p>
      </div>
      <Button onClick={onAdd} size="sm">
        <Plus className="h-4 w-4" />
        {t("addFirstSeller")}
      </Button>
    </div>
  );
}

/* ---------- Earnings dialog ---------- */

function EarningsDialog({
  seller,
  onClose,
  currency,
  t,
}: {
  seller: Seller | null;
  onClose: () => void;
  currency: string;
  t: T;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["seller-earnings", seller?.id],
    queryFn: () => sellersApi.earnings(seller!.id),
    enabled: !!seller,
  });

  return (
    <Dialog
      open={seller !== null}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            {t("sellerEarnings")}
          </DialogTitle>
          <DialogDescription>
            {seller?.name || seller?.email}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <EarningsContent data={data} currency={currency} t={t} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EarningsContent({
  data,
  currency,
  t,
}: {
  data: SellerEarnings;
  currency: string;
  t: T;
}) {
  const kpis = [
    {
      label: t("dailyRevenue"),
      value: data.todayRevenue,
      count: data.todaySales,
      tint: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    },
    {
      label: t("weeklyRevenue"),
      value: data.weekRevenue,
      count: data.weekSales,
      tint: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    },
    {
      label: t("monthlyRevenue"),
      value: data.monthRevenue,
      count: data.monthSales,
      tint: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    },
    {
      label: t("totalRevenue"),
      value: data.totalRevenue,
      count: data.totalSales,
      tint: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    },
  ];

  return (
    <div className="space-y-4">
      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className={cn("rounded-lg p-3", k.tint)}
          >
            <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">
              {k.label}
            </p>
            <p className="mt-1 text-base font-bold tabular-nums">
              <AnimatedNumber
                value={k.value}
                decimals={2}
                prefix={currency}
              />
            </p>
            <p className="text-[10px] opacity-70">
              {k.count} {t("totalSales").toLowerCase()}
            </p>
          </div>
        ))}
      </div>

      <Separator />

      {/* Profit vs Revenue summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("totalRevenue")}
          </p>
          <p className="mt-1 text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatMoney(data.totalRevenue, currency)}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("totalProfit")}
          </p>
          <p className="mt-1 text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatMoney(data.totalProfit, currency)}
          </p>
        </div>
      </div>

      {/* Daily series — simple SVG bar chart */}
      {data.dailySeries && data.dailySeries.length > 0 && (
        <div className="rounded-lg border p-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            {t("last7DaysEarnings")}
          </p>
          <DailyBarChart data={data.dailySeries} currency={currency} />
        </div>
      )}
    </div>
  );
}

function DailyBarChart({
  data,
  currency,
}: {
  data: { date: string; revenue: number; profit: number }[];
  currency: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.revenue));
  return (
    <div className="flex items-end gap-1.5 h-32" role="img" aria-label="Last 7 days revenue">
      {data.map((d) => {
        const pct = Math.max(2, (d.revenue / max) * 100);
        const dateLabel = new Date(d.date).toLocaleDateString("ar-DZ-u-nu-latn", {
          weekday: "short",
        });
        return (
          <div
            key={d.date}
            className="flex flex-1 flex-col items-center justify-end gap-1"
            title={`${dateLabel}: ${formatMoney(d.revenue, currency)} · ${formatMoney(
              d.profit,
              currency
            )} profit`}
          >
            <div className="flex w-full flex-col justify-end h-24">
              <div
                className="w-full rounded-t bg-gradient-to-t from-emerald-600 to-teal-500"
                style={{ height: `${pct}%` }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground">{dateLabel[0]}</span>
          </div>
        );
      })}
    </div>
  );
}
