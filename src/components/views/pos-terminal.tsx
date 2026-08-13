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
} from "lucide-react";

import { productsApi, shopApi } from "@/lib/api";
import { useCartStore } from "@/lib/cart-store";
import { cn } from "@/lib/utils";
import { colorFromString, formatMoney, initialsOf } from "@/lib/format";
import type { Product } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  { key: "Cash", label: "Cash", icon: Banknote },
  { key: "UPI", label: "UPI", icon: QrCode },
  { key: "Card", label: "Card", icon: CreditCard },
] as const;

function stockBadge(stock: number) {
  if (stock <= 0)
    return (
      <Badge
        variant="secondary"
        className="bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
      >
        Out
      </Badge>
    );
  if (stock <= 5)
    return (
      <Badge
        variant="secondary"
        className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
      >
        {stock} left
      </Badge>
    );
  return (
    <Badge
      variant="secondary"
      className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
    >
      {stock} in stock
    </Badge>
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
          Scan Barcode
        </DialogTitle>
        <DialogDescription>
          Point your camera at a product barcode, or enter the code manually
          below.
        </DialogDescription>
      </DialogHeader>

      {/* Camera preview */}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-black">
        {cameraError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
            <CameraOff className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Camera not available
            </p>
            <p className="text-xs text-muted-foreground">
              Enter the barcode manually below to continue.
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
                Starting camera…
              </div>
            )}
          </>
        )}
      </div>

      {/* Manual fallback — primary path */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          Enter barcode manually
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
            Add
          </Button>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
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
}: {
  product: Product;
  currency: string;
  onAdd: (p: Product) => void;
}) {
  const outOfStock = product.stock <= 0;
  return (
    <motion.button
      type="button"
      whileHover={outOfStock ? undefined : { y: -2 }}
      whileTap={outOfStock ? undefined : { scale: 0.97 }}
      disabled={outOfStock}
      onClick={() => {
        if (outOfStock) {
          toast.error("Out of stock", { description: product.name });
          return;
        }
        onAdd(product);
      }}
      className={cn(
        "group text-left",
        outOfStock && "cursor-not-allowed opacity-50 grayscale"
      )}
    >
      <Card
        className={cn(
          "h-full gap-0 overflow-hidden p-0 transition-colors",
          outOfStock
            ? "bg-muted/40"
            : "group-hover:border-primary/40 group-hover:bg-accent/50"
        )}
      >
        <div
          className="flex h-20 items-center justify-center text-xl font-bold"
          style={{ backgroundColor: colorFromString(product.name) }}
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white/70 text-sm font-bold text-foreground/80 backdrop-blur">
            {initialsOf(product.name)}
          </span>
        </div>
        <div className="space-y-1.5 p-2.5">
          <p className="line-clamp-2 text-xs font-medium leading-snug text-foreground min-h-[2rem]">
            {product.name}
          </p>
          <div className="flex items-center justify-between gap-1">
            <span className="text-sm font-bold text-primary">
              {formatMoney(product.price, currency)}
            </span>
            {stockBadge(product.stock)}
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
}: {
  item: { product: Product; quantity: number };
  currency: string;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}) {
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
          </p>
          <p className="text-xs text-muted-foreground">
            {formatMoney(item.product.price, currency)} each
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
            <span className="w-7 text-center text-xs font-medium tabular-nums">
              {item.quantity}
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
  const addByBarcode = useCartStore((s) => s.addByBarcode);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const setDiscount = useCartStore((s) => s.setDiscount);
  const setPaymentMethod = useCartStore((s) => s.setPaymentMethod);

  const [scanInput, setScanInput] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

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
      toast.success(`${p?.name ?? "Product"} added`);
      setScanInput("");
      return;
    }
    // Try name match (case-insensitive, exact or contains)
    const byName = products.find(
      (p) => p.name.toLowerCase() === code.toLowerCase()
    );
    if (byName) {
      addProduct(byName);
      toast.success(`${byName.name} added`);
      setScanInput("");
      return;
    }
    // Partial name match
    const partial = products.find((p) =>
      p.name.toLowerCase().includes(code.toLowerCase())
    );
    if (partial) {
      addProduct(partial);
      toast.success(`${partial.name} added`);
      setScanInput("");
      return;
    }
    toast.error("Product not found", {
      description: `No product matches "${code}"`,
    });
  };

  const handleCameraScan = (code: string) => {
    const added = addByBarcode(code, products);
    if (added) {
      const p = products.find(
        (x) => x.barcode.toLowerCase() === code.toLowerCase()
      );
      toast.success(`${p?.name ?? "Product"} added`);
    } else {
      // Try name match from camera input too
      const byName = products.find((p) =>
        p.name.toLowerCase().includes(code.toLowerCase())
      );
      if (byName) {
        addProduct(byName);
        toast.success(`${byName.name} added`);
      } else {
        toast.error("Product not found", {
          description: `No product matches "${code}"`,
        });
      }
    }
  };

  const handleAddProduct = (p: Product) => {
    if (p.stock <= 0) {
      toast.error("Out of stock", { description: p.name });
      return;
    }
    // Prevent adding more than stock
    const inCart = items.find((i) => i.product.id === p.id)?.quantity ?? 0;
    if (inCart >= p.stock) {
      toast.error("Stock limit reached", {
        description: `Only ${p.stock} of ${p.name} available`,
      });
      return;
    }
    addProduct(p);
    toast.success(`${p.name} added`, { duration: 1200 });
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
                value={scanInput}
                onChange={(e) => {
                  setScanInput(e.target.value);
                  setSearchTerm(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleScanSubmit();
                }}
                placeholder="Scan or search product / barcode…"
                className="pl-9"
                aria-label="Scan or search product"
              />
              {scanInput && (
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
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setScannerOpen(true)}
                className="shrink-0"
              >
                <Camera className="h-4 w-4" />
                Scan
              </Button>
              <Button
                onClick={handleScanSubmit}
                disabled={!scanInput.trim()}
                className="shrink-0"
              >
                <Plus className="h-4 w-4" />
                Add
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
              <p className="text-sm font-medium">No products found</p>
              <p className="text-xs text-muted-foreground">
                Try a different barcode, name, or category.
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
              />
            ))}
          </div>
        )}
      </div>

      {/* ---------------- Right column: cart ---------------- */}
      <div className="w-full lg:w-[380px] lg:shrink-0">
        <Card className="sticky top-0 flex flex-col gap-0 overflow-hidden p-0 lg:top-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Current Order</h2>
              {totalItems > 0 && (
                <Badge className="ml-1 h-5 min-w-5 justify-center px-1.5 text-[11px]">
                  {totalItems}
                </Badge>
              )}
            </div>
            {items.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => setClearConfirmOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>

          {/* Cart items */}
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-accent text-muted-foreground">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium">Cart is empty</p>
                <p className="text-xs text-muted-foreground">
                  Scan or tap products to add
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
                      if (item.quantity >= item.product.stock) {
                        toast.error("Stock limit reached", {
                          description: `Only ${item.product.stock} of ${item.product.name} available`,
                        });
                        return;
                      }
                      updateQuantity(item.product.id, item.quantity + 1);
                    }}
                    onDecrement={() =>
                      updateQuantity(item.product.id, item.quantity - 1)
                    }
                    onRemove={() => removeItem(item.product.id)}
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
                  <span>Subtotal</span>
                  <span className="tabular-nums">
                    {formatMoney(subtotal, currency)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Discount</span>
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
                    <span>Tax ({taxRate}%)</span>
                    <span className="tabular-nums">
                      {formatMoney(taxAmount, currency)}
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold">Grand Total</span>
                <span className="text-xl font-bold text-primary tabular-nums">
                  {formatMoney(grandTotal, currency)}
                </span>
              </div>

              {/* Payment method */}
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((m) => {
                  const Icon = m.icon;
                  const active = paymentMethod === m.key;
                  return (
                    <Button
                      key={m.key}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "outline"}
                      onClick={() => setPaymentMethod(m.key)}
                      className={cn(
                        "flex flex-col gap-0.5 h-auto py-2",
                        active && "shadow-sm"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-[11px]">{m.label}</span>
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
                Checkout · {formatMoney(grandTotal, currency)}
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

      {/* Checkout dialog */}
      <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} />

      {/* Clear cart confirm */}
      <AlertDialog
        open={clearConfirmOpen}
        onOpenChange={setClearConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear cart?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all {totalItems} item{totalItems === 1 ? "" : "s"}{" "}
              from the current order. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                clearCart();
                setClearConfirmOpen(false);
                toast.success("Cart cleared");
              }}
            >
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
