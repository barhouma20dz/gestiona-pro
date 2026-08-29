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
 *
 * Detection is intentionally defensive because the public preview chain
 * (edge TLS → internal hops → Caddy) REWRITES `x-forwarded-proto` to "http"
 * on the last hop, so trusting that header alone emitted SameSite=Lax
 * cookies that browsers refuse in the HTTPS preview iframe.
 *
 * Rule: treat the request as HTTPS (cross-site-safe cookie) when EITHER
 * - any entry of the x-forwarded-proto chain says "https", OR
 * - the Host is not local (in this sandbox the app is only publicly
 *   reachable through the HTTPS edge, so a public Host implies HTTPS).
 * Plain local development over HTTP keeps the classic SameSite=Lax cookie.
 */
export function sessionCookieOptions(request?: Request) {
  const headerList = (name: string): string[] => {
    const raw = request?.headers.get(name) ?? "";
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const protos = headerList("x-forwarded-proto");
  try {
    if (request?.url) {
      protos.push(new URL(request.url).protocol.replace(":", ""));
    }
  } catch {
    // ignore malformed URL
  }

  const hostHeader = request?.headers.get("host") ?? "";
  let urlHost = "";
  try {
    urlHost = request?.url ? new URL(request.url).host : "";
  } catch {
    // ignore
  }
  const isLocalHost = [hostHeader, urlHost].every(
    (h) =>
      h === "" ||
      /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?$/i.test(h)
  );

  const isHttps = protos.includes("https") || !isLocalHost;

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
