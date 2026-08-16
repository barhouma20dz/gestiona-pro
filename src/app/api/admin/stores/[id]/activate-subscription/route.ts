import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// POST /api/admin/stores/[id]/activate-subscription
// Super admin can activate/extend a store's subscription directly.
// Body: { durationDays: number, plan?: string }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const body = await request.json();

    const durationDays = Number(body?.durationDays);
    if (!Number.isInteger(durationDays) || durationDays <= 0) {
      return NextResponse.json(
        { error: "durationDays must be a positive integer" },
        { status: 400 }
      );
    }

    const plan =
      typeof body?.plan === "string" &&
      ["MONTHLY", "QUARTERLY", "YEARLY"].includes(body.plan)
        ? body.plan
        : "MONTHLY";

    const store = await db.store.findUnique({
      where: { id },
      include: { subscription: true },
    });

    if (!store) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    let baseDate = now;

    if (store.subscription) {
      const currentEnd = new Date(store.subscription.endDate);
      if (currentEnd > now) {
        baseDate = currentEnd;
      }

      const newEndDate = new Date(
        baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000
      );

      const updated = await db.subscription.update({
        where: { storeId: id },
        data: {
          status: "ACTIVE",
          plan,
          endDate: newEndDate,
        },
      });

      return NextResponse.json({
        message: `Subscription activated: +${durationDays} days`,
        subscription: updated,
      });
    } else {
      const newEndDate = new Date(
        now.getTime() + durationDays * 24 * 60 * 60 * 1000
      );

      const created = await db.subscription.create({
        data: {
          storeId: id,
          status: "ACTIVE",
          plan,
          startDate: now,
          endDate: newEndDate,
        },
      });

      return NextResponse.json({
        message: `Subscription created: +${durationDays} days`,
        subscription: created,
      });
    }
  } catch (error) {
    return handleRouteError(error, "POST /api/admin/stores/[id]/activate-subscription");
  }
}
