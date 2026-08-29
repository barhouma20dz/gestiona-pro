"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export interface AuthStore {
  id: string;
  name: string;
  businessType?: string;
  phone?: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  ripNumber?: string;
  footerText?: string;
  currency?: string;
  taxRate?: number;
  logoUrl?: string | null;
  timezone?: string;
  status?: string;
}

export interface AuthSubscription {
  id: string;
  status: string;
  plan: string;
  startDate: string;
  endDate: string;
  trialEndsAt: string | null;
}

interface MeResponse {
  user: AuthUser;
  store: AuthStore | null;
  subscription: AuthSubscription | null;
}

export interface RegisterPayload {
  storeName: string;
  businessType: string;
  phone: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  store: AuthStore | null;
  subscription: AuthSubscription | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const TOKEN_KEY = "swiftbill-token";

// ─── Resilient fetch for auth calls ─────────────────────────────────────────
// Preview URLs sit behind an HTTPS edge + internal proxy. Occasionally the
// edge answers with 502/503/504 (cold start, restart) or drops the request.
// authFetch adds: 15s timeout, one automatic retry, and PRECISE error
// messages so the UI can show the real cause instead of a generic one.

const AUTH_TIMEOUT_MS = 15000;
const RETRYABLE_STATUS = new Set([502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

async function attemptOnce(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      credentials: "same-origin",
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await attemptOnce(url, init);
  } catch (e) {
    // First attempt failed at network level — wait briefly, retry once.
    try {
      await sleep(900);
      res = await attemptOnce(url, init);
    } catch (e2) {
      if (isAbort(e2)) {
        throw new Error("Network timeout — the server did not respond");
      }
      throw new Error("Failed to fetch — the server could not be reached");
    }
  }

  if (RETRYABLE_STATUS.has(res.status)) {
    try {
      await sleep(900);
      const retry = await attemptOnce(url, init);
      if (!RETRYABLE_STATUS.has(retry.status)) return retry;
      throw new Error(`Server error (HTTP ${retry.status})`);
    } catch (e2) {
      if (e2 instanceof Error && e2.message.startsWith("Server error")) throw e2;
      if (isAbort(e2)) {
        throw new Error("Network timeout — the server did not respond");
      }
      throw new Error("Failed to fetch — the server could not be reached");
    }
  }

  return res;
}

// In-memory copy survives even when localStorage is blocked entirely
// (e.g. Safari ITP in third-party iframes) — as long as the SPA lives,
// every request carries the Bearer token and the session works.
let memoryToken: string | null = null;

export function getStoredToken(): string | null {
  if (memoryToken) return memoryToken;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  memoryToken = token;
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // storage blocked (private mode / third-party iframe) — memory copy still holds
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [store, setStore] = useState<AuthStore | null>(null);
  const [subscription, setSubscription] = useState<AuthSubscription | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  // Fetch /api/auth/me — uses cookie OR Authorization header as fallback.
  // keepOnFail: don't wipe a session that was just established directly from
  // a login/register response (e.g. when /me hiccups right after auth).
  const refresh = useCallback(async (opts?: { keepOnFail?: boolean }) => {
    try {
      const token = getStoredToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await authFetch("/api/auth/me", { headers });
      if (res.ok) {
        const data: MeResponse = await res.json().catch(() => null);
        if (data?.user) {
          setUser(data.user);
          setStore(data.store ?? null);
          setSubscription(data.subscription ?? null);
        } else if (!opts?.keepOnFail) {
          setStoredToken(null);
          setUser(null);
          setStore(null);
          setSubscription(null);
        }
      } else {
        // If 401, clear any stale token
        if (!opts?.keepOnFail) {
          setStoredToken(null);
          setUser(null);
          setStore(null);
          setSubscription(null);
        }
      }
    } catch {
      if (!opts?.keepOnFail) {
        setUser(null);
        setStore(null);
        setSubscription(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(
        data?.error || `Server error (HTTP ${res.status})`
      );
    }
    if (!data?.user || !data?.token) {
      throw new Error(`Server error (HTTP ${res.status}) — incomplete response`);
    }

    // Store token as fallback for cross-origin environments where cookies don't work
    if (data.token) {
      setStoredToken(data.token);
    }

    // Enter the app immediately from the response itself — independent of
    // cookie acceptance or storage availability. Then hydrate the rest.
    setUser(data.user);
    setStore(data.store ?? null);
    setSubscription(data.subscription ?? null);
    setLoading(false);

    // Best-effort full hydration (store + subscription) via /me with Bearer
    await refresh({ keepOnFail: true });
  }, [refresh]);

  const register = useCallback(
    async (data: RegisterPayload) => {
      const res = await authFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          body?.error || `Server error (HTTP ${res.status})`
        );
      }
      if (!body?.user || !body?.token) {
        throw new Error(`Server error (HTTP ${res.status}) — incomplete response`);
      }

      // Store token as fallback
      if (body.token) {
        setStoredToken(body.token);
      }

      // Enter the app immediately — independent of cookies/storage
      setUser(body.user);
      setStore(body.store ?? null);
      setSubscription(body.subscription ?? null);
      setLoading(false);

      await refresh({ keepOnFail: true });
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      // ignore network errors — clear local state regardless
    } finally {
      setStoredToken(null);
      setUser(null);
      setStore(null);
      setSubscription(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        store,
        subscription,
        loading,
        login,
        register,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
