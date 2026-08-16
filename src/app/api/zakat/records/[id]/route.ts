import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

interface MarkPaidBody {
  status: "PAID";
  paidDate?: string;
}

// PUT /api/zakat/records/:id — mark record as paid
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStoreOwner();
    const { id } = await params;
    const body = (await request.json()) as MarkPaidBody;

    if (body?.status !== "PAID") {
      return NextResponse.json(
        { error: "Only status 'PAID' is supported via this endpoint" },
        { status: 400 }
      );
    }

    const existing = await db.zakatRecord.findFirst({
      where: { id, storeId: session.storeId },
      select: { id: true, status: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Zakat record not found" },
        { status: 404 }
      );
    }

    const paidDate =
      body.paidDate && body.paidDate.trim() !== ""
        ? new Date(body.paidDate)
        : new Date();
    if (Number.isNaN(paidDate.getTime())) {
      return NextResponse.json(
        { error: "paidDate must be a valid ISO date string" },
        { status: 400 }
      );
    }

    const updated = await db.zakatRecord.update({
      where: { id },
      data: {
        status: "PAID",
        paidDate,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, "PUT /api/zakat/records/:id");
  }
}
