import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const SEED_SHOP = {
  name: "SwiftMart Grocery",
  addressLine1: "123 Market Street",
  addressLine2: "",
  phoneNumber: "+919876543210",
  upiId: "shop@upi",
  footerText: "Thank you, visit again!",
  currency: "₹",
  taxRate: 0,
};

// POST /api/shop/seed — create default shop if none exists (idempotent)
export async function POST() {
  try {
    const existing = await db.shop.findFirst();

    if (existing) {
      return NextResponse.json(
        {
          message: "Shop already exists",
          shop: existing,
          created: false,
        },
        { status: 200 }
      );
    }

    const shop = await db.shop.create({ data: SEED_SHOP });

    return NextResponse.json(
      { message: "Default shop created", shop, created: true },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/shop/seed]", error);
    return NextResponse.json(
      { error: "Failed to seed shop" },
      { status: 500 }
    );
  }
}
