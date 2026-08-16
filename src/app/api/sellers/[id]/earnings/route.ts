import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * GET /api/sellers/[id]/earnings
 * Returns daily/weekly/monthly/all-time earnings for a seller.
 * Requires store owner + the seller must belong to the same store.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id } = await params;

    // Verify the seller belongs to the same store
    const seller = await db.user.findFirst({
      where: { id, storeId: session.storeId, role: "STAFF" },
      select: { id: true, name: true, email: true },
    });
    if (!seller) {
      return NextResponse.json(
        { error: "Seller not found" },
        { status: 404 }
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
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const baseWhere = {
      storeId: session.storeId!,
      sellerId: id,
    };

    const [
      allSales,
      todaySales,
      weekSales,
      monthSales,
    ] = await Promise.all([
      db.sale.findMany({
        where: baseWhere,
        include: { items: true },
        orderBy: { createdAt: "desc" },
      }),
      db.sale.findMany({
        where: {
          ...baseWhere,
          createdAt: { gte: startOfDay, lt: endOfDay },
        },
        include: { items: true },
      }),
      db.sale.findMany({
        where: {
          ...baseWhere,
          createdAt: { gte: startOfWeek },
        },
        include: { items: true },
      }),
      db.sale.findMany({
        where: {
          ...baseWhere,
          createdAt: { gte: startOfMonth },
        },
        include: { items: true },
      }),
    ]);

    // Build a product cost map once across all sales
    const productIds = new Set<string>();
    for (const sale of allSales) {
      for (const item of sale.items) {
        if (item.productId) productIds.add(item.productId);
      }
    }
    const products = productIds.size
      ? await db.product.findMany({
          where: { id: { in: Array.from(productIds) } },
          select: { id: true, costPrice: true },
        })
      : [];
    const costMap = new Map<string, number>();
    for (const p of products) costMap.set(p.id, p.costPrice ?? 0);

    const computeRevenue = (sales: typeof allSales) =>
      sales.reduce((sum, s) => sum + s.total, 0);
    const computeProfit = (sales: typeof allSales) =>
      sales.reduce(
        (sum, s) =>
          sum +
          s.items.reduce((p, it) => {
            const cost = it.productId ? (costMap.get(it.productId) ?? 0) : 0;
            return p + (it.total - it.quantity * cost);
          }, 0),
        0
      );

    // Daily series: last 7 days revenue + profit
    const dailySeries: { date: string; revenue: number; profit: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - i
      );
      const dayEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - i + 1
      );
      const daySales = allSales.filter(
        (s) => s.createdAt >= dayStart && s.createdAt < dayEnd
      );
      dailySeries.push({
        date: dayStart.toISOString().slice(0, 10),
        revenue: round2(computeRevenue(daySales)),
        profit: round2(computeProfit(daySales)),
      });
    }

    return NextResponse.json({
      sellerId: id,
      totalRevenue: round2(computeRevenue(allSales)),
      totalProfit: round2(computeProfit(allSales)),
      totalSales: allSales.length,
      todayRevenue: round2(computeRevenue(todaySales)),
      todaySales: todaySales.length,
      weekRevenue: round2(computeRevenue(weekSales)),
      weekSales: weekSales.length,
      monthRevenue: round2(computeRevenue(monthSales)),
      monthSales: monthSales.length,
      dailySeries,
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/sellers/[id]/earnings");
  }
}
