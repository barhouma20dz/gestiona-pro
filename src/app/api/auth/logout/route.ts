import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookieName } from "@/lib/auth";

export async function POST() {
  try {
    const cookieStore = await cookies();
    // Delete the session cookie by setting maxAge to 0
    cookieStore.set(getSessionCookieName(), "", {
      httpOnly: false,
      sameSite: "none",
      secure: false,
      maxAge: 0,
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/auth/logout]", error);
    return NextResponse.json(
      { error: "Failed to sign out" },
      { status: 500 }
    );
  }
}
