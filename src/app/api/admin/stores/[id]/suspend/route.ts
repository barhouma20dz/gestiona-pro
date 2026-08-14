import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// POST /api/admin/stores/:id/suspend — toggle store status ACTIVE <-> SUSPENDED
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;

    const store = await db.store.findUnique({
      where: { id },
      select: { id: true, status: true, name: true },
    });
    if (!store) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      );
    }

    const nextStatus = store.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";

    const updated = await db.store.update({
      where: { id },
      data: { status: nextStatus },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      status: updated.status,
      message: `Store ${nextStatus === "SUSPENDED" ? "suspended" : "reactivated"} successfully`,
    });
  } catch (error) {
    return handleRouteError(error, "POST /api/admin/stores/:id/suspend");
  }
}
