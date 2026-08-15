import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";
import type { Prisma } from "@prisma/client";

// GET /api/suppliers — list suppliers (with invoices) for the current store
export async function GET() {
  try {
    const session = await requireStoreOwner();
    const suppliers = await db.supplier.findMany({
      where: { storeId: session.storeId },
      include: { invoices: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(suppliers);
  } catch (error) {
    return handleRouteError(error, "GET /api/suppliers");
  }
}

// POST /api/suppliers — create a supplier for the current store
export async function POST(request: Request) {
  try {
    const session = await requireStoreOwner();
    const body = await request.json();

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "Supplier name is required" },
        { status: 400 }
      );
    }
    const phone = typeof body?.phone === "string" ? body.phone : "";
    const email = typeof body?.email === "string" ? body.email : "";
    const address = typeof body?.address === "string" ? body.address : "";
    const notes = typeof body?.notes === "string" ? body.notes : "";

    const data: Prisma.SupplierCreateInput = {
      name,
      phone,
      email,
      address,
      notes,
      store: { connect: { id: session.storeId } },
    };

    const supplier = await db.supplier.create({ data });
    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/suppliers");
  }
}
