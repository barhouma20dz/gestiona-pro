import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

type Params = { params: Promise<{ id: string }> };

// PUT /api/customers/:id — update a customer
export async function PUT(request: Request, { params }: Params) {
  try {
    const session = await requireStoreOwner();
    const storeId = session.storeId;
    const { id } = await params;
    const body = await request.json();

    const existing = await db.customer.findFirst({
      where: { id, storeId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const data: { name?: string; phone?: string; address?: string; notes?: string } = {};
    if (typeof body?.name === "string" && body.name.trim()) {
      data.name = body.name.trim();
    }
    if (typeof body?.phone === "string") {
      data.phone = body.phone.trim();
      if (data.phone) {
        const dup = await db.customer.findUnique({
          where: { storeId_phone: { storeId, phone: data.phone } },
        });
        if (dup && dup.id !== id) {
          return NextResponse.json(
            { error: "This phone number is already registered" },
            { status: 409 }
          );
        }
      }
    }
    if (typeof body?.address === "string") data.address = body.address;
    if (typeof body?.notes === "string") data.notes = body.notes;

    const updated = await db.customer.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, "PUT /api/customers/:id");
  }
}

// DELETE /api/customers/:id — delete a customer (their sales stay, customer ref nulls)
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await requireStoreOwner();
    const storeId = session.storeId;
    const { id } = await params;

    const existing = await db.customer.findFirst({
      where: { id, storeId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    await db.customer.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/customers/:id");
  }
}
