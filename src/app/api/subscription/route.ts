import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";
import { LICENSE_PLANS, isLicensePlan } from "@/lib/license";

// GET /api/subscription — current subscription + store status + days remaining
export async function GET() {
  try {
    const session = await requireStoreOwner();

    const store = await db.store.findUnique({
      where: { id: session.storeId },
      include: { subscription: true },
    });
    if (!store) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    const endDate = store.subscription?.endDate ?? null;
    const daysRemaining = endDate
      ? Math.max(
          0,
          Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        )
      : 0;

    // Effective status: if endDate < now and stored status is ACTIVE/TRIAL,
    // surface as "EXPIRED" without mutating the DB (callers can re-activate).
    const storedStatus = store.subscription?.status ?? "NONE";
    let effectiveStatus = storedStatus;
    if (
      endDate &&
      endDate.getTime() < now.getTime() &&
      (storedStatus === "ACTIVE" || storedStatus === "TRIAL")
    ) {
      effectiveStatus = "EXPIRED";
    }

    const plan = store.subscription?.plan ?? "MONTHLY";
    const planInfo = isLicensePlan(plan) ? LICENSE_PLANS[plan] : undefined;

    return NextResponse.json({
      store: {
        id: store.id,
        name: store.name,
        status: store.status,
      },
      subscription: store.subscription
        ? {
            id: store.subscription.id,
            status: effectiveStatus,
            storedStatus,
            plan: store.subscription.plan,
            startDate: store.subscription.startDate,
            endDate: store.subscription.endDate,
            trialEndsAt: store.subscription.trialEndsAt,
          }
        : null,
      daysRemaining,
      planPrice: planInfo?.price ?? 0,
      planDurationDays: planInfo?.durationDays ?? 0,
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/subscription");
  }
}
