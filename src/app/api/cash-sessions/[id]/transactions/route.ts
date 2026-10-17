import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

type Params = { params: Promise<{ id: string }> };

// POST /api/cash-sessions/:id/transactions — record a manual cash deposit or withdrawal
export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requireStoreOwner();
    const storeId = session.storeId;
    const { id } = await params;
    const body = await request.json();

    const cashSession = await db.cashSession.findFirst({
      where: { id, storeId },
    });
    if (!cashSession) {
      return NextResponse.json({ error: "جلسة الصندوق غير موجودة" }, { status: 404 });
    }
    if (cashSession.status === "CLOSED") {
      return NextResponse.json(
        { error: "لا يمكن إضافة عمليات على جلسة صندوق مغلقة" },
        { status: 400 }
      );
    }

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "المبلغ يجب أن يكون رقماً أكبر من صفر" },
        { status: 400 }
      );
    }

    const type = body.type === "DEPOSIT" ? "DEPOSIT" : "WITHDRAWAL";
    const reason = body.reason?.trim() || (type === "DEPOSIT" ? "إيداع نقدي في الدرج" : "سحب نقدي من الدرج");

    const transaction = await db.cashTransaction.create({
      data: {
        sessionId: id,
        storeId,
        type,
        amount,
        reason,
        userId: session.userId,
      },
      include: {
        user: { select: { name: true } },
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/cash-sessions/:id/transactions");
  }
}
