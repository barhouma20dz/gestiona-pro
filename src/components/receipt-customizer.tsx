"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Printer, RotateCcw, Save, Receipt as ReceiptIcon } from "lucide-react";
import { toast } from "sonner";

import { shopApi } from "@/lib/api";
import type { ReceiptConfig, Sale, Shop } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Receipt } from "@/components/receipt";

const DEFAULT_CFG: Required<Pick<ReceiptConfig, "paperSize" | "fontDensity">> = {
  paperSize: "80mm",
  fontDensity: "normal",
};

/** Sample sale so the live preview always renders a realistic receipt. */
const SAMPLE_SALE: Sale = {
  id: "preview-sale",
  receiptNo: "INV-PREVIEW-0001",
  subtotal: 1250,
  taxAmount: 0,
  discount: 50,
  total: 1200,
  paymentMethod: "Cash",
  itemCount: 3,
  createdAt: new Date().toISOString(),
  items: [
    {
      id: "i1",
      saleId: "preview-sale",
      productId: "p1",
      productName: "حليب تريبلان 1 لتر",
      unitPrice: 120,
      quantity: 2,
      total: 240,
    },
    {
      id: "i2",
      saleId: "preview-sale",
      productId: "p2",
      productName: "خبز كامل (كغ)",
      unitPrice: 200,
      quantity: 1.5,
      total: 300,
    },
    {
      id: "i3",
      saleId: "preview-sale",
      productId: "p3",
      productName: "زيت المائدة 5 لتر",
      unitPrice: 710,
      quantity: 1,
      total: 710,
    },
  ],
};

const PAPER_WIDTHS: Record<string, string> = {
  "80mm": "w-[320px] max-w-full",
  "58mm": "w-[240px] max-w-full",
  a4: "w-[420px] max-w-full",
};

interface ReceiptCustomizerProps {
  shop: Shop;
}

/**
 * Complete starting config: shop's own fields as base + saved overrides.
 * Guarantees the form shows real values and saving persists a full config
 * (not just the one key the user touched).
 */
function buildInitialConfig(shop: Shop): ReceiptConfig {
  return {
    headerTitle: shop.parsedReceiptConfig?.headerTitle ?? shop.name ?? "",
    addressLine1: shop.parsedReceiptConfig?.addressLine1 ?? shop.addressLine1 ?? "",
    addressLine2: shop.parsedReceiptConfig?.addressLine2 ?? shop.addressLine2 ?? "",
    phoneNumber: shop.parsedReceiptConfig?.phoneNumber ?? shop.phoneNumber ?? "",
    footerText: shop.parsedReceiptConfig?.footerText ?? shop.footerText ?? "",
    paperSize: shop.parsedReceiptConfig?.paperSize ?? "80mm",
    fontDensity: shop.parsedReceiptConfig?.fontDensity ?? "normal",
    showQr: shop.parsedReceiptConfig?.showQr ?? true,
    showUnitPrice: shop.parsedReceiptConfig?.showUnitPrice ?? true,
    showSubtotal: shop.parsedReceiptConfig?.showSubtotal ?? true,
    showPaymentMethod: shop.parsedReceiptConfig?.showPaymentMethod ?? true,
    showItemCount: shop.parsedReceiptConfig?.showItemCount ?? true,
    showDate: shop.parsedReceiptConfig?.showDate ?? true,
    showReceiptNo: shop.parsedReceiptConfig?.showReceiptNo ?? true,
    showBranding: shop.parsedReceiptConfig?.showBranding ?? true,
  };
}

/**
 * شاشة تخصيص الإيصال المطبوع — تُحفظ في Store.receiptConfig (JSON)
 * وتقرأها مكوّنات الطباعة (receipt.tsx) عبر shop.parsedReceiptConfig.
 * المعاينة الحية تستخدم نفس مكوّن الطباعة الفعلي مع configOverride.
 */
