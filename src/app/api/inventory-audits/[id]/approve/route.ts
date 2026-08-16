import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// POST /api/inventory-audits/:id/approve — approve audit + update product stock
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id } = await params;

    const audit = await db.inventoryAudit.findFirst({
      where: { id, storeId: session.storeId },
      include: { items: true },
    });
    if (!audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }
    if (audit.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Audit must be in COMPLETED status before it can be approved" },
        { status: 400 }
      );
    }

    await db.$transaction(async (tx) => {
      // 1. Update product stock to match countedStock for each item
      for (const item of audit.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: item.countedStock },
        });
      }

      // 2. Mark audit approved
      await tx.inventoryAudit.update({
        where: { id: audit.id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedBy: session.userId,
        },
      });
    });

    const updated = await db.inventoryAudit.findUnique({
      where: { id },
      include: { items: { orderBy: { productName: "asc" } }, approver: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, "POST /api/inventory-audits/:id/approve");
  }
}
