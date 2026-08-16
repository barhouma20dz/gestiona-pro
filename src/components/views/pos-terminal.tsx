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
} from "lucide-react";

import { productsApi, shopApi } from "@/lib/api";
import { useCartStore, isKgProduct } from "@/lib/cart-store";
import { useHeldOrdersStore } from "@/lib/held-orders-store";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import { colorFromString, formatMoney, initialsOf } from "@/lib/format";
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
  { key: "UPI", labelKey: "upi" as const, icon: QrCode },
  { key: "Card", labelKey: "card" as const, icon: CreditCard },
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
            <p className="text-xs text-red-600">
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
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError("Camera API not supported in this browser.");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {
            /* autoplay may be blocked — ignore */
          });
        }
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const submitManual = () => {
    const code = manualCode.trim();
    if (!code) return;
    onScan(code);
    setManualCode("");
    onOpenChange(false);
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

      {/* Camera preview */}
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
            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-white/70">
                {t("startingCamera")}
              </div>
            )}
          </>
        )}
      </div>

      {/* Manual fallback — primary path */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          {t("enterBarcodeManually")}
        </label>
        <div className="flex gap-2">
          <Input
            autoFocus
            value={manualCode}
            placeholder="e.g. 8901030867531"
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitManual();
            }}
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
/* Product tile                                                                */
/* -------------------------------------------------------------------------- */

function ProductTile({
  product,
  currency,
  onAdd,
  t,
}: {
  product: Product;
  currency: string;
  onAdd: (p: Product) => void;
  t: (k: "out" | "left" | "inStock" | "outOfStockMsg" | "kg" | "inStockKg" | "perKg" | "kgUnit") => string;
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
  onRemove,
  t,
}: {
  item: { product: Product; quantity: number };
  currency: string;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  t: (k: "each" | "kg" | "perKg" | "kgUnit") => string;
}) {
  const isKg = isKgProduct(item.product);
  // For kg products, show weight with 3 decimal places; for count products, integer.
  const qtyDisplay = isKg
    ? item.quantity.toFixed(3)
    : String(item.quantity);
  // Unit suffix for the per-unit price: "/kg" for kg, "each" for count.
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
              className="h-6 w-6"
              onClick={onDecrement}
              aria-label="Decrease quantity"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-12 text-center text-xs font-medium tabular-nums">
              {isKg ? `${qtyDisplay} ${t("kg")}` : `x${qtyDisplay}`}
            </span>
            <Button
              size="icon"
              variant="outline"
              className="h-6 w-6"
              onClick={onIncrement}
              disabled={item.quantity >= item.product.stock}
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
              aria-label="Remove item"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
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

  const currency = shop?.currency || "₹";
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

  // Keyboard shortcuts: F1 focus scan, F2/F3/F4 payment methods, F6 hold, F7 held, F9 checkout
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
        setPaymentMethod("UPI");
        toast.success(`${t("paymentMethod")}: ${t("upi")}`, { duration: 1000 });
        return;
      }
      if (e.key === "F4" && items.length > 0) {
        e.preventDefault();
        setPaymentMethod("Card");
        toast.success(`${t("paymentMethod")}: ${t("card")}`, { duration: 1000 });
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

  const handleScanSubmit = () => {
    const code = scanInput.trim();
    if (!code) return;
    // Try barcode first
    const added = addByBarcode(code, products);
    if (added) {
      const p = products.find(
        (x) => x.barcode.toLowerCase() === code.toLowerCase()
      );
      toast.success(`${p?.name ?? t("customItemDefault")} ${t("productAdded")}`);
      setScanInput("");
      return;
    }
    // Try name match (case-insensitive, exact or contains)
    const byName = products.find(
      (p) => p.name.toLowerCase() === code.toLowerCase()
    );
    if (byName) {
      addProduct(byName);
      toast.success(`${byName.name} ${t("productAdded")}`);
      setScanInput("");
      return;
    }
    // Partial name match
    const partial = products.find((p) =>
      p.name.toLowerCase().includes(code.toLowerCase())
    );
    if (partial) {
      addProduct(partial);
      toast.success(`${partial.name} ${t("productAdded")}`);
      setScanInput("");
      return;
    }
    toast.error(t("productNotFound"), {
      description: `${t("noProductMatches")} "${code}"`,
    });
  };

  const handleCameraScan = (code: string) => {
    const added = addByBarcode(code, products);
    if (added) {
      const p = products.find(
        (x) => x.barcode.toLowerCase() === code.toLowerCase()
      );
      toast.success(`${p?.name ?? t("customItemDefault")} ${t("productAdded")}`);
    } else {
      // Try name match from camera input too
      const byName = products.find((p) =>
        p.name.toLowerCase().includes(code.toLowerCase())
      );
      if (byName) {
        addProduct(byName);
        toast.success(`${byName.name} ${t("productAdded")}`);
      } else {
        toast.error(t("productNotFound"), {
          description: `${t("noProductMatches")} "${code}"`,
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
                  setScanInput(e.target.value);
                  setSearchTerm(e.target.value);
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
                onClick={handleScanSubmit}
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
            {filteredProducts.map((p) => (
              <ProductTile
                key={p.id}
                product={p}
                currency={currency}
                onAdd={handleAddProduct}
                t={t}
              />
            ))}
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

        <Card className="sticky top-0 flex flex-col gap-0 overflow-hidden p-0 lg:top-0">
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
                  const fkey = idx + 2; // F2=Cash, F3=UPI, F4=Card
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
            </div>
          )}
        </Card>
      </div>

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
