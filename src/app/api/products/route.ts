import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

// GET /api/products — list all products, newest first
export async function GET() {
  try {
    const products = await db.product.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error("[GET /api/products]", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// POST /api/products — create a new product
export async function POST(request: Request) {
  try {
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

    // Validation
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

    // Check barcode uniqueness
    const existing = await db.product.findUnique({ where: { barcode } });
    if (existing) {
      return NextResponse.json(
        { error: `Product with barcode '${barcode}' already exists` },
        { status: 409 }
      );
    }

    const product = await db.product.create({
      data: {
        name,
        barcode,
        price,
        costPrice,
        stock: Math.floor(stock),
        category,
      } satisfies Prisma.ProductCreateInput,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("[POST /api/products]", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
