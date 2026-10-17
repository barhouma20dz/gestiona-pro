"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  History,
  TrendingDown,
  TrendingUp,
  AlertOctagon,
  ClipboardList,
  PlusCircle,
  Loader2,
  Calendar,
  Layers,
  ArrowRightLeft,
  X,
  FileSpreadsheet,
} from "lucide-react";

import { stockMovementsApi } from "@/lib/api";
import type { Product, StockMovement, StockMovementType } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface StockMovementDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency?: string;
}

const typeMap: Record<
  StockMovementType,
  { label: string; color: string; icon: any }
> = {
  SALE: {
    label: "مبيعات (صرف)",
    color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    icon: TrendingDown,
  },
  PURCHASE: {
    label: "مشتريات (توريد)",
    color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    icon: TrendingUp,
  },
  RETURN: {
    label: "مرتجع زبون",
    color: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
    icon: ArrowRightLeft,
  },
  ADJUSTMENT: {
    label: "تسوية يدوية",
    color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    icon: History,
  },
  WASTE: {
    label: "تالف / فاقد",
    color: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
    icon: AlertOctagon,
  },
  AUDIT: {
    label: "مطابقة جرد",
    color: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
    icon: ClipboardList,
  },
};

export function StockMovementDialog({
  product,
  open,
  onOpenChange,
  currency = "دج",
}: StockMovementDialogProps) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"history" | "adjust">("history");

  // Adjustment Form State
  const [adjType, setAdjType] = useState<"ADJUSTMENT" | "WASTE">("ADJUSTMENT");
  const [isTarget, setIsTarget] = useState(false); // false = delta, true = set exact target stock
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["stock-movements", product?.id],
    queryFn: () => (product?.id ? stockMovementsApi.list({ productId: product.id, limit: 50 }) : Promise.resolve([])),
    enabled: open && Boolean(product?.id),
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      productId: string;
      type: string;
      quantity: number;
      reason?: string;
      isTarget?: boolean;
    }) => stockMovementsApi.create(data),
    onSuccess: () => {
      toast.success("✓ تم تسجيل حركة المخزون بنجاح وتحديث الرصيد");
      qc.invalidateQueries({ queryKey: ["stock-movements", product?.id] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setQuantity("");
      setReason("");
      setActiveTab("history");
    },
    onError: (err: any) => {
      toast.error(err?.message || "فشل تسجيل حركة المخزون");
    },
  });

  if (!product) return null;

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(quantity);
    if (isNaN(qty)) {
      toast.error("يرجى إدخال كمية صحيحة");
      return;
    }
    if (!reason.trim()) {
      toast.error("يرجى كتابة سبب التعديل أو التلف للتدقيق المخزني");
      return;
    }

    createMutation.mutate({
      productId: product.id,
      type: adjType,
      quantity: qty,
      reason: reason.trim(),
      isTarget,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden" dir="rtl">
        {/* Header */}
        <div className="bg-muted/40 p-5 border-b flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                <History className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg font-bold">
                سجل حركة المخزون والتدقيق
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="font-semibold text-foreground">{product.name}</span>
              <span>·</span>
              <span className="font-mono">{product.barcode}</span>
              <span>·</span>
              <span>
                الرصيد الحالي:{" "}
                <b className="text-emerald-600 font-bold">
                  {product.stock} {product.unitType === "kg" ? "كغ" : "قطعة"}
                </b>
              </span>
            </DialogDescription>
          </div>

          {/* Quick tab switcher */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg shrink-0">
            <Button
              type="button"
              size="sm"
              variant={activeTab === "history" ? "secondary" : "ghost"}
              className="text-xs h-7 px-3"
              onClick={() => setActiveTab("history")}
            >
              <History className="h-3.5 w-3.5 me-1" />
              سجل الحركات
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeTab === "adjust" ? "secondary" : "ghost"}
              className="text-xs h-7 px-3"
              onClick={() => setActiveTab("adjust")}
            >
              <PlusCircle className="h-3.5 w-3.5 me-1 text-emerald-600" />
              تسجيل تسوية / إتلاف
            </Button>
          </div>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "history" ? (
            <div>
              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  <span className="text-xs">جاري تحميل سجل الحركات...</span>
                </div>
              ) : movements.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <FileSpreadsheet className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">لا توجد حركات مخزون مسجلة بعد لهذا المنتج</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    يتم تسجيل جميع عمليات البيع، التوريد، التسوية اليدوية والتلف تلقائياً في هذا السجل.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="text-xs">
                        <TableHead className="text-center">نوع الحركة</TableHead>
                        <TableHead className="text-center">الكمية</TableHead>
                        <TableHead className="text-center">الرصيد (قبل ← بعد)</TableHead>
                        <TableHead className="text-start">السبب / المرجع</TableHead>
                        <TableHead className="text-center">التاريخ والوقت</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((m) => {
                        const meta = typeMap[m.type] || {
                          label: m.type,
                          color: "bg-muted text-muted-foreground",
                          icon: History,
                        };
                        const Icon = meta.icon;
                        const isNegative = m.quantity < 0 || m.type === "SALE" || m.type === "WASTE";

                        return (
                          <TableRow key={m.id} className="text-xs hover:bg-muted/30">
                            <TableCell className="text-center">
                              <div className="flex justify-center">
                                <Badge className={cn("gap-1 py-0.5 text-[10px] font-medium border", meta.color)}>
                                  <Icon className="h-3 w-3" />
                                  {meta.label}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-bold tabular-nums">
                              <span
                                className={cn(
                                  m.quantity > 0 ? "text-emerald-600" : "text-red-500"
                                )}
                              >
                                {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                              </span>
                            </TableCell>
                            <TableCell className="text-center tabular-nums text-muted-foreground">
                              {m.beforeQty} ←{" "}
                              <b className="text-foreground">{m.afterQty}</b>
                            </TableCell>
                            <TableCell className="text-start max-w-[200px] truncate" title={m.reason || ""}>
                              {m.reason || (m.referenceId ? `مرجع: ${m.referenceId.slice(0, 8)}` : "—")}
                            </TableCell>
                            <TableCell className="text-center tabular-nums text-muted-foreground text-[11px]">
                              {formatDateTime(m.createdAt)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleAdjustSubmit} className="space-y-4 max-w-lg mx-auto py-2">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300">
                ⚠️ أي تعديل يدوي أو إتلاف يتم تقييده فوراً في دفتر الأستاذ المخزني باسم المستخدم مع الاحتفاظ بالأثر المالي.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">نوع الحركة</Label>
                  <Select
                    value={adjType}
                    onValueChange={(v) => setAdjType(v as "ADJUSTMENT" | "WASTE")}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADJUSTMENT">تسوية يدوية (تصحيح/زيادة/نقصان)</SelectItem>
                      <SelectItem value="WASTE">تسجيل تالف / كسر / منتهي الصلاحية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">طريقة الحساب</Label>
                  <Select
                    value={isTarget ? "target" : "delta"}
                    onValueChange={(v) => setIsTarget(v === "target")}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delta">إضافة (+) أو خصم (-) كمية</SelectItem>
                      <SelectItem value="target">تعيين الرصيد الفعلي الإجمالي مباشرة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  {isTarget ? "الكمية الفعلية الجديدة في الرف" : "كمية التعديل (مثال: +10 للإضافة أو -5 للخصم)"}
                </Label>
                <Input
                  type="number"
                  step={product.unitType === "kg" ? "0.001" : "1"}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={isTarget ? String(product.stock) : "-2 أو +5"}
                  className="h-9 text-sm tabular-nums"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">سبب الحركة / ملاحظات التدقيق (إلزامي)</Label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="مثال: تلف أثناء النقل، انتهاء صلاحية، تصحيح خطأ إدخال سابق..."
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("history")}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  تأكيد وقيد الحركة في المخزون
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
