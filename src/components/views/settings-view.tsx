"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Database,
  Download,
  Info,
  Loader2,
  Printer,
  Save,
  Settings as SettingsIcon,
  ShieldAlert,
  Store,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

import { productsApi, shopApi } from "@/lib/api";
import { initialsOf } from "@/lib/format";
import type { Product, Shop } from "@/lib/types";
import { useLanguage } from "@/lib/language-context";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const AUTOPRINT_KEY = "swiftbill_autoprint";
const APP_VERSION = "v1.0.0";

const cardMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

// --- localStorage-backed autoPrint subscription (React-canonical pattern) ---
const emptySubscribe = (): (() => void) => () => {};
function readAutoPrintSnapshot(): boolean {
  try {
    return window.localStorage.getItem(AUTOPRINT_KEY) === "true";
  } catch {
    return false;
  }
}
function subscribeAutoPrint(cb: () => void): () => void {
  if (typeof window === "undefined") return emptySubscribe();
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

export function SettingsView() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: shop, isLoading } = useQuery({
    queryKey: ["shop"],
    queryFn: shopApi.get,
  });

  const autoPrint = useSyncExternalStore(
    subscribeAutoPrint,
    readAutoPrintSnapshot,
    () => false
  );

  const [taxValue, setTaxValue] = useState(0);
  const [currencyValue, setCurrencyValue] = useState("₹");
  const [syncedShopId, setSyncedShopId] = useState<string | null>(null);

  // Sync tax slider + currency from server when the loaded shop changes.
  if (shop && shop.id !== syncedShopId) {
    setSyncedShopId(shop.id);
    setTaxValue(Math.min(20, Math.max(0, shop.taxRate ?? 0)));
    setCurrencyValue(shop.currency ?? "₹");
  }

  const taxMutation = useMutation({
    mutationFn: (rate: number) => shopApi.update({ taxRate: rate }),
    onSuccess: () => {
      toast.success(t("taxRateUpdated"));
      void queryClient.invalidateQueries({ queryKey: ["shop"] });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : t("failedUpdateTax");
      toast.error(msg);
    },
  });

  const handleSaveTax = () => {
    const rate = Math.min(100, Math.max(0, taxValue));
    taxMutation.mutate(rate);
  };

  const currencyMutation = useMutation({
    mutationFn: (currency: string) => shopApi.update({ currency }),
    onSuccess: () => {
      toast.success(t("currencyUpdated"));
      void queryClient.invalidateQueries({ queryKey: ["shop"] });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : t("failedUpdateTax");
      toast.error(msg);
    },
  });

  const handleSaveCurrency = () => {
    currencyMutation.mutate(currencyValue);
  };

  const handleAutoPrintChange = (checked: boolean) => {
    try {
      window.localStorage.setItem(AUTOPRINT_KEY, checked ? "true" : "false");
      // Manually fire a storage event so this tab also re-renders.
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: AUTOPRINT_KEY,
          newValue: checked ? "true" : "false",
        })
      );
      toast.success(
        checked
          ? t("autoprintEnabled")
          : t("autoprintDisabled")
      );
    } catch {
      toast.error(t("couldNotSavePref"));
    }
  };

  const handlePrintTest = () => {
    // Use setTimeout so React commits the print node before printing.
    window.setTimeout(() => window.print(), 50);
  };

  if (isLoading || !shop) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    );
  }

  const taxDirty = Number(shop.taxRate ?? 0) !== taxValue;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold tracking-tight">{t("settings")}</h2>
      </div>

      {/* 1. App Profile */}
      <motion.div {...cardMotion} transition={{ duration: 0.25 }}>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-6 sm:flex-row sm:items-center sm:gap-6">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-primary text-2xl font-bold text-primary-foreground shadow-md shadow-primary/30">
              {initialsOf(shop.name)}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-base font-bold uppercase tracking-tight">
                {shop.name}
              </p>
              <p className="text-sm text-muted-foreground">
                SwiftBill POS {APP_VERSION}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <Badge variant="secondary" className="gap-1">
                  <Store className="h-3 w-3" />
                  {shop.currency || "₹"} · {t("tax")} {shop.taxRate ?? 0}%
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Info className="h-3 w-3" />
                  {t("editInShopDetails")}
                </Badge>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-not-allowed opacity-60"
                  disabled
                >
                  {t("editShop")}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t("goToShopDetails")}
              </TooltipContent>
            </Tooltip>
          </CardContent>
        </Card>
      </motion.div>

      {/* 2. Quick Tax Config */}
      <motion.div
        {...cardMotion}
        transition={{ duration: 0.25, delay: 0.05 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              {t("quickTaxConfig")}
            </CardTitle>
            <CardDescription>
              {t("taxAppliedTo")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t("current")}
                </p>
                <p className="text-2xl font-bold text-primary">
                  {shop.taxRate ?? 0}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t("adjustingTo")}
                </p>
                <p className="text-2xl font-bold">{taxValue}%</p>
              </div>
            </div>

            <div className="space-y-2">
              <Slider
                min={0}
                max={20}
                step={0.5}
                value={[taxValue]}
                onValueChange={(v) => setTaxValue(v[0] ?? 0)}
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>0%</span>
                <span>10%</span>
                <span>20%</span>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveTax}
                disabled={!taxDirty || taxMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {taxMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {t("saveTaxRate")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 2.5. Currency Config */}
      <motion.div
        {...cardMotion}
        transition={{ duration: 0.25, delay: 0.075 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" />
              {t("currencyConfig")}
            </CardTitle>
            <CardDescription>
              {t("currencyConfigDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t("currentCurrency")}
                </p>
                <p className="text-2xl font-bold text-primary">
                  {shop.currency ?? "₹"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t("selectCurrency")}
                </p>
                <p className="text-2xl font-bold">{currencyValue}</p>
              </div>
            </div>

            {/* Currency quick-pick chips */}
            <div className="flex flex-wrap gap-2">
              {["₹", "$", "€", "£", "¥", "د.ج", "ر.س", "د.إ", "ج.م", "د.ك", "د.ل", "د.ت"].map(
                (cur) => (
                  <button
                    key={cur}
                    onClick={() => setCurrencyValue(cur)}
                    className={
                      "min-w-[3rem] rounded-lg border px-3 py-2 text-sm font-bold transition-all " +
                      (currencyValue === cur
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-card text-foreground hover:bg-accent hover:border-primary/40")
                    }
                  >
                    {cur}
                  </button>
                )
              )}
            </div>

            {/* Custom currency input */}
            <div className="space-y-1.5">
              <Label htmlFor="custom-currency">{t("currencySymbol")}</Label>
              <input
                id="custom-currency"
                type="text"
                maxLength={5}
                value={currencyValue}
                onChange={(e) => setCurrencyValue(e.target.value)}
                className="flex h-9 w-24 rounded-md border border-input bg-transparent px-3 py-1 text-sm font-bold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="₹"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveCurrency}
                disabled={
                  !shop ||
                  (shop.currency ?? "₹") === currencyValue ||
                  currencyMutation.isPending
                }
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {currencyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {t("saveCurrency")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 3. Printer & Receipts */}
      <motion.div
        {...cardMotion}
        transition={{ duration: 0.25, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-4 w-4 text-primary" />
              {t("printerReceipts")}
            </CardTitle>
            <CardDescription>
              {t("printWebNote")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Label className="text-sm font-medium">
                  {t("printTestReceipt")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("openBrowserPrint")}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handlePrintTest}
                className="self-start sm:self-auto"
              >
                <Printer className="h-4 w-4" />
                {t("printTest")}
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-4">
              <div className="pr-4">
                <Label className="text-sm font-medium">
                  {t("autoPrintAfterSale")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("savedLocally")}
                </p>
              </div>
              <Switch checked={autoPrint} onCheckedChange={handleAutoPrintChange} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 4. Data Management (danger zone) */}
      <motion.div
        {...cardMotion}
        transition={{ duration: 0.25, delay: 0.15 }}
      >
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-4 w-4" />
              {t("dataManagement")}
            </CardTitle>
            <CardDescription>
              {t("destructiveActions")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <Label className="text-sm font-medium">
                    {t("clearSalesHistory")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("permanentDelete")}
                  </p>
                </div>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex w-full sm:w-auto">
                    <Button
                      variant="destructive"
                      disabled
                      className="w-full cursor-not-allowed opacity-60 sm:w-auto"
                    >
                      {t("clearSales")}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t("adminOnly")}</TooltipContent>
              </Tooltip>
            </div>

            <Separator />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <Database className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <Label className="text-sm font-medium">
                    {t("exportProducts")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("downloadCsv")}
                  </p>
                </div>
              </div>
              <ExportProductsButton t={t} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 5. About */}
      <motion.div
        {...cardMotion}
        transition={{ duration: 0.25, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>{t("about")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
              <span className="text-muted-foreground">{t("app")}</span>
              <span className="sm:col-span-2 font-medium">{t("appName")} POS</span>

              <span className="text-muted-foreground">{t("version")}</span>
              <span className="sm:col-span-2 font-medium">{APP_VERSION}</span>

              <span className="text-muted-foreground">{t("stack")}</span>
              <span className="sm:col-span-2 font-medium">
                Next.js, Prisma, Tailwind CSS
              </span>

              <span className="text-muted-foreground">{t("docs")}</span>
              <span className="sm:col-span-2 font-medium text-primary">
                {t("viewUserGuide")}
              </span>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              {t("aboutDesc")}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Hidden print template for test receipts */}
      <div className="print-receipt hidden" aria-hidden>
        <div style={{ fontFamily: "monospace", fontSize: 12, lineHeight: 1.4 }}>
          <p style={{ textAlign: "center", fontWeight: 700, fontSize: 14 }}>
            {shop.name?.toUpperCase() || "SWIFTBILL POS"}
          </p>
          {shop.addressLine1 && (
            <p style={{ textAlign: "center" }}>{shop.addressLine1}</p>
          )}
          {shop.addressLine2 && (
            <p style={{ textAlign: "center" }}>{shop.addressLine2}</p>
          )}
          {shop.phoneNumber && (
            <p style={{ textAlign: "center" }}>Ph: {shop.phoneNumber}</p>
          )}
          <p style={{ borderTop: "1px dashed #999", margin: "8px 0" }} />
          <p>This is a test print from SwiftBill POS.</p>
          <p style={{ borderTop: "1px dashed #999", margin: "8px 0" }} />
          <p style={{ textAlign: "center" }}>
            {shop.footerText || "Thank you, visit again!"}
          </p>
        </div>
      </div>
    </div>
  );
}

function ExportProductsButton({ t }: { t: (k: "exportedProducts" | "failedExport" | "exportCsv") => string }) {
  const [busy, setBusy] = useState(false);

  const handleExport = useCallback(async () => {
    setBusy(true);
    try {
      const products = await productsApi.list();
      const csv = toCsv(products);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `swiftbill-products-${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${t("exportedProducts")} (${products.length})`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : t("failedExport");
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }, [t]);

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={busy}
      className="self-start sm:self-auto"
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {t("exportCsv")}
    </Button>
  );
}

function toCsv(products: Product[]): string {
  const headers = [
    "id",
    "name",
    "barcode",
    "category",
    "price",
    "stock",
    "createdAt",
    "updatedAt",
  ];
  const escape = (v: unknown): string => {
    const s = v == null ? "" : String(v);
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const rows = products.map((p) =>
    [
      p.id,
      p.name,
      p.barcode,
      p.category,
      p.price,
      p.stock,
      p.createdAt,
      p.updatedAt,
    ]
      .map(escape)
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}
