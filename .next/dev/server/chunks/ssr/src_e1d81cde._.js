module.exports = [
"[project]/src/lib/auth-context.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "getStoredToken",
    ()=>getStoredToken,
    "setStoredToken",
    ()=>setStoredToken,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
;
const TOKEN_KEY = "swiftbill-token";
// ─── Resilient fetch for auth calls ─────────────────────────────────────────
// Preview URLs sit behind an HTTPS edge + internal proxy. Occasionally the
// edge answers with 502/503/504 (cold start, restart) or drops the request.
// authFetch adds: 15s timeout, one automatic retry, and PRECISE error
// messages so the UI can show the real cause instead of a generic one.
const AUTH_TIMEOUT_MS = 15000;
const RETRYABLE_STATUS = new Set([
    502,
    503,
    504
]);
const sleep = (ms)=>new Promise((r)=>setTimeout(r, ms));
function isAbort(e) {
    return e instanceof DOMException && e.name === "AbortError";
}
async function attemptOnce(url, init) {
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(), AUTH_TIMEOUT_MS);
    try {
        return await fetch(url, {
            ...init,
            signal: controller.signal,
            credentials: "same-origin",
            cache: "no-store"
        });
    } finally{
        clearTimeout(timer);
    }
}
async function authFetch(url, init) {
    let res;
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
let memoryToken = null;
function getStoredToken() {
    if (memoryToken) return memoryToken;
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch  {
        return null;
    }
}
function setStoredToken(token) {
    memoryToken = token;
    try {
        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
        } else {
            localStorage.removeItem(TOKEN_KEY);
        }
    } catch  {
    // storage blocked (private mode / third-party iframe) — memory copy still holds
    }
}
// ─── Context ─────────────────────────────────────────────────────────────────
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(null);
function AuthProvider({ children }) {
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [store, setStore] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [subscription, setSubscription] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    // Fetch /api/auth/me — uses cookie OR Authorization header as fallback.
    // keepOnFail: don't wipe a session that was just established directly from
    // a login/register response (e.g. when /me hiccups right after auth).
    const refresh = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (opts)=>{
        try {
            const token = getStoredToken();
            const headers = {};
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
            const res = await authFetch("/api/auth/me", {
                headers
            });
            if (res.ok) {
                const data = await res.json().catch(()=>null);
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
        } catch  {
            if (!opts?.keepOnFail) {
                setUser(null);
                setStore(null);
                setSubscription(null);
            }
        } finally{
            setLoading(false);
        }
    }, []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        refresh();
    }, [
        refresh
    ]);
    const login = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (email, password)=>{
        const res = await authFetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });
        const data = await res.json().catch(()=>null);
        if (!res.ok) {
            throw new Error(data?.error || `Server error (HTTP ${res.status})`);
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
        await refresh({
            keepOnFail: true
        });
    }, [
        refresh
    ]);
    const register = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (data)=>{
        const res = await authFetch("/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
        const body = await res.json().catch(()=>null);
        if (!res.ok) {
            throw new Error(body?.error || `Server error (HTTP ${res.status})`);
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
        await refresh({
            keepOnFail: true
        });
    }, [
        refresh
    ]);
    const logout = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "same-origin"
            });
        } catch  {
        // ignore network errors — clear local state regardless
        } finally{
            setStoredToken(null);
            setUser(null);
            setStore(null);
            setSubscription(null);
        }
    }, []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: {
            user,
            store,
            subscription,
            loading,
            login,
            register,
            logout,
            refresh
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/src/lib/auth-context.tsx",
        lineNumber: 313,
        columnNumber: 5
    }, this);
}
function useAuth() {
    const ctx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return ctx;
}
}),
"[project]/src/lib/api.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// API client helpers for SwiftBill POS
__turbopack_context__.s([
    "adminApi",
    ()=>adminApi,
    "customersApi",
    ()=>customersApi,
    "expiryApi",
    ()=>expiryApi,
    "inventoryAuditApi",
    ()=>inventoryAuditApi,
    "myEarningsApi",
    ()=>myEarningsApi,
    "productsApi",
    ()=>productsApi,
    "salesApi",
    ()=>salesApi,
    "sellersApi",
    ()=>sellersApi,
    "shopApi",
    ()=>shopApi,
    "subscriptionApi",
    ()=>subscriptionApi,
    "supplierInvoicesApi",
    ()=>supplierInvoicesApi,
    "supplierPaymentsApi",
    ()=>supplierPaymentsApi,
    "suppliersApi",
    ()=>suppliersApi,
    "zakatApi",
    ()=>zakatApi
]);
// Read stored JWT token — shared accessor with auth-context so the in-memory
// copy works even when localStorage is blocked (Safari third-party iframes).
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2d$context$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth-context.tsx [app-ssr] (ecmascript)");
;
function getAuthToken() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2d$context$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getStoredToken"])();
}
async function request(url, options) {
    const token = getAuthToken();
    const headers = {
        "Content-Type": "application/json",
        ...options?.headers ?? {}
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(url, {
        ...options,
        headers,
        credentials: "same-origin"
    });
    if (!res.ok) {
        const text = await res.text().catch(()=>"Request failed");
        throw new Error(text || `Request failed: ${res.status}`);
    }
    if (res.status === 204) return undefined;
    return res.json();
}
const productsApi = {
    list: ()=>request("/api/products"),
    create: (data)=>request("/api/products", {
            method: "POST",
            body: JSON.stringify(data)
        }),
    update: (id, data)=>request(`/api/products/${id}`, {
            method: "PUT",
            body: JSON.stringify(data)
        }),
    delete: (id)=>request(`/api/products/${id}`, {
            method: "DELETE"
        }),
    findByBarcode: (barcode)=>request(`/api/products/barcode/${encodeURIComponent(barcode)}`)
};
const shopApi = {
    get: ()=>request("/api/shop"),
    update: (data)=>request("/api/shop", {
            method: "PUT",
            body: JSON.stringify(data)
        })
};
const salesApi = {
    list: ()=>request("/api/sales"),
    get: (id)=>request(`/api/sales/${id}`),
    create: (data)=>request("/api/sales", {
            method: "POST",
            body: JSON.stringify(data)
        }),
    stats: ()=>request("/api/sales/stats")
};
const customersApi = {
    list: ()=>request("/api/customers"),
    create: (data)=>request("/api/customers", {
            method: "POST",
            body: JSON.stringify(data)
        }),
    update: (id, data)=>request(`/api/customers/${id}`, {
            method: "PUT",
            body: JSON.stringify(data)
        }),
    delete: (id)=>request(`/api/customers/${id}`, {
            method: "DELETE"
        }),
    payments: (id)=>request(`/api/customers/${id}/payments`),
    addPayment: (id, data)=>request(`/api/customers/${id}/payments`, {
            method: "POST",
            body: JSON.stringify(data)
        })
};
const suppliersApi = {
    list: ()=>request("/api/suppliers"),
    create: (data)=>request("/api/suppliers", {
            method: "POST",
            body: JSON.stringify(data)
        }),
    update: (id, data)=>request(`/api/suppliers/${id}`, {
            method: "PUT",
            body: JSON.stringify(data)
        }),
    delete: (id)=>request(`/api/suppliers/${id}`, {
            method: "DELETE"
        }),
    invoices: (id)=>request(`/api/suppliers/${id}/invoices`)
};
const supplierInvoicesApi = {
    list: ()=>request("/api/supplier-invoices"),
    create: (data)=>request("/api/supplier-invoices", {
            method: "POST",
            body: JSON.stringify(data)
        }),
    get: (id)=>request(`/api/supplier-invoices/${id}`),
    update: (id, data)=>request(`/api/supplier-invoices/${id}`, {
            method: "PUT",
            body: JSON.stringify(data)
        }),
    delete: (id)=>request(`/api/supplier-invoices/${id}`, {
            method: "DELETE"
        })
};
const expiryApi = {
    list: ()=>request("/api/products/expiry")
};
const subscriptionApi = {
    get: ()=>request("/api/subscription"),
    activate: (key)=>request("/api/subscription/activate", {
            method: "POST",
            body: JSON.stringify({
                key
            })
        })
};
const adminApi = {
    stats: ()=>request("/api/admin/stats"),
    stores: ()=>request("/api/admin/stores"),
    generateLicense: (plan)=>request("/api/admin/licenses", {
            method: "POST",
            body: JSON.stringify({
                plan
            })
        }),
    licenses: ()=>request("/api/admin/licenses"),
    suspendStore: (id)=>request(`/api/admin/stores/${id}/suspend`, {
            method: "POST"
        }),
    activateSubscription: (id, durationDays, plan)=>request(`/api/admin/stores/${id}/activate-subscription`, {
            method: "POST",
            body: JSON.stringify({
                durationDays,
                plan
            })
        })
};
const sellersApi = {
    list: ()=>request("/api/sellers"),
    create: (data)=>request("/api/sellers", {
            method: "POST",
            body: JSON.stringify(data)
        }),
    update: (id, data)=>request(`/api/sellers/${id}`, {
            method: "PUT",
            body: JSON.stringify(data)
        }),
    delete: (id)=>request(`/api/sellers/${id}`, {
            method: "DELETE"
        }),
    earnings: (id)=>request(`/api/sellers/${id}/earnings`),
    changePassword: (id, password)=>request(`/api/sellers/${id}/change-password`, {
            method: "POST",
            body: JSON.stringify({
                password
            })
        })
};
const myEarningsApi = {
    get: ()=>request("/api/my-earnings")
};
const inventoryAuditApi = {
    list: ()=>request("/api/inventory-audits"),
    create: (data)=>request("/api/inventory-audits", {
            method: "POST",
            body: JSON.stringify(data)
        }),
    get: (id)=>request(`/api/inventory-audits/${id}`),
    update: (id, data)=>request(`/api/inventory-audits/${id}`, {
            method: "PUT",
            body: JSON.stringify(data)
        }),
    delete: (id)=>request(`/api/inventory-audits/${id}`, {
            method: "DELETE"
        }),
    updateItems: (id, items)=>request(`/api/inventory-audits/${id}/items`, {
            method: "PUT",
            body: JSON.stringify({
                items
            })
        }),
    approve: (id)=>request(`/api/inventory-audits/${id}/approve`, {
            method: "POST"
        }),
    stats: (id)=>request(`/api/inventory-audits/${id}/stats`)
};
const zakatApi = {
    getSettings: ()=>request("/api/zakat/settings"),
    updateSettings: (data)=>request("/api/zakat/settings", {
            method: "PUT",
            body: JSON.stringify(data)
        }),
    calculate: (data)=>request("/api/zakat/calculate", {
            method: "POST",
            body: JSON.stringify(data)
        }),
    getRecords: ()=>request("/api/zakat/records"),
    markPaid: (id, data)=>request(`/api/zakat/records/${id}`, {
            method: "PUT",
            body: JSON.stringify(data)
        })
};
const supplierPaymentsApi = {
    list: (invoiceId)=>request(`/api/supplier-invoices/${invoiceId}/payments`),
    create: (invoiceId, data)=>request(`/api/supplier-invoices/${invoiceId}/payments`, {
            method: "POST",
            body: JSON.stringify(data)
        }),
    delete: (invoiceId, paymentId)=>request(`/api/supplier-invoices/${invoiceId}/payments/${paymentId}`, {
            method: "DELETE"
        })
};
}),
"[project]/src/lib/cart-store.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isKgProduct",
    ()=>isKgProduct,
    "useCartStore",
    ()=>useCartStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/react.mjs [app-ssr] (ecmascript)");
