import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";
import { validateLicenseKey } from "@/lib/license";

// POST /api/subscription/activate
// Body: { key: string }
// Validates the HMAC signature server-side, marks the key as USED,
// activates the store's subscription, and sets endDate = now + durationDays.
export async function POST(request: Request) {
  try {
    const session = await requireStoreOwner();
    const body = await request.json();
    const key =
      typeof body?.key === "string" ? body.key.trim().toUpperCase() : "";

    if (!key) {
      return NextResponse.json(
        { error: "License key is required" },
        { status: 400 }
      );
    }

    // Find the key in the DB
    const licenseKey = await db.licenseKey.findUnique({
      where: { key },
    });

    if (!licenseKey) {
      return NextResponse.json(
        { error: "Invalid license key" },
        { status: 400 }
      );
    }

    // Verify HMAC signature server-side (constant-time)
    if (!validateLicenseKey(licenseKey.key, licenseKey.signature)) {
      return NextResponse.json(
        { error: "Invalid license key signature" },
        { status: 400 }
      );
    }

    if (licenseKey.status === "USED") {
      return NextResponse.json(
        { error: "This license key has already been used" },
        { status: 409 }
      );
    }
    if (licenseKey.status === "EXPIRED" || licenseKey.status === "CANCELLED") {
      return NextResponse.json(
        { error: `This license key is ${licenseKey.status.toLowerCase()}` },
        { status: 409 }
      );
    }

    const now = new Date();
    const durationDays = licenseKey.durationDays;
    const endDate = new Date(
      now.getTime() + durationDays * 24 * 60 * 60 * 1000
    );

    // Atomically: mark key as USED + activate subscription
    const result = await db.$transaction(async (tx) => {
      const updatedKey = await tx.licenseKey.update({
        where: { id: licenseKey.id },
        data: {
          status: "USED",
          storeId: session.storeId,
          activatedAt: now,
        },
      });

      // Upsert the store's subscription (activate it)
      const existing = await tx.subscription.findUnique({
        where: { storeId: session.storeId },
      });

      let subscription;
      if (existing) {
        // If the existing subscription is still active, extend from endDate;
        // otherwise extend from now.
        const baseDate =
          existing.status === "ACTIVE" && existing.endDate.getTime() > now.getTime()
            ? existing.endDate
            : now;
        const newEndDate = new Date(
          baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000
        );

        subscription = await tx.subscription.update({
          where: { id: existing.id },
          data: {
            status: "ACTIVE",
            plan: licenseKey.plan,
            startDate: now,
            endDate: newEndDate,
          },
        });
        return { subscription, key: updatedKey, extendedFrom: baseDate };
      }

      subscription = await tx.subscription.create({
        data: {
          storeId: session.storeId,
          status: "ACTIVE",
          plan: licenseKey.plan,
          startDate: now,
          endDate,
        },
      });
      return { subscription, key: updatedKey, extendedFrom: now };
    });

    return NextResponse.json({
      message: "Subscription activated successfully",
      subscription: result.subscription,
      plan: licenseKey.plan,
      durationDays,
    });
  } catch (error) {
    return handleRouteError(error, "POST /api/subscription/activate");
  }
}
