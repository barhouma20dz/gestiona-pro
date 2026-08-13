import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

// GET /api/sales — list all sales newest first, include items
export async function GET() {
  try {
    const sales = await db.sale.findMany({
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(sales);
  } catch (error) {
    console.error("[GET /api/sales]", error);
    return NextResponse.json(
      { error: "Failed to fetch sales" },
      { status: 500 }
    );
  }
}

// POST /api/sales — create a sale (atomic transaction)
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateSaleBody;

    // --- Validation ---
    if (
      !body ||
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {
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

    // Validate quantities up-front
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

    // --- Resolve shop (auto-create default if missing) ---
    let shop = await db.shop.findFirst();
    if (!shop) {
      shop = await db.shop.create({
        data: {
          name: "My Store",
          footerText: "Thank you for shopping with us!",
          currency: "₹",
          taxRate: 0,
        },
      });
    }

    // --- Run everything atomically ---
    const created = await db.$transaction(async (tx) => {
      // Fetch all products by id
      const productIds = body.items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      // Validate each line item against DB state
      const saleItemLines: {
        product: (typeof products)[number];
        quantity: number;
        lineTotal: number;
      }[] = [];

      for (const item of body.items) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new Error(
            `Product with id '${item.productId}' not found`
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
      const taxRate = shop!.taxRate ?? 0;
      const taxAmount = (taxableBase * taxRate) / 100;
      const total = taxableBase + taxAmount;
      const itemCount = saleItemLines.reduce(
        (sum, l) => sum + l.quantity,
        0
      );

      // Generate receipt number: INV-YYYYMMDD-XXXX based on today's count
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
          createdAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      });
      const receiptNo = `INV-${datePrefix}-${pad(todayCount + 1, 4)}`;

      // Create the sale + items, and decrement stock atomically
      const sale = await tx.sale.create({
        data: {
          receiptNo,
          subtotal,
          taxAmount,
          discount: effectiveDiscount,
          total,
          paymentMethod,
          itemCount,
          shopId: shop!.id,
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

      // Decrement stock (clamp at 0)
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

    // Distinguish "not found" validation errors from server errors
    if (/not found/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error("[POST /api/sales]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
