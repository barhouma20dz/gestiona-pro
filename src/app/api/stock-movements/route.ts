import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";
import type { Prisma } from "@prisma/client";

// GET /api/stock-movements — list inventory movements for store
export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    if (!session.storeId) {
      return NextResponse.json({ error: "No store associated" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const type = searchParams.get("type");
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || 100)));

    const where: Prisma.StockMovementWhereInput = {
      storeId: session.storeId,
    };

    if (productId) where.productId = productId;
    if (type) where.type = type;

    const movements = await db.stockMovement.findMany({
      where,
      include: {
        product: {
          select: { name: true, barcode: true, unitType: true, price: true },
        },
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(movements);
  } catch (error) {
    return handleRouteError(error, "GET /api/stock-movements");
  }
}

// POST /api/stock-movements — manual stock adjustment or loss recording
export async function POST(request: Request) {
  try {
    const session = await requireStoreOwner();
    const body = await request.json();

    const productId = typeof body?.productId === "string" ? body.productId.trim() : "";
    const type = typeof body?.type === "string" ? body.type.trim() : "ADJUSTMENT";
    const quantity = Number(body?.quantity);
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }
    if (Number.isNaN(quantity) || quantity <= 0) {
      return NextResponse.json({ error: "quantity must be > 0" }, { status: 400 });
    }

    const product = await db.product.findFirst({
      where: { id: productId, storeId: session.storeId },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const beforeQty = product.stock;
    let afterQty = beforeQty;

    if (type === "PURCHASE" || type === "RETURN") {
      afterQty = beforeQty + quantity;
    } else if (type === "WASTE" || type === "SALE") {
      afterQty = Math.max(0, beforeQty - quantity);
    } else {
      // Direct adjustment: quantity specifies the delta or target
      const isTarget = Boolean(body?.isTarget);
      afterQty = isTarget ? quantity : Math.max(0, beforeQty + quantity);
    }

    const movement = await db.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: { stock: afterQty },
      });

      return tx.stockMovement.create({
        data: {
          storeId: session.storeId,
          productId,
          type,
          quantity: Math.abs(afterQty - beforeQty),
          beforeQty,
          afterQty,
          unitCost: product.costPrice,
          reason: reason || `تسوية يدوية (${type})`,
          userId: session.userId,
        },
        include: {
          product: {
            select: { name: true, barcode: true, unitType: true },
          },
        },
      });
    });

    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/stock-movements");
  }
}
