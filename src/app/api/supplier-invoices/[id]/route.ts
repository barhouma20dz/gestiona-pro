import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// GET /api/supplier-invoices/:id — single invoice (with items + supplier)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id } = await params;

    const invoice = await db.supplierInvoice.findFirst({
      where: { id, storeId: session.storeId },
      include: { items: true, supplier: true },
    });
    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(invoice);
  } catch (error) {
    return handleRouteError(error, "GET /api/supplier-invoices/:id");
  }
}

// PUT /api/supplier-invoices/:id — update status / paidAmount / notes
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id } = await params;
    const body = await request.json();

    const existing = await db.supplierInvoice.findFirst({
      where: { id, storeId: session.storeId },
      select: { id: true, totalAmount: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (body?.paidAmount !== undefined) {
      const paid = Number(body.paidAmount);
      if (Number.isNaN(paid) || paid < 0) {
        return NextResponse.json(
          { error: "paidAmount must be a number >= 0" },
          { status: 400 }
        );
      }
      data.paidAmount = paid;
      // Auto-derive status from totalAmount + paidAmount unless explicitly set
      if (body?.status === undefined) {
        data.status =
          paid >= existing.totalAmount
            ? "PAID"
            : paid > 0
              ? "PARTIAL"
              : "UNPAID";
      }
    }
    if (typeof body?.status === "string") {
      const valid = ["PAID", "PARTIAL", "UNPAID"];
      if (!valid.includes(body.status)) {
        return NextResponse.json(
          { error: `status must be one of ${valid.join(", ")}` },
          { status: 400 }
        );
      }
      data.status = body.status;
    }
    if (typeof body?.notes === "string") {
      data.notes = body.notes;
    }
    if (body?.attachmentUrl !== undefined) {
      data.attachmentUrl = typeof body.attachmentUrl === "string" ? body.attachmentUrl.trim() : null;
    }
    if (typeof body?.invoiceNo === "string" && body.invoiceNo.trim()) {
      // Enforce unique [storeId, invoiceNo] if changing
      const dup = await db.supplierInvoice.findFirst({
        where: {
          storeId: session.storeId,
          invoiceNo: body.invoiceNo,
          NOT: { id: existing.id },
        },
        select: { id: true },
      });
      if (dup) {
        return NextResponse.json(
          { error: `Invoice number '${body.invoiceNo}' already exists` },
          { status: 409 }
        );
      }
      data.invoiceNo = body.invoiceNo.trim();
    }

    const updated = await db.supplierInvoice.update({
      where: { id },
      data,
      include: { items: true, supplier: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, "PUT /api/supplier-invoices/:id");
  }
}

// DELETE /api/supplier-invoices/:id — delete invoice (cascades items)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id } = await params;

    const existing = await db.supplierInvoice.findFirst({
      where: { id, storeId: session.storeId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    await db.supplierInvoice.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/supplier-invoices/:id");
  }
}
