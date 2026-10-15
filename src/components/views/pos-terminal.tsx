"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ScanLine,
  Search,
  Plus,
  Camera,
  CameraOff,
  Trash2,
  Minus,
  ShoppingCart,
  PackageX,
  X,
  CheckCircle2,
  CreditCard,
  Banknote,
  QrCode,
  Pause,
  Play,
  History,
  Clock,
  Calculator,
  Users,
  Scale,
  ScrollText,
  HandCoins,
  Send,
  Radio,
} from "lucide-react";

import { productsApi, shopApi } from "@/lib/api";
import { useCartStore, isKgProduct } from "@/lib/cart-store";
import { useHeldOrdersStore } from "@/lib/held-orders-store";
import { useRoomSyncStore } from "@/lib/room-sync-store";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import { colorFromString, formatMoney, initialsOf } from "@/lib/format";
import { playScanBeep, vibrateScan, triggerCashDrawerKick } from "@/lib/scan-feedback";
import type { Product } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

import { CheckoutDialog } from "@/components/checkout-dialog";

const PAYMENT_METHODS = [
  { key: "Cash", labelKey: "cash" as const, icon: Banknote },
  { key: "BARIDIMOB", labelKey: "baridimob" as const, icon: QrCode },
  { key: "CARD", labelKey: "card" as const, icon: CreditCard },
  { key: "CHEQUE", labelKey: "cheque" as const, icon: ScrollText },
  { key: "CREDIT", labelKey: "creditSale" as const, icon: HandCoins },
] as const;

function stockBadge(
  stock: number,
  unitType: string,
  t: (k: "out" | "left" | "inStock" | "kg" | "inStockKg") => string
) {
  const isKg = unitType === "kg";
  if (stock <= 0)
    return (
      <Badge
        variant="secondary"
        className="bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
      >
        {t("out")}
      </Badge>
    );
  if (stock <= 5)
    return (
      <Badge
        variant="secondary"
        className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
      >
        {isKg
          ? `${stock.toFixed(stock % 1 === 0 ? 0 : 3)} ${t("kg")}`
          : `${stock} ${t("left")}`}
      </Badge>
    );
  return (
    <Badge
      variant="secondary"
      className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
    >
      {isKg
        ? `${stock.toFixed(stock % 1 === 0 ? 0 : 3)} ${t("inStockKg")}`
        : `${stock} ${t("inStock")}`}
    </Badge>
  );
}

/* -------------------------------------------------------------------------- */
/* Weight dialog — for kg (weighted) products                                  */
/* -------------------------------------------------------------------------- */

type WeightDialogT = (
  k:
    | "weighProduct"
    | "enterWeight"
    | "weight"
    | "pricePerKg"
    | "totalPrice"
    | "kg"
    | "perKg"
    | "cancel"
    | "add"
    | "out"
    | "left"
    | "inStock"
    | "inStockKg"
) => string;

function WeightDialog({
  open,
  product,
  currency,
  onOpenChange,
  onAdd,
  t,
}: {
  open: boolean;
  product: Product | null;
  currency: string;
  onOpenChange: (o: boolean) => void;
  onAdd: (product: Product, weight: number) => void;
  t: WeightDialogT;
}) {
  // Radix Dialog unmounts DialogContent on close (after exit animation), so the
  // inner WeightDialogBody component is freshly mounted each time the dialog
  // opens — its useState initializer fires again, giving a fresh 1.000 kg start.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {product && (
          <WeightDialogBody
            product={product}
            currency={currency}
            onOpenChange={onOpenChange}
            onAdd={onAdd}
            t={t}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function WeightDialogBody({
  product,
  currency,
  onOpenChange,
  onAdd,
  t,
}: {
  product: Product;
  currency: string;
  onOpenChange: (o: boolean) => void;
  onAdd: (product: Product, weight: number) => void;
  t: WeightDialogT;
}) {
  const [weightStr, setWeightStr] = useState("1.000");

  const weight = Number(weightStr) || 0;
  const pricePerKg = product.price;
  const total = weight * pricePerKg;
  const inStock = product.stock;
  const exceedsStock = weight > inStock;
  const invalid = weight <= 0 || exceedsStock;

  const quickWeights = [0.25, 0.5, 1, 1.5, 2];

  const handleAdd = () => {
    if (weight <= 0) {
      toast.error(t("enterWeight"));
      return;
    }
    if (exceedsStock) {
      toast.error(t("inStockKg"), {
        description: `${inStock} ${t("kg")}`,
      });
      return;
    }
    onAdd(product, weight);
    onOpenChange(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-amber-600" />
          {t("weighProduct")}
          <span className="text-muted-foreground">· {product.name}</span>
        </DialogTitle>
        <DialogDescription>{t("enterWeight")}</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* Price per kg + stock info */}
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
          <div>
            <p className="text-[11px] text-muted-foreground">
              {t("pricePerKg")}
            </p>
            <p className="text-sm font-bold tabular-nums text-amber-700 dark:text-amber-400">
              {formatMoney(pricePerKg, currency)}
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                {t("perKg")}
              </span>
            </p>
          </div>
          {stockBadge(inStock, "kg", t)}
        </div>

        {/* Big weight input */}
        <div className="space-y-1.5">
          <Label htmlFor="weight-input">
            {t("weight")} ({t("kg")})
          </Label>
          <Input
            id="weight-input"
            type="number"
            min={0}
            step="0.001"
            inputMode="decimal"
            autoFocus
            value={weightStr}
            onChange={(e) => setWeightStr(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !invalid) handleAdd();
            }}
            className="text-center text-2xl font-bold tabular-nums"
          />
          {exceedsStock && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {t("inStockKg")}: {inStock} {t("kg")}
            </p>
          )}
        </div>

        {/* Quick weight buttons */}
        <div className="grid grid-cols-5 gap-2">
          {quickWeights.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWeightStr(w.toFixed(3))}
              className={cn(
                "rounded-lg border px-2 py-1.5 text-xs font-medium tabular-nums transition-colors",
                Math.abs(weight - w) < 0.0001
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {w.toFixed(3)}
            </button>
          ))}
        </div>

        {/* Calculated total */}
        <div className="flex items-center justify-between rounded-lg border bg-primary/5 px-3 py-2.5">
          <span className="text-sm font-medium text-muted-foreground">
            {t("totalPrice")}
          </span>
          <span className="text-xl font-bold text-primary tabular-nums">
            {formatMoney(total, currency)}
          </span>
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {t("cancel")}
        </Button>
        <Button onClick={handleAdd} disabled={invalid}>
          <Plus className="h-4 w-4" />
          {t("add")}
        </Button>
      </DialogFooter>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Camera scanner dialog                                                       */
