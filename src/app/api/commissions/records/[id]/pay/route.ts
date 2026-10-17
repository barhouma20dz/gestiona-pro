import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// POST /api/commissions/records/[id]/pay — record payout for approved reward
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const record = await db.sellerRewardRecord.findFirst({
      where: { id, storeId: session.storeId },
      include: { seller: true },
    });

    if (!record) {
      return NextResponse.json({ error: "Reward record not found" }, { status: 404 });
    }

    const paymentMethod = typeof body?.paymentMethod === "string" ? body.paymentMethod : "Cash";

    const updated = await db.sellerRewardRecord.update({
      where: { id: record.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paidBy: session.userId,
        paymentMethod,
        notes: typeof body?.notes === "string" ? body.notes : record.notes,
      },
      include: {
        seller: {
          select: { id: true, name: true, username: true, email: true },
        },
      },
    });

    // Automatically record an Expense in the store's expenses table for complete ledger integrity
    try {
      await db.expense.create({
        data: {
          storeId: session.storeId,
          category: "SALARIES",
          categoryLabel: "رواتب ومكافآت",
          amount: record.approvedAmount,
          expenseDate: new Date(),
          paymentMethod: paymentMethod === "BARIDIMOB" ? "Baridimob" : "Cash",
          paidTo: record.seller?.name || "بائع",
          notes: `تسديد مكافأة مستحقة للموظف رقم: ${record.id}`,
          userId: session.userId,
        },
      });
    } catch {
      // Non-fatal if expense table constraint, continue
    }

    // Record audit log
    await db.auditLog.create({
      data: {
        storeId: session.storeId,
        userId: session.userId,
        userName: session.email,
        action: "PAY",
        entity: "SELLER_REWARD",
        entityId: updated.id,
        details: JSON.stringify({
          seller: record.seller?.name || record.sellerId,
          paidAmount: record.approvedAmount,
          paymentMethod,
        }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, "POST /api/commissions/records/[id]/pay");
  }
}
