"use client";

import { useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  HandHeart,
  Calculator,
  History,
  Settings as SettingsIcon,
  Loader2,
  Save,
  Printer,
  CheckCircle2,
  Coins,
  Wallet,
  Landmark,
  Scale,
} from "lucide-react";

import { zakatApi, shopApi } from "@/lib/api";
import type { ZakatSettings, ZakatRecord } from "@/lib/types";
import { formatMoney, formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import type { TranslationKey } from "@/lib/i18n";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export function Zakat() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<"calculator" | "records" | "settings">(
    "calculator"
  );

  return (
    <div className="space-y-6">
      {/* Gradient page header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-lg sm:p-6 print:hidden">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 backdrop-blur">
            <HandHeart className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight drop-shadow-sm sm:text-xl">
              {t("zakat")}
            </h2>
            <p className="mt-0.5 text-sm text-emerald-50/80">
              {t("zakatDesc")}
            </p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="print:hidden">
          <TabsTrigger value="calculator">
            <Calculator className="me-1.5 h-4 w-4" />
            {t("zakatCalculator")}
          </TabsTrigger>
          <TabsTrigger value="records">
            <History className="me-1.5 h-4 w-4" />
            {t("zakatRecords")}
          </TabsTrigger>
          <TabsTrigger value="settings">
            <SettingsIcon className="me-1.5 h-4 w-4" />
            {t("zakatSettings")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="mt-4">
          <ZakatCalculatorTab />
        </TabsContent>
        <TabsContent value="records" className="mt-4">
          <ZakatRecordsTab />
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <ZakatSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- Calculator Tab ---------- */

function ZakatCalculatorTab() {
  const { t } = useLanguage();
  const qc = useQueryClient();

  const { data: shop } = useQuery({ queryKey: ["shop"], queryFn: shopApi.get });
  const currency = shop?.currency ?? "دج";

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["zakat-settings"],
    queryFn: zakatApi.getSettings,
  });

  if (settingsLoading || !settings) {
    return (
      <Card className="p-12">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <ZakatCalculatorForm
      key="zakat-calc"
      settings={settings}
      currency={currency}
      t={t}
      qc={qc}
    />
  );
}

/* ---------- Calculator inner form (mounted after settings are loaded) ---------- */

function ZakatCalculatorForm({
  settings,
  currency,
  t,
  qc,
}: {
  settings: ZakatSettings;
  currency: string;
  t: (k: TranslationKey) => string;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [inventoryValue, setInventoryValue] = useState<string>("");
  const [cashValue, setCashValue] = useState<string>(String(settings.cashOnHand));
  const [receivablesValue, setReceivablesValue] = useState<string>(
    String(settings.receivables)
  );
  const [liabilitiesValue, setLiabilitiesValue] = useState<string>(
    String(settings.liabilities)
  );
  const [notes, setNotes] = useState("");

  const inv = Number(inventoryValue) || 0;
  const cash = Number(cashValue) || 0;
  const recv = Number(receivablesValue) || 0;
  const liab = Number(liabilitiesValue) || 0;

  const includeInventory = settings.includeInventory;
  const includeCash = settings.includeCash;
  const includeReceivables = settings.includeReceivables;
  const zakatRate = settings.zakatRate;

  const zakatBase = useMemo(() => {
    return (
      (includeInventory ? inv : 0) +
      (includeCash ? cash : 0) +
      (includeReceivables ? recv : 0) -
      liab
    );
  }, [
    inv,
    cash,
    recv,
    liab,
    includeInventory,
    includeCash,
    includeReceivables,
  ]);

  const zakatAmount = Math.max(0, zakatBase) * (zakatRate / 100);

  const calculateMutation = useMutation({
    mutationFn: () =>
      zakatApi.calculate({
        year,
        inventoryValue: inv,
        cashValue: cash,
        receivablesValue: recv,
        liabilitiesValue: liab,
        notes: notes.trim(),
      }),
    onSuccess: () => {
      toast.success(t("zakatSaved"));
      qc.invalidateQueries({ queryKey: ["zakat-records"] });
      setNotes("");
    },
    onError: (e: Error) => toast.error(e.message || t("zakatSaved")),
  });

  const cards = [
    {
      label: t("inventoryValueLabel"),
      value: inventoryValue,
      setter: setInventoryValue,
      icon: Scale,
      tint: "bg-emerald-500/15 text-emerald-600",
      placeholder: "0.00",
    },
    {
      label: t("cashValueLabel"),
      value: cashValue,
      setter: setCashValue,
      icon: Wallet,
      tint: "bg-emerald-500/15 text-emerald-600",
      placeholder: "0.00",
    },
    {
      label: t("receivablesValueLabel"),
      value: receivablesValue,
      setter: setReceivablesValue,
      icon: Landmark,
      tint: "bg-emerald-500/15 text-emerald-600",
      placeholder: "0.00",
    },
    {
      label: t("liabilitiesValueLabel"),
      value: liabilitiesValue,
      setter: setLiabilitiesValue,
      icon: Coins,
      tint: "bg-red-500/15 text-red-600",
      placeholder: "0.00",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Year selector */}
      <Card className="gap-0 p-4 sm:p-5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="zakat-year" className="text-sm">
              {t("auditYear")}
            </Label>
            <Input
              id="zakat-year"
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-9 w-28 tabular-nums"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              {t("printAudit")}
            </Button>
            <Button
              size="sm"
              onClick={() => calculateMutation.mutate()}
              disabled={calculateMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {calculateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t("saveCalculation")}
            </Button>
          </div>
        </div>
      </Card>

      {/* Input cards */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.2 }}
            >
              <Card className="gap-0 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {c.label}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-lg",
                      c.tint
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {currency}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={c.value}
                    onChange={(e) => c.setter(e.target.value)}
                    placeholder={c.placeholder}
                    className="pl-8 tabular-nums font-semibold"
                  />
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Result */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
        <Card className="gap-0 p-5">
          <p className="text-xs font-medium text-muted-foreground">
            {t("zakatBase")}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl tabular-nums">
            {formatMoney(Math.max(0, zakatBase), currency)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t("zakatRate")}: {zakatRate}% ·{" "}
            {t("nisabAmount")}: {formatMoney(settings?.nisabAmount ?? 0, currency)}
          </p>
        </Card>
        <Card className="gap-0 border-emerald-500/40 bg-emerald-500/5 p-5">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {t("zakatAmount")}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-700 tabular-nums sm:text-3xl dark:text-emerald-400">
            {formatMoney(zakatAmount, currency)}
          </p>
          <p className="mt-1 text-[11px] text-emerald-700/70 dark:text-emerald-400/70">
            {t("autoCompute")} · {t("zakatRate")} {zakatRate}%
          </p>
        </Card>
      </div>

      {/* Notes */}
      <Card className="gap-0 p-4 sm:p-5 print:hidden">
        <Label htmlFor="zakat-notes" className="text-sm">
          {t("paymentNotes")}
        </Label>
        <Textarea
          id="zakat-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-2"
          placeholder={t("paymentNotes")}
        />
      </Card>

      {/* Print-only summary */}
      <div className="hidden print:block">
        <h3 className="text-base font-bold">
          {t("zakat")} {year}
        </h3>
        <p>
          {t("zakatBase")}: {formatMoney(zakatBase, currency)}
        </p>
        <p>
          {t("zakatAmount")}: {formatMoney(zakatAmount, currency)}
        </p>
      </div>
    </div>
  );
}

/* ---------- Records Tab ---------- */

function ZakatRecordsTab() {
  const { t } = useLanguage();
  const qc = useQueryClient();

  const { data: shop } = useQuery({ queryKey: ["shop"], queryFn: shopApi.get });
  const currency = shop?.currency ?? "دج";

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["zakat-records"],
    queryFn: zakatApi.getRecords,
  });

  const [markPaidTarget, setMarkPaidTarget] = useState<ZakatRecord | null>(null);

  const markPaidMutation = useMutation({
    mutationFn: (id: string) =>
      zakatApi.markPaid(id, { status: "PAID", paidDate: new Date().toISOString() }),
    onSuccess: () => {
      toast.success(t("zakatMarkedPaid"));
      qc.invalidateQueries({ queryKey: ["zakat-records"] });
      setMarkPaidTarget(null);
    },
    onError: (e: Error) => toast.error(e.message || t("zakatMarkedPaid")),
  });

  return (
    <Card className="gap-0 p-0">
      <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
        <h3 className="text-sm font-semibold">{t("zakatRecords")}</h3>
        <span className="text-xs text-muted-foreground">{records.length}</span>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
            <History className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium">{t("noZakatRecords")}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-6">{t("auditYear")}</TableHead>
                  <TableHead>{t("calculationDate")}</TableHead>
                  <TableHead className="text-right">{t("zakatBase")}</TableHead>
                  <TableHead className="text-right">{t("zakatRate")}</TableHead>
                  <TableHead className="text-right">{t("zakatAmount")}</TableHead>
                  <TableHead className="text-center">{t("status")}</TableHead>
                  <TableHead className="pr-6 text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id} className="hover:bg-emerald-500/5">
                    <TableCell className="pl-6 py-2.5 font-semibold tabular-nums">
                      {r.year}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(r.calculationDate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(r.zakatBase, currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {r.zakatRate}%
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                      {formatMoney(r.zakatAmount, currency)}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.status === "PAID" ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/15 dark:text-emerald-400">
                          <CheckCircle2 className="me-1 h-3 w-3" />
                          {t("zakatStatusPaid")}
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 hover:bg-amber-500/15 dark:text-amber-400">
                          {t("zakatStatusUnpaid")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      {r.status !== "PAID" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMarkPaidTarget(r)}
                          className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {t("markZakatPaid")}
                        </Button>
                      )}
                      {r.status === "PAID" && r.paidDate && (
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(r.paidDate)}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile list */}
          <ul className="block divide-y md:hidden">
            {records.map((r) => (
              <li key={r.id} className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold tabular-nums">{r.year}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatDateTime(r.calculationDate)}
                    </p>
                  </div>
                  {r.status === "PAID" ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/15 dark:text-emerald-400">
                      {t("zakatStatusPaid")}
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 hover:bg-amber-500/15 dark:text-amber-400">
                      {t("zakatStatusUnpaid")}
                    </Badge>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <p className="text-muted-foreground">{t("zakatBase")}</p>
                    <p className="tabular-nums font-medium">
                      {formatMoney(r.zakatBase, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("zakatAmount")}</p>
                    <p className="tabular-nums font-medium text-emerald-700 dark:text-emerald-400">
                      {formatMoney(r.zakatAmount, currency)}
                    </p>
                  </div>
                </div>
                {r.status !== "PAID" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                    onClick={() => setMarkPaidTarget(r)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t("markZakatPaid")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <AlertDialog
        open={markPaidTarget !== null}
        onOpenChange={(o) => !o && setMarkPaidTarget(null)}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("markZakatPaid")}?</AlertDialogTitle>
            <AlertDialogDescription>
              {t("zakatAmount")}:{" "}
              <span className="font-semibold">
                {markPaidTarget
                  ? formatMoney(markPaidTarget.zakatAmount, currency)
                  : ""}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={markPaidMutation.isPending}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={(e) => {
                e.preventDefault();
                if (markPaidTarget) markPaidMutation.mutate(markPaidTarget.id);
              }}
              disabled={markPaidMutation.isPending}
            >
              {markPaidMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {t("markZakatPaid")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/* ---------- Settings Tab ---------- */

function ZakatSettingsTab() {
  const { t } = useLanguage();
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["zakat-settings"],
    queryFn: zakatApi.getSettings,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ZakatSettings>) =>
      zakatApi.updateSettings(data),
    onSuccess: () => {
      toast.success(t("zakatSettingsSaved"));
      qc.invalidateQueries({ queryKey: ["zakat-settings"] });
    },
    onError: (e: Error) => toast.error(e.message || t("zakatSettingsSaved")),
  });

  if (isLoading || !settings) {
    return (
      <Card className="p-12">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <ZakatSettingsForm key="zakat-settings" initial={settings} t={t} qc={qc} updateMutation={updateMutation} />
  );
}

/* ---------- Settings inner form (mounted after settings load) ---------- */

function ZakatSettingsForm({
  initial,
  t,
  qc,
  updateMutation,
}: {
  initial: ZakatSettings;
  t: (k: TranslationKey) => string;
  qc: ReturnType<typeof useQueryClient>;
  updateMutation: UseMutationResult<
    ZakatSettings,
    Error,
    Partial<ZakatSettings>
  >;
}) {
  const [form, setForm] = useState<Partial<ZakatSettings>>(initial);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      zakatRate: Number(form.zakatRate),
      nisabAmount: Number(form.nisabAmount),
      haulStartDate: form.haulStartDate ?? null,
      cashOnHand: Number(form.cashOnHand),
      receivables: Number(form.receivables),
      liabilities: Number(form.liabilities),
      includeInventory: !!form.includeInventory,
      includeCash: !!form.includeCash,
      includeReceivables: !!form.includeReceivables,
      valuationMethod: form.valuationMethod === "selling" ? "selling" : "cost",
    });
  };

  return (
    <Card className="gap-0 p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="z-rate">{t("zakatRate")}</Label>
            <Input
              id="z-rate"
              type="number"
              min={0}
              max={100}
              step="0.01"
              inputMode="decimal"
              value={form.zakatRate ?? 2.5}
              onChange={(e) =>
                setForm((f) => ({ ...f, zakatRate: Number(e.target.value) }))
              }
              className="tabular-nums"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="z-nisab">{t("nisabAmount")}</Label>
            <Input
              id="z-nisab"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={form.nisabAmount ?? 0}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  nisabAmount: Number(e.target.value),
                }))
              }
              className="tabular-nums"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="z-haul">{t("haulStartDate")}</Label>
            <Input
              id="z-haul"
              type="date"
              value={
                form.haulStartDate
                  ? new Date(form.haulStartDate).toISOString().slice(0, 10)
                  : ""
              }
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  haulStartDate: e.target.value || null,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="z-method">{t("valuationMethod")}</Label>
            <Select
              value={form.valuationMethod === "selling" ? "selling" : "cost"}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  valuationMethod: v as "cost" | "selling",
                }))
              }
            >
              <SelectTrigger id="z-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cost">{t("valuationCost")}</SelectItem>
                <SelectItem value="selling">{t("valuationSelling")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="z-cash">{t("cashOnHand")}</Label>
            <Input
              id="z-cash"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={form.cashOnHand ?? 0}
              onChange={(e) =>
                setForm((f) => ({ ...f, cashOnHand: Number(e.target.value) }))
              }
              className="tabular-nums"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="z-recv">{t("receivables")}</Label>
            <Input
              id="z-recv"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={form.receivables ?? 0}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  receivables: Number(e.target.value),
                }))
              }
              className="tabular-nums"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="z-liab">{t("liabilities")}</Label>
            <Input
              id="z-liab"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={form.liabilities ?? 0}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  liabilities: Number(e.target.value),
                }))
              }
              className="tabular-nums"
            />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="z-inc-inv" className="text-sm font-medium">
              {t("includeInventory")}
            </Label>
            <Switch
              id="z-inc-inv"
              checked={!!form.includeInventory}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, includeInventory: v }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="z-inc-cash" className="text-sm font-medium">
              {t("includeCash")}
            </Label>
            <Switch
              id="z-inc-cash"
              checked={!!form.includeCash}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, includeCash: v }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="z-inc-recv" className="text-sm font-medium">
              {t("includeReceivables")}
            </Label>
            <Switch
              id="z-inc-recv"
              checked={!!form.includeReceivables}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, includeReceivables: v }))
              }
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t("saveChanges")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
