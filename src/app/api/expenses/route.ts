import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

export const EXPENSE_CATEGORIES: Record<string, string> = {
  RENT: "إيجار المحل",
  UTILITIES: "كهرباء ومياه وإنترنت",
  SALARIES: "رواتب وأجور العمال",
  TRANSPORT: "نقل وتوصيل وشحن",
  MAINTENANCE: "صيانة وتصليح وتجهيزات",
  MARKETING: "إعلانات ودعاية",
  PACKAGING: "أكياس ومواد تغليف",
  OTHER: "مصاريف تشغيلية أخرى",
};

interface CreateExpenseInput {
  category: string;
  categoryLabel?: string;
  amount: number;
  expenseDate?: string;
  paymentMethod?: string; // Cash | Bank | Baridimob | Cheque
  paidTo?: string;
  notes?: string;
  receiptUrl?: string;
}

// GET /api/expenses — list expenses with filtering & summary totals
export async function GET(request: Request) {
  try {
    const session = await requireStoreOwner();
    const storeId = session.storeId;
    const { searchParams } = new URL(request.url);

    const category = searchParams.get("category");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const paymentMethod = searchParams.get("paymentMethod");

    const where: any = { storeId };

    if (category && category !== "ALL") {
      where.category = category;
    }
    if (paymentMethod && paymentMethod !== "ALL") {
      where.paymentMethod = paymentMethod;
    }
    if (dateFrom || dateTo) {
      where.expenseDate = {};
      if (dateFrom) {
        where.expenseDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        where.expenseDate.lte = to;
      }
    }

    const expenses = await db.expense.findMany({
      where,
      include: {
        user: { select: { name: true } },
      },
      orderBy: { expenseDate: "desc" },
    });

    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Grouping by category for analytics
    const byCategory: Record<string, { label: string; total: number; count: number }> = {};
    for (const exp of expenses) {
      const cat = exp.category;
      if (!byCategory[cat]) {
        byCategory[cat] = {
          label: exp.categoryLabel || EXPENSE_CATEGORIES[cat] || cat,
          total: 0,
          count: 0,
        };
      }
      byCategory[cat].total += exp.amount;
      byCategory[cat].count += 1;
    }

    return NextResponse.json({
      totalAmount,
      count: expenses.length,
      byCategory,
      expenses,
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/expenses");
  }
}

// POST /api/expenses — record a new operating expense
export async function POST(request: Request) {
  try {
    const session = await requireStoreOwner();
    const storeId = session.storeId;
    const body = (await request.json()) as CreateExpenseInput;

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "يرجى تحديد مبلغ صحيح للمصروف أكبر من صفر" },
        { status: 400 }
      );
    }

    const category = body.category?.trim() || "OTHER";
    const categoryLabel =
      body.categoryLabel?.trim() || EXPENSE_CATEGORIES[category] || "مصاريف أخرى";

    const expenseDate = body.expenseDate ? new Date(body.expenseDate) : new Date();
    const paymentMethod = body.paymentMethod || "Cash";

    // If paid by Cash, check if there is an active open cash drawer session
    let cashSessionId: string | null = null;
    if (paymentMethod === "Cash") {
      const openSession = await db.cashSession.findFirst({
        where: { storeId, status: "OPEN" },
        select: { id: true },
      });
      if (openSession) {
        cashSessionId = openSession.id;
      }
    }

    const expense = await db.expense.create({
      data: {
        storeId,
        category,
        categoryLabel,
        amount,
        expenseDate,
        paymentMethod,
        paidTo: body.paidTo?.trim() || null,
        notes: body.notes?.trim() || "",
        receiptUrl: body.receiptUrl?.trim() || null,
        userId: session.userId,
        cashSessionId,
      },
      include: {
        user: { select: { name: true } },
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/expenses");
  }
}
