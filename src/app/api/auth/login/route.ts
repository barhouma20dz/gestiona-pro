import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {
  signToken,
  getSessionCookieName,
  sessionCookieOptions,
} from "@/lib/auth";
import { consumeRateLimit, resetRateLimit, clientIp } from "@/lib/rate-limit";

interface LoginBody {
  email?: string;
  username?: string;
  password?: string;
}

// Brute-force brake (م-0): 10 attempts per identifier+IP per 10 minutes.
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;

    const identifier = (body.username || body.email)?.trim();
    const password = body.password;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "يرجى إدخال اسم المستخدم أو البريد الإلكتروني وكلمة المرور" },
        { status: 400 }
      );
    }

    // م-0: rate limit BEFORE any DB query (works for username or email).
    const rateKey = `login:${identifier.toLowerCase()}:${clientIp(request)}`;
    const rate = consumeRateLimit(rateKey, LOGIN_LIMIT, LOGIN_WINDOW_MS);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: `محاولات كثيرة جداً. أعد المحاولة بعد ${rate.retryAfterSec} ثانية`,
          code: "TOO_MANY_ATTEMPTS",
        },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
      );
    }

    const isEmail = identifier.includes("@");
    const user = await db.user.findFirst({
      where: isEmail
        ? { email: identifier.toLowerCase() }
        : {
            OR: [
              { username: identifier },
              { email: identifier.toLowerCase() },
            ],
          },
      include: { store: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "بيانات الدخول غير صحيحة" },
        { status: 401 }
      );
    }

    if (user.isActive === false) {
      return NextResponse.json(
        { error: "هذا الحساب معطل حالياً. يرجى التواصل مع إدارة المتجر" },
        { status: 403 }
      );
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return NextResponse.json(
        { error: "بيانات الدخول غير صحيحة" },
        { status: 401 }
      );
    }

    resetRateLimit(rateKey); // successful login clears the brake

    // Check store status (skip for SUPER_ADMIN who has no store)
    if (user.store && user.store.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "تم تجميد هذا المتجر مؤقتاً" },
        { status: 403 }
      );
    }

    // Parse user permissions
    let parsedPerms: string[] = [];
    if (user.role === "OWNER" || user.role === "SUPER_ADMIN") {
      parsedPerms = ["*"];
    } else if (user.permissions) {
      try {
        parsedPerms = JSON.parse(user.permissions);
      } catch {
        parsedPerms = [];
      }
    }

    // Sign JWT
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      storeId: user.storeId,
    });

    // Set cookie — protocol-aware so browsers actually accept it on HTTPS preview
    const cookieStore = await cookies();
    cookieStore.set(
      getSessionCookieName(),
      token,
      sessionCookieOptions(request)
    );

    return NextResponse.json(
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          permissions: parsedPerms,
        },
        store: user.store
          ? {
              id: user.store.id,
              name: user.store.name,
              businessType: user.store.businessType,
              status: user.store.status,
              logoUrl: user.store.logoUrl,
              storePhotoUrl: user.store.storePhotoUrl,
              primaryDisplayImage: user.store.primaryDisplayImage,
              sidebarConfig: user.store.sidebarConfig,
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
