import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// GET /api/inventory-audits/:id/stats — summary of audit differences
export async function GET(
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

    let matchedCount = 0;
    let shortageCount = 0;
    let surplusCount = 0;
    let shortageValue = 0;
    let surplusValue = 0;
    for (const item of audit.items) {
      if (item.difference === 0) {
        matchedCount += 1;
      } else if (item.difference < 0) {
        shortageCount += 1;
        shortageValue += Math.abs(item.differenceValue);
      } else {
        surplusCount += 1;
        surplusValue += item.differenceValue;
      }
    }

    return NextResponse.json({
      totalProducts: audit.items.length,
      matchedCount,
      shortageCount,
      surplusCount,
      shortageValue,
      surplusValue,
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/inventory-audits/:id/stats");
  }
}
