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
  upiId?: string;
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

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [store, setStore] = useState<AuthStore | null>(null);
  const [subscription, setSubscription] = useState<AuthSubscription | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  // Fetch /api/auth/me on mount
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "same-origin",
      });
      if (res.ok) {
        const data: MeResponse = await res.json();
        setUser(data.user);
        setStore(data.store);
        setSubscription(data.subscription);
      } else {
        setUser(null);
        setStore(null);
        setSubscription(null);
      }
    } catch {
      setUser(null);
      setStore(null);
      setSubscription(null);
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

    // Re-fetch /me to populate store + subscription fully
    await refresh();
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

      await refresh();
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