"use client";
;
function isKgProduct(itemOrProduct) {
    return itemOrProduct.unitType === "kg";
}
const useCartStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["create"])((set, get)=>({
        items: [],
        discount: 0,
        paymentMethod: "Cash",
        addProduct: (product)=>set((state)=>{
                const existing = state.items.find((i)=>i.product.id === product.id);
                if (existing) {
                    return {
                        items: state.items.map((i)=>i.product.id === product.id ? {
                                ...i,
                                quantity: i.quantity + 1
                            } : i)
                    };
                }
                return {
                    items: [
                        ...state.items,
                        {
                            product,
                            quantity: 1
                        }
                    ]
                };
            }),
        addWeightedProduct: (product, weight)=>set((state)=>{
                const safeWeight = Number.isFinite(weight) && weight > 0 ? weight : 0;
                if (safeWeight <= 0) return state;
                const existing = state.items.find((i)=>i.product.id === product.id);
                if (existing) {
                    return {
                        items: state.items.map((i)=>i.product.id === product.id ? {
                                ...i,
                                quantity: i.quantity + safeWeight
                            } : i)
                    };
                }
                return {
                    items: [
                        ...state.items,
                        {
                            product,
                            quantity: safeWeight
                        }
                    ]
                };
            }),
        addByBarcode: (barcode, products)=>{
            const product = products.find((p)=>p.barcode.toLowerCase() === barcode.trim().toLowerCase());
            if (!product) return false;
            // Count products add 1 piece; kg products need a weight dialog in the UI,
            // but for barcode-driven flow we add 1 kg by default.
            if (isKgProduct(product)) {
                get().addWeightedProduct(product, 1);
            } else {
                get().addProduct(product);
            }
            return true;
        },
        removeItem: (productId)=>set((state)=>({
                    items: state.items.filter((i)=>i.product.id !== productId)
                })),
        updateQuantity: (productId, quantity)=>set((state)=>{
                if (quantity <= 0) {
                    return {
                        items: state.items.filter((i)=>i.product.id !== productId)
                    };
                }
                return {
                    items: state.items.map((i)=>i.product.id === productId ? {
                            ...i,
                            quantity
                        } : i)
                };
            }),
        clearCart: ()=>set({
                items: [],
                discount: 0,
                paymentMethod: "Cash"
            }),
        setDiscount: (amount)=>set({
                discount: Math.max(0, amount)
            }),
        setPaymentMethod: (method)=>set({
                paymentMethod: method
            }),
        subtotal: ()=>get().items.reduce((sum, i)=>sum + i.product.price * i.quantity, 0),
        totalItems: ()=>get().items.reduce((sum, i)=>sum + i.quantity, 0)
    }));
}),
"[project]/src/lib/held-orders-store.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useHeldOrdersStore",
    ()=>useHeldOrdersStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/react.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$middleware$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/middleware.mjs [app-ssr] (ecmascript)");
