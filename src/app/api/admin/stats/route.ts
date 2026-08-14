import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";
import { LICENSE_PLANS } from "@/lib/license";

// GET /api/admin/stats — overall SaaS metrics (super admin)
export async function GET() {
  try {
    await requireSuperAdmin();

    const [
      totalStores,
      activeSubs,
      trialSubs,
      expiredSubs,
      suspendedStores,
      recentStoresRaw,
      allSubs,
    ] = await Promise.all([
      db.store.count(),
      db.subscription.count({ where: { status: "ACTIVE" } }),
      db.subscription.count({ where: { status: "TRIAL" } }),
      db.subscription.count({ where: { status: "EXPIRED" } }),
      db.store.count({ where: { status: "SUSPENDED" } }),
      db.store.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          businessType: true,
          status: true,
          createdAt: true,
          subscription: { select: { status: true, plan: true, endDate: true } },
        },
      }),
      db.subscription.findMany({
        where: { status: "ACTIVE" },
        select: { plan: true },
      }),
    ]);

    // Estimated monthly recurring revenue from active subscriptions
    // (sum of normalized monthly price: monthly = full, quarterly = /3, yearly = /12)
    const monthlyFromPlan: Record<string, number> = {
      MONTHLY: LICENSE_PLANS.MONTHLY.price,
      QUARTERLY: LICENSE_PLANS.QUARTERLY.price / 3,
      YEARLY: LICENSE_PLANS.YEARLY.price / 12,
    };
    const estimatedMonthlyRevenue = allSubs.reduce(
      (sum, s) => sum + (monthlyFromPlan[s.plan] ?? 0),
      0
    );

    const round2 = (n: number) => Math.round(n * 100) / 100;

    return NextResponse.json({
      totalStores,
      activeSubscriptions: activeSubs,
      trialSubscriptions: trialSubs,
      expiredSubscriptions: expiredSubs,
      suspendedStores,
      estimatedMonthlyRevenue: round2(estimatedMonthlyRevenue),
      recentStores: recentStoresRaw,
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/stats");
  }
}
