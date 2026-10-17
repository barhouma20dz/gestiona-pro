import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// GET /api/audit-logs — list audit trail of sensitive operations
export async function GET(request: Request) {
  try {
    const session = await requireStoreOwner();
    const storeId = session.storeId!;

    const url = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
    const action = url.searchParams.get("action");

    const where: any = { storeId };
    if (action) {
      where.action = action;
    }

    const logs = await db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, username: true, email: true },
        },
      },
    });

    const formatted = logs.map((log) => ({
      id: log.id,
      storeId: log.storeId,
      userId: log.userId,
      userName: log.user?.name || log.user?.username || log.userName || "النظام",
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      details: log.details,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    return handleRouteError(error, "GET /api/audit-logs");
  }
}
