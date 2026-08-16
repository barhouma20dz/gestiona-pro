import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

interface CreateSellerBody {
  name?: string;
  email?: string;
  password?: string;
}

// GET /api/sellers — list all STAFF users in the current store, with aggregates
export async function GET() {
  try {
    const session = await requireStoreOwner();
    const storeId = session.storeId!;

    const [sellers, salesAgg] = await Promise.all([
      db.user.findMany({
        where: { storeId, role: "STAFF" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          storeId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.sale.groupBy({
        by: ["sellerId"],
        where: {
          storeId,
          sellerId: { not: null },
        },
        _count: { _all: true },
        _sum: { total: true },
      }),
    ]);

    const aggMap = new Map<
      string,
      { count: number; revenue: number }
    >();
    for (const row of salesAgg) {
      if (!row.sellerId) continue;
      aggMap.set(row.sellerId, {
        count: row._count?._all ?? 0,
        revenue: row._sum?.total ?? 0,
      });
    }

    // Profit per seller — fetch all sale items for store sellers in one go.
    const sellerIds = sellers.map((s) => s.id);
    const saleItems = await db.saleItem.findMany({
      where: {
        sale: {
          storeId,
          ...(sellerIds.length ? { sellerId: { in: sellerIds } } : {}),
        },
      },
      select: {
        quantity: true,
        total: true,
        productId: true,
        sale: { select: { sellerId: true } },
      },
    });

    const productIds = Array.from(
      new Set(
        saleItems
          .map((i) => i.productId)
          .filter((p): p is string => !!p)
      )
    );
    const products = productIds.length
      ? await db.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, costPrice: true },
        })
      : [];
    const costMap = new Map<string, number>();
    for (const p of products) costMap.set(p.id, p.costPrice ?? 0);

    const profitBySeller = new Map<string, number>();
    for (const item of saleItems) {
      const sid = item.sale?.sellerId;
      if (!sid) continue;
      const cost = item.productId ? (costMap.get(item.productId) ?? 0) : 0;
      const profit = item.total - item.quantity * cost;
      profitBySeller.set(sid, (profitBySeller.get(sid) ?? 0) + profit);
    }

    const result = sellers.map((s) => {
      const agg = aggMap.get(s.id);
      return {
        ...s,
        totalSales: agg?.count ?? 0,
        totalRevenue: agg?.revenue ?? 0,
        totalProfit: profitBySeller.get(s.id) ?? 0,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, "GET /api/sellers");
  }
}

// POST /api/sellers — create a new STAFF user linked to the current store
export async function POST(request: Request) {
  try {
    const session = await requireStoreOwner();
    const body = (await request.json()) as CreateSellerBody;

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, password" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "This email is already in use" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const seller = await db.user.create({
      data: {
        email,
        password: passwordHash,
        name,
        role: "STAFF",
        storeId: session.storeId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        storeId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      { ...seller, totalSales: 0, totalRevenue: 0, totalProfit: 0 },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, "POST /api/sellers");
  }
}
