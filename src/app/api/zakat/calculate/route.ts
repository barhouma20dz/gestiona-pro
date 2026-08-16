import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStoreOwner } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";

interface CalculateBody {
  year?: number;
  inventoryValue?: number;
  cashValue?: number;
  receivablesValue?: number;
  liabilitiesValue?: number;
  notes?: string;
}

// POST /api/zakat/calculate — compute zakat values + save as ZakatRecord
export async function POST(request: Request) {
  try {
    const session = await requireStoreOwner();
    const body = (await request.json()) as CalculateBody;

    const year = Number(body?.year);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        { error: "year must be a valid integer between 2000 and 2100" },
        { status: 400 }
      );
    }

    // Ensure settings exist
    let settings = await db.zakatSettings.findUnique({
      where: { storeId: session.storeId },
    });
    if (!settings) {
      settings = await db.zakatSettings.create({
        data: { storeId: session.storeId },
      });
    }

    // Compute values not provided
    let inventoryValue: number;
    if (body.inventoryValue !== undefined && body.inventoryValue !== null) {
      inventoryValue = Number(body.inventoryValue) || 0;
    } else {
      const products = await db.product.findMany({
        where: { storeId: session.storeId },
        select: { stock: true, costPrice: true, price: true },
      });
      inventoryValue = products.reduce((sum, p) => {
        const unit = settings!.valuationMethod === "selling" ? p.price : p.costPrice;
        return sum + unit * p.stock;
      }, 0);
    }

    const cashValue =
      body.cashValue !== undefined && body.cashValue !== null
        ? Number(body.cashValue) || 0
        : settings.cashOnHand;
    const receivablesValue =
      body.receivablesValue !== undefined && body.receivablesValue !== null
        ? Number(body.receivablesValue) || 0
        : settings.receivables;
    const liabilitiesValue =
      body.liabilitiesValue !== undefined && body.liabilitiesValue !== null
        ? Number(body.liabilitiesValue) || 0
        : settings.liabilities;

    const zakatBase =
      (settings.includeInventory ? inventoryValue : 0) +
      (settings.includeCash ? cashValue : 0) +
      (settings.includeReceivables ? receivablesValue : 0) -
      liabilitiesValue;

    const zakatRate = settings.zakatRate;
    const zakatAmount = zakatBase * (zakatRate / 100);

    const notes = typeof body?.notes === "string" ? body.notes.trim() : "";

    const record = await db.zakatRecord.create({
      data: {
        storeId: session.storeId,
        year,
        calculationDate: new Date(),
        inventoryValue,
        cashValue,
        receivablesValue,
        liabilitiesValue,
        zakatBase: Math.max(0, zakatBase),
        zakatRate,
        zakatAmount: Math.max(0, zakatAmount),
        status: "UNPAID",
        notes,
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/zakat/calculate");
  }
}
