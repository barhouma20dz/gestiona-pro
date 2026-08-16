import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";
import type { Prisma } from "@prisma/client";

// GET /api/sales/stats — today's stats scoped to the current store.
// STAFF users only see their own sales; OWNER sees store-wide.
export async function GET() {
  try {
    const session = await requireAuth();
    if (!session.storeId) {
      return NextResponse.json(
        { error: "No store associated with this account" },
        { status: 403 }
      );
    }

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

    const where: Prisma.SaleWhereInput = {
      storeId: session.storeId,
      createdAt: { gte: startOfDay, lt: endOfDay },
    };
    if (session.role === "STAFF") {
      where.sellerId = session.userId;
    }

    const sales = await db.sale.findMany({
      where,
      include: { items: true },
    });

    const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
    const transactionCount = sales.length;
    const itemsSold = sales.reduce((sum, s) => sum + s.itemCount, 0);
    const avgTicket = transactionCount > 0 ? totalSales / transactionCount : 0;

    const round2 = (n: number) => Math.round(n * 100) / 100;

    return NextResponse.json({
      totalSales: round2(totalSales),
      transactionCount,
      itemsSold,
      avgTicket: round2(avgTicket),
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/sales/stats");
  }
}