/* -------------------------------------------------------------------------- */

function CameraScannerDialog({
  open,
  onOpenChange,
  onScan,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onScan: (code: string) => void;
}) {
  // The inner body lives inside DialogContent. Radix mounts/unmounts its
  // children with the dialog lifecycle (after exit animation), so the body
  // component state (camera, manualCode) is naturally reset on each open.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <CameraScannerBody onScan={onScan} onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}

function CameraScannerBody({
  onScan,
  onOpenChange,
}: {
  onScan: (code: string) => void;
  onOpenChange: (o: boolean) => void;
}) {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  // Continuous scanning: keep the dialog open and keep adding scanned products.
  const [keepOpen, setKeepOpen] = useState(true);
  const keepOpenRef = useRef(keepOpen);
  const [lastScan, setLastScan] = useState<{ code: string; at: number } | null>(
    null
  );
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    keepOpenRef.current = keepOpen;
  }, [keepOpen]);

  useEffect(() => {
    let cancelled = false;
    let lastCode = "";
    let lastAt = 0;

    async function startCamera() {
      try {
        // Dynamic import to keep the heavy ZXing bundle out of the POS chunk.
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const { DecodeHintType, BarcodeFormat } = await import("@zxing/library");

        if (!videoRef.current) return;

        // Restrict to retail barcode formats → faster + fewer false reads.
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.CODE_93,
          BarcodeFormat.ITF,
          BarcodeFormat.CODABAR,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        // Key speed fix: zxing's default delayBetweenScanAttempts is 500ms
        // (only 2 decode tries per second!). 30ms → ~30 tries/sec.
        const reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 30,
          delayBetweenScanSuccess: 250,
        });

        const handleDetected = (text: string) => {
          if (cancelled) return;
          const now = Date.now();
          // Ignore the same code re-detected within 1.5s (staying in frame).
          if (text === lastCode && now - lastAt < 1500) return;
          lastCode = text;
          lastAt = now;

          // Instant feedback: beep + vibrate + green flash.
          playScanBeep(true);
          vibrateScan(true);
          setLastScan({ code: text, at: now });
          setFlash(true);
          setTimeout(() => {
            if (!cancelled) setFlash(false);
          }, 260);

          onScan(text);

          // Single-shot mode: close right after a successful scan.
          if (!keepOpenRef.current) {
            onOpenChange(false);
          }
        };

        // High-resolution + back camera → reads barcodes from farther away.
        const controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: "environment",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          },
          videoRef.current,
          (result) => {
            const text = result?.getText();
            if (text) handleDetected(text);
          }
        );

        controlsRef.current = controls;
        if (!cancelled) setCameraReady(true);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Unable to access camera.";
        setCameraError(message);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (controlsRef.current) {
        try {
          controlsRef.current.stop();
        } catch {
          // ignore
        }
        controlsRef.current = null;
      }
    };
  }, [onScan, onOpenChange]);

  const submitManual = () => {
    const code = manualCode.trim();
    if (!code) return;
    playScanBeep(true);
    vibrateScan(true);
    onScan(code);
    setManualCode("");
    if (!keepOpenRef.current) onOpenChange(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ScanLine className="h-5 w-5 text-primary" />
          {t("scanBarcode")}
        </DialogTitle>
        <DialogDescription>
          {t("cameraHint")}
        </DialogDescription>
      </DialogHeader>

      {/* Camera preview with live decoding */}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-black">
        {cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
            <CameraOff className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {t("cameraNotAvailable")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("manualBarcodeHint")}
            </p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            {/* Success flash */}
            {flash && (
              <div className="pointer-events-none absolute inset-0 bg-emerald-400/25 transition-opacity" />
            )}
            {/* Scan frame overlay */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-24 w-3/4 max-w-[260px] rounded-md border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
                <span className="absolute -left-1 -top-1 h-4 w-4 border-l-4 border-t-4 border-primary" />
                <span className="absolute -right-1 -top-1 h-4 w-4 border-r-4 border-t-4 border-primary" />
                <span className="absolute -bottom-1 -left-1 h-4 w-4 border-b-4 border-l-4 border-primary" />
                <span className="absolute -bottom-1 -right-1 h-4 w-4 border-b-4 border-r-4 border-primary" />
                <motion.span
                  className="absolute inset-x-1 top-1/2 h-0.5 bg-primary"
                  initial={{ y: -40 }}
                  animate={{ y: 40 }}
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut",
                  }}
                />
              </div>
            </div>
            {/* Last detected code — feedback while continuous scanning */}
            {lastScan && keepOpen && (
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-emerald-500/90 p-2 text-white">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="truncate font-mono text-sm font-bold">
                  {lastScan.code}
                </span>
              </div>
            )}
            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-white/70">
                {t("startingCamera")}
              </div>
            )}
          </>
        )}
      </div>

      {/* Continuous scan toggle */}
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
        <input
          type="checkbox"
          checked={keepOpen}
          onChange={(e) => setKeepOpen(e.target.checked)}
          className="h-4 w-4 accent-emerald-600"
        />
        <span className="text-sm font-medium">{t("keepScannerOpen")}</span>
        <span className="text-xs text-muted-foreground">
          — {t("keepScannerOpenHint")}
        </span>
      </label>

      {/* Manual fallback — primary path */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          {t("enterBarcodeManually")}
        </label>
        <div className="flex gap-2">
          <Input
            autoFocus={!!cameraError}
            value={manualCode}
            placeholder="e.g. 8901030867531"
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitManual();
            }}
            className="font-mono"
          />
          <Button type="button" onClick={submitManual} disabled={!manualCode.trim()}>
            <Plus className="h-4 w-4" />
            {t("add")}
          </Button>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {t("close")}
        </Button>
      </DialogFooter>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Multiplier & search helpers                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Extracts the searchable product query from multiplier input (e.g. "100*بيض" -> "بيض")
 */