"use client";
;
;
function generateLabel(items) {
    if (items.length === 0) return "Empty order";
    if (items.length === 1) return items[0].product.name;
    return `${items[0].product.name} +${items.length - 1} more`;
}
const useHeldOrdersStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["create"])()((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$middleware$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["persist"])((set, get)=>({
        orders: [],
        holdOrder: (order)=>{
            const id = `hold-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const heldOrder = {
                id,
                label: generateLabel(order.items),
                items: order.items,
                discount: order.discount,
                paymentMethod: order.paymentMethod,
                heldAt: Date.now()
            };
            set((state)=>({
                    orders: [
                        heldOrder,
                        ...state.orders
                    ]
                }));
            return id;
        },
        resumeOrder: (id)=>{
            const order = get().orders.find((o)=>o.id === id);
            if (!order) return null;
            // Remove from held list when resumed
            set((state)=>({
                    orders: state.orders.filter((o)=>o.id !== id)
                }));
            return order;
        },
        deleteOrder: (id)=>set((state)=>({
                    orders: state.orders.filter((o)=>o.id !== id)
                })),
        clearAll: ()=>set({
                orders: []
            })
    }), {
    name: "swiftbill-held-orders",
    // Only persist the orders array
    partialize: (state)=>({
            orders: state.orders
        })
}));
}),
"[project]/src/lib/scan-feedback.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "playScanBeep",
    ()=>playScanBeep,
    "vibrateScan",
    ()=>vibrateScan
]);
/**
 * Scan feedback helpers — shared by POS camera scanner and barcode dialogs.
 * Uses WebAudio (no asset files) so the beep plays instantly (< 10ms latency).
 */ let audioCtx = null;
function getAudioContext() {
    if ("TURBOPACK compile-time truthy", 1) return null;
    //TURBOPACK unreachable
    ;
}
function playScanBeep(success = true) {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
        const now = ctx.currentTime;
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        // Success: quick rising two-tone (880Hz → 1320Hz).
        // Error: single low buzz (320Hz).
        const freqs = success ? [
            880,
            1320
        ] : [
            320
        ];
        const step = 0.09;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.22, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + step * freqs.length + 0.02);
        freqs.forEach((freq, i)=>{
            const osc = ctx.createOscillator();
            osc.type = "square";
            osc.frequency.setValueAtTime(freq, now + i * step);
            osc.connect(gain);
            osc.start(now + i * step);
            osc.stop(now + (i + 1) * step);
        });
    } catch  {
    // Ignore audio failures — never block the scan flow.
    }
}
function vibrateScan(success = true) {
    if (typeof navigator === "undefined" || !navigator.vibrate) return;
    try {
        navigator.vibrate(success ? 80 : [
            60,
            40,
            60
        ]);
    } catch  {
    // ignore
    }
}
}),
"[project]/src/lib/payment.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// Payment method helpers — single source of truth for DZ payment methods
// Stored values: "Cash" | "BARIDIMOB" | "CARD" | "CHEQUE" (+ legacy "UPI"/"Card")
__turbopack_context__.s([
    "SALE_PAYMENT_METHODS",
    ()=>SALE_PAYMENT_METHODS,
    "paymentLabelKey",
    ()=>paymentLabelKey
]);
function paymentLabelKey(method) {
    const m = (method || "Cash").toLowerCase();
    if (m === "baridimob" || m === "upi") return "baridimob";
    if (m === "card") return "card";
    if (m === "cheque") return "cheque";
    if (m === "credit") return "credit";
    return "cash";
}
const SALE_PAYMENT_METHODS = [
    "Cash",
    "BARIDIMOB",
    "CARD",
    "CHEQUE"
];
}),
"[project]/src/lib/use-count-up.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useCountUp",
    ()=>useCountUp
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
"use client";
;
function useCountUp(target, duration = 800) {
    // Check reduced motion at render time (not in effect)
    const reducedMotion = ("TURBOPACK compile-time value", "undefined") !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // If reduced motion, just return target directly
    const [value, setValue] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : 0);
    const fromRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : 0);
    const rafRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const from = fromRef.current;
        const diff = target - from;
        // No change needed — skip animation entirely
        if (diff === 0) return;
        const start = performance.now();
        const tick = (now)=>{
            const elapsed = now - start;
            const progress = Math.min(1, elapsed / duration);
            // easeOutCubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = from + diff * eased;
            setValue(current);
            if (progress < 1) {
                rafRef.current = requestAnimationFrame(tick);
            } else {
                fromRef.current = target;
            }
        };
        rafRef.current = requestAnimationFrame(tick);
        return ()=>{
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
            }
            fromRef.current = target;
        };
    }, [
        target,
        duration
    ]);
    return value;
}
}),
"[project]/src/app/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Home
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2d$context$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth-context.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2d$screen$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/auth-screen.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$app$2d$shell$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/app-shell.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$language$2d$context$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/language-context.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-ssr] (ecmascript) <export default as Loader2>");
"use client";
;
;
;
;
;
;
;
function LoadingScreen() {
    const { t } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$language$2d$context$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useLanguage"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 dark:from-emerald-900 dark:via-emerald-950 dark:to-teal-950",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "pointer-events-none absolute -top-32 -start-32 h-96 w-96 rounded-full bg-emerald-400/30 blur-3xl"
            }, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 14,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "pointer-events-none absolute -bottom-40 -end-24 h-[28rem] w-[28rem] rounded-full bg-teal-300/25 blur-3xl"
            }, void 0, false, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 15,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                initial: {
                    opacity: 0,
                    scale: 0.95
                },
                animate: {
                    opacity: 1,
                    scale: 1
                },
                transition: {
                    duration: 0.4
                },
                className: "relative z-10 flex flex-col items-center gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid h-16 w-16 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur-md",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-3xl font-black text-white drop-shadow-sm",
                            children: "S"
                        }, void 0, false, {
                            fileName: "[project]/src/app/page.tsx",
                            lineNumber: 23,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/page.tsx",
                        lineNumber: 22,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-2 text-white",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                className: "h-4 w-4 animate-spin"
                            }, void 0, false, {
                                fileName: "[project]/src/app/page.tsx",
                                lineNumber: 26,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-sm font-medium",
                                children: t("loading")
                            }, void 0, false, {
                                fileName: "[project]/src/app/page.tsx",
                                lineNumber: 27,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/page.tsx",
                        lineNumber: 25,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/page.tsx",
                lineNumber: 16,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/page.tsx",
        lineNumber: 13,
        columnNumber: 5
    }, this);
}
function AppContent() {
    const { user, loading } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2d$context$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuth"])();
    if (loading) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(LoadingScreen, {}, void 0, false, {
        fileName: "[project]/src/app/page.tsx",
        lineNumber: 37,
        columnNumber: 23
    }, this);
    if (!user) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$auth$2d$screen$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AuthScreen"], {}, void 0, false, {
        fileName: "[project]/src/app/page.tsx",
        lineNumber: 38,
        columnNumber: 21
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$app$2d$shell$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AppShell"], {}, void 0, false, {
        fileName: "[project]/src/app/page.tsx",
        lineNumber: 39,
        columnNumber: 10
    }, this);
}
function Home() {
    // LanguageProvider is already mounted in src/app/layout.tsx and wraps the
    // whole app, so useLanguage() is available throughout (AuthScreen, AppShell,
    // LoadingScreen). AuthProvider is nested here so the auth context reaches
    // both the gate (this page) and the AppShell downstream.
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2d$context$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AuthProvider"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(AppContent, {}, void 0, false, {
            fileName: "[project]/src/app/page.tsx",
            lineNumber: 49,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/app/page.tsx",
        lineNumber: 48,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=src_e1d81cde._.js.map