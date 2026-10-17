import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// GET /api/commissions/calculate — preview reward calculation for sellers in period
export async function GET(request: Request) {
  try {
    const session = await requireStoreOwner();
    const { searchParams } = new URL(request.url);

    let rule = await db.commissionRule.findFirst({
      where: { storeId: session.storeId },
    });

    if (!rule) {
      rule = await db.commissionRule.create({
        data: {
          storeId: session.storeId,
          isEnabled: false,
          calculationBasis: "NET_SALES",
          rewardType: "PERCENTAGE",
          rateValue: 5.0,
          period: "MONTHLY",
          minTarget: 0,
        },
      });
    }

    const periodParam = searchParams.get("period") || rule.period;
    const now = new Date();
    let dateFrom: Date;
    let dateTo: Date;

    if (periodParam === "DAILY") {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (periodParam === "WEEKLY") {
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFrom.setHours(0, 0, 0, 0);
      dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else {
      // MONTHLY
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Fetch active staff sellers
    const sellers = await db.user.findMany({
      where: {
        storeId: session.storeId,
        role: "STAFF",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
      },
      orderBy: { name: "asc" },
    });

    const records: any[] = [];

    for (const seller of sellers) {
      // Find sales made by this seller in the period
      const sales = await db.sale.findMany({
        where: {
          storeId: session.storeId,
          sellerId: seller.id,
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: { costPrice: true },
              },
            },
          },
        },
      });

      let totalSales = 0;
      let discounts = 0;
      let netSales = 0;
      let grossProfit = 0;
      const salesCount = sales.length;

      for (const sale of sales) {
        totalSales += sale.subtotal;
        discounts += sale.discount;
        netSales += sale.total;

        let saleCost = 0;
        for (const item of sale.items) {
          saleCost += (item.product?.costPrice ?? 0) * item.quantity;
        }
        grossProfit += (sale.total - saleCost);
      }

      totalSales = Math.round(totalSales * 100) / 100;
      discounts = Math.round(discounts * 100) / 100;
      netSales = Math.round(netSales * 100) / 100;
      grossProfit = Math.round(grossProfit * 100) / 100;

      // Determine metric
      const metric =
        rule.calculationBasis === "TOTAL_SALES"
          ? totalSales
          : rule.calculationBasis === "GROSS_PROFIT"
          ? grossProfit
          : netSales;

      const qualifies = rule.isEnabled && metric >= rule.minTarget;
      let calculatedAmount = 0;

      if (qualifies) {
        if (rule.rewardType === "PERCENTAGE") {
          calculatedAmount = Math.round(((metric * rule.rateValue) / 100) * 100) / 100;
        } else {
          // FIXED_AMOUNT
          calculatedAmount = rule.rateValue;
        }
      }

      records.push({
        id: `preview_${seller.id}`,
        storeId: session.storeId,
        sellerId: seller.id,
        seller,
        ruleId: rule.id,
        periodStart: dateFrom.toISOString(),
        periodEnd: dateTo.toISOString(),
        totalSales,
        discounts,
        netSales,
        grossProfit,
        salesCount,
        calculatedAmount,
        approvedAmount: calculatedAmount,
        status: "CALCULATED",
        ruleSnapshot: JSON.stringify(rule),
        notes: qualifies
          ? `مؤهل للمكافأة (${metric} >= ${rule.minTarget})`
          : rule.isEnabled
          ? `لم يبلغ الحد الأدنى المستهدف (${metric} < ${rule.minTarget})`
          : "نظام المكافآت معطل حالياً",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }

    return NextResponse.json({
      rule,
      records,
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/commissions/calculate");
  }
}
