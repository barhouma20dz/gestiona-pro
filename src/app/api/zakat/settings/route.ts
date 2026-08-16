import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

interface UpdateSettingsBody {
  zakatRate?: number;
  nisabAmount?: number;
  haulStartDate?: string | null;
  cashOnHand?: number;
  receivables?: number;
  liabilities?: number;
  includeInventory?: boolean;
  includeCash?: boolean;
  includeReceivables?: boolean;
  valuationMethod?: "cost" | "selling";
}

// GET /api/zakat/settings — return ZakatSettings for store (auto-create if missing)
export async function GET() {
  try {
    const session = await requireStoreOwner();

    let settings = await db.zakatSettings.findUnique({
      where: { storeId: session.storeId },
    });
    if (!settings) {
      settings = await db.zakatSettings.create({
        data: { storeId: session.storeId },
      });
    }
    return NextResponse.json(settings);
  } catch (error) {
    return handleRouteError(error, "GET /api/zakat/settings");
  }
}

// PUT /api/zakat/settings — update settings fields
export async function PUT(request: Request) {
  try {
    const session = await requireStoreOwner();
    const body = (await request.json()) as UpdateSettingsBody;

    // Ensure settings row exists
    let settings = await db.zakatSettings.findUnique({
      where: { storeId: session.storeId },
    });
    if (!settings) {
      settings = await db.zakatSettings.create({
        data: { storeId: session.storeId },
      });
    }

    const data: Record<string, unknown> = {};
    if (body.zakatRate !== undefined) {
      const v = Number(body.zakatRate);
      if (Number.isNaN(v) || v < 0 || v > 100) {
        return NextResponse.json(
          { error: "zakatRate must be a number between 0 and 100" },
          { status: 400 }
        );
      }
      data.zakatRate = v;
    }
    if (body.nisabAmount !== undefined) {
      const v = Number(body.nisabAmount);
      if (Number.isNaN(v) || v < 0) {
        return NextResponse.json(
          { error: "nisabAmount must be a number >= 0" },
          { status: 400 }
        );
      }
      data.nisabAmount = v;
    }
    if (body.haulStartDate !== undefined) {
      if (body.haulStartDate === null || body.haulStartDate === "") {
        data.haulStartDate = null;
      } else {
        const d = new Date(body.haulStartDate);
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json(
            { error: "haulStartDate must be a valid ISO date string" },
            { status: 400 }
          );
        }
        data.haulStartDate = d;
      }
    }
    if (body.cashOnHand !== undefined) {
      const v = Number(body.cashOnHand);
      if (Number.isNaN(v) || v < 0) {
        return NextResponse.json(
          { error: "cashOnHand must be a number >= 0" },
          { status: 400 }
        );
      }
      data.cashOnHand = v;
    }
    if (body.receivables !== undefined) {
      const v = Number(body.receivables);
      if (Number.isNaN(v) || v < 0) {
        return NextResponse.json(
          { error: "receivables must be a number >= 0" },
          { status: 400 }
        );
      }
      data.receivables = v;
    }
    if (body.liabilities !== undefined) {
      const v = Number(body.liabilities);
      if (Number.isNaN(v) || v < 0) {
        return NextResponse.json(
          { error: "liabilities must be a number >= 0" },
          { status: 400 }
        );
      }
      data.liabilities = v;
    }
    if (typeof body.includeInventory === "boolean") {
      data.includeInventory = body.includeInventory;
    }
    if (typeof body.includeCash === "boolean") {
      data.includeCash = body.includeCash;
    }
    if (typeof body.includeReceivables === "boolean") {
      data.includeReceivables = body.includeReceivables;
    }
    if (typeof body.valuationMethod === "string") {
      if (!["cost", "selling"].includes(body.valuationMethod)) {
        return NextResponse.json(
          { error: "valuationMethod must be 'cost' or 'selling'" },
          { status: 400 }
        );
      }
      data.valuationMethod = body.valuationMethod;
    }

    const updated = await db.zakatSettings.update({
      where: { storeId: session.storeId },
      data,
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, "PUT /api/zakat/settings");
  }
}
