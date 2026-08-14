import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// GET /api/suppliers/:id/invoices — list purchase invoices for a supplier
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id } = await params;

    // Verify the supplier belongs to the store
    const supplier = await db.supplier.findFirst({
      where: { id, storeId: session.storeId },
      select: { id: true, name: true },
    });
    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    const invoices = await db.supplierInvoice.findMany({
      where: { supplierId: id, storeId: session.storeId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      supplier,
      invoices,
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/suppliers/:id/invoices");
  }
}
