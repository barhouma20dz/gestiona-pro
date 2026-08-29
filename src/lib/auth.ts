// JWT session utilities — server-side only
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "swiftbill-dev-secret-change-in-production";
const secret = new TextEncoder().encode(JWT_SECRET);

export interface SessionPayload {
  userId: string;
  email: string;
  role: string; // OWNER | STAFF | SUPER_ADMIN
  storeId: string | null;
}

/** Session guaranteed to be bound to a tenant store (returned by requireStoreOwner). */
export interface StoreSessionPayload extends SessionPayload {
  storeId: string;
}

const SESSION_COOKIE = "swiftbill-session";
const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE;
}

export function getSessionDuration(): number {
  return SESSION_DURATION;
}

/**
 * Correct cookie options for the current request protocol.
 *
 * Per the cookie spec, `SameSite=None` requires the `Secure` attribute —
 * browsers REJECT `SameSite=None; Secure=false` cookies entirely.
 * The preview environment is served over HTTPS (behind a proxy), so we detect
 * `x-forwarded-proto: https` and emit a valid cross-site cookie there, while
 * local HTTP development gets a classic SameSite=Lax cookie.
 */
export function sessionCookieOptions(request?: Request) {
  const proto =
    request?.headers.get("x-forwarded-proto") ??
    (() => {
      try {
        return request?.url ? new URL(request.url).protocol.replace(":", "") : null;
      } catch {
        return null;
      }
    })();

  const isHttps = proto === "https";

  return isHttps
    ? {
        httpOnly: false,
        sameSite: "none" as const,
        secure: true, // required when sameSite=none — browsers reject otherwise
        maxAge: getSessionDuration(),
        path: "/",
      }
    : {
        httpOnly: false,
        sameSite: "lax" as const,
        secure: false,
        maxAge: getSessionDuration(),
        path: "/",
      };
}
