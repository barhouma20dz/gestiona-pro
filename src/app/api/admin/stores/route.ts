import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// GET /api/admin/stores — list all stores with subscription + counts (super admin)
export async function GET() {
  try {
    await requireSuperAdmin();
    const stores = await db.store.findMany({
      include: {
        subscription: true,
        _count: {
          select: {
            users: true,
            products: true,
            sales: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      stores.map((s) => ({
        id: s.id,
        name: s.name,
        businessType: s.businessType,
        phone: s.phone,
        email: s.email,
        status: s.status,
        currency: s.currency,
        timezone: s.timezone,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        subscription: s.subscription,
        counts: {
          users: s._count.users,
          products: s._count.products,
          sales: s._count.sales,
        },
      }))
    );
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/stores");
  }
}
