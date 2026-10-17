"use client";

import { useQuery } from "@tanstack/react-query";
import { Printer, RefreshCw, UserRound, Truck, FileText, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { statementsApi, shopApi } from "@/lib/api";
import { formatMoney, formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface StatementDialogProps {
  type: "customer" | "supplier";
  targetId: string | null;
  targetName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StatementDialog({
  type,
  targetId,
  targetName,
  open,
  onOpenChange,
}: StatementDialogProps) {
  const { data: shop } = useQuery({ queryKey: ["shop"], queryFn: shopApi.get });
  const currency = shop?.currency ?? "دج";

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["statement", type, targetId],
    queryFn: () => {
      if (!targetId) return null;
      return type === "customer"
        ? statementsApi.customer(targetId)
        : statementsApi.supplier(targetId);
    },
    enabled: open && !!targetId,
  });

  const handlePrint = () => {
    window.print();
  };

  const isCustomer = type === "customer";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                {isCustomer ? <UserRound className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  كشف حساب تفصيلي: {targetName || (isCustomer ? "الزبون" : "المورد")}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  سجل المعاملات والمدفوعات والرصيد التراكمي
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
              </Button>
              <Button
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 bg-primary text-primary-foreground shadow"
              >
                <Printer className="h-4 w-4" />
                طباعة الكشف
              </Button>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin mb-2" />
            جارٍ استخراج وتدقيق كشف الحساب...
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3.5 bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  {isCustomer ? "إجمالي الديون (المبيعات الآجلة)" : "إجمالي الفواتير المستحقة"}
                </p>
                <p className="mt-1 text-base font-bold font-mono">
                  {formatMoney(
                    isCustomer ? data.summary.totalDebit ?? 0 : data.summary.totalInvoices ?? 0,
                    currency
                  )}
                </p>
              </Card>

              <Card className="p-3.5 bg-emerald-500/5 border-emerald-500/20">
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  {isCustomer ? "المبالغ المسددة من الزبون" : "المبالغ المسددة للمورد"}
                </p>
                <p className="mt-1 text-base font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                  {formatMoney(
                    isCustomer ? data.summary.totalCredit ?? 0 : data.summary.totalPaid ?? 0,
                    currency
                  )}
                </p>
              </Card>

              <Card className="p-3.5 bg-red-500/5 border-red-500/20">
                <p className="text-xs text-red-700 dark:text-red-300 font-bold">
                  الرصيد المتبقي المستحق
                </p>
                <p className="mt-1 text-base font-black text-red-600 dark:text-red-400 font-mono">
                  {formatMoney(data.summary.currentOutstanding, currency)}
                </p>
              </Card>
            </div>

            {/* Ledger Table */}
            <Card className="p-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">التاريخ</TableHead>
                    <TableHead className="text-start">البيان / المعاملة</TableHead>
                    <TableHead className="text-center">المرجع</TableHead>
                    <TableHead className="text-center">
                      {isCustomer ? "المستحق (+)" : "الفاتورة (+)"}
                    </TableHead>
                    <TableHead className="text-center">
                      {isCustomer ? "المسدد (-)" : "المدفوع (-)"}
                    </TableHead>
                    <TableHead className="text-center font-bold">الرصيد المتبقي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.ledger.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
                        لا توجد حركات مسجلة لهذا الحساب حتى الآن.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.ledger.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-center font-mono text-xs whitespace-nowrap">
                          {formatDate(entry.date)}
                        </TableCell>
                        <TableCell className="text-start text-xs font-medium">
                          {entry.title}
                          {entry.details && (
                            <span className="block text-[11px] text-muted-foreground line-clamp-1">
                              {entry.details}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">
                          {entry.reference}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-amber-600 tabular-nums">
                          {entry.debit > 0 ? `+${formatMoney(entry.debit, currency)}` : "—"}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-emerald-600 tabular-nums">
                          {entry.credit > 0 ? `-${formatMoney(entry.credit, currency)}` : "—"}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs font-bold tabular-nums">
                          {formatMoney(entry.runningBalance, currency)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
