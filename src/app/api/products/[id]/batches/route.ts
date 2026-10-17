import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// GET /api/products/:id/batches — list batches for a specific product
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (!session.storeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const { id } = await params;

    const batches = await db.productBatch.findMany({
      where: { productId: id, storeId: session.storeId },
      orderBy: { expiryDate: "asc" },
    });

    return NextResponse.json(batches);
  } catch (error) {
    return handleRouteError(error, "GET /api/products/:id/batches");
  }
}

// POST /api/products/:id/batches — add a new batch / lot to product
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id } = await params;
    const body = await request.json();

    const product = await db.product.findFirst({
      where: { id, storeId: session.storeId },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const batchNumber = typeof body?.batchNumber === "string" && body.batchNumber.trim()
      ? body.batchNumber.trim()
      : `LOT-${Date.now().toString(36).toUpperCase()}`;
    const expiryDateStr = typeof body?.expiryDate === "string" ? body.expiryDate.trim() : "";
    const quantity = Number(body?.quantity);
    const costPrice = body?.costPrice !== undefined ? Number(body.costPrice) : product.costPrice;

    if (!expiryDateStr) {
      return NextResponse.json({ error: "expiryDate is required" }, { status: 400 });
    }
    const expiryDate = new Date(expiryDateStr);
    if (Number.isNaN(expiryDate.getTime())) {
      return NextResponse.json({ error: "Invalid expiryDate" }, { status: 400 });
    }
    if (Number.isNaN(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "quantity must be > 0" }, { status: 400 });
    }

    const batch = await db.$transaction(async (tx) => {
      const b = await tx.productBatch.create({
        data: {
          storeId: session.storeId,
          productId: id,
          batchNumber,
          expiryDate,
          quantity,
          costPrice,
          status: "ACTIVE",
        },
      });

      // Update product stock and record movement
      const newStock = product.stock + quantity;
      await tx.product.update({
        where: { id },
        data: {
          stock: newStock,
          expiryDate: !product.expiryDate || expiryDate < product.expiryDate ? expiryDate : product.expiryDate,
        },
      });

      await tx.stockMovement.create({
        data: {
          storeId: session.storeId,
          productId: id,
          type: "PURCHASE",
          quantity,
          beforeQty: product.stock,
          afterQty: newStock,
          unitCost: costPrice,
          reason: `إضافة دفعة إنتاج وصلاحية جديدة (#${batchNumber})`,
          referenceId: b.id,
          userId: session.userId,
        },
      });

      return b;
    });

    return NextResponse.json(batch, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/products/:id/batches");
  }
}
