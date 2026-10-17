import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

export interface ReorderItemRecommendation {
  productId: string;
  productName: string;
  barcode: string;
  category: string;
  unitType: string;
  currentStock: number;
  minStock: number;
  pendingOrdersQty: number;
  avgDailySales: number;
  daysOfSupply: number;
  leadTimeDays: number;
  reorderPoint: number;
  recommendedQty: number;
  unitCost: number;
  estimatedCost: number;
  urgency: "OUT_OF_STOCK" | "CRITICAL" | "WARNING" | "NORMAL";
  urgencyLabel: string;
  supplier: {
    id: string;
    name: string;
    phone: string;
    leadTimeDays: number;
  } | null;
}

export interface ReorderRecommendationsResponse {
  summary: {
    totalProductsScanned: number;
    itemsNeedingReorder: number;
    outOfStockCount: number;
    criticalCount: number;
    warningCount: number;
    totalEstimatedInvestment: number;
  };
  recommendations: ReorderItemRecommendation[];
}

export async function GET() {
  try {
    const session = await requireStoreOwner();

    // 1. Fetch all store products with their linked supplier
    const products = await db.product.findMany({
      where: { storeId: session.storeId },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            phone: true,
            leadTimeDays: true,
          },
        },
      },
      orderBy: { stock: "asc" },
    });

    if (products.length === 0) {
      return NextResponse.json<ReorderRecommendationsResponse>({
        summary: {
          totalProductsScanned: 0,
          itemsNeedingReorder: 0,
          outOfStockCount: 0,
          criticalCount: 0,
          warningCount: 0,
          totalEstimatedInvestment: 0,
        },
        recommendations: [],
      });
    }

    // 2. Fetch sales from the past 30 days to compute true velocity (daily run rate)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const saleItems = await db.saleItem.findMany({
      where: {
        sale: {
          storeId: session.storeId,
          createdAt: { gte: thirtyDaysAgo },
        },
        productId: { not: null },
      },
      select: {
        productId: true,
        quantity: true,
      },
    });

    const velocityMap = new Map<string, number>();
    for (const item of saleItems) {
      if (!item.productId) continue;
      velocityMap.set(
        item.productId,
        (velocityMap.get(item.productId) ?? 0) + item.quantity
      );
    }

    // 3. Fetch active pending purchase order quantities (SENT or PARTIAL)
    const pendingPoItems = await db.purchaseOrderItem.findMany({
      where: {
        order: {
          storeId: session.storeId,
          status: { in: ["SENT", "PARTIAL"] },
        },
        productId: { not: null },
      },
      select: {
        productId: true,
        orderedQty: true,
        receivedQty: true,
      },
    });

    const pendingMap = new Map<string, number>();
    for (const poItem of pendingPoItems) {
      if (!poItem.productId) continue;
      const remaining = Math.max(0, poItem.orderedQty - poItem.receivedQty);
      pendingMap.set(
        poItem.productId,
        (pendingMap.get(poItem.productId) ?? 0) + remaining
      );
    }

    // 4. Compute reorder point and recommendation formula for each product
    const recommendations: ReorderItemRecommendation[] = [];
    let outOfStockCount = 0;
    let criticalCount = 0;
    let warningCount = 0;
    let totalEstimatedInvestment = 0;

    for (const p of products) {
      const unitsSold30d = velocityMap.get(p.id) ?? 0;
      const avgDailySales = Math.round((unitsSold30d / 30) * 100) / 100;
      const pendingQty = pendingMap.get(p.id) ?? 0;
      const leadTime = p.supplier?.leadTimeDays ?? 3;
      const minStock = p.minStock > 0 ? p.minStock : 5;

      // Safety stock formula: at least minStock, or 3 days of average sales
      const safetyStock = Math.max(minStock, Math.ceil(avgDailySales * 3));
      // Lead time demand: sales expected while waiting for delivery
      const leadTimeDemand = avgDailySales * leadTime;
      // Reorder point = lead time demand + safety stock
      const reorderPoint = Math.ceil(leadTimeDemand + safetyStock);

      const effectiveStock = p.stock + pendingQty;
      const daysOfSupply =
        avgDailySales > 0
          ? Math.round((p.stock / avgDailySales) * 10) / 10
          : p.stock > 0
          ? 999
          : 0;

      // Determine if replenishment is needed
      const needsReorder =
        p.stock <= 0 ||
        effectiveStock <= reorderPoint ||
        p.stock <= minStock;

      if (!needsReorder) continue;

      // Recommended quantity calculation:
      // Target coverage = 14 days of sales + safety stock
      const targetCoverage = Math.max(
        minStock * 2,
        Math.ceil(avgDailySales * 14 + safetyStock)
      );
      const rawRec = Math.ceil(targetCoverage - effectiveStock);
      const recommendedQty = Math.max(minStock, rawRec);

      const unitCost =
        p.costPrice > 0 ? p.costPrice : Math.round(p.price * 0.75 * 100) / 100;
      const estimatedCost = Math.round(recommendedQty * unitCost * 100) / 100;

      let urgency: "OUT_OF_STOCK" | "CRITICAL" | "WARNING" | "NORMAL" = "WARNING";
      let urgencyLabel = "مخزون منخفض";

      if (p.stock <= 0) {
        urgency = "OUT_OF_STOCK";
        urgencyLabel = "نفد تماماً";
        outOfStockCount++;
      } else if (daysOfSupply <= leadTime || p.stock < minStock * 0.5) {
        urgency = "CRITICAL";
        urgencyLabel = "حرج جداً";
        criticalCount++;
      } else {
        urgency = "WARNING";
        urgencyLabel = "قارب على النفاد";
        warningCount++;
      }

      totalEstimatedInvestment += estimatedCost;

      recommendations.push({
        productId: p.id,
        productName: p.name,
        barcode: p.barcode,
        category: p.category,
        unitType: p.unitType,
        currentStock: p.stock,
        minStock: p.minStock,
        pendingOrdersQty: pendingQty,
        avgDailySales,
        daysOfSupply,
        leadTimeDays: leadTime,
        reorderPoint,
        recommendedQty,
        unitCost,
        estimatedCost,
        urgency,
        urgencyLabel,
        supplier: p.supplier
          ? {
              id: p.supplier.id,
              name: p.supplier.name,
              phone: p.supplier.phone,
              leadTimeDays: p.supplier.leadTimeDays,
            }
          : null,
      });
    }

    // Sort: OUT_OF_STOCK first, then CRITICAL, then WARNING, then by daysOfSupply ascending
    const urgencyOrder = {
      OUT_OF_STOCK: 1,
      CRITICAL: 2,
      WARNING: 3,
      NORMAL: 4,
    };

    recommendations.sort((a, b) => {
      const uA = urgencyOrder[a.urgency];
      const uB = urgencyOrder[b.urgency];
      if (uA !== uB) return uA - uB;
      return a.daysOfSupply - b.daysOfSupply;
    });

    return NextResponse.json<ReorderRecommendationsResponse>({
      summary: {
        totalProductsScanned: products.length,
        itemsNeedingReorder: recommendations.length,
        outOfStockCount,
        criticalCount,
        warningCount,
        totalEstimatedInvestment: Math.round(totalEstimatedInvestment * 100) / 100,
      },
      recommendations,
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/recommendations/reorder");
  }
}
