import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// PUT /api/products/:id — update a product within the current store
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id } = await params;
    const body = await request.json();

    // Verify the product belongs to this store
    const existing = await db.product.findFirst({
      where: { id, storeId: session.storeId },
    });
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
      if (barcode !== existing.barcode) {
        const dup = await db.product.findFirst({
          where: { storeId: session.storeId, barcode },
          select: { id: true },
        });
        if (dup && dup.id !== existing.id) {
          return NextResponse.json(
            { error: `Product with barcode '${barcode}' already exists in your store` },
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

    if (body?.costPrice !== undefined) {
      const costPrice = Number(body.costPrice);
      if (Number.isNaN(costPrice) || costPrice < 0) {
        return NextResponse.json(
          { error: "Cost price must be a number >= 0" },
          { status: 400 }
        );
      }
      data.costPrice = costPrice;
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

    if (body?.expiryDate !== undefined) {
      if (body.expiryDate === null || body.expiryDate === "") {
        data.expiryDate = null;
      } else if (typeof body.expiryDate === "string") {
        const d = new Date(body.expiryDate);
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json(
            { error: "expiryDate must be a valid ISO date string" },
            { status: 400 }
          );
        }
        data.expiryDate = d;
      }
    }

    if (body?.expiryDate2 !== undefined) {
      if (body.expiryDate2 === null || body.expiryDate2 === "") {
        data.expiryDate2 = null;
      } else if (typeof body.expiryDate2 === "string") {
        const d2 = new Date(body.expiryDate2);
        if (Number.isNaN(d2.getTime())) {
          return NextResponse.json(
            { error: "expiryDate2 must be a valid ISO date string" },
            { status: 400 }
          );
        }
        data.expiryDate2 = d2;
      }
    }

    if (body?.supplierId !== undefined) {
      if (body.supplierId === null || body.supplierId === "") {
        data.supplierId = null;
      } else if (typeof body.supplierId === "string") {
        const supplier = await db.supplier.findFirst({
          where: { id: body.supplierId, storeId: session.storeId },
          select: { id: true },
        });
        if (!supplier) {
          return NextResponse.json(
            { error: "Supplier not found in your store" },
            { status: 400 }
          );
        }
        data.supplierId = body.supplierId;
      }
    }

    if (body?.imageUrl !== undefined) {
      if (body.imageUrl === null || body.imageUrl === "") {
        data.imageUrl = null;
      } else if (typeof body.imageUrl === "string") {
        data.imageUrl = body.imageUrl.trim();
      }
    }

    const updated = await db.product.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, "PUT /api/products/:id");
  }
}

// DELETE /api/products/:id — delete a product within the current store
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id } = await params;

    const existing = await db.product.findFirst({
      where: { id, storeId: session.storeId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    await db.product.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/products/:id");
  }
}
