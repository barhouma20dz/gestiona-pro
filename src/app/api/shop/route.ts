import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const DEFAULT_SHOP = {
  name: "My Store",
  addressLine1: "",
  addressLine2: "",
  phoneNumber: "",
  upiId: "",
  footerText: "Thank you for shopping with us!",
  currency: "₹",
  taxRate: 0,
};

// GET /api/shop — return first shop row, auto-create a default if none exists
export async function GET() {
  try {
    let shop = await db.shop.findFirst();

    if (!shop) {
      shop = await db.shop.create({ data: DEFAULT_SHOP });
    }

    return NextResponse.json(shop);
  } catch (error) {
    console.error("[GET /api/shop]", error);
    return NextResponse.json(
      { error: "Failed to fetch shop" },
      { status: 500 }
    );
  }
}

// PUT /api/shop — upsert the single shop row
export async function PUT(request: Request) {
  try {
    const body = await request.json();

    // Fetch existing (or create default) to ensure singleton exists
    const existing = await db.shop.findFirst();

    const data: Record<string, unknown> = {};

    if (typeof body?.name === "string") data.name = body.name.trim();
    if (typeof body?.addressLine1 === "string")
      data.addressLine1 = body.addressLine1;
    if (typeof body?.addressLine2 === "string")
      data.addressLine2 = body.addressLine2;
    if (typeof body?.phoneNumber === "string")
      data.phoneNumber = body.phoneNumber;
    if (typeof body?.upiId === "string") data.upiId = body.upiId;
    if (typeof body?.footerText === "string") data.footerText = body.footerText;
    if (typeof body?.currency === "string") data.currency = body.currency;

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

    let shop;
    if (existing) {
      shop = await db.shop.update({
        where: { id: existing.id },
        data,
      });
    } else {
      shop = await db.shop.create({
        data: { ...DEFAULT_SHOP, ...(data as object) },
      });
    }

    return NextResponse.json(shop);
  } catch (error) {
    console.error("[PUT /api/shop]", error);
    return NextResponse.json(
      { error: "Failed to update shop" },
      { status: 500 }
    );
  }
}
