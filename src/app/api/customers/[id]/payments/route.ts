import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

type Params = { params: Promise<{ id: string }> };

const VALID_METHODS = ["Cash", "BARIDIMOB", "CARD", "CHEQUE"];

// GET /api/customers/:id/payments — debt repayment history (newest first)
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await requireStoreOwner();
    const storeId = session.storeId;
    const { id } = await params;

    const customer = await db.customer.findFirst({
      where: { id, storeId },
    });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const payments = await db.customerPayment.findMany({
      where: { customerId: id, storeId },
      include: { user: { select: { name: true } } },
      orderBy: { paymentDate: "desc" },
    });
    return NextResponse.json(payments);
  } catch (error) {
    return handleRouteError(error, "GET /api/customers/:id/payments");
  }
}

// POST /api/customers/:id/payments — record a debt repayment
export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requireStoreOwner();
    const storeId = session.storeId;
    const { id } = await params;
    const body = await request.json();

    const amount = Number(body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "amount must be a number > 0" },
        { status: 400 }
      );
    }

    const customer = await db.customer.findFirst({
      where: { id, storeId },
    });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const paymentMethod = VALID_METHODS.includes(body?.paymentMethod)
      ? body.paymentMethod
      : "Cash";

    // Optional: attach to a specific CREDIT sale and validate remaining amount
    let saleId: string | null = null;
    if (typeof body?.saleId === "string" && body.saleId) {
      const sale = await db.sale.findFirst({
        where: { id: body.saleId, storeId, customerId: id },
      });
      if (!sale) {
        return NextResponse.json(
          { error: "Sale not found for this customer" },
          { status: 404 }
        );
      }
      const paidSoFar = await db.customerPayment.aggregate({
        where: { saleId: sale.id },
        _sum: { amount: true },
      });
      const remaining = sale.total - (paidSoFar._sum.amount ?? 0);
      if (amount > remaining + 0.001) {
        return NextResponse.json(
          { error: "Payment exceeds the remaining amount for this sale" },
          { status: 400 }
        );
      }
      saleId = sale.id;
    }

    const payment = await db.customerPayment.create({
      data: {
        storeId,
        customerId: id,
        saleId,
        amount,
        paymentMethod,
        notes: typeof body?.notes === "string" ? body.notes : "",
        ...(session.userId ? { userId: session.userId } : {}),
      },
      include: { user: { select: { name: true } } },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/customers/:id/payments");
  }
}
