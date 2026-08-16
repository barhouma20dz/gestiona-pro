import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

interface ChangePasswordBody {
  password?: string;
}

/**
 * POST /api/sellers/[id]/change-password
 * Body: { password }
 * Allowed: store owner (any seller in their store) OR the seller themselves.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = (await request.json()) as ChangePasswordBody;
    const password = body.password ?? "";

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Find the seller
    const seller = await db.user.findUnique({ where: { id } });
    if (!seller) {
      return NextResponse.json(
        { error: "Seller not found" },
        { status: 404 }
      );
    }

    // Authorization: store owner (same store) OR the seller themselves (STAFF)
    const isOwner = session.role === "OWNER" && session.storeId === seller.storeId;
    const isSelf = session.userId === seller.id && session.role === "STAFF";
    if (!isOwner && !isSelf) {
      return NextResponse.json(
        { error: "Forbidden — you can only change your own password or a seller in your store" },
        { status: 403 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await db.user.update({
      where: { id },
      data: { password: passwordHash },
    });

    return NextResponse.json(
      { message: "Password changed successfully" },
      { status: 200 }
    );
  } catch (error) {
    return handleRouteError(error, "POST /api/sellers/[id]/change-password");
  }
}
