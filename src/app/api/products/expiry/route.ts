import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// Number of days ahead used to flag "near expiry" products.
export const NEAR_EXPIRY_DAYS = 30;

// GET /api/products/expiry — return expired + near-expiry products for the store
//   expired:     expiryDate < now
//   nearExpiry:  now <= expiryDate <= now + NEAR_EXPIRY_DAYS
export async function GET() {
  try {
    const session = await requireStoreOwner();
    const now = new Date();
    const threshold = new Date(
      now.getTime() + NEAR_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    );

    const [expired, nearExpiry] = await Promise.all([
      db.product.findMany({
        where: {
          storeId: session.storeId,
          expiryDate: { lt: now },
        },
        orderBy: { expiryDate: "asc" },
      }),
      db.product.findMany({
        where: {
          storeId: session.storeId,
          expiryDate: { gte: now, lte: threshold },
        },
        orderBy: { expiryDate: "asc" },
      }),
    ]);

    return NextResponse.json({
      expired,
      nearExpiry,
      thresholdDays: NEAR_EXPIRY_DAYS,
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/products/expiry");
  }
}
