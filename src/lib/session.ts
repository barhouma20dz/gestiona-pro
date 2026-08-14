// Server-side session helper — reads JWT from cookies
import { cookies } from "next/headers";
import { verifyToken, getSessionCookieName, type SessionPayload } from "./auth";

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireStoreOwner(): Promise<SessionPayload> {
  const session = await requireAuth();
  if (!session.storeId) {
    throw new Error("NO_STORE");
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
