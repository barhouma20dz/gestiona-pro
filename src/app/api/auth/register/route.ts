import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {
  signToken,
  getSessionCookieName,
  getSessionDuration,
} from "@/lib/auth";

interface RegisterBody {
  storeName?: string;
  businessType?: string;
  phone?: string;
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterBody;

    const storeName = body.storeName?.trim();
    const businessType = body.businessType?.trim() || "Other";
    const phone = body.phone?.trim() || "";
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    // Basic validation
    if (!storeName || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields: storeName, email, password" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Email uniqueness
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "This email is already registered" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Trial dates: 14 days from now
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Create Store + User + Subscription in one transaction
    const result = await db.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: {
          name: storeName,
          businessType,
          phone,
          email,
          status: "ACTIVE",
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          password: passwordHash,
          name: storeName,
          role: "OWNER",
          storeId: store.id,
        },
      });

      const subscription = await tx.subscription.create({
        data: {
          storeId: store.id,
          status: "TRIAL",
          plan: "MONTHLY",
          startDate: now,
          endDate: trialEndsAt,
          trialEndsAt,
        },
      });

      return { store, user, subscription };
    });

    // Sign JWT
    const token = await signToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      storeId: result.store.id,
    });

    // Set httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set(getSessionCookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: getSessionDuration(),
      path: "/",
    });

    return NextResponse.json(
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
        },
        store: {
          id: result.store.id,
          name: result.store.name,
        },
        subscription: {
          id: result.subscription.id,
          status: result.subscription.status,
          plan: result.subscription.plan,
          trialEndsAt: result.subscription.trialEndsAt,
          endDate: result.subscription.endDate,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/auth/register]", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
