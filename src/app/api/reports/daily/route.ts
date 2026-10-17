import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// Helper: Calculate day metrics for a given date range
async function calculateDayFinancials(storeId: string, startOfDay: Date, endOfDay: Date) {
  // 1. Fetch sales for the day with items and product cost price
  const sales = await db.sale.findMany({
    where: {
      storeId,
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    include: {
      items: {
        include: {
          product: { select: { costPrice: true, price: true } },
        },
      },
    },
  });

  let totalSales = 0;
  let totalDiscounts = 0;
  let cogs = 0; // Cost of Goods Sold

  const paymentBreakdown: Record<string, { total: number; count: number }> = {
    Cash: { total: 0, count: 0 },
    BARIDIMOB: { total: 0, count: 0 },
    CARD: { total: 0, count: 0 },
    CHEQUE: { total: 0, count: 0 },
    CREDIT: { total: 0, count: 0 },
  };

  for (const s of sales) {
    totalSales += s.total + s.discount; // Gross sales before discount
    totalDiscounts += s.discount;

    // Track payment breakdown
    const method = s.paymentMethod || "Cash";
    if (!paymentBreakdown[method]) {
      paymentBreakdown[method] = { total: 0, count: 0 };
    }
    paymentBreakdown[method].total += s.total;
    paymentBreakdown[method].count += 1;

    // Calculate COGS
    for (const item of s.items) {
      const itemCost = item.product?.costPrice ?? 0;
      cogs += item.quantity * itemCost;
    }
  }

  const netSales = totalSales - totalDiscounts;
  const grossProfit = netSales - cogs;
  const grossProfitMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

  // 2. Fetch operating expenses for the day
  const expenses = await db.expense.findMany({
    where: {
      storeId,
      expenseDate: { gte: startOfDay, lte: endOfDay },
    },
  });

  const totalOperatingExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const expensesByCategory: Record<string, number> = {};
  for (const e of expenses) {
    const cat = e.categoryLabel || e.category;
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + e.amount;
  }

  // Net Operating Profit
  const netOperatingProfit = grossProfit - totalOperatingExpenses;
  const netProfitMargin = netSales > 0 ? (netOperatingProfit / netSales) * 100 : 0;

  // 3. Customer debt collections on this day
  const debtRepayments = await db.customerPayment.findMany({
    where: {
      storeId,
      paymentDate: { gte: startOfDay, lte: endOfDay },
    },
  });
  const totalCustomerDebtCollected = debtRepayments.reduce((sum, p) => sum + p.amount, 0);

  // 4. Supplier payments on this day
  const supplierPayments = await db.supplierPayment.findMany({
    where: {
      storeId,
      paymentDate: { gte: startOfDay, lte: endOfDay },
    },
  });
  const totalSupplierPaid = supplierPayments.reduce((sum, p) => sum + p.amount, 0);

  // 5. Cash Flow Analysis (Receipts vs Disbursements)
  // Cash In: Cash from sales + Cash debt collected
  const cashFromSales = paymentBreakdown["Cash"]?.total ?? 0;
  const cashDebtCollected = debtRepayments
    .filter((p) => p.paymentMethod === "Cash")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalCashIn = cashFromSales + cashDebtCollected;

  // Cash Out: Cash expenses + Cash supplier payments
  const cashExpenses = expenses
    .filter((e) => e.paymentMethod === "Cash")
    .reduce((sum, e) => sum + e.amount, 0);
  const cashSupplierPaid = supplierPayments
    .filter((p) => p.paymentMethod === "Cash")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalCashOut = cashExpenses + cashSupplierPaid;
  const netCashFlow = totalCashIn - totalCashOut;

  return {
    salesCount: sales.length,
    totalSales,
    totalDiscounts,
    netSales,
    cogs,
    grossProfit,
    grossProfitMargin,
    totalOperatingExpenses,
    expensesByCategory,
    netOperatingProfit,
    netProfitMargin,
    paymentBreakdown,
    totalCustomerDebtCollected,
    totalSupplierPaid,
    cashFlow: {
      totalCashIn,
      totalCashOut,
      netCashFlow,
      cashFromSales,
      cashDebtCollected,
      cashExpenses,
      cashSupplierPaid,
    },
  };
}

// GET /api/reports/daily?date=YYYY-MM-DD
export async function GET(request: Request) {
  try {
    const session = await requireStoreOwner();
    const storeId = session.storeId;
    const { searchParams } = new URL(request.url);

    const dateParam = searchParams.get("date");
    const targetDate = dateParam ? new Date(dateParam) : new Date();

    // Start and end of selected day (00:00:00 to 23:59:59.999)
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Start and end of previous day for comparison
    const startOfPrevDay = new Date(startOfDay);
    startOfPrevDay.setDate(startOfPrevDay.getDate() - 1);
    const endOfPrevDay = new Date(endOfDay);
    endOfPrevDay.setDate(endOfPrevDay.getDate() - 1);

    const currentDay = await calculateDayFinancials(storeId, startOfDay, endOfDay);
    const prevDay = await calculateDayFinancials(storeId, startOfPrevDay, endOfPrevDay);

    // Day-over-day changes
    const comparison = {
      salesDiff: currentDay.netSales - prevDay.netSales,
      salesPercentChange:
        prevDay.netSales > 0
          ? ((currentDay.netSales - prevDay.netSales) / prevDay.netSales) * 100
          : 0,
      grossProfitDiff: currentDay.grossProfit - prevDay.grossProfit,
      grossProfitPercentChange:
        prevDay.grossProfit > 0
          ? ((currentDay.grossProfit - prevDay.grossProfit) / prevDay.grossProfit) * 100
          : 0,
      netProfitDiff: currentDay.netOperatingProfit - prevDay.netOperatingProfit,
      prevDayNetSales: prevDay.netSales,
      prevDayNetProfit: prevDay.netOperatingProfit,
    };

    return NextResponse.json({
      date: startOfDay.toISOString().slice(0, 10),
      currentDay,
      comparison,
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/reports/daily");
  }
}
