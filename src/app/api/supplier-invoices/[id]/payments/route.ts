import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

interface CreatePaymentBody {
  amount?: number;
  paymentDate?: string;
  paymentMethod?: string;
  notes?: string;
}

// GET /api/supplier-invoices/:id/payments — list all payments for an invoice
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id } = await params;

    // Verify invoice belongs to store
    const invoice = await db.supplierInvoice.findFirst({
      where: { id, storeId: session.storeId },
      select: { id: true },
    });
    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    const payments = await db.supplierPayment.findMany({
      where: { invoiceId: id },
      include: { user: true },
      orderBy: { paymentDate: "desc" },
    });
    return NextResponse.json(payments);
  } catch (error) {
    return handleRouteError(error, "GET /api/supplier-invoices/:id/payments");
  }
}

// POST /api/supplier-invoices/:id/payments — record a new payment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id } = await params;
    const body = (await request.json()) as CreatePaymentBody;

    const amount = Number(body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "amount must be a positive number" },
        { status: 400 }
      );
    }

    const validMethods = ["Cash", "Bank", "Cheque", "Other"];
    const paymentMethod =
      typeof body?.paymentMethod === "string" && validMethods.includes(body.paymentMethod)
        ? body.paymentMethod
        : "Cash";

    const paymentDate =
      body?.paymentDate && body.paymentDate.trim() !== ""
        ? new Date(body.paymentDate)
        : new Date();
    if (Number.isNaN(paymentDate.getTime())) {
      return NextResponse.json(
        { error: "paymentDate must be a valid ISO date string" },
        { status: 400 }
      );
    }

    const notes = typeof body?.notes === "string" ? body.notes.trim() : "";

    const result = await db.$transaction(async (tx) => {
      const invoice = await tx.supplierInvoice.findFirst({
        where: { id, storeId: session.storeId },
        select: { id: true, totalAmount: true, paidAmount: true },
      });
      if (!invoice) {
        throw new Error("INVOICE_NOT_FOUND");
      }
      const remaining = invoice.totalAmount - invoice.paidAmount;
      if (amount > remaining + 0.0001) {
        // small float tolerance
        throw new Error(
          `AMOUNT_EXCEEDS_REMAINING: ${amount.toFixed(2)} > ${remaining.toFixed(2)}`
        );
      }

      const payment = await tx.supplierPayment.create({
        data: {
          invoice: { connect: { id: invoice.id } },
          store: { connect: { id: session.storeId } },
          amount,
          paymentDate,
          paymentMethod,
          notes,
          user: session.userId ? { connect: { id: session.userId } } : undefined,
        },
        include: { user: true },
      });

      const newPaidAmount = invoice.paidAmount + amount;
      const newStatus =
        newPaidAmount >= invoice.totalAmount
          ? "PAID"
          : newPaidAmount > 0
            ? "PARTIAL"
            : "UNPAID";

      await tx.supplierInvoice.update({
        where: { id: invoice.id },
        data: { paidAmount: newPaidAmount, status: newStatus },
      });

      return payment;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "INVOICE_NOT_FOUND") {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }
    if (msg.startsWith("AMOUNT_EXCEEDS_REMAINING")) {
      return NextResponse.json(
        { error: "Amount exceeds the remaining invoice balance" },
        { status: 400 }
      );
    }
    return handleRouteError(error, "POST /api/supplier-invoices/:id/payments");
  }
}
