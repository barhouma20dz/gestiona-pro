import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";
import type { Prisma } from "@prisma/client";

// GET /api/purchase-orders — list purchase orders for current tenant store
export async function GET(request: Request) {
  try {
    const session = await requireStoreOwner();
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId");
    const status = searchParams.get("status");

    const where: Prisma.PurchaseOrderWhereInput = {
      storeId: session.storeId,
    };
    if (supplierId) where.supplierId = supplierId;
    if (status && status !== "ALL") where.status = status;

    const orders = await db.purchaseOrder.findMany({
      where,
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            leadTimeDays: true,
            paymentTerms: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
                unitType: true,
              },
            },
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNo: true,
            status: true,
            totalAmount: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
  } catch (error) {
    return handleRouteError(error, "GET /api/purchase-orders");
  }
}

// POST /api/purchase-orders — create a new purchase order (DRAFT status, does NOT increase stock)
export async function POST(request: Request) {
  try {
    const session = await requireStoreOwner();
    const body = await request.json();

    const supplierId = typeof body?.supplierId === "string" ? body.supplierId.trim() : "";
    if (!supplierId) {
      return NextResponse.json({ error: "supplierId is required" }, { status: 400 });
    }

    const supplier = await db.supplier.findFirst({
      where: { id: supplierId, storeId: session.storeId },
      select: { id: true, name: true },
    });
    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found in your store" }, { status: 404 });
    }

    if (!Array.isArray(body?.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Purchase order must have at least one item" }, { status: 400 });
    }

    // Auto-generate order number if omitted: PO-YYYYMMDD-XXXX
    let orderNo = typeof body?.orderNo === "string" && body.orderNo.trim() ? body.orderNo.trim() : "";
    if (!orderNo) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const rand = Math.floor(1000 + Math.random() * 9000);
      orderNo = `PO-${dateStr}-${rand}`;
    }

    // Check unique orderNo in store
    const existing = await db.purchaseOrder.findFirst({
      where: { storeId: session.storeId, orderNo },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: `Order number '${orderNo}' already exists` }, { status: 409 });
    }

    const expectedDate = body?.expectedDate ? new Date(body.expectedDate) : null;
    const notes = typeof body?.notes === "string" ? body.notes.trim() : "";

    // Normalize items
    let totalAmount = 0;
    const itemsCreate: Prisma.PurchaseOrderItemCreateWithoutOrderInput[] = [];

    for (const item of body.items) {
      const productName = typeof item?.productName === "string" ? item.productName.trim() : "";
      if (!productName) {
        return NextResponse.json({ error: "Item productName is required" }, { status: 400 });
      }
      const orderedQty = parseFloat(item?.orderedQty);
      if (isNaN(orderedQty) || orderedQty <= 0) {
        return NextResponse.json({ error: "Item orderedQty must be a positive number" }, { status: 400 });
      }
      const unitCost = parseFloat(item?.unitCost) || 0;
      const total = orderedQty * unitCost;
      totalAmount += total;

      const itemRecord: Prisma.PurchaseOrderItemCreateWithoutOrderInput = {
        productName,
        orderedQty,
        receivedQty: 0,
        unitCost,
        total,
      };

      if (item.productId && typeof item.productId === "string") {
        itemRecord.product = { connect: { id: item.productId } };
      }

      itemsCreate.push(itemRecord);
    }

    const order = await db.purchaseOrder.create({
      data: {
        storeId: session.storeId,
        supplierId,
        orderNo,
        status: "DRAFT",
        expectedDate,
        totalAmount,
        notes,
        createdById: session.userId,
        items: {
          create: itemsCreate,
        },
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/purchase-orders");
  }
}
