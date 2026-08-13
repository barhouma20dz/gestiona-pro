import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// PUT /api/products/:id — update a product
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};

    if (typeof body?.name === "string") {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json(
          { error: "Product name cannot be empty" },
          { status: 400 }
        );
      }
      data.name = name;
    }

    if (typeof body?.barcode === "string") {
      const barcode = body.barcode.trim();
      if (!barcode) {
        return NextResponse.json(
          { error: "Barcode cannot be empty" },
          { status: 400 }
        );
      }
      // Check uniqueness if it's being changed
      if (barcode !== existing.barcode) {
        const dup = await db.product.findUnique({ where: { barcode } });
        if (dup) {
          return NextResponse.json(
            { error: `Product with barcode '${barcode}' already exists` },
            { status: 409 }
          );
        }
      }
      data.barcode = barcode;
    }

    if (body?.price !== undefined) {
      const price = Number(body.price);
      if (Number.isNaN(price) || price < 0) {
        return NextResponse.json(
          { error: "Price must be a number >= 0" },
          { status: 400 }
        );
      }
      data.price = price;
    }

    if (body?.stock !== undefined) {
      const stock = Number(body.stock);
      if (Number.isNaN(stock) || stock < 0) {
        return NextResponse.json(
          { error: "Stock must be an integer >= 0" },
          { status: 400 }
        );
      }
      data.stock = Math.floor(stock);
    }

    if (typeof body?.category === "string" && body.category.trim()) {
      data.category = body.category.trim();
    }

    const updated = await db.product.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/products/:id]", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE /api/products/:id — delete a product
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    await db.product.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/products/:id]", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
