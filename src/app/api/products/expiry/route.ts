import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// Number of days ahead used to flag "near expiry" products.
export const NEAR_EXPIRY_DAYS = 30;

// GET /api/products/expiry — return expired + near-expiry products for the store
// Checks BOTH expiryDate and expiryDate2 (for dual-batch products).
//   expired:     expiryDate < now OR expiryDate2 < now
//   nearExpiry:  now <= expiryDate <= now + NEAR_EXPIRY_DAYS
//                OR now <= expiryDate2 <= now + NEAR_EXPIRY_DAYS
export async function GET() {
  try {
    const session = await requireStoreOwner();
    const now = new Date();
    const threshold = new Date(
      now.getTime() + NEAR_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    );

    // Expired: either expiryDate or expiryDate2 is in the past
    const expired = await db.product.findMany({
      where: {
        storeId: session.storeId,
        OR: [
          { expiryDate: { lt: now, not: null } },
          { expiryDate2: { lt: now, not: null } },
        ],
      },
      orderBy: { expiryDate: "asc" },
    });

    // Near expiry: either date is within the threshold window
    const nearExpiry = await db.product.findMany({
      where: {
        storeId: session.storeId,
        OR: [
          { expiryDate: { gte: now, lte: threshold, not: null } },
          { expiryDate2: { gte: now, lte: threshold, not: null } },
        ],
      },
      orderBy: { expiryDate: "asc" },
    });

    return NextResponse.json({
      expired,
      nearExpiry,
      thresholdDays: NEAR_EXPIRY_DAYS,
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/products/expiry");
  }
}
