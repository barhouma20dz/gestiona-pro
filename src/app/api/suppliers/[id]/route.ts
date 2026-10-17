import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// PUT /api/suppliers/:id — update a supplier (must belong to the store)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id } = await params;
    const body = await request.json();

    const existing = await db.supplier.findFirst({
      where: { id, storeId: session.storeId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (typeof body?.name === "string") {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json(
          { error: "Supplier name cannot be empty" },
          { status: 400 }
        );
      }
      data.name = name;
    }
    if (typeof body?.phone === "string") data.phone = body.phone;
    if (typeof body?.email === "string") data.email = body.email;
    if (typeof body?.address === "string") data.address = body.address;
    if (typeof body?.notes === "string") data.notes = body.notes;
    if (typeof body?.leadTimeDays === "number") data.leadTimeDays = body.leadTimeDays;
    if (typeof body?.paymentTerms === "string") data.paymentTerms = body.paymentTerms;

    const updated = await db.supplier.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, "PUT /api/suppliers/:id");
  }
}

// DELETE /api/suppliers/:id — delete a supplier (404 if has invoices)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id } = await params;

    const existing = await db.supplier.findFirst({
      where: { id, storeId: session.storeId },
      include: { _count: { select: { invoices: true } } },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }
    if (existing._count.invoices > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete supplier with ${existing._count.invoices} invoice(s). Remove or reassign invoices first.`,
        },
        { status: 400 }
      );
    }

    await db.supplier.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/suppliers/:id");
  }
}
