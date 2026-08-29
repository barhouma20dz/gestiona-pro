import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookieName, sessionCookieOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    // Delete the session cookie by setting maxAge to 0
    cookieStore.set(
      getSessionCookieName(),
      "",
      { ...sessionCookieOptions(request), maxAge: 0 }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/auth/logout]", error);
    return NextResponse.json(
      { error: "Failed to sign out" },
      { status: 500 }
    );
  }
}
