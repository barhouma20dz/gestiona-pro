import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/session";
import { handleRouteError } from "@/lib/api-error";
import {
  generateLicenseKey,
  LICENSE_PLANS,
  isLicensePlan,
  type LicensePlan,
} from "@/lib/license";

// GET /api/admin/licenses — list all license keys with store info (super admin)
export async function GET() {
  try {
    await requireSuperAdmin();
    const keys = await db.licenseKey.findMany({
      include: {
        store: { select: { id: true, name: true } },
        createdBy: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(keys);
  } catch (error) {
    return handleRouteError(error, "GET /api/admin/licenses");
  }
}

// POST /api/admin/licenses — generate a new license key (super admin)
// Body: { plan: "MONTHLY" | "QUARTERLY" | "YEARLY" }
export async function POST(request: Request) {
  try {
    const session = await requireSuperAdmin();
    const body = await request.json();
    const planRaw = typeof body?.plan === "string" ? body.plan.trim().toUpperCase() : "";
    if (!isLicensePlan(planRaw)) {
      return NextResponse.json(
        {
          error: `plan must be one of ${Object.keys(LICENSE_PLANS).join(", ")}`,
        },
        { status: 400 }
      );
    }
    const plan: LicensePlan = planRaw;
    const generated = generateLicenseKey(plan);

    const created = await db.licenseKey.create({
      data: {
        key: generated.key,
        signature: generated.signature,
        plan,
        durationDays: generated.durationDays,
        status: "UNUSED",
        createdById: session.userId,
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        key: created.key,
        signature: created.signature,
        plan: created.plan,
        durationDays: created.durationDays,
        status: created.status,
        createdAt: created.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, "POST /api/admin/licenses");
  }
}
