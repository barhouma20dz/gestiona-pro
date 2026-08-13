"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Loader2,
  Printer,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

import { salesApi, shopApi, type CreateSalePayload } from "@/lib/api";
import { useCartStore } from "@/lib/cart-store";
import { useLanguage } from "@/lib/language-context";
import { formatMoney } from "@/lib/format";
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

  // Cart store slices
  const items = useCartStore((s) => s.items);
  const discount = useCartStore((s) => s.discount);
  const paymentMethod = useCartStore((s) => s.paymentMethod);
  const clearCart = useCartStore((s) => s.clearCart);

  const { data: shop } = useQuery({
    queryKey: ["shop"],
    queryFn: shopApi.get,
  });

  const currency = shop?.currency || "₹";
  const taxRate = shop?.taxRate ?? 0;

  const subtotal = items.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0
  );
  const taxableAmount = Math.max(0, subtotal - discount);
  const taxAmount = (taxableAmount * taxRate) / 100;
  const grandTotal = taxableAmount + taxAmount;

  const upiId = shop?.upiId?.trim() ?? "";
  const showUpiQR = paymentMethod === "UPI" && upiId.length > 0;
  const upiQrData = showUpiQR
    ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(
        shop?.name || "Store"
      )}&am=${grandTotal.toFixed(2)}&cu=INR`
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
      // Invalidate stats + sales lists
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["salesStats"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : t("failedCompleteSale");
      toast.error(t("couldNotCompleteSale"), { description: message });
    },
  });

  const handleComplete = () => {
    if (items.length === 0) return;
    const payload: CreateSalePayload = {
      items: items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
      })),
      discount,
      paymentMethod,
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
      }, 200);
    }
  };

  const handleNewOrder = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStage("review");
      setCompletedSale(null);
    }, 200);
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        {stage === "receipt" && completedSale && shop ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                {t("paymentSuccessful")}
              </DialogTitle>
              <DialogDescription>
                {t("receipt")} {completedSale.receiptNo} ·{" "}
                {formatMoney(completedSale.total, currency)} · {completedSale.paymentMethod}
              </DialogDescription>
            </DialogHeader>

            {/* Receipt preview */}
            <div className="max-h-[60vh] overflow-y-auto scrollbar-emerald rounded-md border bg-muted/30 p-2">
              <Receipt shop={shop} sale={completedSale} />
            </div>

            <DialogFooter className="no-print gap-2 sm:justify-between">
              <Button variant="outline" onClick={handleNewOrder}>
                <RotateCcw className="h-4 w-4" />
                {t("newOrder")}
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="h-4 w-4" />
                {t("printReceipt")}
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

              {/* UPI QR */}
              {showUpiQR && (
                <div className="flex flex-col items-center gap-2 rounded-lg border bg-accent/30 p-4">
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <QRCodeSVG
                      value={upiQrData}
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
                    {t("upi")}: {upiId}
                  </p>
                </div>
              )}

              {/* Totals */}
              <div className="space-y-1.5 rounded-lg border bg-card p-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("subtotal")}</span>
                  <span className="tabular-nums">
                    {formatMoney(subtotal, currency)}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t("discount")}</span>
                    <span className="tabular-nums">
                      − {formatMoney(discount, currency)}
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
                <Badge variant="secondary">{paymentMethod}</Badge>
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
                disabled={createSale.isPending || items.length === 0}
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
