import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// POST /api/commissions/records/[id]/approve — approve seller reward
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

    const approvedAmount =
      typeof body?.approvedAmount === "number"
        ? Math.max(0, body.approvedAmount)
        : record.calculatedAmount;

    const updated = await db.sellerRewardRecord.update({
      where: { id: record.id },
      data: {
        status: "APPROVED",
        approvedAmount,
        approvedAt: new Date(),
        approvedBy: session.userId,
        notes: typeof body?.notes === "string" ? body.notes : record.notes,
      },
      include: {
        seller: {
          select: { id: true, name: true, username: true, email: true },
        },
      },
    });

    // Record audit log
    await db.auditLog.create({
      data: {
        storeId: session.storeId,
        userId: session.userId,
        userName: session.email,
        action: "APPROVE",
        entity: "SELLER_REWARD",
        entityId: updated.id,
        details: JSON.stringify({
          seller: record.seller?.name || record.sellerId,
          approvedAmount,
        }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, "POST /api/commissions/records/[id]/approve");
  }
}
