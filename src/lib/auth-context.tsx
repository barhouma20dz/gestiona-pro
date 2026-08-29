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
      const res = await fetch("/api/auth/me", {
        credentials: "same-origin",
        headers,
      });
      if (res.ok) {
        const data: MeResponse = await res.json();
        setUser(data.user);
        setStore(data.store);
        setSubscription(data.subscription);
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
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || "Failed to sign in");
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(data),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || "Failed to create account");
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
