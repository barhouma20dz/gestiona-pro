import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

type Params = { params: Promise<{ id: string }> };

// GET /api/suppliers/:id/statement — detailed chronological supplier statement
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await requireStoreOwner();
    const storeId = session.storeId;
    const { id } = await params;

    const supplier = await db.supplier.findFirst({
      where: { id, storeId },
    });
    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    // Fetch supplier invoices
    const invoices = await db.supplierInvoice.findMany({
      where: { storeId, supplierId: id },
      include: {
        items: {
          select: {
            productName: true,
            quantity: true,
            unitPrice: true,
            total: true,
          },
        },
      },
    });

    // Fetch supplier payments
    const payments = await db.supplierPayment.findMany({
      where: { storeId, invoice: { supplierId: id } },
      include: {
        invoice: { select: { invoiceNo: true } },
        user: { select: { name: true } },
      },
    });

    interface SupplierStatementEntry {
      id: string;
      date: string;
      type: "INVOICE" | "PAYMENT";
      title: string;
      reference: string;
      debit: number;   // قيمة فاتورة المورد المستحقة
      credit: number;  // المبلغ المسدد للمورد
      runningBalance: number; // الرصيد المستحق التراكمي
      details?: string;
      paidBy?: string | null;
    }

    const rawEntries: Array<{
      id: string;
      date: Date;
      type: "INVOICE" | "PAYMENT";
      title: string;
      reference: string;
      debit: number;
      credit: number;
      details?: string;
      paidBy?: string | null;
    }> = [];

    for (const inv of invoices) {
      const itemsSummary = inv.items
        .map((it) => `${it.productName} (${it.quantity})`)
        .slice(0, 3)
        .join("، ");
      rawEntries.push({
        id: inv.id,
        date: inv.invoiceDate,
        type: "INVOICE",
        title: "فاتورة شراء من المورد",
        reference: inv.invoiceNo,
        debit: inv.totalAmount,
        credit: 0,
        details: itemsSummary ? `${itemsSummary}...` : undefined,
      });
    }

    for (const pay of payments) {
      rawEntries.push({
        id: pay.id,
        date: pay.paymentDate,
        type: "PAYMENT",
        title: `دفعة للمورد (${pay.paymentMethod})`,
        reference: pay.invoice.invoiceNo,
        debit: 0,
        credit: pay.amount,
        details: pay.notes || undefined,
        paidBy: pay.user?.name,
      });
    }

    // Sort ascending by date
    rawEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

    let balance = 0;
    const ledger: SupplierStatementEntry[] = rawEntries.map((e) => {
      balance += e.debit - e.credit;
      return {
        id: e.id,
        date: e.date.toISOString(),
        type: e.type,
        title: e.title,
        reference: e.reference,
        debit: e.debit,
        credit: e.credit,
        runningBalance: Math.max(0, balance),
        details: e.details,
        paidBy: e.paidBy,
      };
    });

    const totalInvoices = rawEntries.reduce((sum, e) => sum + e.debit, 0);
    const totalPaid = rawEntries.reduce((sum, e) => sum + e.credit, 0);
    const currentOutstanding = Math.max(0, totalInvoices - totalPaid);

    return NextResponse.json({
      supplier: {
        id: supplier.id,
        name: supplier.name,
        phone: supplier.phone,
        leadTimeDays: supplier.leadTimeDays,
        paymentTerms: supplier.paymentTerms,
      },
      summary: {
        totalInvoices,
        totalPaid,
        currentOutstanding,
      },
      ledger,
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/suppliers/:id/statement");
  }
}
