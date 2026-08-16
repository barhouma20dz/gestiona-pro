import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

interface UpdateSellerBody {
  name?: string;
  email?: string;
}

async function getOwnedSeller(id: string, storeId: string) {
  // Returns the seller only if they belong to the same store and are STAFF
  return db.user.findFirst({
    where: { id, storeId, role: "STAFF" },
  });
}

// PUT /api/sellers/[id] — update seller name/email (not password)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id } = await params;

    const existing = await getOwnedSeller(id, session.storeId!);
    if (!existing) {
      return NextResponse.json(
        { error: "Seller not found" },
        { status: 404 }
      );
    }

    const body = (await request.json()) as UpdateSellerBody;
    const data: { name?: string; email?: string } = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json(
          { error: "Name cannot be empty" },
          { status: 400 }
        );
      }
      data.name = name;
    }

    if (typeof body.email === "string") {
      const email = body.email.trim().toLowerCase();
      if (!email) {
        return NextResponse.json(
          { error: "Email cannot be empty" },
          { status: 400 }
        );
      }
      // Check uniqueness if changing
      if (email !== existing.email) {
        const dup = await db.user.findUnique({ where: { email } });
        if (dup) {
          return NextResponse.json(
            { error: "This email is already in use" },
            { status: 409 }
          );
        }
        data.email = email;
      }
    }

    const updated = await db.user.update({
      where: { id },
      data,
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

    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, "PUT /api/sellers/[id]");
  }
}

// DELETE /api/sellers/[id] — delete seller; unlink their sales (set sellerId to null)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id } = await params;

    const existing = await getOwnedSeller(id, session.storeId!);
    if (!existing) {
      return NextResponse.json(
        { error: "Seller not found" },
        { status: 404 }
      );
    }

    // Unlink sales, then delete the seller.
    await db.$transaction([
      db.sale.updateMany({
        where: { sellerId: id, storeId: session.storeId! },
        data: { sellerId: null },
      }),
      db.user.delete({ where: { id } }),
    ]);

    return NextResponse.json(
      { message: "Seller deleted", id },
      { status: 200 }
    );
  } catch (error) {
    return handleRouteError(error, "DELETE /api/sellers/[id]");
  }
}
