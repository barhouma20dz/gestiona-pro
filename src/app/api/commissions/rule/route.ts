import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// GET /api/commissions/rule — get or initialize commission rule for store
export async function GET() {
  try {
    const session = await requireStoreOwner();

    let rule = await db.commissionRule.findFirst({
      where: { storeId: session.storeId },
    });

    if (!rule) {
      // Create disabled default rule
      rule = await db.commissionRule.create({
        data: {
          storeId: session.storeId,
          isEnabled: false,
          calculationBasis: "NET_SALES",
          rewardType: "PERCENTAGE",
          rateValue: 5.0,
          period: "MONTHLY",
          minTarget: 0,
          notes: "نظام المكافآت والحوافز للبائعين",
        },
      });
    }

    return NextResponse.json(rule);
  } catch (error) {
    return handleRouteError(error, "GET /api/commissions/rule");
  }
}

// POST /api/commissions/rule — update commission rule
export async function POST(request: Request) {
  try {
    const session = await requireStoreOwner();
    const body = await request.json();

    const isEnabled = typeof body?.isEnabled === "boolean" ? body.isEnabled : false;
    const calculationBasis =
      body?.calculationBasis === "TOTAL_SALES" ||
      body?.calculationBasis === "GROSS_PROFIT"
        ? body.calculationBasis
        : "NET_SALES";
    const rewardType =
      body?.rewardType === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE";
    const rateValue = Number(body?.rateValue) || 0;
    const period =
      body?.period === "DAILY" || body?.period === "WEEKLY"
        ? body.period
        : "MONTHLY";
    const minTarget = Number(body?.minTarget) || 0;
    const notes = typeof body?.notes === "string" ? body.notes : "";

    let rule = await db.commissionRule.findFirst({
      where: { storeId: session.storeId },
    });

    if (rule) {
      rule = await db.commissionRule.update({
        where: { id: rule.id },
        data: {
          isEnabled,
          calculationBasis,
          rewardType,
          rateValue,
          period,
          minTarget,
          notes,
        },
      });
    } else {
      rule = await db.commissionRule.create({
        data: {
          storeId: session.storeId,
          isEnabled,
          calculationBasis,
          rewardType,
          rateValue,
          period,
          minTarget,
          notes,
        },
      });
    }

    // Record audit log
    await db.auditLog.create({
      data: {
        storeId: session.storeId,
        userId: session.userId,
        userName: session.email,
        action: "UPDATE",
        entity: "COMMISSION_RULE",
        entityId: rule.id,
        details: JSON.stringify({ isEnabled, calculationBasis, rewardType, rateValue, period, minTarget }),
      },
    });

    return NextResponse.json(rule);
  } catch (error) {
    return handleRouteError(error, "POST /api/commissions/rule");
  }
}
