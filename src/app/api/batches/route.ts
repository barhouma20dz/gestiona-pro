import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// GET /api/batches — list all batches across store with urgency breakdown
export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    if (!session.storeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all"; // all | expired | 3days | 7days | 30days

    const now = new Date();
    const day3 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const day7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const day30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const batches = await db.productBatch.findMany({
      where: {
        storeId: session.storeId,
        quantity: { gt: 0 },
      },
      include: {
        product: {
          select: { id: true, name: true, barcode: true, price: true, unitType: true, category: true },
        },
      },
      orderBy: { expiryDate: "asc" },
    });

    // Categorize
    const enriched = batches.map((b) => {
      const exp = new Date(b.expiryDate);
      const diffMs = exp.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      let urgency: "expired" | "urgent_3" | "near_7" | "medium_30" | "safe" = "safe";
      if (diffDays <= 0) {
        urgency = "expired";
      } else if (diffDays <= 3) {
        urgency = "urgent_3";
      } else if (diffDays <= 7) {
        urgency = "near_7";
      } else if (diffDays <= 30) {
        urgency = "medium_30";
      }

      return {
        ...b,
        diffDays,
        urgency,
        stockValue: b.quantity * b.costPrice,
        sellingValue: b.quantity * b.product.price,
      };
    });

    let filtered = enriched;
    if (filter === "expired") filtered = enriched.filter((b) => b.urgency === "expired");
    else if (filter === "3days") filtered = enriched.filter((b) => b.urgency === "expired" || b.urgency === "urgent_3");
    else if (filter === "7days") filtered = enriched.filter((b) => b.urgency === "expired" || b.urgency === "urgent_3" || b.urgency === "near_7");
    else if (filter === "30days") filtered = enriched.filter((b) => b.urgency !== "safe");

    const stats = {
      totalBatches: enriched.length,
      expiredCount: enriched.filter((b) => b.urgency === "expired").length,
      urgent3Count: enriched.filter((b) => b.urgency === "urgent_3").length,
      near7Count: enriched.filter((b) => b.urgency === "near_7").length,
      medium30Count: enriched.filter((b) => b.urgency === "medium_30").length,
      totalAtRiskValue: enriched.filter((b) => b.urgency !== "safe").reduce((s, b) => s + b.stockValue, 0),
    };

    return NextResponse.json({ batches: filtered, stats });
  } catch (error) {
    return handleRouteError(error, "GET /api/batches");
  }
}
