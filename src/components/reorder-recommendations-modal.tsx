"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Boxes,
  AlertTriangle,
  Flame,
  Truck,
  TrendingDown,
  RefreshCw,
  ShoppingCart,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { recommendationsApi } from "@/lib/api";
import type { ReorderItemRecommendation } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ReorderRecommendationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency?: string;
  onNavigateToPurchaseOrders?: () => void;
}

export function ReorderRecommendationsModal({
  open,
  onOpenChange,
  currency = "دج",
  onNavigateToPurchaseOrders,
}: ReorderRecommendationsModalProps) {
  const [filterUrgency, setFilterUrgency] = useState<string>("ALL");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["reorderRecommendations"],
    queryFn: recommendationsApi.reorder,
    enabled: open,
  });

  const summary = data?.summary;
  const items = data?.recommendations ?? [];

  const filteredItems = items.filter((item) => {
    if (filterUrgency === "ALL") return true;
    return item.urgency === filterUrgency;
  });

  const urgencyBadge = (urgency: ReorderItemRecommendation["urgency"]) => {
    switch (urgency) {
      case "OUT_OF_STOCK":
        return (
          <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/15">
            نفد تماماً
          </Badge>
        );
      case "CRITICAL":
        return (
          <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/15">
            حرج جداً
          </Badge>
        );
      case "WARNING":
        return (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/15">
            قارب على النفاد
          </Badge>
        );
      default:
        return (
          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/15">
            طبيعي
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/15 text-amber-600">
                <Boxes className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">
                  توصيات إعادة الطلب الذكية (Smart Reorder)
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  توليد مقترحات كميات التوريد استناداً إلى سرعة المبيعات، مهلة المورد، ومستوى الأمان
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              className="gap-1.5 shrink-0"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefetching && "animate-spin")} />
              <span>تحديث المقترحات</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3.5 gap-0 border-amber-500/20 bg-amber-500/5">
              <p className="text-xs text-muted-foreground font-medium">أصناف بحاجة لتوريد</p>
              {isLoading ? (
                <Skeleton className="h-7 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-bold mt-1 text-amber-600 tabular-nums">
                  {summary?.itemsNeedingReorder ?? 0}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground mt-0.5">
                من إجمالي {summary?.totalProductsScanned ?? 0} منتج
              </p>
            </Card>

            <Card className="p-3.5 gap-0 border-red-500/20 bg-red-500/5">
              <p className="text-xs text-muted-foreground font-medium">منتجات نفدت تماماً</p>
              {isLoading ? (
                <Skeleton className="h-7 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-bold mt-1 text-red-600 tabular-nums">
                  {summary?.outOfStockCount ?? 0}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground mt-0.5">تتطلب طلبيات فورية</p>
            </Card>

            <Card className="p-3.5 gap-0 border-rose-500/20 bg-rose-500/5">
              <p className="text-xs text-muted-foreground font-medium">مخزون حرج (≤ التوريد)</p>
              {isLoading ? (
                <Skeleton className="h-7 w-16 mt-1" />
              ) : (
                <p className="text-2xl font-bold mt-1 text-rose-600 tabular-nums">
                  {summary?.criticalCount ?? 0}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground mt-0.5">يوشك على التوقف</p>
            </Card>

            <Card className="p-3.5 gap-0 border-emerald-500/20 bg-emerald-500/5">
              <p className="text-xs text-muted-foreground font-medium">التكلفة التقديرية</p>
              {isLoading ? (
                <Skeleton className="h-7 w-20 mt-1" />
              ) : (
                <p className="text-xl font-bold mt-1 text-emerald-600 tabular-nums">
                  {formatMoney(summary?.totalEstimatedInvestment ?? 0, currency)}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground mt-0.5">لتغطية المخزون</p>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Filter className="h-3 w-3" />
                تصفية:
              </span>
              {[
                { key: "ALL", label: "الكل" },
                { key: "OUT_OF_STOCK", label: "النافد فقط" },
                { key: "CRITICAL", label: "الحرج" },
                { key: "WARNING", label: "المخزون المنخفض" },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilterUrgency(f.key)}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-full border transition",
                    filterUrgency === f.key
                      ? "bg-primary text-primary-foreground border-primary font-medium"
                      : "bg-background hover:bg-muted text-muted-foreground"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground tabular-nums">
              عرض {filteredItems.length} من {items.length} مقترح
            </p>
          </div>

          {/* Recommendations Table */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center gap-3 bg-muted/10 rounded-2xl border border-dashed">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-base font-semibold">مستويات المخزون ممتازة!</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                لا توجد منتجات تتطلب إعادة طلب حالياً وفقاً لمعادلات معدل المبيعات وحدود الأمان المحددة.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div
                  key={item.productId}
                  className="p-4 rounded-xl border bg-card hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">
                        {item.productName}
                      </span>
                      {urgencyBadge(item.urgency)}
                      <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span>المخزون الحالي: </span>
                        <strong className={cn(item.currentStock <= 0 ? "text-red-600" : "text-foreground")}>
                          {item.currentStock} {item.unitType === "kg" ? "كغ" : "قطعة"}
                        </strong>
                        <span className="text-[10px] block opacity-80">
                          (الحد الأدنى: {item.minStock})
                        </span>
                      </div>
                      <div>
                        <span>معدل البيع: </span>
                        <strong className="text-foreground">
                          {item.avgDailySales}/يوم
                        </strong>
                        <span className="text-[10px] block opacity-80">
                          (يكفي لـ: {item.daysOfSupply > 90 ? "90+ يوم" : `${item.daysOfSupply} يوم`})
                        </span>
                      </div>
                      <div>
                        <span>المورد المقترح: </span>
                        <strong className="text-foreground">
                          {item.supplier?.name || "غير محدد"}
                        </strong>
                        <span className="text-[10px] block opacity-80">
                          (مهلة التوريد: {item.leadTimeDays} أيام)
                        </span>
                      </div>
                      <div>
                        <span>الكمية المقترحة: </span>
                        <strong className="text-emerald-600 font-bold text-sm">
                          +{item.recommendedQty} {item.unitType === "kg" ? "كغ" : "قطعة"}
                        </strong>
                        <span className="text-[10px] block opacity-80">
                          (تكلفة تقديرية: {formatMoney(item.estimatedCost, currency)})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex sm:flex-col items-center justify-end gap-2">
                    {onNavigateToPurchaseOrders && (
                      <Button
                        size="sm"
                        onClick={() => {
                          onOpenChange(false);
                          onNavigateToPurchaseOrders();
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 w-full sm:w-auto"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        <span>طلب الشراء</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
