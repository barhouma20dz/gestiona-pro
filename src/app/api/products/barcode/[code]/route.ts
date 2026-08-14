import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

// GET /api/products/barcode/:code — find a product by barcode within the store
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { code } = await params;
    const decoded = decodeURIComponent(code);

    const product = await db.product.findFirst({
      where: { storeId: session.storeId, barcode: decoded },
    });

    if (!product) {
      return NextResponse.json(
        { error: `No product found for barcode '${decoded}'` },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    return handleRouteError(error, "GET /api/products/barcode/:code");
  }
}
