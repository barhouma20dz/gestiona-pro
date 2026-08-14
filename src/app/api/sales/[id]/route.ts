import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// GET /api/sales/:id — fetch a single sale (with items), scoped to the store
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id } = await params;

    const sale = await db.sale.findFirst({
      where: { id, storeId: session.storeId },
      include: { items: true },
    });

    if (!sale) {
      return NextResponse.json(
        { error: "Sale not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(sale);
  } catch (error) {
    return handleRouteError(error, "GET /api/sales/:id");
  }
}
