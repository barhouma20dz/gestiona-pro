import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

interface UpdateAuditBody {
  notes?: string;
  status?: "DRAFT" | "COMPLETED" | "APPROVED";
}

// GET /api/inventory-audits/:id — single audit with items
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id } = await params;

    const audit = await db.inventoryAudit.findFirst({
      where: { id, storeId: session.storeId },
      include: { items: { orderBy: { productName: "asc" } }, approver: true },
    });
    if (!audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }
    return NextResponse.json(audit);
  } catch (error) {
    return handleRouteError(error, "GET /api/inventory-audits/:id");
  }
}

// PUT /api/inventory-audits/:id — update notes and/or status (DRAFT -> COMPLETED)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id } = await params;
    const body = (await request.json()) as UpdateAuditBody;

    const existing = await db.inventoryAudit.findFirst({
      where: { id, storeId: session.storeId },
      select: { id: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (typeof body?.notes === "string") {
      data.notes = body.notes.trim();
    }
    if (typeof body?.status === "string") {
      const valid = ["DRAFT", "COMPLETED", "APPROVED"];
      if (!valid.includes(body.status)) {
        return NextResponse.json(
          { error: `status must be one of ${valid.join(", ")}` },
          { status: 400 }
        );
      }
      // Only allow status transitions forward (DRAFT -> COMPLETED -> APPROVED)
      // Approval is handled by its own endpoint; here we allow DRAFT -> COMPLETED
      if (body.status === "COMPLETED" && existing.status !== "DRAFT") {
        return NextResponse.json(
          {
            error:
              "Audit can only be marked COMPLETED from DRAFT status; use the approve endpoint to APPROVE",
          },
          { status: 400 }
        );
      }
      if (body.status === "APPROVED") {
        return NextResponse.json(
          { error: "Use POST /api/inventory-audits/:id/approve to approve an audit" },
          { status: 400 }
        );
      }
      data.status = body.status;
    }

    const updated = await db.inventoryAudit.update({
      where: { id },
      data,
      include: { items: { orderBy: { productName: "asc" } }, approver: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, "PUT /api/inventory-audits/:id");
  }
}

// DELETE /api/inventory-audits/:id — only if DRAFT
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id } = await params;

    const existing = await db.inventoryAudit.findFirst({
      where: { id, storeId: session.storeId },
      select: { id: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }
    if (existing.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Cannot delete an audit that is not in DRAFT status" },
        { status: 400 }
      );
    }

    await db.inventoryAudit.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/inventory-audits/:id");
  }
}
