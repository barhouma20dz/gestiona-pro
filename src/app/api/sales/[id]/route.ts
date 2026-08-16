import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// GET /api/sales/:id — fetch a single sale (with items), scoped to the store.
// STAFF users can only access their own sales; OWNER can access any store sale.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (!session.storeId) {
      return NextResponse.json(
        { error: "No store associated with this account" },
        { status: 403 }
      );
    }
    const { id } = await params;

    const where: { id: string; storeId: string; sellerId?: string } = {
      id,
      storeId: session.storeId,
    };
    if (session.role === "STAFF") {
      where.sellerId = session.userId;
    }

    const sale = await db.sale.findFirst({
      where,
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
