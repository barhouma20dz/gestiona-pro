import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";
import { calculateSessionCashFlow } from "../../route";

type Params = { params: Promise<{ id: string }> };

// POST /api/cash-sessions/:id/close — close cash drawer session with discrepancy check
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
      return NextResponse.json({ error: "هذه الجلسة مغلقة بالفعل مسبقاً" }, { status: 400 });
    }

    const closingCashActual = Number(body.closingCashActual);
    if (!Number.isFinite(closingCashActual) || closingCashActual < 0) {
      return NextResponse.json(
        { error: "المبلغ الفعلي المعدود يجب أن يكون رقماً صفراً أو موجباً" },
        { status: 400 }
      );
    }

    const closedAt = new Date();
    const flow = await calculateSessionCashFlow(storeId, cashSession.openedAt, closedAt);
    const closingCashExpected = cashSession.openingCash + flow.netCashFlow;
    const difference = closingCashActual - closingCashExpected;

    const closed = await db.cashSession.update({
      where: { id },
      data: {
        status: "CLOSED",
        closedAt,
        closingCashActual,
        closingCashExpected,
        difference,
        notes: body.notes?.trim() ? `${cashSession.notes}\n${body.notes.trim()}`.trim() : cashSession.notes,
      },
      include: {
        user: { select: { name: true } },
      },
    });

    return NextResponse.json({
      session: closed,
      flow,
      closingCashExpected,
      difference,
    });
  } catch (error) {
    return handleRouteError(error, "POST /api/cash-sessions/:id/close");
  }
}
