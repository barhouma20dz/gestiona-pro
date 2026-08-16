import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

interface CreateAuditBody {
  year?: number;
  auditDate?: string;
  notes?: string;
}

// GET /api/inventory-audits — list all audits for the store
export async function GET() {
  try {
    const session = await requireStoreOwner();
    const audits = await db.inventoryAudit.findMany({
      where: { storeId: session.storeId },
      include: { items: true, approver: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(audits);
  } catch (error) {
    return handleRouteError(error, "GET /api/inventory-audits");
  }
}

// POST /api/inventory-audits — create audit + auto-populate items from current products
export async function POST(request: Request) {
  try {
    const session = await requireStoreOwner();
    const body = (await request.json()) as CreateAuditBody;

    const year = Number(body?.year);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        { error: "year must be a valid integer between 2000 and 2100" },
        { status: 400 }
      );
    }

    const auditDate = body?.auditDate ? new Date(body.auditDate) : new Date();
    if (Number.isNaN(auditDate.getTime())) {
      return NextResponse.json(
        { error: "auditDate must be a valid ISO date string" },
        { status: 400 }
      );
    }

    const notes = typeof body?.notes === "string" ? body.notes.trim() : "";

    // Snapshot current products to create audit items
    const products = await db.product.findMany({
      where: { storeId: session.storeId },
      orderBy: { name: "asc" },
    });

    const created = await db.$transaction(async (tx) => {
      const audit = await tx.inventoryAudit.create({
        data: {
          year,
          auditDate,
          status: "DRAFT",
          notes,
          store: { connect: { id: session.storeId } },
          items: {
            create: products.map((p) => ({
              productId: p.id,
              productName: p.name,
              barcode: p.barcode,
              unitType: p.unitType,
              systemStock: p.stock,
              countedStock: p.stock,
              difference: 0,
              costPrice: p.costPrice,
              differenceValue: 0,
            })),
          },
        },
        include: { items: true, approver: true },
      });

      return audit;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/inventory-audits");
  }
}