function extractSearchTerm(val: string): string {
  const trimmed = val.trim();
  const match = trimmed.match(/^(.*?)\s*[*xX×]\s*(.*?)$/);
  if (!match) return trimmed;
  const partA = match[1].trim();
  const partB = match[2].trim();
  const numA = parseFloat(partA.replace(",", "."));
  const numB = parseFloat(partB.replace(",", "."));
  const isNumA = !isNaN(numA) && isFinite(numA);
  const isNumB = !isNaN(numB) && isFinite(numB);
  if (isNumA && !isNumB) return partB;
  if (!isNumA && isNumB) return partA;
  return trimmed;
}

/**
 * Parses user input for multiplier patterns:
 * - "1*100" (item index 1 * 100 units, or barcode * qty)
 * - "100*1" (100 units * item index 1)
 * - "100*بيض" or "بيض*100" (100 units of "بيض")
 * - "100*0225555555465465" (100 units of barcode)
 */
function parseMultiplierInput(
  raw: string,
  products: Product[]
): { product: Product; quantity: number } | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(.*?)\s*[*xX×]\s*(.*?)$/);
  if (!match) return null;

  const partA = match[1].trim();
  const partB = match[2].trim();
  if (!partA || !partB) return null;

  const numA = parseFloat(partA.replace(",", "."));
  const numB = parseFloat(partB.replace(",", "."));
  const isNumA = !isNaN(numA) && numA > 0;
  const isNumB = !isNaN(numB) && numB > 0;

  // Case 1: Both parts are numbers (e.g. "1*100", "100*1", "barcode*qty")
  if (isNumA && isNumB) {
    // 1a. Check if partA is an exact barcode
    const byBarcodeA = products.find((p) => p.barcode === partA);
    if (byBarcodeA) return { product: byBarcodeA, quantity: numB };

    // 1b. Check if partB is an exact barcode
    const byBarcodeB = products.find((p) => p.barcode === partB);
    if (byBarcodeB) return { product: byBarcodeB, quantity: numA };

    // 1c. Catalog 1-based index (e.g. 1*100 -> item 1, qty 100)
    const intA = Math.floor(numA);
    const intB = Math.floor(numB);

    if (intA >= 1 && intA <= products.length && String(intA) === partA) {
      return { product: products[intA - 1], quantity: numB };
    }

    if (intB >= 1 && intB <= products.length && String(intB) === partB) {
      return { product: products[intB - 1], quantity: numA };
    }

    // 1d. If there is only 1 product in the catalog, associate with it!
    if (products.length === 1) {
      const qty = Math.max(numA, numB);
      return { product: products[0], quantity: qty };
    }

    return null;
  }

  // Case 2: One is a number, the other is text (e.g. "100*بيض" or "بيض*100")
  let qty = 1;
  let targetText = "";

  if (isNumA && !isNumB) {
    qty = numA;
    targetText = partB;
  } else if (!isNumA && isNumB) {
    qty = numB;
    targetText = partA;
  } else {
    return null;
  }

  const targetLower = targetText.toLowerCase();
  const product =
    products.find((p) => p.barcode.toLowerCase() === targetLower) ||
    products.find((p) => p.name.toLowerCase() === targetLower) ||
    products.find((p) => p.name.toLowerCase().includes(targetLower));

  if (product) {
    return { product, quantity: qty };
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Product tile                                                                */
/* -------------------------------------------------------------------------- */

function ProductTile({
  product,
  currency,
  onAdd,
  t,
  catalogIndex,
}: {
  product: Product;
  currency: string;
  onAdd: (p: Product) => void;
  t: (k: "out" | "left" | "inStock" | "outOfStockMsg" | "kg" | "inStockKg" | "perKg" | "kgUnit") => string;
  catalogIndex?: number;
}) {
  const outOfStock = product.stock <= 0;
  const isKg = isKgProduct(product);
  return (
    <motion.button
      type="button"
      whileHover={outOfStock ? undefined : { y: -4, scale: 1.02 }}
      whileTap={outOfStock ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      disabled={outOfStock}
      onClick={() => {
        if (outOfStock) {
          toast.error(t("outOfStockMsg"), { description: product.name });
          return;
        }
        onAdd(product);
      }}
      className={cn(
        "group relative text-left",
        outOfStock && "cursor-not-allowed opacity-50 grayscale"
      )}
    >
      <Card
        className={cn(
          "h-full gap-0 overflow-hidden p-0 transition-all duration-200",
          outOfStock
            ? "bg-muted/40"
            : "group-hover:border-primary/50 group-hover:bg-accent/60 group-hover:shadow-lg group-hover:shadow-primary/10"
        )}
      >
        <div
          className="relative flex h-20 items-center justify-center text-xl font-bold transition-transform duration-200 group-hover:scale-105"
          style={{ backgroundColor: colorFromString(product.name) }}
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white/70 text-sm font-bold text-foreground/80 backdrop-blur transition-transform duration-200 group-hover:scale-110">
            {initialsOf(product.name)}
          </span>
          {/* Catalog index badge — top-right */}
          {typeof catalogIndex === "number" && (
            <span
              className="absolute right-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur"
              title={`رقم الصنف: ${catalogIndex + 1} (يمكنك كتابة ${catalogIndex + 1}*100 للإضافة السريعة)`}
            >
              #{catalogIndex + 1}
            </span>
          )}
          {/* Unit type badge — top-left */}
          {isKg && (
            <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
              <Scale className="h-2.5 w-2.5" />
              {t("kgUnit")}
            </span>
          )}
          {/* Shine effect on hover */}
          {!outOfStock && (
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
          )}
        </div>
        <div className="space-y-1.5 p-2.5">
          <p className="line-clamp-2 text-xs font-medium leading-snug text-foreground min-h-[2rem]">
            {product.name}
          </p>
          <div className="flex items-center justify-between gap-1">
            <span className="text-sm font-bold text-primary transition-colors group-hover:text-primary/80 tabular-nums">
              {formatMoney(product.price, currency)}
              {isKg && (
                <span className="ml-0.5 text-[9px] font-normal text-muted-foreground">
                  {t("perKg")}
                </span>
              )}
            </span>
            {stockBadge(product.stock, product.unitType, t)}
          </div>
        </div>
      </Card>
    </motion.button>
  );
}

/* -------------------------------------------------------------------------- */
/* Cart item row                                                              */
/* -------------------------------------------------------------------------- */

function CartItemRow({
  item,
  currency,
  onIncrement,
  onDecrement,
  onUpdateQuantity,
  onRemove,
  t,
}: {
  item: { product: Product; quantity: number };
  currency: string;
  onIncrement: () => void;
  onDecrement: () => void;
  onUpdateQuantity: (qty: number) => void;
  onRemove: () => void;
  t: (k: "each" | "kg" | "perKg" | "kgUnit") => string;
}) {
  const isKg = isKgProduct(item.product);
  const [inputValue, setInputValue] = useState(
    isKg ? item.quantity.toFixed(3) : String(item.quantity)
  );

  useEffect(() => {
    setInputValue(isKg ? item.quantity.toFixed(3) : String(item.quantity));
  }, [item.quantity, isKg]);

  const commitQty = (valStr: string) => {
    const clean = valStr.trim().replace(",", ".");
    const parsed = parseFloat(clean);
    if (isNaN(parsed) || parsed <= 0) {
      setInputValue(isKg ? item.quantity.toFixed(3) : String(item.quantity));
      return;
    }
    const finalQty = isKg ? Math.round(parsed * 1000) / 1000 : Math.round(parsed);
    if (finalQty > item.product.stock) {
      toast.error("تجاوز الحد الأقصى للمخزون", {
        description: `المخزون المتوفر: ${item.product.stock}`,
      });
      onUpdateQuantity(item.product.stock);
      setInputValue(isKg ? item.product.stock.toFixed(3) : String(item.product.stock));
      return;
    }
    onUpdateQuantity(finalQty);
    setInputValue(isKg ? finalQty.toFixed(3) : String(finalQty));
  };

  const unitSuffix = isKg ? t("perKg") : t("each");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="overflow-hidden"
    >
      <div className="flex items-start gap-2 px-3 py-2.5">
        <div
          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md text-[10px] font-bold text-foreground/70"
          style={{ backgroundColor: colorFromString(item.product.name) }}
        >
          {initialsOf(item.product.name)}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">
            {item.product.name}
            {isKg && (
              <span className="ml-1 text-[10px] font-normal text-amber-700 dark:text-amber-400">
                {t("kgUnit")}
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {formatMoney(item.product.price, currency)} {unitSuffix}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <span className="text-sm font-semibold tabular-nums">
            {formatMoney(item.product.price * item.quantity, currency)}
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="h-6 w-6 shrink-0"
              onClick={onDecrement}
              aria-label="Decrease quantity"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <div className="relative flex items-center">
              <input
                type="number"
                inputMode="decimal"
                min={isKg ? "0.001" : "1"}
                step={isKg ? "0.001" : "1"}
                max={item.product.stock}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={() => commitQty(inputValue)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    commitQty(inputValue);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                onFocus={(e) => e.target.select()}
                title="انقر لتعديل الكمية يدوياً (مثال: 10 أو 100)"
                className="h-6 w-14 rounded border border-border bg-background px-1 text-center text-xs font-semibold tabular-nums text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
              />
              {isKg && (
                <span className="mr-1 text-[10px] text-muted-foreground">
                  {t("kg")}
                </span>
              )}
            </div>
            <Button
              size="icon"
              variant="outline"
              className="h-6 w-6 shrink-0"
              onClick={onIncrement}
              disabled={item.quantity >= item.product.stock}
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
              aria-label="Remove item"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          {/* Quick-add chips (+10, +50, +100) */}
          <div className="flex items-center gap-1 justify-end pt-0.5">
            {[10, 50, 100].map((step) => {
              const disabled = item.quantity + step > item.product.stock;
              return (
                <button
                  key={step}
                  type="button"
                  onClick={() => {
                    const next = Math.min(item.product.stock, item.quantity + step);
                    commitQty(String(next));
                  }}
                  disabled={disabled}
                  title={`إضافة ${step} إلى الكمية`}
                  className="rounded border border-border/60 bg-muted/40 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-600 dark:hover:text-emerald-400 px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  +{step}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <Separator />
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main POS Terminal view                                                      */
/* -------------------------------------------------------------------------- */

export function PosTerminal() {
  const { t } = useLanguage();
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: productsApi.list,
  });

  const { data: shop } = useQuery({
    queryKey: ["shop"],
    queryFn: shopApi.get,
  });

  const currency = shop?.currency || "دج";
  const taxRate = shop?.taxRate ?? 0;

  // Cart store — select primitive slices to avoid re-render storms
  const items = useCartStore((s) => s.items);
  const discount = useCartStore((s) => s.discount);
  const paymentMethod = useCartStore((s) => s.paymentMethod);
  const addProduct = useCartStore((s) => s.addProduct);
  const addWeightedProduct = useCartStore((s) => s.addWeightedProduct);
  const addByBarcode = useCartStore((s) => s.addByBarcode);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const setDiscount = useCartStore((s) => s.setDiscount);
  const setPaymentMethod = useCartStore((s) => s.setPaymentMethod);

  // Held orders (parked sales) — persisted to localStorage
  const heldOrders = useHeldOrdersStore((s) => s.orders);
  const holdOrder = useHeldOrdersStore((s) => s.holdOrder);
  const resumeOrder = useHeldOrdersStore((s) => s.resumeOrder);
  const deleteHeldOrder = useHeldOrdersStore((s) => s.deleteOrder);

  // Room Sync state & multi-device role
  const role = useRoomSyncStore((s) => s.role);
  const isConnected = useRoomSyncStore((s) => s.isConnected);
  const submitOrderToCashier = useRoomSyncStore((s) => s.submitOrderToCashier);
  const broadcastCartUpdate = useRoomSyncStore((s) => s.broadcastCartUpdate);

  const [scanInput, setScanInput] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [shortcutsHintOpen, setShortcutsHintOpen] = useState(false);
  const [heldOrdersOpen, setHeldOrdersOpen] = useState(false);
  const [customItemOpen, setCustomItemOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  // Weight dialog state — opened when a kg product is clicked.
  const [weighProduct, setWeighProduct] = useState<Product | null>(null);
  const weighOpen = weighProduct !== null;

  const scanInputRef = useRef<HTMLInputElement>(null);

  const handleAddCustomItem = () => {
    const price = Number(customPrice);
    if (!customPrice || Number.isNaN(price) || price <= 0) {
      toast.error(t("enterValidPrice"));
      return;
    }
    const name = customName.trim() || t("customItemDefault");
    const customProduct: Product = {
      id: `custom-${Date.now()}`,
      name,
      barcode: `CUSTOM-${Date.now().toString().slice(-6)}`,
      price,
      costPrice: 0,
      stock: 999999,
      unitType: "count",
      category: "Custom",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addProduct(customProduct);
    toast.success(`${name} ${t("productAdded")}`, { description: formatMoney(price, currency) });
    setCustomName("");
    setCustomPrice("");
    setCustomItemOpen(false);
  };

  const handleHoldOrder = () => {
    if (items.length === 0) return;
    holdOrder({ items, discount, paymentMethod });
    const count = items.reduce((s, i) => s + i.quantity, 0);
    toast.success(`${t("orderHeld")} (${count} ${t("orderHeldItems")})`, {
      description: t("pressF7Resume"),
      duration: 2500,
    });
    clearCart();
  };

  const handleResumeOrder = (id: string) => {
    const order = resumeOrder(id);
    if (!order) {
      toast.error(t("orderNotFound"));
      return;
    }
    // If current cart is non-empty, hold it first
    if (items.length > 0) {
      holdOrder({ items, discount, paymentMethod });
      toast.info(t("currentCartHeld"), { duration: 1500 });
    }
    // Restore the held order into the cart.
    // For kg products, we must add by weight (the quantity itself is the weight);
    // for count products, we add one piece at a time to mirror the original count.
    order.items.forEach((ci) => {
      if (isKgProduct(ci.product)) {
        addWeightedProduct(ci.product, ci.quantity);
      } else {
        const intQty = Math.max(0, Math.floor(ci.quantity));
        for (let i = 0; i < intQty; i++) {
          addProduct(ci.product);
        }
      }
    });
    setDiscount(order.discount);
    setPaymentMethod(order.paymentMethod);
    setHeldOrdersOpen(false);
    toast.success(t("orderResumed"), { duration: 1500 });
  };

  const handleDeleteHeldOrder = (id: string) => {
    deleteHeldOrder(id);
    toast.success(t("heldOrderDiscarded"));
  };

  const handleOpenCashDrawer = () => {
    void triggerCashDrawerKick();
    toast.success(t("cashDrawerOpened"), {
      icon: "💵",
      duration: 1500,
    });
  };

  // Keyboard shortcuts: F1 focus scan, F2/F3/F4 payment methods, F6 hold, F7 held, F8 drawer, F9 checkout
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if a dialog is open or user is typing in a non-scan input
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      // F1 — focus scan input (always works, even if typing)
      if (e.key === "F1") {
        e.preventDefault();
        scanInputRef.current?.focus();
        scanInputRef.current?.select();
        return;
      }

      // F2/F3/F4 — payment method selection (only when cart non-empty)
      if (e.key === "F2" && items.length > 0) {
        e.preventDefault();
        setPaymentMethod("Cash");
        toast.success(`${t("paymentMethod")}: ${t("cash")}`, { duration: 1000 });
        return;
      }
      if (e.key === "F3" && items.length > 0) {
        e.preventDefault();
        setPaymentMethod("BARIDIMOB");
        toast.success(`${t("paymentMethod")}: ${t("baridimob")}`, { duration: 1000 });
        return;
      }
      if (e.key === "F4" && items.length > 0) {
        e.preventDefault();
        setPaymentMethod("CARD");
        toast.success(`${t("paymentMethod")}: ${t("card")}`, { duration: 1000 });
        return;
      }

      // F8 — open cash drawer
      if (e.key === "F8" && !isTyping) {
        e.preventDefault();
        handleOpenCashDrawer();
        return;
      }

      // F9 — checkout (only when cart non-empty and not typing in scan input)
      if (e.key === "F9" && items.length > 0 && !isTyping) {
        e.preventDefault();
        setCheckoutOpen(true);
        return;
      }

      // F6 — hold current order (only when cart non-empty and not typing)
      if (e.key === "F6" && items.length > 0 && !isTyping) {
        e.preventDefault();
        handleHoldOrder();
        return;
      }

      // F7 — open held orders dialog (only when not typing)
      if (e.key === "F7" && !isTyping) {
        e.preventDefault();
        setHeldOrdersOpen(true);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [items.length, setPaymentMethod, items, discount, paymentMethod, t]);

  // Auto-focus the scan input on mount (desktop only — avoids popping the
  // on-screen keyboard on tablets/phones) so a USB scanner works immediately.
  // NOTE: the hardware-scanner capture effect lives right after
  // handleScanSubmit is declared (see below).
  const scanBufferRef = useRef("");
  const lastKeyAtRef = useRef(0);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return ["All", ...Array.from(set).sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat =
        activeCategory === "All" || p.category === activeCategory;
      const matchSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.barcode.toLowerCase().includes(term);
      return matchCat && matchSearch;
    });
  }, [products, activeCategory, searchTerm]);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
    [items]
  );
  const totalItems = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );
  const taxableAmount = Math.max(0, subtotal - discount);
  const taxAmount = (taxableAmount * taxRate) / 100;
  const grandTotal = taxableAmount + taxAmount;

  const handleSendOrderToCashier = async () => {
    if (items.length === 0) {
      toast.error(t("cartIsEmpty"));
      return;
    }
    const ok = await submitOrderToCashier({
      items,
      total: grandTotal,
      note: "طلب من الهاتف",
    });
    if (ok) {
      toast.success("تم إرسال الطلب إلى الكاشير بنجاح! 🚀");
      clearCart();
    } else {
      toast.error("فشل إرسال الطلب، تأكد من الاتصال بالغرفة");
    }
  };

  const handleScanSubmit = (codeOverride?: string) => {
    const raw = (codeOverride ?? scanInput).trim();
    if (!raw) return;

    // 1. Check if user typed shortcut to update the last added item, e.g. "*100" or "x50"
    const lastItemMatch = raw.match(/^[*xX×]\s*(\d+(\.\d+)?)$/);
    if (lastItemMatch && items.length > 0) {
      const qty = parseFloat(lastItemMatch[1]);
      if (qty > 0) {
        const lastItem = items[items.length - 1];
        if (qty > lastItem.product.stock) {
          toast.error(t("stockLimitReached"), {
            description: `${t("only")} ${lastItem.product.stock} ${t("available")}`,
          });
          return;
        }
        updateQuantity(lastItem.product.id, qty);
        playScanBeep(true);
        vibrateScan(true);
        toast.success(`${lastItem.product.name} × ${qty}`, { duration: 1500 });
        setScanInput("");
        setSearchTerm("");
        scanInputRef.current?.focus();
        return;
      }
    }

    // 2. Check for multiplier syntax: 1*100, 100*1, 100*بيض, بيض*100, 100*barcode
    const parsed = parseMultiplierInput(raw, products);
    if (parsed) {
      const { product, quantity } = parsed;
      if (quantity > product.stock) {
        toast.error(t("stockLimitReached"), {
          description: `${t("only")} ${product.stock} ${t("available")}`,
        });
        return;
      }
      addWeightedProduct(product, quantity);
      playScanBeep(true);
      vibrateScan(true);
      toast.success(
        `${product.name} × ${quantity} ${t("productAdded")}`,
        { duration: 1500 }
      );
      setScanInput("");
      setSearchTerm("");
      scanInputRef.current?.focus();
      return;
    }

    // 3. Try barcode first
    const added = addByBarcode(raw, products);
    if (added) {
      const p = added.product;
      const msg = added.weightKg
        ? `${p.name} (${added.weightKg.toFixed(3)} ${t("kg") || "كغ"}) ${t("productAdded")}`
        : `${p.name} ${t("productAdded")}`;
      playScanBeep(true);
      vibrateScan(true);
      toast.success(msg, { duration: 1500 });
      setScanInput("");
      setSearchTerm("");
      scanInputRef.current?.focus();
      return;
    }

    // 4. Try name match (case-insensitive, exact or contains)
    const byName = products.find(
      (p) => p.name.toLowerCase() === raw.toLowerCase()
    );
    if (byName) {
      addProduct(byName);
      playScanBeep(true);
      vibrateScan(true);
      toast.success(`${byName.name} ${t("productAdded")}`, { duration: 1500 });
      setScanInput("");
      setSearchTerm("");
      scanInputRef.current?.focus();
      return;
    }

    // 5. Partial name match
    const partial = products.find((p) =>
      p.name.toLowerCase().includes(raw.toLowerCase())
    );
    if (partial) {
      addProduct(partial);
      playScanBeep(true);
      vibrateScan(true);
      toast.success(`${partial.name} ${t("productAdded")}`, { duration: 1500 });
      setScanInput("");
      setSearchTerm("");
      scanInputRef.current?.focus();
      return;
    }

    // 6. Direct numeric index match: e.g. "1" selects product #1
    const idx = parseInt(raw, 10);
    if (!isNaN(idx) && String(idx) === raw && idx >= 1 && idx <= products.length) {
      const p = products[idx - 1];
      addProduct(p);
      playScanBeep(true);
      vibrateScan(true);
      toast.success(`${p.name} ${t("productAdded")}`, { duration: 1500 });
      setScanInput("");
      setSearchTerm("");
      scanInputRef.current?.focus();
      return;
    }

    playScanBeep(false);
    vibrateScan(false);
    toast.error(t("productNotFound"), {
      description: `${t("noProductMatches")} "${raw}"`,
    });
  };

  // Auto-focus the scan input on mount (desktop only — avoids popping the
  // on-screen keyboard on tablets/phones).
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: fine)").matches
    ) {
      scanInputRef.current?.focus();
    }
  }, []);

  // Hardware barcode scanner (USB / Bluetooth) capture.
  // Scanners "type" the code very fast (< 30ms between keys) and finish with
  // Enter. We capture that burst even when the scan input is NOT focused, so
  // the cashier can scan straight away without touching the mouse/keyboard.
  const scanSubmitRef = useRef(handleScanSubmit);
  useEffect(() => {
    scanSubmitRef.current = handleScanSubmit;
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Never interfere while the user is typing inside a field — those
      // inputs handle their own Enter key.
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (isTyping) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const now = Date.now();

      if (e.key === "Enter") {
        const code = scanBufferRef.current.trim();
        const burstJustEnded = now - lastKeyAtRef.current < 150;
        scanBufferRef.current = "";
        lastKeyAtRef.current = 0;
        // A fast burst of ≥ 4 chars followed immediately by Enter is
        // virtually always a hardware scanner (human typing is slower).
        if (code.length >= 4 && burstJustEnded) {
          e.preventDefault();
          scanSubmitRef.current(code);
        }
        return;
      }

      if (e.key.length === 1) {
        // Append to the burst if keystrokes come fast, otherwise start fresh.
        if (now - lastKeyAtRef.current < 80) {
          scanBufferRef.current += e.key;
        } else {
          scanBufferRef.current = e.key;
        }
        lastKeyAtRef.current = now;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleCameraScan = (code: string) => {
    const added = addByBarcode(code, products);
    if (added) {
      const p = added.product;
      const msg = added.weightKg
        ? `${p.name} (${added.weightKg.toFixed(3)} ${t("kg") || "كغ"}) ${t("productAdded")}`
        : `${p.name} ${t("productAdded")}`;
      toast.success(msg, {
        duration: 1200,
      });
    } else {
      // Try name match from camera input too
      const byName = products.find((p) =>
        p.name.toLowerCase().includes(code.toLowerCase())
      );
      if (byName) {
        addProduct(byName);
        toast.success(`${byName.name} ${t("productAdded")}`, {
          duration: 1200,
        });
      } else {
        playScanBeep(false);
        vibrateScan(false);
        toast.error(t("productNotFound"), {
          description: `${t("noProductMatches")} "${code}"`,
          duration: 2000,
        });
      }
    }
  };

  const handleAddProduct = (p: Product) => {
    if (p.stock <= 0) {
      toast.error(t("outOfStockMsg"), { description: p.name });
      return;
    }
    // Prevent adding more than stock
    const inCart = items.find((i) => i.product.id === p.id)?.quantity ?? 0;
    if (inCart >= p.stock) {
      toast.error(t("stockLimitReached"), {
        description: `${t("only")} ${p.stock} ${t("of")} ${p.name} ${t("available")}`,
      });
      return;
    }
    // For kg (weighted) products, open the weight dialog instead of adding 1 piece.
    if (isKgProduct(p)) {
      setWeighProduct(p);
      return;
    }
    addProduct(p);
    toast.success(`${p.name} ${t("productAdded")}`, { duration: 1200 });
  };

  // Handler invoked by the WeightDialog's Add button.
  const handleAddWeighted = (product: Product, weight: number) => {
    const inCart = items.find((i) => i.product.id === product.id)?.quantity ?? 0;
    if (inCart + weight > product.stock) {
      toast.error(t("stockLimitReached"), {
        description: `${t("only")} ${product.stock} ${t("kg")} ${t("of")} ${product.name} ${t("available")}`,
      });
      return;
    }
    addWeightedProduct(product, weight);
    toast.success(
      `${product.name} — ${weight.toFixed(3)} ${t("kg")}`,
      { description: formatMoney(product.price * weight, currency), duration: 1500 }
    );
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      {/* ---------------- Left column: catalog & scan ---------------- */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Scan bar */}
        <Card className="gap-0 p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={scanInputRef}
                value={scanInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setScanInput(val);
                  setSearchTerm(extractSearchTerm(val));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleScanSubmit();
                }}
                placeholder={t("scanOrSearch")}
                className="pl-9 pr-10"
                aria-label={t("scanOrSearch")}
              />
              {scanInput ? (
                <button
                  onClick={() => {
                    setScanInput("");
                    setSearchTerm("");
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  F1
                </kbd>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCustomItemOpen(true)}
                className="shrink-0"
                title={t("addCustomItemTitle")}
              >
                <Calculator className="h-4 w-4" />
                <span className="hidden sm:inline">{t("custom")}</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setScannerOpen(true)}
                className="shrink-0"
              >
                <Camera className="h-4 w-4" />
                {t("scan")}
              </Button>
              <Button
                onClick={() => handleScanSubmit()}
                disabled={!scanInput.trim()}
                className="shrink-0"
              >
                <Plus className="h-4 w-4" />
                {t("add")}
              </Button>
            </div>
          </div>
        </Card>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-emerald">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                activeCategory === cat
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product grid */}
        {productsLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-xl border bg-muted/50"
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <PackageX className="h-10 w-10 text-muted-foreground/60" />
            <div>
              <p className="text-sm font-medium">{t("noProductsFound")}</p>
              <p className="text-xs text-muted-foreground">
                {t("tryDifferentBarcode")}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((p) => {
              const catalogIndex = products.findIndex((prod) => prod.id === p.id);
              return (
                <ProductTile
                  key={p.id}
                  product={p}
                  currency={currency}
                  onAdd={handleAddProduct}
                  t={t}
                  catalogIndex={catalogIndex >= 0 ? catalogIndex : undefined}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ---------------- Right column: cart ---------------- */}
      <div className="w-full lg:w-[380px] lg:shrink-0 space-y-3">
        {/* Held carts panel — visible strip of waiting customers */}
        {heldOrders.length > 0 && (
          <Card className="gap-0 p-0 overflow-hidden border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center justify-between gap-2 border-b border-amber-500/20 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-amber-600" />
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                  {t("heldCarts")} ({heldOrders.length})
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground">{t("heldCartsDesc")}</p>
            </div>
            <div className="max-h-[120px] overflow-y-auto scrollbar-emerald p-2 space-y-1.5">
              {heldOrders.map((order, idx) => {
                const orderTotal = order.items.reduce(
                  (s, i) => s + i.product.price * i.quantity,
                  0
                );
                const orderCount = order.items.reduce(
                  (s, i) => s + i.quantity,
                  0
                );
                const heldAgo = Math.round(
                  (Date.now() - order.heldAt) / 60000
                );
                return (
                  <div
                    key={order.id}
                    className="group flex items-center gap-2 rounded-lg border border-amber-500/20 bg-card p-2 transition-colors hover:border-amber-500/40 hover:bg-amber-500/5"
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {order.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {orderCount} {t("items2")} · {formatMoney(orderTotal, currency)} ·{" "}
                        {heldAgo < 1 ? t("now") : `${heldAgo}m`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 shrink-0 px-2 text-[10px] border-amber-500/30 text-amber-700 hover:bg-amber-500/10 hover:text-amber-700"
                      onClick={() => handleResumeOrder(order.id)}
                    >
                      <Play className="h-2.5 w-2.5" />
                      {t("resumeCart")}
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <Card id="cart-container" className="sticky top-0 flex flex-col gap-0 overflow-hidden p-0 lg:top-0 scroll-mt-20">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">{t("currentOrder")}</h2>
              {totalItems > 0 && (
                <Badge className="ml-1 h-5 min-w-5 justify-center px-1.5 text-[11px]">
                  {totalItems}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Cash Drawer button */}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-emerald-600"
                onClick={handleOpenCashDrawer}
                title={`${t("openCashDrawer")} (F8)`}
              >
                <Banknote className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("cashDrawer")}</span>
              </Button>
              {/* Held orders button */}
              <Button
                size="sm"
                variant="ghost"
                className="relative h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                onClick={() => setHeldOrdersOpen(true)}
                title={`${t("heldOrders")} (F7)`}
              >
                <History className="h-3.5 w-3.5" />
                {t("held")}
                {heldOrders.length > 0 && (
                  <span className="ml-1 grid h-4 min-w-4 place-items-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                    {heldOrders.length}
                  </span>
                )}
              </Button>
              {items.length > 0 && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                    onClick={handleHoldOrder}
                    title={`${t("hold")} (F6)`}
                  >
                    <Pause className="h-3.5 w-3.5" />
                    {t("hold")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => setClearConfirmOpen(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("clear")}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Cart items */}
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-accent text-muted-foreground">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium">{t("cartIsEmpty")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("scanOrTapProducts")}
                </p>
              </div>
            </div>
          ) : (
            <div className="max-h-[40vh] overflow-y-auto scrollbar-emerald">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <CartItemRow
                    key={item.product.id}
                    item={item}
                    currency={currency}
                    onIncrement={() => {
                      const step = isKgProduct(item.product) ? 0.25 : 1;
                      const next = item.quantity + step;
                      if (next > item.product.stock) {
                        toast.error(t("stockLimitReached"), {
                          description: `${t("only")} ${item.product.stock} ${
                            isKgProduct(item.product) ? t("kg") : ""
                          } ${t("of")} ${item.product.name} ${t("available")}`.trim(),
                        });
                        return;
                      }
                      updateQuantity(item.product.id, next);
                    }}
                    onDecrement={() => {
                      const step = isKgProduct(item.product) ? 0.25 : 1;
                      updateQuantity(item.product.id, item.quantity - step);
                    }}
                    onUpdateQuantity={(newQty) => updateQuantity(item.product.id, newQty)}
                    onRemove={() => removeItem(item.product.id)}
                    t={t}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Totals + checkout */}
          {items.length > 0 && (
            <div className="space-y-3 border-t px-4 py-3">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("subtotal")}</span>
                  <span className="tabular-nums">
                    {formatMoney(subtotal, currency)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{t("discount")}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {currency}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={Number.isFinite(discount) ? discount : 0}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setDiscount(Number.isNaN(v) ? 0 : v);
                      }}
                      className="h-7 w-24 text-right tabular-nums"
                    />
                  </div>
                </div>

                {taxRate > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("tax")} ({taxRate}%)</span>
                    <span className="tabular-nums">
                      {formatMoney(taxAmount, currency)}
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold">{t("grandTotal")}</span>
                <span className="text-xl font-bold text-primary tabular-nums">
                  {formatMoney(grandTotal, currency)}
                </span>
              </div>

              {/* Payment method */}
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((m, idx) => {
                  const Icon = m.icon;
                  const active = paymentMethod === m.key;
                  const fkey = idx + 2; // F2=Cash, F3=BaridiMob, F4=Card
                  return (
                    <Button
                      key={m.key}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "outline"}
                      onClick={() => setPaymentMethod(m.key)}
                      className={cn(
                        "relative flex flex-col gap-0.5 h-auto py-2",
                        active && "shadow-sm"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-[11px]">{t(m.labelKey)}</span>
                      <kbd
                        className={cn(
                          "absolute right-1 top-1 rounded px-1 text-[9px] font-medium leading-tight",
                          active
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        F{fkey}
                      </kbd>
                    </Button>
                  );
                })}
              </div>

              {role === "order_taker" ? (
                <Button
                  size="lg"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md"
                  onClick={handleSendOrderToCashier}
                >
                  <Send className="h-4 w-4 ml-1.5" />
                  إرسال الطلب إلى الكاشير ({formatMoney(grandTotal, currency)})
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => setCheckoutOpen(true)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {t("checkout")} · {formatMoney(grandTotal, currency)}
                  <kbd className="ml-2 rounded bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-medium">
                    F9
                  </kbd>
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Mobile floating quick cart summary (visible on small screens when cart has items) */}
      {items.length > 0 && (
        <div className="fixed bottom-16 inset-x-0 z-30 p-2.5 bg-card/95 backdrop-blur-md border-t border-border shadow-2xl lg:hidden flex items-center justify-between gap-3 safe-area-bottom">
          <div className="flex flex-col">
            <span className="text-[11px] text-muted-foreground">
              {totalItems} {totalItems === 1 ? "صنف" : "أصناف"}
            </span>
            <span className="text-base font-extrabold text-primary font-mono">
              {formatMoney(grandTotal, currency)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {role === "order_taker" ? (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                onClick={handleSendOrderToCashier}
              >
                <Send className="h-3.5 w-3.5 ml-1" />
                إرسال للكاشير
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setCheckoutOpen(true)}
                className="font-bold text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 ml-1" />
                الدفع
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                document.getElementById("cart-container")?.scrollIntoView({ behavior: "smooth" });
              }}
              title="عرض السلة"
              className="h-8 w-8 p-0"
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Camera scanner dialog */}
      <CameraScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleCameraScan}
      />

      {/* Weight dialog — opens when a kg product is clicked */}
      <WeightDialog
        open={weighOpen}
        product={weighProduct}
        currency={currency}
        onOpenChange={(o) => {
          if (!o) setWeighProduct(null);
        }}
        onAdd={handleAddWeighted}
        t={t}
      />

      {/* Checkout dialog */}
      <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} />

      {/* Clear cart confirm */}
      <AlertDialog
        open={clearConfirmOpen}
        onOpenChange={setClearConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("clearCart")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("removeAllItems")} {totalItems} {t("items")}{" "}
              {t("fromCurrentOrder")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                clearCart();
                setClearConfirmOpen(false);
                toast.success(t("cartCleared"));
              }}
            >
              {t("clear")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Held orders dialog */}
      <Dialog open={heldOrdersOpen} onOpenChange={setHeldOrdersOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              {t("heldOrders")}
              {heldOrders.length > 0 && (
                <Badge className="h-5 min-w-5 justify-center px-1.5 text-[11px]">
                  {heldOrders.length}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {t("parkedOrdersResume")}
            </DialogDescription>
          </DialogHeader>

          {heldOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-accent text-muted-foreground">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium">{t("noHeldOrders")}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("pressToHold")}
                </p>
              </div>
            </div>
          ) : (
            <div className="max-h-[50vh] space-y-2 overflow-y-auto scrollbar-emerald">
              {heldOrders.map((order) => {
                const orderTotal = order.items.reduce(
                  (s, i) => s + i.product.price * i.quantity,
                  0
                );
                const orderCount = order.items.reduce(
                  (s, i) => s + i.quantity,
                  0
                );
                const heldAgo = Math.round(
                  (Date.now() - order.heldAt) / 60000
                );
                return (
                  <div
                    key={order.id}
                    className="rounded-lg border bg-card p-3 transition-colors hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {order.label}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {orderCount} {t("items")} ·{" "}
                          {formatMoney(orderTotal, currency)} ·{" "}
                          {heldAgo < 1
                            ? t("justNow")
                            : heldAgo < 60
                            ? `${heldAgo} ${t("minutesAgo")}`
                            : `${Math.round(heldAgo / 60)} ${t("hoursAgo")}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleResumeOrder(order.id)}
                        >
                          <Play className="h-3 w-3" />
                          {t("resume")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteHeldOrder(order.id)}
                          aria-label={t("discard")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setHeldOrdersOpen(false)}
            >
              {t("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom item dialog */}
      <Dialog open={customItemOpen} onOpenChange={setCustomItemOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              {t("quickCustomItem")}
            </DialogTitle>
            <DialogDescription>
              {t("customItemDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="custom-name">{t("itemName")}</Label>
              <Input
                id="custom-name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Loose rice 2kg"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custom-price">{t("price")}</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {currency}
                </span>
                <Input
                  id="custom-price"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="0.00"
                  className="pl-7 tabular-nums"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddCustomItem();
                  }}
                />
              </div>
            </div>

            {/* Quick price chips */}
            <div className="flex flex-wrap gap-2">
              <span className="self-center text-xs text-muted-foreground">
                {t("quick")}:
              </span>
              {[10, 20, 50, 100, 500].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setCustomPrice(String(amt))}
                  className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
                >
                  {currency}
                  {amt}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCustomItemOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleAddCustomItem}
              disabled={!customPrice || Number(customPrice) <= 0}
            >
              <Plus className="h-4 w-4" />
              {t("addToCart")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
