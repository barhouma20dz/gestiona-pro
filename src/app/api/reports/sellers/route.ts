import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";
import type { SellerPerformanceItem, SellerPerformanceReport } from "@/lib/types";

// GET /api/reports/sellers — Aggregate seller sales, revenue, profit and averages
export async function GET(request: Request) {
  try {
    const session = await requirePermission("reports.view");
    const { searchParams } = new URL(request.url);

    const period = (searchParams.get("period") || "today") as
      | "today"
      | "week"
      | "month"
      | "custom";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const now = new Date();
    let dateFrom: Date;
    let dateTo: Date;

    if (period === "today") {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === "week") {
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFrom.setHours(0, 0, 0, 0);
      dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === "month") {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      // custom
      dateFrom = startDateParam ? new Date(startDateParam) : new Date(now.getFullYear(), now.getMonth(), 1);
      dateFrom.setHours(0, 0, 0, 0);
      dateTo = endDateParam ? new Date(endDateParam) : new Date(now);
      dateTo.setHours(23, 59, 59, 999);
    }

    // 1. Fetch sales within period for this store
    const sales = await db.sale.findMany({
      where: {
        storeId: session.storeId,
        createdAt: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: { costPrice: true, name: true },
            },
          },
        },
        seller: {
          select: { id: true, name: true, username: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. Fetch all registered users for this store (staff & owner) so they appear even with 0 sales
    const storeUsers = await db.user.findMany({
      where: { storeId: session.storeId },
      select: { id: true, name: true, username: true, role: true },
    });

    // 3. Map & Aggregate
    const sellerMap = new Map<string, SellerPerformanceItem>();

    for (const u of storeUsers) {
      sellerMap.set(u.id, {
        sellerId: u.id,
        sellerName: u.name || u.username || (u.role === "OWNER" ? "المدير (المالك)" : "بائع"),
        username: u.username ?? null,
        salesCount: 0,
        totalGrossSales: 0,
        totalDiscounts: 0,
        returnsCount: 0,
        returnsTotal: 0,
        netSales: 0,
        averageTicket: 0,
        grossProfit: 0,
        profitMarginPercent: 0,
      });
    }

    const unassignedKey = "unassigned";

    for (const sale of sales) {
      const key = sale.sellerId || unassignedKey;
      let record = sellerMap.get(key);

      if (!record) {
        record = {
          sellerId: key,
          sellerName: key === unassignedKey ? "المدير / غير محدد" : (sale.seller?.name || "بائع"),
          username: sale.seller?.username ?? null,
          salesCount: 0,
          totalGrossSales: 0,
          totalDiscounts: 0,
          returnsCount: 0,
          returnsTotal: 0,
          netSales: 0,
          averageTicket: 0,
          grossProfit: 0,
          profitMarginPercent: 0,
        };
        sellerMap.set(key, record);
      }

      record.salesCount += 1;
      record.totalGrossSales += sale.subtotal;
      record.totalDiscounts += sale.discount;
      record.netSales += sale.total;

      // Profit calculation
      let saleCost = 0;
      for (const item of sale.items) {
        const itemCost = (item.product?.costPrice ?? 0) * item.quantity;
        saleCost += itemCost;
      }
      const saleGrossProfit = sale.total - saleCost;
      record.grossProfit += saleGrossProfit;
    }

    // 4. Compute Averages and Margins, and calculate Grand Totals
    let totalSalesCount = 0;
    let totalGrossRevenue = 0;
    let totalNetRevenue = 0;
    let totalDiscounts = 0;
    let totalReturns = 0;
    let totalProfit = 0;

    const sellers: SellerPerformanceItem[] = [];

    for (const [key, item] of sellerMap.entries()) {
      // Don't show unassigned row if 0 sales
      if (key === unassignedKey && item.salesCount === 0) continue;

      item.totalGrossSales = Math.round(item.totalGrossSales * 100) / 100;
      item.totalDiscounts = Math.round(item.totalDiscounts * 100) / 100;
      item.netSales = Math.round(item.netSales * 100) / 100;
      item.grossProfit = Math.round(item.grossProfit * 100) / 100;

      item.averageTicket =
        item.salesCount > 0 ? Math.round((item.netSales / item.salesCount) * 100) / 100 : 0;
      item.profitMarginPercent =
        item.netSales > 0 ? Math.round((item.grossProfit / item.netSales) * 1000) / 10 : 0;

      totalSalesCount += item.salesCount;
      totalGrossRevenue += item.totalGrossSales;
      totalNetRevenue += item.netSales;
      totalDiscounts += item.totalDiscounts;
      totalReturns += item.returnsTotal;
      totalProfit += item.grossProfit;

      sellers.push(item);
    }

    // Sort sellers by netSales descending
    sellers.sort((a, b) => b.netSales - a.netSales);

    const report: SellerPerformanceReport = {
      period,
      startDate: dateFrom.toISOString(),
      endDate: dateTo.toISOString(),
      summary: {
        totalSalesCount,
        totalGrossRevenue: Math.round(totalGrossRevenue * 100) / 100,
        totalNetRevenue: Math.round(totalNetRevenue * 100) / 100,
        totalDiscounts: Math.round(totalDiscounts * 100) / 100,
        totalReturns: Math.round(totalReturns * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
      },
      sellers,
    };

    return NextResponse.json(report);
  } catch (error) {
    return handleRouteError(error, "GET /api/reports/sellers");
  }
}
