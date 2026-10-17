import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

type Params = { params: Promise<{ id: string }> };

// GET /api/customers/:id/statement — detailed chronological account statement
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

    // Fetch credit sales (debits - customer owes money)
    const creditSales = await db.sale.findMany({
      where: { storeId, customerId: id, paymentMethod: "CREDIT" },
      select: {
        id: true,
        receiptNo: true,
        total: true,
        createdAt: true,
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

    // Fetch debt repayments (credits - customer pays off debt)
    const payments = await db.customerPayment.findMany({
      where: { storeId, customerId: id },
      include: { user: { select: { name: true } } },
    });

    // Merge transactions into chronological order
    interface StatementEntry {
      id: string;
      date: string;
      type: "CREDIT_SALE" | "PAYMENT";
      title: string;
      reference: string;
      debit: number;   // المبلغ المستحق على الزبون
      credit: number;  // المبلغ المسدد من الزبون
      runningBalance: number; // الرصيد التراكمي بعد العملية
      details?: string;
      receivedBy?: string | null;
    }

    const rawEntries: Array<{
      id: string;
      date: Date;
      type: "CREDIT_SALE" | "PAYMENT";
      title: string;
      reference: string;
      debit: number;
      credit: number;
      details?: string;
      receivedBy?: string | null;
    }> = [];

    for (const sale of creditSales) {
      const itemsSummary = sale.items
        .map((it) => `${it.productName} (${it.quantity})`)
        .slice(0, 3)
        .join("، ");
      rawEntries.push({
        id: sale.id,
        date: sale.createdAt,
        type: "CREDIT_SALE",
        title: "عملية بيع بالآجل",
        reference: sale.receiptNo,
        debit: sale.total,
        credit: 0,
        details: itemsSummary ? `${itemsSummary}...` : undefined,
      });
    }

    for (const pay of payments) {
      rawEntries.push({
        id: pay.id,
        date: pay.paymentDate,
        type: "PAYMENT",
        title: `تسديد دفعة (${pay.paymentMethod})`,
        reference: pay.notes || "تسديد نقدي",
        debit: 0,
        credit: pay.amount,
        receivedBy: pay.user?.name,
      });
    }

    // Sort ascending by date for accurate running balance
    rawEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

    let balance = 0;
    const ledger: StatementEntry[] = rawEntries.map((e) => {
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
        receivedBy: e.receivedBy,
      };
    });

    const totalDebit = rawEntries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = rawEntries.reduce((sum, e) => sum + e.credit, 0);
    const currentOutstanding = Math.max(0, totalDebit - totalCredit);

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
      },
      summary: {
        totalDebit,
        totalCredit,
        currentOutstanding,
      },
      ledger,
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/customers/:id/statement");
  }
}
