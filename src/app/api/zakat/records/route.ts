import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// GET /api/zakat/records — list all zakat records for store, newest first
export async function GET() {
  try {
    const session = await requireStoreOwner();
    const records = await db.zakatRecord.findMany({
      where: { storeId: session.storeId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(records);
  } catch (error) {
    return handleRouteError(error, "GET /api/zakat/records");
  }
}
