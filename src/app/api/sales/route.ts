import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";
import type { Prisma } from "@prisma/client";

type PaymentMethod = "Cash" | "UPI" | "Card";
const VALID_PAYMENT_METHODS: PaymentMethod[] = ["Cash", "UPI", "Card"];

interface SaleItemInput {
  productId: string;
  quantity: number;
}

interface CreateSaleBody {
  items: SaleItemInput[];
  discount: number;
  paymentMethod: PaymentMethod;
  sellerId?: string | null;
}

function pad(n: number, width = 4): string {
  return n.toString().padStart(width, "0");
}

function dateStamp(d: Date): string {
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1, 2);
  const day = pad(d.getDate(), 2);
  return `${y}${m}${day}`;
}

/**
 * GET /api/sales
 * - STAFF: only their own sales (where sellerId === session.userId)
 * - OWNER: all store sales, optionally filtered by ?sellerId=
 */
export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    if (!session.storeId) {
      return NextResponse.json(
        { error: "No store associated with this account" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const where: Prisma.SaleWhereInput = { storeId: session.storeId };

    if (session.role === "STAFF") {
      where.sellerId = session.userId;
    } else if (session.role === "OWNER") {
      const sellerId = searchParams.get("sellerId");
      if (sellerId) {
        where.sellerId = sellerId;
      }
    }

    const sales = await db.sale.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(sales);
  } catch (error) {
    return handleRouteError(error, "GET /api/sales");
  }
}

/**
 * POST /api/sales — create a sale (atomic transaction, store-scoped)
 * - STAFF: sellerId is forced to session.userId
 * - OWNER: sellerId can be passed in body or null
 */
export async function POST(request: Request) {
  try {
    const session = await requireStoreOwner();
    const body = (await request.json()) as CreateSaleBody;

    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Sale must contain at least one item" },
        { status: 400 }
      );
    }

    const paymentMethod = body.paymentMethod;
    if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json(
        {
          error: `paymentMethod must be one of ${VALID_PAYMENT_METHODS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const discount = Number(body.discount ?? 0);
    if (Number.isNaN(discount) || discount < 0) {
      return NextResponse.json(
        { error: "discount must be a number >= 0" },
        { status: 400 }
      );
    }

    for (const item of body.items) {
      const qty = Number(item.quantity);
      if (
        !item.productId ||
        typeof item.productId !== "string" ||
        Number.isNaN(qty) ||
        !Number.isInteger(qty) ||
        qty <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "Each item must have a valid productId and an integer quantity > 0",
          },
          { status: 400 }
        );
      }
    }

    const storeId = session.storeId!;

    // Determine sellerId:
    // - STAFF: forced to their own userId
    // - OWNER: optional from body, validated to belong to the same store
    let sellerId: string | null = null;
    if (session.role === "STAFF") {
      sellerId = session.userId;
    } else if (session.role === "OWNER" && body.sellerId) {
      const seller = await db.user.findFirst({
        where: {
          id: body.sellerId,
          storeId,
          role: "STAFF",
        },
        select: { id: true },
      });
      if (seller) {
        sellerId = seller.id;
      }
    }

    // Fetch store (for taxRate) — outside transaction to avoid extra locks
    const store = await db.store.findUnique({
      where: { id: storeId },
      select: { taxRate: true },
    });
    if (!store) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      );
    }

    const created = await db.$transaction(async (tx) => {
      const productIds = body.items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, storeId },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      const saleItemLines: {
        product: (typeof products)[number];
        quantity: number;
        lineTotal: number;
      }[] = [];

      for (const item of body.items) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new Error(
            `Product with id '${item.productId}' not found in your store`
          );
        }
        const qty = Number(item.quantity);
        const lineTotal = product.price * qty;
        saleItemLines.push({ product, quantity: qty, lineTotal });
      }

      const subtotal = saleItemLines.reduce(
        (sum, l) => sum + l.lineTotal,
        0
      );
      const effectiveDiscount = Math.min(discount, subtotal);
      const taxableBase = Math.max(0, subtotal - effectiveDiscount);
      const taxRate = store.taxRate ?? 0;
      const taxAmount = (taxableBase * taxRate) / 100;
      const total = taxableBase + taxAmount;
      const itemCount = saleItemLines.reduce(
        (sum, l) => sum + l.quantity,
        0
      );

      // Generate receipt number unique per store: INV-YYYYMMDD-XXXX
      const today = new Date();
      const datePrefix = dateStamp(today);
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const endOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1
      );

      const todayCount = await tx.sale.count({
        where: {
          storeId,
          createdAt: { gte: startOfDay, lt: endOfDay },
        },
      });
      const receiptNo = `INV-${datePrefix}-${pad(todayCount + 1, 4)}`;

      const sale = await tx.sale.create({
        data: {
          receiptNo,
          subtotal,
          taxAmount,
          discount: effectiveDiscount,
          total,
          paymentMethod,
          itemCount,
          store: { connect: { id: storeId } },
          ...(sellerId ? { seller: { connect: { id: sellerId } } } : {}),
          items: {
            create: saleItemLines.map((l) => ({
              productId: l.product.id,
              productName: l.product.name,
              unitPrice: l.product.price,
              quantity: l.quantity,
              total: l.lineTotal,
            })),
          },
        },
        include: { items: true },
      });

      for (const l of saleItemLines) {
        const newStock = Math.max(0, l.product.stock - l.quantity);
        await tx.product.update({
          where: { id: l.product.id },
          data: { stock: newStock },
        });
      }

      return sale;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create sale";
    if (/not found/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return handleRouteError(error, "POST /api/sales");
  }
}
