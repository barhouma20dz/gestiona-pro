import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

// GET /api/auth/me — return current user + store + subscription info
export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: session.userId },
      include: {
        store: {
          include: {
            subscription: true,
          },
        },
      },
    });

    if (!user || user.isActive === false) {
      // Session token points to a user that no longer exists or is disabled
      return NextResponse.json(
        { error: user?.isActive === false ? "هذا الحساب معطل حالياً" : "Not authenticated" },
        { status: 401 }
      );
    }

    let parsedPerms: string[] = [];
    if (user.role === "OWNER" || user.role === "SUPER_ADMIN") {
      parsedPerms = ["*"];
    } else if (user.permissions) {
      try {
        parsedPerms = JSON.parse(user.permissions);
      } catch {
        parsedPerms = [];
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        phone: user.phone,
        permissions: parsedPerms,
      },
      store: user.store
        ? {
            id: user.store.id,
            name: user.store.name,
            businessType: user.store.businessType,
            phone: user.store.phone,
            email: user.store.email,
            addressLine1: user.store.addressLine1,
            addressLine2: user.store.addressLine2,
            ripNumber: user.store.ripNumber,
            footerText: user.store.footerText,
            currency: user.store.currency,
            taxRate: user.store.taxRate,
            logoUrl: user.store.logoUrl,
            storePhotoUrl: user.store.storePhotoUrl,
            primaryDisplayImage: user.store.primaryDisplayImage,
            sidebarConfig: user.store.sidebarConfig,
            timezone: user.store.timezone,
            status: user.store.status,
          }
        : null,
      subscription: user.store?.subscription
        ? {
            id: user.store.subscription.id,
            status: user.store.subscription.status,
            plan: user.store.subscription.plan,
            startDate: user.store.subscription.startDate,
            endDate: user.store.subscription.endDate,
            trialEndsAt: user.store.subscription.trialEndsAt,
          }
        : null,
    });
  } catch (error) {
    console.error("[GET /api/auth/me]", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}
