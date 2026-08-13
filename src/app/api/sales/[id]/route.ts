import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/sales/:id — fetch a single sale with its items
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const sale = await db.sale.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!sale) {
      return NextResponse.json(
        { error: "Sale not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(sale);
  } catch (error) {
    console.error("[GET /api/sales/:id]", error);
    return NextResponse.json(
      { error: "Failed to fetch sale" },
      { status: 500 }
    );
  }
}
