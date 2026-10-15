"use client";

import { useMemo, useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Loader2,
  Save,
  Store,
  Info,
  Receipt as ReceiptIcon,
  Printer,
  Sparkles,
  Sliders,
  CheckCircle2,
  QrCode,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";

import { shopApi } from "@/lib/api";
import { formatMoney, initialsOf } from "@/lib/format";
import type { Shop, Sale, ReceiptConfig } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { printReceiptElement } from "@/lib/print";

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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Receipt } from "@/components/receipt";

const FOOTER_MAX = 120;
const CURRENCY_OPTIONS = ["دج", "$", "€", "£", "¥"];

interface FormState {
  name: string;
  addressLine1: string;
  addressLine2: string;
  phoneNumber: string;
  ripNumber: string;
  footerText: string;
  currency: string;
  taxRate: number;
  receiptConfig: ReceiptConfig;
}

const DEFAULT_RECEIPT_CONFIG: ReceiptConfig = {
  headerTitle: "INFO",
  addressLine1: "حي العقيد لطفي",
  addressLine2: "سعيدة",
  phoneNumber: "+213 555 12 34 56",
  paperSize: "80mm",
  showQr: true,
  qrText: "مسح إيصال QR",
  showUnitPrice: true,
  showSubtotal: true,
  showPaymentMethod: true,
  showItemCount: true,
  showDate: true,
  showReceiptNo: true,
  showBranding: true,
  footerText: "شكراً لزيارتكم – نتشرف بخدمتكم دائماً",
  fontDensity: "normal",
};

const EMPTY_FORM: FormState = {
  name: "",
  addressLine1: "",
  addressLine2: "",
  phoneNumber: "",
  ripNumber: "",
  footerText: "",
  currency: "دج",
  taxRate: 0,
  receiptConfig: DEFAULT_RECEIPT_CONFIG,
};

function toForm(shop: Shop): FormState {
  let cfg = DEFAULT_RECEIPT_CONFIG;
  if (shop.parsedReceiptConfig) {
    cfg = { ...DEFAULT_RECEIPT_CONFIG, ...shop.parsedReceiptConfig };
  } else if (shop.receiptConfig) {
    try {
      cfg = { ...DEFAULT_RECEIPT_CONFIG, ...JSON.parse(shop.receiptConfig) };
    } catch {
      // ignore
    }
  } else {
    cfg = {
      ...DEFAULT_RECEIPT_CONFIG,
      headerTitle: shop.name || "INFO",
      addressLine1: shop.addressLine1 || "حي العقيد لطفي",
      addressLine2: shop.addressLine2 || "سعيدة",
      phoneNumber: shop.phoneNumber || "+213 555 12 34 56",
      footerText: shop.footerText || "شكراً لزيارتكم – نتشرف بخدمتكم دائماً",
    };
  }

  return {
    name: shop.name ?? "",
    addressLine1: shop.addressLine1 ?? "",
    addressLine2: shop.addressLine2 ?? "",
    phoneNumber: shop.phoneNumber ?? "",
    ripNumber: shop.ripNumber ?? "",
    footerText: shop.footerText ?? "",
    currency: shop.currency || "دج",
    taxRate: shop.taxRate ?? 0,
    receiptConfig: cfg,
  };
}

