import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// GET /api/purchase-orders/:id — get a single purchase order
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id } = await params;

    const order = await db.purchaseOrder.findFirst({
      where: { id, storeId: session.storeId },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
        invoice: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    return handleRouteError(error, "GET /api/purchase-orders/:id");
  }
}

// PUT /api/purchase-orders/:id — update status (e.g. SENT, CANCELLED) or notes
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id } = await params;
    const body = await request.json();

    const existing = await db.purchaseOrder.findFirst({
      where: { id, storeId: session.storeId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    const data: Record<string, any> = {};

    if (typeof body?.status === "string") {
      const allowed = ["DRAFT", "SENT", "PARTIAL", "RECEIVED", "CANCELLED"];
      if (!allowed.includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      data.status = body.status;
    }

    if (typeof body?.notes === "string") {
      data.notes = body.notes.trim();
    }

    if (body?.expectedDate !== undefined) {
      data.expectedDate = body.expectedDate ? new Date(body.expectedDate) : null;
    }

    const updated = await db.purchaseOrder.update({
      where: { id },
      data,
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
        invoice: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, "PUT /api/purchase-orders/:id");
  }
}

// DELETE /api/purchase-orders/:id — delete a purchase order (allowed only if DRAFT or CANCELLED)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id } = await params;

    const existing = await db.purchaseOrder.findFirst({
      where: { id, storeId: session.storeId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    if (existing.status !== "DRAFT" && existing.status !== "CANCELLED") {
      return NextResponse.json(
        { error: "Only draft or cancelled purchase orders can be deleted" },
        { status: 400 }
      );
    }

    await db.purchaseOrder.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/purchase-orders/:id");
  }
}
