import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// GET /api/commissions/records — list saved seller rewards / commission records
export async function GET() {
  try {
    const session = await requireStoreOwner();

    const records = await db.sellerRewardRecord.findMany({
      where: { storeId: session.storeId },
      include: {
        seller: {
          select: { id: true, name: true, username: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(records);
  } catch (error) {
    return handleRouteError(error, "GET /api/commissions/records");
  }
}

// POST /api/commissions/records — create/snapshot new reward records
export async function POST(request: Request) {
  try {
    const session = await requireStoreOwner();
    const body = await request.json();

    const rule = await db.commissionRule.findFirst({
      where: { storeId: session.storeId },
    });

    const ruleSnapshot = rule ? JSON.stringify(rule) : "{}";
    const now = new Date();

    const inputRecords = Array.isArray(body?.records) ? body.records : [body];
    const created: any[] = [];

    for (const item of inputRecords) {
      if (!item.sellerId) continue;

      const record = await db.sellerRewardRecord.create({
        data: {
          storeId: session.storeId,
          sellerId: item.sellerId,
          ruleId: rule?.id ?? null,
          periodStart: item.periodStart ? new Date(item.periodStart) : new Date(now.getFullYear(), now.getMonth(), 1),
          periodEnd: item.periodEnd ? new Date(item.periodEnd) : now,
          totalSales: Number(item.totalSales) || 0,
          discounts: Number(item.discounts) || 0,
          netSales: Number(item.netSales) || 0,
          grossProfit: Number(item.grossProfit) || 0,
          salesCount: Number(item.salesCount) || 0,
          calculatedAmount: Number(item.calculatedAmount) || 0,
          approvedAmount: Number(item.approvedAmount) || Number(item.calculatedAmount) || 0,
          status: "CALCULATED",
          ruleSnapshot,
          notes: item.notes || "حساب مكافأة معتمد",
        },
        include: {
          seller: {
            select: { id: true, name: true, username: true, email: true },
          },
        },
      });

      created.push(record);
    }

    // Record audit log
    await db.auditLog.create({
      data: {
        storeId: session.storeId,
        userId: session.userId,
        userName: session.email,
        action: "CREATE",
        entity: "COMMISSION_SNAPSHOT",
        entityId: created.map((r) => r.id).join(","),
        details: `Saved ${created.length} seller reward records`,
      },
    });

    return NextResponse.json(created);
  } catch (error) {
    return handleRouteError(error, "POST /api/commissions/records");
  }
}
