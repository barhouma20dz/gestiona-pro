import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/products/barcode/:code — find a product by barcode
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const decoded = decodeURIComponent(code);

    const product = await db.product.findUnique({
      where: { barcode: decoded },
    });

    if (!product) {
      return NextResponse.json(
        { error: `No product found for barcode '${decoded}'` },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("[GET /api/products/barcode/:code]", error);
    return NextResponse.json(
      { error: "Failed to fetch product by barcode" },
      { status: 500 }
    );
  }
}
