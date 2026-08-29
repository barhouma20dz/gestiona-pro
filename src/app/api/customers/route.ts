import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// GET /api/customers — list customers with computed stats:
//   - totalSales / creditOutstanding (CREDIT sales total − debt payments)
//   - loyaltyPoints balance
export async function GET() {
  try {
    const session = await requireStoreOwner();
    const storeId = session.storeId;

    const customers = await db.customer.findMany({
      where: { storeId },
      include: {
        sales: {
          select: { total: true, paymentMethod: true, createdAt: true },
        },
        payments: { select: { amount: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = customers.map((c) => {
      const creditTotal = c.sales
        .filter((s) => s.paymentMethod === "CREDIT")
        .reduce((sum, s) => sum + s.total, 0);
      const paidTotal = c.payments.reduce((sum, p) => sum + p.amount, 0);
      const lastSaleAt = c.sales.reduce<string | null>((latest, s) => {
        const iso = s.createdAt.toISOString();
        return !latest || iso > latest ? iso : latest;
      }, null);
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        notes: c.notes,
        loyaltyPoints: c.loyaltyPoints,
        totalSales: c.sales.reduce((sum, s) => sum + s.total, 0),
        salesCount: c.sales.length,
        creditOutstanding: Math.max(0, creditTotal - paidTotal),
        lastSaleAt,
        createdAt: c.createdAt,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, "GET /api/customers");
  }
}

// POST /api/customers — create a customer
export async function POST(request: Request) {
  try {
    const session = await requireStoreOwner();
    const storeId = session.storeId;
    const body = await request.json();

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "Customer name is required" },
        { status: 400 }
      );
    }
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

    // Enforce per-store phone uniqueness when a phone is provided
    if (phone) {
      const existing = await db.customer.findUnique({
        where: { storeId_phone: { storeId, phone } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "This phone number is already registered" },
          { status: 409 }
        );
      }
    }

    const customer = await db.customer.create({
      data: {
        storeId,
        name,
        phone,
        address: typeof body?.address === "string" ? body.address : "",
        notes: typeof body?.notes === "string" ? body.notes : "",
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/customers");
  }
}
