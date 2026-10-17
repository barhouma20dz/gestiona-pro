import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// GET /api/shop — return the current user's store (with subscription)
export async function GET() {
  try {
    const session = await requireStoreOwner();

    const store = await db.store.findUnique({
      where: { id: session.storeId },
      include: { subscription: true },
    });
    if (!store) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      );
    }

    // Normalize to the client `Shop` contract (phoneNumber, camelCase fields)
    const { phone, receiptConfig, ...rest } = store;
    let parsedReceiptConfig = undefined;
    if (receiptConfig) {
      try {
        parsedReceiptConfig = JSON.parse(receiptConfig);
      } catch {
        // ignore
      }
    }
    return NextResponse.json({
      ...rest,
      phoneNumber: phone,
      receiptConfig,
      parsedReceiptConfig,
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/shop");
  }
}

// PUT /api/shop — update the current user's store fields
export async function PUT(request: Request) {
  try {
    const session = await requireStoreOwner();
    const body = await request.json();

    const data: Record<string, unknown> = {};

    if (typeof body?.name === "string" && body.name.trim()) {
      data.name = body.name.trim();
    }
    if (typeof body?.addressLine1 === "string") {
      data.addressLine1 = body.addressLine1;
    }
    if (typeof body?.addressLine2 === "string") {
      data.addressLine2 = body.addressLine2;
    }
    if (typeof body?.phone === "string") {
      data.phone = body.phone;
    }
    if (typeof body?.ripNumber === "string") {
      data.ripNumber = body.ripNumber;
    }
    if (typeof body?.footerText === "string") {
      data.footerText = body.footerText;
    }
    if (typeof body?.currency === "string") {
      data.currency = body.currency;
    }
    if (typeof body?.businessType === "string") {
      data.businessType = body.businessType;
    }
    if (typeof body?.logoUrl === "string" || body?.logoUrl === null) {
      data.logoUrl = typeof body.logoUrl === "string" && body.logoUrl.trim() !== "" ? body.logoUrl.trim() : null;
    }
    if (body?.storePhotoUrl !== undefined) {
      data.storePhotoUrl = typeof body.storePhotoUrl === "string" && body.storePhotoUrl.trim() !== "" ? body.storePhotoUrl.trim() : null;
    }
    if (typeof body?.primaryDisplayImage === "string") {
      data.primaryDisplayImage = body.primaryDisplayImage === "STORE_PHOTO" ? "STORE_PHOTO" : "LOGO";
    }
    if (body?.sidebarConfig !== undefined) {
      data.sidebarConfig = typeof body.sidebarConfig === "string" ? body.sidebarConfig : JSON.stringify(body.sidebarConfig);
    }
    if (typeof body?.timezone === "string") {
      data.timezone = body.timezone;
    }
    if (body?.receiptConfig !== undefined) {
      data.receiptConfig =
        typeof body.receiptConfig === "string"
          ? body.receiptConfig
          : JSON.stringify(body.receiptConfig);
    }

    if (body?.taxRate !== undefined) {
      const taxRate = Number(body.taxRate);
      if (Number.isNaN(taxRate) || taxRate < 0) {
        return NextResponse.json(
          { error: "taxRate must be a number >= 0" },
          { status: 400 }
        );
      }
      data.taxRate = taxRate;
    }

    const updated = await db.store.update({
      where: { id: session.storeId },
      data,
      include: { subscription: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, "PUT /api/shop");
  }
}