export function ReceiptCustomizer({ shop }: ReceiptCustomizerProps) {
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<ReceiptConfig>(() =>
    buildInitialConfig(shop)
  );

  const set = <K extends keyof ReceiptConfig>(key: K, value: ReceiptConfig[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const isDirty = JSON.stringify(draft) !== JSON.stringify(buildInitialConfig(shop));

  const saveMutation = useMutation({
    mutationFn: () =>
      shopApi.update({ receiptConfig: JSON.stringify(draft) }),
    onSuccess: () => {
      toast.success("تم حفظ إعدادات الإيصال بنجاح");
      void queryClient.invalidateQueries({ queryKey: ["shop"] });
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "تعذر حفظ إعدادات الإيصال"
      );
    },
  });

  const handleReset = () => {
    setDraft(buildInitialConfig(shop));
  };

  const handlePrintPreview = () => {
    window.setTimeout(() => window.print(), 50);
  };

  const paperSize = draft.paperSize ?? DEFAULT_CFG.paperSize;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ReceiptIcon className="h-5 w-5 text-emerald-500" />
            <div>
              <CardTitle className="text-lg">تخصيص الإيصال المطبوع</CardTitle>
              <CardDescription>
                تحكم كامل في شكل الفاتورة الحرارية: الترويسة، الأبعاد، الكثافة،
                وعناصر العرض — مع معاينة حية مطابقة للطباعة الفعلية
              </CardDescription>
            </div>
          </div>
          {isDirty && (
            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
              تغييرات غير محفوظة
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8">
          {/* ── Form column ── */}
          <div className="space-y-5">
            {/* Paper size + density */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">مقاس الورق</Label>
                <Select
                  value={paperSize}
                  onValueChange={(v) =>
                    set("paperSize", v as ReceiptConfig["paperSize"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر المقاس" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="80mm">حراري 80مم (الأكثر شيوعاً)</SelectItem>
                    <SelectItem value="58mm">حراري 58مم (محل صغير)</SelectItem>
                    <SelectItem value="a4">ورق A4 (فاتورة كاملة)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">كثافة الخط</Label>
                <Select
                  value={draft.fontDensity ?? DEFAULT_CFG.fontDensity}
                  onValueChange={(v) =>
                    set("fontDensity", v as ReceiptConfig["fontDensity"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر الكثافة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">عادي</SelectItem>
                    <SelectItem value="compact">مضغوط (سطور أكثر)</SelectItem>
                    <SelectItem value="spacious">متباعد (أوضح للقراءة)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Header texts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">عنوان الترويسة</Label>
                <Input
                  value={draft.headerTitle ?? ""}
                  onChange={(e) => set("headerTitle", e.target.value)}
                  placeholder={shop.name}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">رقم الهاتف</Label>
                <Input
                  value={draft.phoneNumber ?? ""}
                  onChange={(e) => set("phoneNumber", e.target.value)}
                  placeholder={shop.phoneNumber || "0X XX XX XX XX"}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">سطر العنوان 1</Label>
                <Input
                  value={draft.addressLine1 ?? ""}
                  onChange={(e) => set("addressLine1", e.target.value)}
                  placeholder={shop.addressLine1 || "الشارع، الحي"}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">سطر العنوان 2</Label>
                <Input
                  value={draft.addressLine2 ?? ""}
                  onChange={(e) => set("addressLine2", e.target.value)}
                  placeholder={shop.addressLine2 || "المدينة، الولاية"}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">رسالة الختام (أسفل الإيصال)</Label>
              <Input
                value={draft.footerText ?? ""}
                onChange={(e) => set("footerText", e.target.value)}
                placeholder="شكراً لزيارتكم – نتشرف بخدمتكم دائماً"
              />
            </div>

            <Separator />

            {/* Visibility toggles */}
            <div>
              <Label className="text-sm font-semibold">عناصر العرض</Label>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                <ToggleRow
                  label="رمز QR للمسح"
                  checked={draft.showQr ?? true}
                  onChange={(v) => set("showQr", v)}
                />
                <ToggleRow
                  label="سعر الوحدة"
                  checked={draft.showUnitPrice ?? true}
                  onChange={(v) => set("showUnitPrice", v)}
                />
                <ToggleRow
                  label="المجموع الفرعي"
                  checked={draft.showSubtotal ?? true}
                  onChange={(v) => set("showSubtotal", v)}
                />
                <ToggleRow
                  label="طريقة الدفع"
                  checked={draft.showPaymentMethod ?? true}
                  onChange={(v) => set("showPaymentMethod", v)}
                />
                <ToggleRow
                  label="عدد القطع"
                  checked={draft.showItemCount ?? true}
                  onChange={(v) => set("showItemCount", v)}
                />
                <ToggleRow
                  label="التاريخ والوقت"
                  checked={draft.showDate ?? true}
                  onChange={(v) => set("showDate", v)}
                />
                <ToggleRow
                  label="رقم الفاتورة"
                  checked={draft.showReceiptNo ?? true}
                  onChange={(v) => set("showReceiptNo", v)}
                />
                <ToggleRow
                  label="توقيع النظام (Branding)"
                  checked={draft.showBranding ?? true}
                  onChange={(v) => set("showBranding", v)}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !isDirty}
                className="gap-1.5"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                حفظ الإعدادات
              </Button>
              <Button variant="outline" onClick={handleReset} className="gap-1.5">
                <RotateCcw className="h-4 w-4" />
                استعادة الافتراضي
              </Button>
              <Button
                variant="ghost"
                onClick={handlePrintPreview}
                className="gap-1.5"
              >
                <Printer className="h-4 w-4" />
                تجربة الطباعة
              </Button>
            </div>
          </div>

          {/* ── Live preview column ── */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 self-start">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                معاينة حية
              </span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                {paperSize === "a4" ? "A4" : paperSize}
              </span>
            </div>
            <div className="rounded-xl border-2 border-dashed border-border/70 bg-muted/30 p-4 overflow-auto max-w-full flex justify-center">
              <div className={`${PAPER_WIDTHS[paperSize] ?? PAPER_WIDTHS["80mm"]} origin-top`}>
                <Receipt
                  shop={shop}
                  sale={SAMPLE_SALE}
                  configOverride={draft}
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground text-center max-w-[340px]">
              المعاينة تستخدم مكوّن الطباعة الفعلي نفسه — ما تراه هنا هو ما سيخرج
              من الطابعة بعد الحفظ.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label className="text-sm font-normal cursor-pointer">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
