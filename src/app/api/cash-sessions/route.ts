import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// Helper: Calculate cash movements for a session timeframe
export async function calculateSessionCashFlow(storeId: string, fromDate: Date, toDate?: Date | null) {
  const dateFilter: any = { gte: fromDate };
  if (toDate) {
    dateFilter.lte = toDate;
  }

  // 1. Cash Sales
  const cashSalesAgg = await db.sale.aggregate({
    where: {
      storeId,
      paymentMethod: "Cash",
      createdAt: dateFilter,
    },
    _sum: { total: true },
    _count: true,
  });
  const cashSales = cashSalesAgg._sum.total ?? 0;
  const salesCount = cashSalesAgg._count;

  // 2. Customer Debt Repayments (Cash)
  const cashDebtAgg = await db.customerPayment.aggregate({
    where: {
      storeId,
      paymentMethod: "Cash",
      paymentDate: dateFilter,
    },
    _sum: { amount: true },
  });
  const cashCustomerDebts = cashDebtAgg._sum.amount ?? 0;

  // 3. Supplier Payments (Cash)
  const cashSupplierAgg = await db.supplierPayment.aggregate({
    where: {
      storeId,
      paymentMethod: "Cash",
      paymentDate: dateFilter,
    },
    _sum: { amount: true },
  });
  const cashSupplierPayments = cashSupplierAgg._sum.amount ?? 0;

  // 4. Operating Expenses (Cash)
  const cashExpensesAgg = await db.expense.aggregate({
    where: {
      storeId,
      paymentMethod: "Cash",
      expenseDate: dateFilter,
    },
    _sum: { amount: true },
  });
  const cashExpenses = cashExpensesAgg._sum.amount ?? 0;

  // 5. Manual Cash Transactions (DEPOSIT vs WITHDRAWAL)
  const transactions = await db.cashTransaction.findMany({
    where: {
      storeId,
      createdAt: dateFilter,
    },
  });
  const cashDeposits = transactions
    .filter((t) => t.type === "DEPOSIT")
    .reduce((sum, t) => sum + t.amount, 0);
  const cashWithdrawals = transactions
    .filter((t) => t.type === "WITHDRAWAL")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIn = cashSales + cashCustomerDebts + cashDeposits;
  const totalOut = cashSupplierPayments + cashExpenses + cashWithdrawals;
  const netCashFlow = totalIn - totalOut;

  return {
    cashSales,
    salesCount,
    cashCustomerDebts,
    cashDeposits,
    totalIn,
    cashSupplierPayments,
    cashExpenses,
    cashWithdrawals,
    totalOut,
    netCashFlow,
  };
}

// GET /api/cash-sessions — get active session & history
export async function GET() {
  try {
    const session = await requireStoreOwner();
    const storeId = session.storeId;

    // 1. Check for active open session
    const activeSession = await db.cashSession.findFirst({
      where: { storeId, status: "OPEN" },
      include: {
        user: { select: { name: true } },
        transactions: {
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    let activeSessionWithCalculations: any = null;
    if (activeSession) {
      const flow = await calculateSessionCashFlow(storeId, activeSession.openedAt);
      const expectedCash = activeSession.openingCash + flow.netCashFlow;
      activeSessionWithCalculations = {
        ...activeSession,
        flow,
        expectedCash,
      };
    }

    // 2. Fetch history of closed sessions
    const closedSessions = await db.cashSession.findMany({
      where: { storeId, status: "CLOSED" },
      include: {
        user: { select: { name: true } },
      },
      orderBy: { closedAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      activeSession: activeSessionWithCalculations,
      history: closedSessions,
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/cash-sessions");
  }
}

// POST /api/cash-sessions — open a new cash session
export async function POST(request: Request) {
  try {
    const session = await requireStoreOwner();
    const storeId = session.storeId;
    const body = await request.json();

    // Check if an open session already exists
    const existingOpen = await db.cashSession.findFirst({
      where: { storeId, status: "OPEN" },
    });
    if (existingOpen) {
      return NextResponse.json(
        { error: "يوجد جلسة صندوق مفتوحة حالياً، يرجى إغلاقها أولاً قبل فتح جلسة جديدة" },
        { status: 409 }
      );
    }

    const openingCash = Number(body.openingCash);
    if (!Number.isFinite(openingCash) || openingCash < 0) {
      return NextResponse.json(
        { error: "الرصيد الافتتاحي يجب أن يكون رقماً صفراً أو موجباً" },
        { status: 400 }
      );
    }

    const newSession = await db.cashSession.create({
      data: {
        storeId,
        userId: session.userId,
        openingCash,
        notes: body.notes?.trim() || "",
        status: "OPEN",
      },
      include: {
        user: { select: { name: true } },
      },
    });

    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/cash-sessions");
  }
}
