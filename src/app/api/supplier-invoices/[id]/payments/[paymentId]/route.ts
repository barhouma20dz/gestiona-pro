import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// DELETE /api/supplier-invoices/:id/payments/:paymentId — reverse payment effect
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id, paymentId } = await params;

    const result = await db.$transaction(async (tx) => {
      // Verify invoice belongs to store
      const invoice = await tx.supplierInvoice.findFirst({
        where: { id, storeId: session.storeId },
        select: { id: true, totalAmount: true, paidAmount: true },
      });
      if (!invoice) {
        throw new Error("INVOICE_NOT_FOUND");
      }

      const payment = await tx.supplierPayment.findUnique({
        where: { id: paymentId },
        select: { id: true, invoiceId: true, amount: true },
      });
      if (!payment || payment.invoiceId !== id) {
        throw new Error("PAYMENT_NOT_FOUND");
      }

      await tx.supplierPayment.delete({ where: { id: paymentId } });

      const newPaidAmount = Math.max(0, invoice.paidAmount - payment.amount);
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

      return { ok: true };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    if (msg === "INVOICE_NOT_FOUND" || msg === "PAYMENT_NOT_FOUND") {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }
    return handleRouteError(
      error,
      "DELETE /api/supplier-invoices/:id/payments/:paymentId"
    );
  }
}