export function ShopDetails() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: shop, isLoading } = useQuery({
    queryKey: ["shop"],
    queryFn: shopApi.get,
  });

  const [activeTab, setActiveTab] = useState<"profile" | "receipt">("receipt");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [syncedShopId, setSyncedShopId] = useState<string | null>(null);
  const receiptPreviewRef = useRef<HTMLDivElement>(null);

  if (shop && shop.id !== syncedShopId) {
    setSyncedShopId(shop.id);
    setForm(toForm(shop));
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateReceipt = <K extends keyof ReceiptConfig>(
    key: K,
    value: ReceiptConfig[K]
  ) =>
    setForm((prev) => ({
      ...prev,
      receiptConfig: { ...prev.receiptConfig, [key]: value },
    }));

  const mutation = useMutation({
    mutationFn: (data: Partial<Shop>) => shopApi.update(data),
    onSuccess: () => {
      toast.success("تم حفظ إعدادات المتجر وتخصيص الإيصال بنجاح!");
      void queryClient.invalidateQueries({ queryKey: ["shop"] });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : "تعذر حفظ إعدادات المتجر";
      toast.error(msg);
    },
  });

  const canSave =
    form.name.trim().length > 0 || form.receiptConfig.headerTitle?.trim();

  const handleSave = () => {
    const tax = Math.min(100, Math.max(0, Number(form.taxRate) || 0));
    mutation.mutate({
      name: form.name.trim() || form.receiptConfig.headerTitle || "متجر",
      addressLine1: form.addressLine1.trim(),
      addressLine2: form.addressLine2.trim(),
      phoneNumber: form.phoneNumber.trim(),
      ripNumber: form.ripNumber.trim(),
      footerText: form.receiptConfig.footerText || form.footerText,
      currency: form.currency || "دج",
      taxRate: tax,
      receiptConfig: JSON.stringify(form.receiptConfig),
    });
  };

  const handlePrintTest = () => {
    if (!receiptPreviewRef.current) return;
    printReceiptElement(receiptPreviewRef.current, {
      format: form.receiptConfig.paperSize || "80mm",
      title: `إيصال-تجريبي-${form.receiptConfig.headerTitle || "INFO"}`,
    });
    toast.info("تم إرسال الإيصال التجريبي إلى الطابعة.");
  };

  // Mock sale for live preview (identical to the user's uploaded sample)
  const previewSale: Sale = useMemo(
    () => ({
      id: "preview-sale-1",
      storeId: shop?.id || "preview-store",
      sellerId: null,
      customerId: null,
      receiptNo: "INV-20261015-0001",
      subtotal: 75.0,
      taxAmount: 0,
      discount: 0,
      total: 75.0,
      paymentMethod: "Cash",
      itemCount: 1,
      loyaltyPointsEarned: 0,
      loyaltyPointsRedeemed: 0,
      createdAt: new Date().toISOString(),
      items: [
        {
          id: "item-preview-1",
          saleId: "preview-sale-1",
          productId: "p1",
          productName: "بيض",
          quantity: 3,
          unitPrice: 25.0,
          total: 75.0,
        },
      ],
    }),
    [shop?.id]
  );

  if (isLoading || !shop) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-56" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <Skeleton className="h-[500px] w-full" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 p-6 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/20 text-3xl font-black backdrop-blur">
              {initialsOf(form.receiptConfig.headerTitle || shop?.name || "G")}
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight drop-shadow-sm">
                إعدادات المتجر وتخصيص الإيصال الحراري
              </h2>
              <p className="mt-0.5 text-xs sm:text-sm text-emerald-100/90">
                تحكم كامل في مظهر الفاتورة والإيصال الحراري (80mm / 58mm) مع معاينة فورية ومطابقة تامة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrintTest}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs font-bold"
            >
              <Printer className="h-4 w-4 ml-1.5" />
              طباعة إيصال تجريبي
            </Button>
            <Button
              onClick={handleSave}
              disabled={!canSave || mutation.isPending}
              className="bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold shadow-md"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 ml-1.5 animate-spin" />
              ) : (
                <Save className="h-4 w-4 ml-1.5" />
              )}
              حفظ التعديلات
            </Button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mt-6 flex border-b border-white/15">
          <button
            type="button"
            onClick={() => setActiveTab("receipt")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-bold transition-all",
              activeTab === "receipt"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-emerald-100/70 hover:text-white"
            )}
          >
            <ReceiptIcon className="h-4 w-4" />
            تخصيص الإيصال والطباعة (Receipt Template)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-bold transition-all",
              activeTab === "profile"
                ? "border-amber-400 text-amber-300"
                : "border-transparent text-emerald-100/70 hover:text-white"
            )}
          >
            <Store className="h-4 w-4" />
            بيانات المحل والضريبة
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left: Controls and Settings */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "receipt" ? (
            <div className="space-y-6">
              {/* Paper Format & Header Card */}
              <Card className="border shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-emerald-600" />
                    ترويسة الإيصال ومقاس الورق
                  </CardTitle>
                  <CardDescription className="text-xs">
                    خصص النص الذي يظهر في أعلى الفاتورة ونوع الطابعة المستخدمة
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Paper size buttons */}
                  <div>
                    <Label className="text-xs font-bold mb-1.5 block">
                      نوع ومقاس ورق الطباعة:
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "80mm", name: "80 مم حراري", desc: "طابعات الكاشير القياسية (موصى به)" },
                        { id: "58mm", name: "58 مم مصغر", desc: "طابعات الجيب والبلوتوث المحمولة" },
                        { id: "a4", name: "A4 ليزر مكتبي", desc: "فواتير تجارية كاملة (Canon/HP)" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => updateReceipt("paperSize", item.id as any)}
                          className={cn(
                            "flex flex-col items-start p-2.5 rounded-xl border text-right transition-all",
                            form.receiptConfig.paperSize === item.id
                              ? "border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold ring-2 ring-emerald-500/30"
                              : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                          )}
                        >
                          <span className="text-xs">{item.name}</span>
                          <span className="text-[10px] text-gray-500 font-normal mt-0.5">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 pt-1">
                    <Field label="عنوان الترويسة الرئيسي (Header Title)">
                      <Input
                        value={form.receiptConfig.headerTitle ?? ""}
                        onChange={(e) => updateReceipt("headerTitle", e.target.value)}
                        placeholder="INFO أو اسم المحل"
                        className="font-bold font-mono"
                      />
                    </Field>

                    <Field label="رقم الهاتف في الإيصال">
                      <Input
                        value={form.receiptConfig.phoneNumber ?? ""}
                        onChange={(e) => updateReceipt("phoneNumber", e.target.value)}
                        placeholder="+213 555 12 34 56"
                        dir="ltr"
                        className="text-right font-bold"
                      />
                    </Field>

                    <Field label="سطر العنوان الأول">
                      <Input
                        value={form.receiptConfig.addressLine1 ?? ""}
                        onChange={(e) => updateReceipt("addressLine1", e.target.value)}
                        placeholder="مثال: حي العقيد لطفي"
                      />
                    </Field>

                    <Field label="سطر العنوان الثاني / المدينة">
                      <Input
                        value={form.receiptConfig.addressLine2 ?? ""}
                        onChange={(e) => updateReceipt("addressLine2", e.target.value)}
                        placeholder="مثال: سعيدة"
                      />
                    </Field>
                  </div>
                </CardContent>
              </Card>

              {/* Elements Visibility Switches */}
              <Card className="border shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    عناصر وحقول الإيصال
                  </CardTitle>
                  <CardDescription className="text-xs">
                    حدد التفاصيل التي ترغب في طباعتها أو إخفائها لتوفير الورق وسرعة الطباعة
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SwitchItem
                      title="سعر الوحدة (@ 25,00 دج)"
                      desc="عرض سعر القطعة الفردي تحت اسم الصنف"
                      checked={form.receiptConfig.showUnitPrice ?? true}
                      onCheckedChange={(v) => updateReceipt("showUnitPrice", v)}
                    />

                    <SwitchItem
                      title="المجموع الفرعي"
                      desc="عرض سطر المجموع الفرعي قبل الإجمالي"
                      checked={form.receiptConfig.showSubtotal ?? true}
                      onCheckedChange={(v) => updateReceipt("showSubtotal", v)}
                    />

                    <SwitchItem
                      title="طريقة الدفع (نقداً / بطاقة)"
                      desc="طباعة نوع وسيلة الدفع المستخدمة"
                      checked={form.receiptConfig.showPaymentMethod ?? true}
                      onCheckedChange={(v) => updateReceipt("showPaymentMethod", v)}
                    />

                    <SwitchItem
                      title="عدد العناصر الكلي"
                      desc="إظهار عدد السلع المشتراة"
                      checked={form.receiptConfig.showItemCount ?? true}
                      onCheckedChange={(v) => updateReceipt("showItemCount", v)}
                    />

                    <SwitchItem
                      title="رقم الإيصال (INV-…)"
                      desc="طباعة المعرف الفرعي للعملية"
                      checked={form.receiptConfig.showReceiptNo ?? true}
                      onCheckedChange={(v) => updateReceipt("showReceiptNo", v)}
                    />

                    <SwitchItem
                      title="التاريخ والوقت"
                      desc="طباعة وقت وتاريخ إتمام المعاملة"
                      checked={form.receiptConfig.showDate ?? true}
                      onCheckedChange={(v) => updateReceipt("showDate", v)}
                    />
                  </div>

                  <div className="border-t pt-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <SwitchItem
                        title="رمز الاستجابة السريعة (QR Code)"
                        desc="طباعة QR للتحقق والبحث السريع"
                        checked={form.receiptConfig.showQr ?? true}
                        onCheckedChange={(v) => updateReceipt("showQr", v)}
                      />

                      <SwitchItem
                        title="شعار النظام (Gestiona Pro POS)"
                        desc="إظهار توقيع النظام المصغر أسفل الفاتورة"
                        checked={form.receiptConfig.showBranding ?? true}
                        onCheckedChange={(v) => updateReceipt("showBranding", v)}
                      />
                    </div>
                  </div>

                  {form.receiptConfig.showQr && (
                    <div className="pt-2">
                      <Field label="النص أسفل رمز QR">
                        <Input
                          value={form.receiptConfig.qrText ?? "مسح إيصال QR"}
                          onChange={(e) => updateReceipt("qrText", e.target.value)}
                          placeholder="مسح إيصال QR"
                          className="text-xs"
                        />
                      </Field>
                    </div>
                  )}

                  <div className="pt-2">
                    <Field label="رسالة الشكر والتذييل (Footer Text)">
                      <Textarea
                        value={form.receiptConfig.footerText ?? ""}
                        onChange={(e) =>
                          updateReceipt("footerText", e.target.value.slice(0, FOOTER_MAX))
                        }
                        maxLength={FOOTER_MAX}
                        rows={2}
                        placeholder="شكراً لزيارتكم – نتشرف بخدمتكم دائماً"
                        className="font-medium text-xs"
                      />
                      <div className="text-left text-[10px] text-gray-500 mt-0.5">
                        {(form.receiptConfig.footerText ?? "").length} / {FOOTER_MAX} حرف
                      </div>
                    </Field>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Store Profile Form */
            <Card className="border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Store className="h-4 w-4 text-emerald-600" />
                  بيانات المتجر القانونية والضريبية
                </CardTitle>
                <CardDescription className="text-xs">
                  البيانات الرسمية للمحل والعملة ونسبة الضريبة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="اسم المتجر التجاري" required>
                    <Input
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      placeholder="متجر رِواق"
                    />
                  </Field>

                  <Field label="رقم الهاتف">
                    <Input
                      value={form.phoneNumber}
                      onChange={(e) => update("phoneNumber", e.target.value)}
                      placeholder="+213 555 12 34 56"
                      dir="ltr"
                    />
                  </Field>

                  <Field label="العنوان (السطر 1)">
                    <Input
                      value={form.addressLine1}
                      onChange={(e) => update("addressLine1", e.target.value)}
                      placeholder="حي العقيد لطفي"
                    />
                  </Field>

                  <Field label="المدينة أو المنطقة (السطر 2)">
                    <Input
                      value={form.addressLine2}
                      onChange={(e) => update("addressLine2", e.target.value)}
                      placeholder="سعيدة"
                    />
                  </Field>

                  <Field
                    label="رقم الحساب البريدي RIP (بريدي موب)"
                    hint="يستخدم لعرض رمز الاستجابة السريعة للدفع عند نقطة البيع"
                  >
                    <Input
                      value={form.ripNumber}
                      onChange={(e) => update("ripNumber", e.target.value)}
                      placeholder="00799999 0000000000 00"
                      dir="ltr"
                    />
                  </Field>

                  <Field label="رمز العملة الافتراضية">
                    <div className="flex items-center gap-2">
                      <Input
                        value={form.currency}
                        onChange={(e) =>
                          update("currency", e.target.value.slice(0, 4))
                        }
                        className="w-20 text-center font-bold font-mono"
                        maxLength={4}
                      />
                      <div className="flex flex-wrap gap-1">
                        {CURRENCY_OPTIONS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => update("currency", c)}
                            className={cn(
                              "grid h-8 min-w-8 place-items-center rounded-lg border px-2 font-mono text-xs transition",
                              form.currency === c
                                ? "border-emerald-600 bg-emerald-600 text-white font-bold"
                                : "bg-white hover:bg-gray-100 text-gray-800"
                            )}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  </Field>

                  <Field
                    label="نسبة الضريبة (TVA %)"
                    hint="تضاف تلقائياً على المنتجات الخاضعة للضريبة"
                  >
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.5"
                      value={Number.isFinite(form.taxRate) ? form.taxRate : 0}
                      onChange={(e) =>
                        update("taxRate", Number(e.target.value) || 0)
                      }
                      className="w-32 font-bold"
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Button at bottom */}
          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={!canSave || mutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 shadow-md"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 ml-2" />
              )}
              حفظ وتطبيق الإعدادات
            </Button>
          </div>
        </motion.div>

        {/* Right: Live Interactive Receipt Preview */}
        <div className="lg:sticky lg:top-4 lg:self-start space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
              <ReceiptIcon className="h-4 w-4 text-emerald-600" />
              المعاينة الحية للإيصال (Live Preview)
            </div>
            <button
              type="button"
              onClick={handlePrintTest}
              className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
            >
              <Printer className="h-3.5 w-3.5" />
              تجربة الطباعة
            </button>
          </div>

          {/* Card Frame simulating real thermal paper roll */}
          <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-neutral-100/80 p-3 shadow-inner overflow-hidden">
            <div className="rounded-xl border border-gray-200 bg-white shadow-md overflow-x-auto">
              <Receipt
                ref={receiptPreviewRef}
                shop={shop}
                sale={previewSale}
                configOverride={form.receiptConfig}
                size={form.receiptConfig.paperSize}
              />
            </div>
            <div className="mt-2 text-center text-[10px] text-gray-500 font-medium">
              يتم تحديث المعاينة مباشرة مع كل تغيير في الإعدادات أعلاه
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold text-gray-800">
        {label}
        {required && <span className="mr-0.5 text-red-500">*</span>}
      </Label>
      {children}
      {hint && (
        <p className="flex items-start gap-1 text-[10px] text-gray-500">
          <Info className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
          <span>{hint}</span>
        </p>
      )}
    </div>
  );
}

function SwitchItem({
  title,
  desc,
  checked,
  onCheckedChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 bg-gray-50/70 hover:bg-gray-50 transition-colors">
      <div className="space-y-0.5 pl-2">
        <p className="text-xs font-bold text-gray-800">{title}</p>
        <p className="text-[10px] text-gray-500 leading-tight">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
