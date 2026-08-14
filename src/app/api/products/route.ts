import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";
import type { Prisma } from "@prisma/client";

// GET /api/products — list products for the current store, newest first
export async function GET() {
  try {
    const session = await requireStoreOwner();
    const products = await db.product.findMany({
      where: { storeId: session.storeId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(products);
  } catch (error) {
    return handleRouteError(error, "GET /api/products");
  }
}

// POST /api/products — create a product for the current store
// Enforces @@unique([storeId, barcode]).
// Optional new fields: expiryDate (ISO), supplierId, imageUrl.
export async function POST(request: Request) {
  try {
    const session = await requireStoreOwner();
    const body = await request.json();

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const barcode =
      typeof body?.barcode === "string" ? body.barcode.trim() : "";
    const price = Number(body?.price);
    const costPrice =
      body?.costPrice === undefined || body?.costPrice === null
        ? 0
        : Number(body?.costPrice);
    const stock =
      body?.stock === undefined || body?.stock === null
        ? 0
        : Number(body?.stock);
    const category =
      typeof body?.category === "string" && body.category.trim()
        ? body.category.trim()
        : "General";

    // New optional fields
    const expiryDate =
      typeof body?.expiryDate === "string" && body.expiryDate.trim()
        ? new Date(body.expiryDate)
        : null;
    const supplierId =
      typeof body?.supplierId === "string" && body.supplierId.trim()
        ? body.supplierId.trim()
        : null;
    const imageUrl =
      typeof body?.imageUrl === "string" && body.imageUrl.trim()
        ? body.imageUrl.trim()
        : null;

    if (!name) {
      return NextResponse.json(
        { error: "Product name is required" },
        { status: 400 }
      );
    }
    if (!barcode) {
      return NextResponse.json(
        { error: "Barcode is required" },
        { status: 400 }
      );
    }
    if (Number.isNaN(price) || price < 0) {
      return NextResponse.json(
        { error: "Price must be a number >= 0" },
        { status: 400 }
      );
    }
    if (Number.isNaN(costPrice) || costPrice < 0) {
      return NextResponse.json(
        { error: "Cost price must be a number >= 0" },
        { status: 400 }
      );
    }
    if (Number.isNaN(stock) || stock < 0) {
      return NextResponse.json(
        { error: "Stock must be an integer >= 0" },
        { status: 400 }
      );
    }
    if (expiryDate && Number.isNaN(expiryDate.getTime())) {
      return NextResponse.json(
        { error: "expiryDate must be a valid ISO date string" },
        { status: 400 }
      );
    }

    // Verify supplier belongs to the same store (if provided)
    if (supplierId) {
      const supplier = await db.supplier.findFirst({
        where: { id: supplierId, storeId: session.storeId },
        select: { id: true },
      });
      if (!supplier) {
        return NextResponse.json(
          { error: "Supplier not found in your store" },
          { status: 400 }
        );
      }
    }

    // Enforce unique [storeId, barcode]
    const existing = await db.product.findFirst({
      where: { storeId: session.storeId, barcode },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Product with barcode '${barcode}' already exists in your store` },
        { status: 409 }
      );
    }

    const data: Prisma.ProductCreateInput = {
      name,
      barcode,
      price,
      costPrice,
      stock: Math.floor(stock),
      category,
      store: { connect: { id: session.storeId } },
    };
    if (expiryDate) data.expiryDate = expiryDate;
    if (supplierId) data.supplier = { connect: { id: supplierId } };
    if (imageUrl) data.imageUrl = imageUrl;

    const product = await db.product.create({ data });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/products");
  }
}
