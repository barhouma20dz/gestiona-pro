"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Minus,
  RefreshCw,
  Clock,
  DollarSign,
  Receipt,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import { cashSessionsApi, shopApi } from "@/lib/api";
import { formatMoney, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface CashDrawerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CashDrawerDialog({ open, onOpenChange }: CashDrawerDialogProps) {
  const qc = useQueryClient();

  const [openDrawerModal, setOpenDrawerModal] = useState(false);
  const [openingCashInput, setOpeningCashInput] = useState("");
  const [openingNotes, setOpeningNotes] = useState("");

  const [closeDrawerModal, setCloseDrawerModal] = useState(false);
  const [closingCashInput, setClosingCashInput] = useState("");
  const [closingNotes, setClosingNotes] = useState("");

  const [transactionModal, setTransactionModal] = useState<"DEPOSIT" | "WITHDRAWAL" | null>(null);
  const [transAmount, setTransAmount] = useState("");
  const [transReason, setTransReason] = useState("");

  const { data: shop } = useQuery({ queryKey: ["shop"], queryFn: shopApi.get });
  const currency = shop?.currency ?? "دج";

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["cashSessions"],
    queryFn: cashSessionsApi.get,
    enabled: open,
  });

  const activeSession = data?.activeSession;

  // Open Mutation
  const openMutation = useMutation({
    mutationFn: cashSessionsApi.open,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cashSessions"] });
      toast.success("تم فتح وردية الصندوق بنجاح");
      setOpenDrawerModal(false);
      setOpeningCashInput("");
      setOpeningNotes("");
    },
    onError: (e: any) => toast.error(e?.message || "فشل فتح الصندوق"),
  });

  // Close Mutation
  const closeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { closingCashActual: number; notes?: string } }) =>
      cashSessionsApi.close(id, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["cashSessions"] });
      qc.invalidateQueries({ queryKey: ["dailyReport"] });
      if (res.difference === 0) {
        toast.success("تم إغلاق الصندوق بمطابقة تامة 100%");
      } else if (res.difference > 0) {
        toast.success(`تم إغلاق الصندوق مع فائض: +${formatMoney(res.difference, currency)}`);
      } else {
        toast.warning(`تم إغلاق الصندوق مع عجز: ${formatMoney(res.difference, currency)}`);
      }
      setCloseDrawerModal(false);
      setClosingCashInput("");
      setClosingNotes("");
    },
    onError: (e: any) => toast.error(e?.message || "فشل إغلاق الصندوق"),
  });

  // Manual Transaction Mutation
  const transMutation = useMutation({
    mutationFn: ({
      sessionId,
      data,
    }: {
      sessionId: string;
      data: { type: "DEPOSIT" | "WITHDRAWAL"; amount: number; reason?: string };
    }) => cashSessionsApi.addTransaction(sessionId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cashSessions"] });
      toast.success("تم تسجيل العملية النقدية بنجاح");
      setTransactionModal(null);
      setTransAmount("");
      setTransReason("");
    },
    onError: (e: any) => toast.error(e?.message || "فشل تسجيل العملية"),
  });

  const handleOpenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cash = Number(openingCashInput);
    if (!Number.isFinite(cash) || cash < 0) {
      toast.error("يرجى إدخال رصيد افتتاحي صحيح");
      return;
    }
    openMutation.mutate({ openingCash: cash, notes: openingNotes });
  };

  const handleCloseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    const cash = Number(closingCashInput);
    if (!Number.isFinite(cash) || cash < 0) {
      toast.error("يرجى إدخال المبلغ الفعلي المعدود");
      return;
    }
    closeMutation.mutate({
      id: activeSession.id,
      data: { closingCashActual: cash, notes: closingNotes },
    });
  };

  const handleTransSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !transactionModal) return;
    const amount = Number(transAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح أكبر من صفر");
      return;
    }
    transMutation.mutate({
      sessionId: activeSession.id,
      data: { type: transactionModal, amount, reason: transReason },
    });
  };

  // Preview discrepancy when typing closing cash
  const previewDiff =
    closingCashInput && activeSession?.expectedCash !== undefined
      ? Number(closingCashInput) - activeSession.expectedCash
      : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">
                    إدارة درج النقود والورديات
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    متابعة السيولة النقدية الحالية وفروقات الصندوق
                  </DialogDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
              </Button>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <RefreshCw className="mx-auto h-6 w-6 animate-spin mb-2" />
              جارٍ تحميل بيانات الصندوق...
            </div>
          ) : activeSession ? (
            /* Open Session View */
            <div className="space-y-4">
              {/* Status Banner */}
              <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      الصندوق مفتوح حالياً
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      مفتوح منذ {formatDateTime(activeSession.openedAt)} بواسطة{" "}
                      {activeSession.user?.name || "المسؤول"}
                    </p>
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white">جلسة نشطة</Badge>
              </div>

              {/* Main Cash Expected Card */}
              <Card className="p-4 bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-lg">
                <p className="text-xs text-slate-300 font-medium">
                  المبلغ المتوقع حالياً في الدرج (Expected Cash)
                </p>
                <p className="mt-1 text-2xl font-black text-emerald-400 font-mono sm:text-3xl">
                  {formatMoney(activeSession.expectedCash ?? 0, currency)}
                </p>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-white/10">
                  <span>الرصيد الافتتاحي: {formatMoney(activeSession.openingCash, currency)}</span>
                  <span>
                    صافي الحركة:{" "}
                    {formatMoney(activeSession.flow?.netCashFlow ?? 0, currency)}
                  </span>
                </div>
              </Card>

              {/* Cash Flow Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border bg-muted/40 p-2.5">
                  <div className="flex items-center justify-between text-emerald-600 font-semibold">
                    <span className="flex items-center gap-1">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      مبيعات نقدية
                    </span>
                    <span className="font-mono">
                      +{formatMoney(activeSession.flow?.cashSales ?? 0, currency)}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/40 p-2.5">
                  <div className="flex items-center justify-between text-emerald-600 font-semibold">
                    <span className="flex items-center gap-1">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      ديون محصلة
                    </span>
                    <span className="font-mono">
                      +{formatMoney(activeSession.flow?.cashCustomerDebts ?? 0, currency)}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/40 p-2.5">
                  <div className="flex items-center justify-between text-rose-600 font-semibold">
                    <span className="flex items-center gap-1">
                      <ArrowDownRight className="h-3.5 w-3.5" />
                      مصاريف نقدية
                    </span>
                    <span className="font-mono">
                      -{formatMoney(activeSession.flow?.cashExpenses ?? 0, currency)}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/40 p-2.5">
                  <div className="flex items-center justify-between text-rose-600 font-semibold">
                    <span className="flex items-center gap-1">
                      <ArrowDownRight className="h-3.5 w-3.5" />
                      دفعات موردين
                    </span>
                    <span className="font-mono">
                      -{formatMoney(activeSession.flow?.cashSupplierPayments ?? 0, currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTransactionModal("DEPOSIT")}
                  className="gap-1 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-500/10"
                >
                  <Plus className="h-3.5 w-3.5" />
                  إيداع نقدي
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTransactionModal("WITHDRAWAL")}
                  className="gap-1 text-rose-700 hover:text-rose-800 hover:bg-rose-500/10"
                >
                  <Minus className="h-3.5 w-3.5" />
                  سحب نقدي
                </Button>
                <Button
                  size="sm"
                  onClick={() => setCloseDrawerModal(true)}
                  className="gap-1 bg-red-600 hover:bg-red-500 text-white font-bold"
                >
                  <Lock className="h-3.5 w-3.5" />
                  إغلاق الصندوق
                </Button>
              </div>

              {/* Shift Transactions History */}
              {activeSession.transactions && activeSession.transactions.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t">
                  <p className="text-xs font-bold text-muted-foreground">
                    العمليات اليدوية في الوردية الحالية:
                  </p>
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {activeSession.transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between rounded-md border bg-card p-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Badge
                            className={cn(
                              "text-[10px] px-1.5 py-0",
                              tx.type === "DEPOSIT"
                                ? "bg-emerald-500/15 text-emerald-700"
                                : "bg-rose-500/15 text-rose-700"
                            )}
                          >
                            {tx.type === "DEPOSIT" ? "إيداع" : "سحب"}
                          </Badge>
                          <span>{tx.reason || "عملية يدوية"}</span>
                        </div>
                        <span className="font-mono font-bold">
                          {formatMoney(tx.amount, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Closed Session / Ready to open view */
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-500/15 text-amber-600">
                <Lock className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold">درج النقود مغلق حالياً</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  افتح وردية جديدة وحدد الرصيد الافتتاحي للبدء بتسجيل المبيعات
                  والحسابات النقدية بدقة.
                </p>
              </div>
              <Button
                onClick={() => setOpenDrawerModal(true)}
                className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                <Unlock className="h-4 w-4" />
                فتح وردية الصندوق الآن
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Open Drawer */}
      <Dialog open={openDrawerModal} onOpenChange={setOpenDrawerModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>فتح وردية درج النقود</DialogTitle>
            <DialogDescription>
              أدخل مبلغ الرصيد الافتتاحي الموجود حالياً في الدرج
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleOpenSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>الرصيد الافتتاحي ({currency})</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                required
                autoFocus
                value={openingCashInput}
                onChange={(e) => setOpeningCashInput(e.target.value)}
                placeholder="مثال: 5000"
                className="font-mono text-lg font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label>ملاحظات الفتح (اختياري)</Label>
              <Textarea
                rows={2}
                value={openingNotes}
                onChange={(e) => setOpeningNotes(e.target.value)}
                placeholder="ملاحظات حول بداية الوردية..."
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenDrawerModal(false)}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={openMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                تأكيد الفتح
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Close Drawer with Discrepancy Check */}
      <Dialog open={closeDrawerModal} onOpenChange={setCloseDrawerModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <Lock className="h-5 w-5" />
              إغلاق وجرد الصندوق
            </DialogTitle>
            <DialogDescription>
              قم بعدّ الأموال النقدية الموجودة في الدرج وأدخل المبلغ الفعلي
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCloseSubmit} className="space-y-4">
            <div className="rounded-xl border bg-muted/40 p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">الرصيد المتوقع رياضياً:</span>
                <span className="font-mono font-bold">
                  {formatMoney(activeSession?.expectedCash ?? 0, currency)}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>المبلغ الفعلي المعدود في الدرج ({currency})</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                required
                autoFocus
                value={closingCashInput}
                onChange={(e) => setClosingCashInput(e.target.value)}
                placeholder="المبلغ الفعلي..."
                className="font-mono text-lg font-bold"
              />
            </div>

            {previewDiff !== null && (
              <div
                className={cn(
                  "rounded-lg p-3 text-xs font-semibold flex items-center justify-between",
                  previewDiff === 0
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : previewDiff > 0
                    ? "bg-teal-500/15 text-teal-700 dark:text-teal-300"
                    : "bg-red-500/15 text-red-700 dark:text-red-300"
                )}
              >
                <span>
                  {previewDiff === 0
                    ? "مطابقة تامة للمبلغ المتوقع"
                    : previewDiff > 0
                    ? "فائض نقدي (المبلغ الفعلي أكبر)"
                    : "عجز نقدي (نقص في الدرج)"}
                </span>
                <span className="font-mono font-bold text-sm">
                  {previewDiff >= 0 ? "+" : ""}
                  {formatMoney(previewDiff, currency)}
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>ملاحظات الإغلاق والتسوية</Label>
              <Textarea
                rows={2}
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="أسباب الفروقات أو ملاحظات التسليم..."
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCloseDrawerModal(false)}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={closeMutation.isPending}
                className="bg-red-600 hover:bg-red-500 text-white font-bold"
              >
                تأكيد إغلاق الصندوق
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Manual Deposit / Withdrawal */}
      <Dialog
        open={!!transactionModal}
        onOpenChange={(op) => !op && setTransactionModal(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {transactionModal === "DEPOSIT" ? "إيداع نقدي في الدرج" : "سحب نقدي من الدرج"}
            </DialogTitle>
            <DialogDescription>
              {transactionModal === "DEPOSIT"
                ? "إضافة سيولة إضافية للصندوق (فكة / دعم)"
                : "سحب أموال نقدية من الصندوق (مصاريف نثرية / سحب مالك)"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTransSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>المبلغ ({currency})</Label>
              <Input
                type="number"
                min={1}
                step="0.01"
                required
                autoFocus
                value={transAmount}
                onChange={(e) => setTransAmount(e.target.value)}
                className="font-mono text-base font-bold"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>السبب أو المرجع</Label>
              <Input
                value={transReason}
                onChange={(e) => setTransReason(e.target.value)}
                placeholder={
                  transactionModal === "DEPOSIT"
                    ? "مثال: تزويد فكة الصباح"
                    : "مثال: سحب للمنزل / مشتريات طارئة"
                }
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTransactionModal(null)}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={transMutation.isPending}
                className={cn(
                  "text-white",
                  transactionModal === "DEPOSIT"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-rose-600 hover:bg-rose-500"
                )}
              >
                تأكيد العملية
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
