import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {
  signToken,
  getSessionCookieName,
  getSessionDuration,
} from "@/lib/auth";

interface LoginBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;

    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing email or password" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email },
      include: { store: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check store status (skip for SUPER_ADMIN who has no store)
    if (user.store && user.store.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "Store suspended" },
        { status: 403 }
      );
    }

    // Sign JWT
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      storeId: user.storeId,
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
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        store: user.store
          ? {
              id: user.store.id,
              name: user.store.name,
              businessType: user.store.businessType,
              status: user.store.status,
            }
          : null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    return NextResponse.json(
      { error: "Failed to sign in" },
      { status: 500 }
    );
  }
}
