import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

interface UpdateSellerBody {
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  password?: string;
  isActive?: boolean;
  permissions?: string[];
}

async function getOwnedSeller(id: string, storeId: string) {
  // Returns the seller only if they belong to the same store and are STAFF
  return db.user.findFirst({
    where: { id, storeId, role: "STAFF" },
  });
}

// PUT /api/sellers/[id] — update seller profile, password, active state, and permissions
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
        { error: "المستخدم غير موجود أو لا ينتمي لهذا المتجر" },
        { status: 404 }
      );
    }

    const body = (await request.json()) as UpdateSellerBody;
    const data: Record<string, any> = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json(
          { error: "الاسم لا يمكن أن يكون فارغاً" },
          { status: 400 }
        );
      }
      data.name = name;
    }

    if (typeof body.username === "string") {
      const username = body.username.trim();
      if (username !== existing.username) {
        if (!username) {
          return NextResponse.json(
            { error: "اسم المستخدم لا يمكن أن يكون فارغاً" },
            { status: 400 }
          );
        }
        const dup = await db.user.findFirst({
          where: { username, id: { not: id } },
        });
        if (dup) {
          return NextResponse.json(
            { error: "اسم المستخدم هذا مستخدم بالفعل" },
            { status: 409 }
          );
        }
        data.username = username;
      }
    }

    if (typeof body.email === "string") {
      const email = body.email.trim().toLowerCase();
      if (!email) {
        return NextResponse.json(
          { error: "البريد الإلكتروني لا يمكن أن يكون فارغاً" },
          { status: 400 }
        );
      }
      // Check uniqueness if changing
      if (email !== existing.email) {
        const dup = await db.user.findUnique({ where: { email } });
        if (dup && dup.id !== id) {
          return NextResponse.json(
            { error: "هذا البريد الإلكتروني مسجل مسبقاً" },
            { status: 409 }
          );
        }
        data.email = email;
      }
    }

    if (body.phone !== undefined) {
      data.phone = body.phone ? body.phone.trim() : null;
    }

    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
    }

    if (Array.isArray(body.permissions)) {
      data.permissions = JSON.stringify(body.permissions);
    }

    if (body.password && typeof body.password === "string" && body.password.trim().length > 0) {
      if (body.password.length < 6) {
        return NextResponse.json(
          { error: "يجب أن تتكون كلمة المرور الجديدة من 6 أحرف على الأقل" },
          { status: 400 }
        );
      }
      data.password = await bcrypt.hash(body.password, 10);
    }

    const updated = await db.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        permissions: true,
        storeId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    let parsedPerms: string[] = [];
    if (updated.permissions) {
      try {
        parsedPerms = JSON.parse(updated.permissions);
      } catch {
        parsedPerms = [];
      }
    }

    // Write to audit log
    await db.auditLog.create({
      data: {
        storeId: session.storeId!,
        userId: session.userId,
        userName: session.email,
        action: "USER_UPDATE",
        entity: "USER",
        entityId: id,
        details: `تم تعديل بيانات المستخدم "${updated.username || updated.name}" (الحالة: ${updated.isActive ? "نشط" : "معطل"}, عدد الصلاحيات: ${parsedPerms.length})`,
      },
    }).catch((err) => console.error("Failed to write audit log:", err));

    return NextResponse.json({
      ...updated,
      permissions: parsedPerms,
    });
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
        { error: "المستخدم غير موجود" },
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

    // Write audit log
    await db.auditLog.create({
      data: {
        storeId: session.storeId!,
        userId: session.userId,
        userName: session.email,
        action: "USER_DELETE",
        entity: "USER",
        entityId: id,
        details: `تم حذف حساب المستخدم/البائع "${existing.username || existing.name}" (${existing.email})`,
      },
    }).catch((err) => console.error("Failed to write audit log:", err));

    return NextResponse.json(
      { message: "تم حذف المستخدم بنجاح", id },
      { status: 200 }
    );
  } catch (error) {
    return handleRouteError(error, "DELETE /api/sellers/[id]");
  }
}
