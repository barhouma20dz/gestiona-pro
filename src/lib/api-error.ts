// Tiny helper for mapping auth-thrown errors to NextResponse JSON.
import { NextResponse } from "next/server";

export interface ApiErrorOptions {
  logLabel?: string;
  error?: unknown;
}

/**
 * Maps thrown auth errors (`UNAUTHORIZED`, `NO_STORE`, `FORBIDDEN`) to
 * appropriate HTTP responses. Returns null if the error is not an auth error
 * so the caller can handle it as a 500.
 */
export function mapAuthError(
  message: string
): NextResponse | null {
  switch (message) {
    case "UNAUTHORIZED":
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    case "NO_STORE":
      return NextResponse.json(
        { error: "No store associated with this account" },
        { status: 403 }
      );
    case "ACCOUNT_DISABLED":
      return NextResponse.json(
        { error: "هذا الحساب معطل حالياً. يرجى مراجعة إدارة المتجر" },
        { status: 403 }
      );
    case "FORBIDDEN":
      return NextResponse.json(
        { error: "ليس لديك الصلاحية الكافية لتنفيذ هذه العملية" },
        { status: 403 }
      );
    default:
      return null;
  }
}

/**
 * Wrap an async route handler with auth-error mapping so thrown
 * `requireStoreOwner()` / `requireSuperAdmin()` errors become clean 401/403s.
 */
export async function handleRouteError(
  error: unknown,
  label: string
): Promise<NextResponse> {
  const message =
    error instanceof Error ? error.message : "Internal server error";
  const mapped = mapAuthError(message);
  if (mapped) return mapped;
  console.error(`[${label}]`, error);
  return NextResponse.json(
    { error: message || "Internal server error" },
    { status: 500 }
  );
}
