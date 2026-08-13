import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/sales/stats — today's stats:
// totalSales, transactionCount, itemsSold, avgTicket
export async function GET() {
  try {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );

    const sales = await db.sale.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      include: { items: true },
    });

    const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
    const transactionCount = sales.length;
    const itemsSold = sales.reduce((sum, s) => sum + s.itemCount, 0);
    const avgTicket = transactionCount > 0 ? totalSales / transactionCount : 0;

    // Round to 2 decimals for cleaner client display
    const round2 = (n: number) => Math.round(n * 100) / 100;

    return NextResponse.json({
      totalSales: round2(totalSales),
      transactionCount,
      itemsSold,
      avgTicket: round2(avgTicket),
    });
  } catch (error) {
    console.error("[GET /api/sales/stats]", error);
    return NextResponse.json(
      { error: "Failed to fetch sales stats" },
      { status: 500 }
    );
  }
}
