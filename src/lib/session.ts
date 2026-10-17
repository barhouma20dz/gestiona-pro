// Server-side session helper — reads JWT from cookies OR Authorization header
import { cookies } from "next/headers";
import { headers } from "next/headers";
import {
  verifyToken,
  getSessionCookieName,
  type SessionPayload,
  type StoreSessionPayload,
} from "./auth";

export async function getSession(): Promise<SessionPayload | null> {
  // 1. Try cookie first
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(getSessionCookieName())?.value;
  if (cookieToken) {
    const session = await verifyToken(cookieToken);
    if (session) return session;
  }

  // 2. Fallback: try Authorization: Bearer <token> header
  const headerStore = await headers();
  const authHeader = headerStore.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const bearerToken = authHeader.slice(7);
    const session = await verifyToken(bearerToken);
    if (session) return session;
  }

  return null;
}

export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireStoreOwner(): Promise<StoreSessionPayload> {
  const session = await requireAuth();
  if (!session.storeId) {
    throw new Error("NO_STORE");
  }
  // Store owner or staff assigned to store
  return session as StoreSessionPayload;
}

export async function requirePermission(permissionKey: string): Promise<StoreSessionPayload> {
  const session = await requireStoreOwner();
  if (session.role === "OWNER" || session.role === "SUPER_ADMIN") {
    return session;
  }

  // Look up user permissions and active status dynamically from DB
  const { db } = await import("./db");
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { isActive: true, role: true, permissions: true },
  });

  if (!user || user.isActive === false) {
    throw new Error("ACCOUNT_DISABLED");
  }

  const { hasPermission } = await import("./permissions");
  if (!hasPermission(user, permissionKey)) {
    throw new Error("FORBIDDEN");
  }

  return session;
}

export async function requireSuperAdmin(): Promise<SessionPayload> {
  const session = await requireAuth();
  if (session.role !== "SUPER_ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return session;
}
