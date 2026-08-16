import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

interface UpdateItemsBody {
  items: { id: string; countedStock: number }[];
}

// PUT /api/inventory-audits/:id/items — bulk update counted stock
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id } = await params;
    const body = (await request.json()) as UpdateItemsBody;

    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "items must be a non-empty array" },
        { status: 400 }
      );
    }

    const audit = await db.inventoryAudit.findFirst({
      where: { id, storeId: session.storeId },
      select: { id: true, status: true },
    });
    if (!audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }
    if (audit.status === "APPROVED") {
      return NextResponse.json(
        { error: "Cannot modify items of an approved audit" },
        { status: 400 }
      );
    }

    // Validate each item belongs to the audit
    const itemIds = body.items.map((i) => i.id);
    const existingItems = await db.inventoryAuditItem.findMany({
      where: { id: { in: itemIds }, auditId: id },
      select: { id: true },
    });
    const validIds = new Set(existingItems.map((i) => i.id));
    const invalidIds = itemIds.filter((iid) => !validIds.has(iid));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: `Some items do not belong to this audit: ${invalidIds.join(", ")}` },
        { status: 400 }
      );
    }

    await db.$transaction(async (tx) => {
      for (const item of body.items) {
        const counted = Number(item.countedStock);
        if (Number.isNaN(counted) || counted < 0) {
          throw new Error(`countedStock must be a number >= 0 for item ${item.id}`);
        }
        // Fetch systemStock + costPrice from existing row to recompute difference
        const existing = await tx.inventoryAuditItem.findUnique({
          where: { id: item.id },
          select: { systemStock: true, costPrice: true },
        });
        if (!existing) continue; // shouldn't happen since we validated above
        const difference = counted - existing.systemStock;
        const differenceValue = difference * existing.costPrice;
        await tx.inventoryAuditItem.update({
          where: { id: item.id },
          data: {
            countedStock: counted,
            difference,
            differenceValue,
          },
        });
      }
    });

    const updated = await db.inventoryAudit.findUnique({
      where: { id },
      include: { items: { orderBy: { productName: "asc" } }, approver: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, "PUT /api/inventory-audits/:id/items");
  }
}
