import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";
import { EXPENSE_CATEGORIES } from "../route";

type Params = { params: Promise<{ id: string }> };

// PUT /api/expenses/:id — update an expense
export async function PUT(request: Request, { params }: Params) {
  try {
    const session = await requireStoreOwner();
    const storeId = session.storeId;
    const { id } = await params;
    const body = await request.json();

    const existing = await db.expense.findFirst({
      where: { id, storeId },
    });
    if (!existing) {
      return NextResponse.json({ error: "المصروف غير موجود" }, { status: 404 });
    }

    const data: any = {};
    if (body.amount !== undefined) {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json(
          { error: "المبلغ يجب أن يكون رقماً موجباً أكبر من صفر" },
          { status: 400 }
        );
      }
      data.amount = amount;
    }

    if (body.category) {
      data.category = body.category;
      data.categoryLabel =
        body.categoryLabel || EXPENSE_CATEGORIES[body.category] || "مصاريف أخرى";
    }

    if (body.expenseDate) {
      data.expenseDate = new Date(body.expenseDate);
    }

    if (body.paymentMethod) data.paymentMethod = body.paymentMethod;
    if (body.paidTo !== undefined) data.paidTo = body.paidTo?.trim() || null;
    if (body.notes !== undefined) data.notes = body.notes?.trim() || "";
    if (body.receiptUrl !== undefined) data.receiptUrl = body.receiptUrl?.trim() || null;

    const updated = await db.expense.update({
      where: { id },
      data,
      include: { user: { select: { name: true } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, "PUT /api/expenses/:id");
  }
}

// DELETE /api/expenses/:id — delete an expense
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await requireStoreOwner();
    const storeId = session.storeId;
    const { id } = await params;

    const existing = await db.expense.findFirst({
      where: { id, storeId },
    });
    if (!existing) {
      return NextResponse.json({ error: "المصروف غير موجود" }, { status: 404 });
    }

    await db.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/expenses/:id");
  }
}
