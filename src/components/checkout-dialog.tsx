"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  CheckCircle2,
  FileText,
  Loader2,
  Printer,
  RotateCcw,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";

import {
  salesApi,
  shopApi,
  customersApi,
  type CreateSalePayload,
} from "@/lib/api";
import { useCartStore } from "@/lib/cart-store";
import { useLanguage } from "@/lib/language-context";
import { formatMoney } from "@/lib/format";
import { paymentLabelKey } from "@/lib/payment";
import { triggerCashDrawerKick } from "@/lib/scan-feedback";
import { printReceiptElement } from "@/lib/print";
import { cn } from "@/lib/utils";
import type { Sale } from "@/lib/types";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "@/components/receipt";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DialogStage = "review" | "receipt";

export function CheckoutDialog({ open, onOpenChange }: CheckoutDialogProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<DialogStage>("review");
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [customerId, setCustomerId] = useState<string>("none");
  const [redeemPoints, setRedeemPoints] = useState(0);

  // Cart store slices
  const items = useCartStore((s) => s.items);
  const discount = useCartStore((s) => s.discount);
  const paymentMethod = useCartStore((s) => s.paymentMethod);
  const clearCart = useCartStore((s) => s.clearCart);

  const { data: shop } = useQuery({
    queryKey: ["shop"],
    queryFn: shopApi.get,
  });

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: customersApi.list,
    enabled: open && stage === "review",
  });

  const selectedCustomer = useMemo(
    () => customers?.find((c) => c.id === customerId) ?? null,
    [customers, customerId]
  );

  const currency = shop?.currency || "دج";
  const taxRate = shop?.taxRate ?? 0;
  const pointValue = shop ? 1 : 1; // loyaltyPointValue — placeholder kept simple (1 DZD/point)

  const subtotal = items.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0
  );
  const pointsDiscount = Math.min(
    redeemPoints * pointValue,
    selectedCustomer ? selectedCustomer.loyaltyPoints * pointValue : 0,
    subtotal - discount > 0 ? subtotal - discount : 0
  );
  const effectiveDiscount = Math.min(discount + pointsDiscount, subtotal);
  const taxableAmount = Math.max(0, subtotal - effectiveDiscount);
  const taxAmount = (taxableAmount * taxRate) / 100;
  const grandTotal = taxableAmount + taxAmount;
  const isCredit = paymentMethod === "CREDIT";
  const creditBlocked = isCredit && !selectedCustomer;
  const expectedPoints =
    selectedCustomer && !isCredit && shop?.loyaltyEnabled !== false
      ? Math.floor(grandTotal / (shop?.loyaltyEarnRate ?? 100))
      : 0;

  const ripNumber = shop?.ripNumber?.trim() ?? "";
  const showRipQR = paymentMethod === "BARIDIMOB" && ripNumber.length > 0;
  // BaridiMob has no universal deep-link scheme; a plain-text QR with the RIP
  // and beneficiary is readable by any camera app / BaridiMob scanner.
  const ripQrData = showRipQR
    ? `RIP: ${ripNumber}\nBeneficiary: ${shop?.name || "Store"}\nAmount: ${grandTotal.toFixed(2)} DZD`
    : "";

  const createSale = useMutation({
    mutationFn: (payload: CreateSalePayload) => salesApi.create(payload),
    onSuccess: (sale) => {
      setCompletedSale(sale);
      setStage("receipt");
      toast.success(t("saleCompleted"), {
        description: `${t("receipt")} ${sale.receiptNo}`,
      });
      // Keep a local copy of sale for the receipt, then clear cart store
      clearCart();
      if (paymentMethod === "Cash") {
        void triggerCashDrawerKick();
      }
      // Invalidate stats + sales lists + customers (loyalty balance changed)
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["salesStats"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : t("failedCompleteSale");
      toast.error(t("couldNotCompleteSale"), { description: message });
    },
  });

  const handleComplete = () => {
    if (items.length === 0) return;
    if (isCredit && !selectedCustomer) {
      toast.error(t("creditRequiresCustomer"));
      return;
    }
    const payload: CreateSalePayload = {
      items: items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
      })),
      discount,
      paymentMethod,
      customerId: selectedCustomer ? selectedCustomer.id : null,
      redeemPoints: pointsDiscount > 0 ? redeemPoints : 0,
    };
    createSale.mutate(payload);
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      // Closing the dialog
      onOpenChange(false);
      // Reset stage after close animation
      setTimeout(() => {
        setStage("review");
        setCompletedSale(null);
        setCustomerId("none");
        setRedeemPoints(0);
      }, 200);
    }
  };

  const [printFormat, setPrintFormat] = useState<"80mm" | "58mm" | "a4">("80mm");
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleNewOrder = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStage("review");
      setCompletedSale(null);
      setCustomerId("none");
      setRedeemPoints(0);
      setPrintFormat("80mm");
    }, 200);
  };

  const handlePrint = () => {
    if (!completedSale) return;
    printReceiptElement(receiptRef.current, {
      format: printFormat,
      title: `فاتورة-${completedSale.receiptNo}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn("transition-all duration-200", stage === "receipt" && printFormat === "a4" ? "sm:max-w-3xl" : "sm:max-w-lg")}>
        {stage === "receipt" && completedSale && shop ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                {t("paymentSuccessful")}
              </DialogTitle>
              <DialogDescription>
                {t("receipt")} {completedSale.receiptNo} ·{" "}
                {formatMoney(completedSale.total, currency)} · {" "}
                {t(paymentLabelKey(completedSale.paymentMethod))}
              </DialogDescription>
            </DialogHeader>

            {/* Print format selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border bg-muted/40 p-2">
              <span className="text-xs font-medium text-muted-foreground">
                تنسيق الطباعة والمعاينة:
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPrintFormat("80mm")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
                    printFormat === "80mm"
                      ? "bg-background text-foreground shadow-sm font-bold border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Printer className="h-3.5 w-3.5" />
                  إيصال حراري (80mm)
                </button>
                <button
                  type="button"
                  onClick={() => setPrintFormat("a4")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
                    printFormat === "a4"
                      ? "bg-background text-foreground shadow-sm font-bold border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileText className="h-3.5 w-3.5" />
                  فاتورة A4 (طابعة عادية)
                </button>
              </div>
            </div>

            {/* Receipt preview */}
            <div className="max-h-[60vh] overflow-y-auto scrollbar-emerald rounded-md border bg-muted/20 p-2 sm:p-4">
              <Receipt ref={receiptRef} shop={shop} sale={completedSale} size={printFormat} />
            </div>

            <DialogFooter className="no-print gap-2 sm:justify-between">
              <Button variant="outline" onClick={handleNewOrder}>
                <RotateCcw className="h-4 w-4" />
                {t("newOrder")}
              </Button>
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                <span>
                  {printFormat === "a4" ? "طباعة فاتورة A4" : t("printReceipt")}
                </span>
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                {t("checkout")}
              </DialogTitle>
              <DialogDescription>
                {t("reviewOrder")}
              </DialogDescription>
            </DialogHeader>

            {/* Order summary */}
            <div className="space-y-3">
              <div className="max-h-[32vh] overflow-y-auto scrollbar-emerald rounded-md border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2 font-medium">{t("product")}</th>
                      <th className="px-2 py-2 text-center font-medium">{t("qty")}</th>
                      <th className="px-3 py-2 text-right font-medium">
                        {t("amount")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i) => (
                      <tr
                        key={i.product.id}
                        className="border-t text-foreground"
                      >
                        <td className="px-3 py-2">
                          <p className="truncate text-sm font-medium leading-tight">
                            {i.product.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatMoney(i.product.price, currency)} {t("each")}
                          </p>
                        </td>
                        <td className="px-2 py-2 text-center text-sm tabular-nums">
                          x{i.quantity}
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-medium tabular-nums">
                          {formatMoney(i.product.price * i.quantity, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* BaridiMob RIP QR */}
              {showRipQR && (
                <div className="flex flex-col items-center gap-2 rounded-lg border bg-accent/30 p-4">
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <QRCodeSVG
                      value={ripQrData}
                      size={144}
                      level="M"
                      marginSize={1}
                      fgColor="#0f172a"
                      bgColor="#ffffff"
                    />
                  </div>
                  <p className="text-center text-sm font-medium">
                    {t("scanToPay")}{" "}
                    <span className="text-primary">
                      {formatMoney(grandTotal, currency)}
                    </span>
                  </p>
                  <p className="text-center text-[11px] text-muted-foreground">
                    {t("baridimob")} — RIP: {ripNumber}
                  </p>
                </div>
              )}

              {/* Customer selection */}
              <div className="space-y-2 rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {t("selectCustomer")}
                  </span>
                </div>
                <Select
                  value={customerId}
                  onValueChange={(v) => {
                    setCustomerId(v);
                    setRedeemPoints(0);
                  }}
                >
                  <SelectTrigger dir="auto" className="w-full">
                    <SelectValue placeholder={t("walkInCustomer")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("walkInCustomer")}</SelectItem>
                    {(customers ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.phone ? ` — ${c.phone}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedCustomer && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge
                      variant="outline"
                      className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600"
                    >
                      <Star className="h-3 w-3" />
                      {selectedCustomer.loyaltyPoints} {t("pointsAvailable")}
                    </Badge>
                    {selectedCustomer.creditOutstanding > 0 && (
                      <Badge
                        variant="outline"
                        className="border-destructive/30 bg-destructive/10 text-destructive"
                      >
                        {t("creditOutstanding")}:{" "}
                        {formatMoney(selectedCustomer.creditOutstanding, currency)}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Points redemption */}
                {selectedCustomer &&
                  !isCredit &&
                  selectedCustomer.loyaltyPoints > 0 &&
                  shop?.loyaltyEnabled !== false && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {t("redeemPoints")}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          −{formatMoney(pointsDiscount, currency)}
                        </span>
                      </div>
                      <Input
                        dir="ltr"
                        type="number"
                        min={0}
                        max={selectedCustomer.loyaltyPoints}
                        value={redeemPoints || ""}
                        onChange={(e) =>
                          setRedeemPoints(
                            Math.max(
                              0,
                              Math.min(
                                Math.floor(Number(e.target.value) || 0),
                                selectedCustomer.loyaltyPoints
                              )
                            )
                          )
                        }
                        placeholder="0"
                        className="h-8 text-sm"
                      />
                    </div>
                  )}

                {expectedPoints > 0 && (
                  <p className="text-[11px] text-emerald-600">
                    ★ +{expectedPoints} {t("pointsWillEarn")}
                  </p>
                )}

                {creditBlocked && (
                  <p className="text-[11px] font-medium text-destructive">
                    {t("creditRequiresCustomer")}
                  </p>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-1.5 rounded-lg border bg-card p-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("subtotal")}</span>
                  <span className="tabular-nums">
                    {formatMoney(subtotal, currency)}
                  </span>
                </div>
                {effectiveDiscount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("discount")}</span>
                    <span className="tabular-nums">
                      − {formatMoney(effectiveDiscount, currency)}
                    </span>
                  </div>
                )}
                {taxRate > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("tax")} ({taxRate}%)</span>
                    <span className="tabular-nums">
                      {formatMoney(taxAmount, currency)}
                    </span>
                  </div>
                )}
                <Separator className="my-1.5" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{t("grandTotal")}</span>
                  <span className="text-xl font-bold text-primary tabular-nums">
                    {formatMoney(grandTotal, currency)}
                  </span>
                </div>
              </div>

              {/* Payment summary */}
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                <span className="text-muted-foreground">{t("paymentMethod")}</span>
                <Badge variant="secondary">{t(paymentLabelKey(paymentMethod))}</Badge>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createSale.isPending}
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={handleComplete}
                disabled={
                  createSale.isPending || items.length === 0 || creditBlocked
                }
                className="min-w-[160px]"
              >
                {createSale.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("completing")}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    {t("completeSale")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
