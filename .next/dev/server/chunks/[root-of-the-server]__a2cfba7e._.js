module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/src/lib/db.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "db",
    ()=>db
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__ = __turbopack_context__.i("[externals]/@prisma/client [external] (@prisma/client, cjs, [project]/node_modules/@prisma/client)");
;
const globalForPrisma = globalThis;
const db = globalForPrisma.prisma ?? new __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__["PrismaClient"]({
    log: [
        'query'
    ]
});
if ("TURBOPACK compile-time truthy", 1) globalForPrisma.prisma = db;
}),
"[project]/src/lib/auth.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getSessionCookieName",
    ()=>getSessionCookieName,
    "getSessionDuration",
    ()=>getSessionDuration,
    "sessionCookieOptions",
    ()=>sessionCookieOptions,
    "signToken",
    ()=>signToken,
    "verifyToken",
    ()=>verifyToken
]);
// JWT session utilities — server-side only
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$webapi$2f$jwt$2f$sign$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jose/dist/webapi/jwt/sign.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$webapi$2f$jwt$2f$verify$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jose/dist/webapi/jwt/verify.js [app-route] (ecmascript)");
;
const JWT_SECRET = process.env.JWT_SECRET || "swiftbill-dev-secret-change-in-production";
const secret = new TextEncoder().encode(JWT_SECRET);
const SESSION_COOKIE = "swiftbill-session";
const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds
async function signToken(payload) {
    return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$webapi$2f$jwt$2f$sign$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SignJWT"]({
        ...payload
    }).setProtectedHeader({
        alg: "HS256"
    }).setIssuedAt().setExpirationTime(`${SESSION_DURATION}s`).sign(secret);
}
async function verifyToken(token) {
    try {
        const { payload } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jose$2f$dist$2f$webapi$2f$jwt$2f$verify$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jwtVerify"])(token, secret);
        return payload;
    } catch  {
        return null;
    }
}
function getSessionCookieName() {
    return SESSION_COOKIE;
}
function getSessionDuration() {
    return SESSION_DURATION;
}
function sessionCookieOptions(request) {
    const headerList = (name)=>{
        const raw = request?.headers.get(name) ?? "";
        return raw.split(",").map((s)=>s.trim()).filter(Boolean);
    };
    const protos = headerList("x-forwarded-proto");
    try {
        if (request?.url) {
            protos.push(new URL(request.url).protocol.replace(":", ""));
        }
    } catch  {
    // ignore malformed URL
    }
    const hostHeader = request?.headers.get("host") ?? "";
    let urlHost = "";
    try {
        urlHost = request?.url ? new URL(request.url).host : "";
    } catch  {
    // ignore
    }
    const isLocalHost = [
        hostHeader,
        urlHost
    ].every((h)=>h === "" || /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?$/i.test(h));
    const isHttps = protos.includes("https") || !isLocalHost;
    return isHttps ? {
        httpOnly: false,
        sameSite: "none",
        secure: true,
        maxAge: getSessionDuration(),
        path: "/"
    } : {
        httpOnly: false,
        sameSite: "lax",
        secure: false,
        maxAge: getSessionDuration(),
        path: "/"
    };
}
}),
"[project]/src/lib/session.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getSession",
    ()=>getSession,
    "requireAuth",
    ()=>requireAuth,
    "requireStoreOwner",
    ()=>requireStoreOwner,
    "requireSuperAdmin",
    ()=>requireSuperAdmin
]);
// Server-side session helper — reads JWT from cookies OR Authorization header
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/auth.ts [app-route] (ecmascript)");
;
;
;
async function getSession() {
    // 1. Try cookie first
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cookies"])();
    const cookieToken = cookieStore.get((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSessionCookieName"])())?.value;
    if (cookieToken) {
        const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifyToken"])(cookieToken);
        if (session) return session;
    }
    // 2. Fallback: try Authorization: Bearer <token> header
    const headerStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["headers"])();
    const authHeader = headerStore.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
        const bearerToken = authHeader.slice(7);
        const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["verifyToken"])(bearerToken);
        if (session) return session;
    }
    return null;
}
async function requireAuth() {
    const session = await getSession();
    if (!session) {
        throw new Error("UNAUTHORIZED");
    }
    return session;
}
async function requireStoreOwner() {
    const session = await requireAuth();
    if (!session.storeId) {
        throw new Error("NO_STORE");
    }
    // storeId is guaranteed non-null here — expose the narrowed type so callers
    // can pass session.storeId straight into Prisma filters without casts.
    return session;
}
async function requireSuperAdmin() {
    const session = await requireAuth();
    if (session.role !== "SUPER_ADMIN") {
        throw new Error("FORBIDDEN");
    }
    return session;
}
}),
"[project]/src/lib/api-error.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "handleRouteError",
    ()=>handleRouteError,
    "mapAuthError",
    ()=>mapAuthError
]);
// Tiny helper for mapping auth-thrown errors to NextResponse JSON.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
;
function mapAuthError(message) {
    switch(message){
        case "UNAUTHORIZED":
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Authentication required"
            }, {
                status: 401
            });
        case "NO_STORE":
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "No store associated with this account"
            }, {
                status: 403
            });
        case "FORBIDDEN":
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Forbidden — super admin access required"
            }, {
                status: 403
            });
        default:
            return null;
    }
}
async function handleRouteError(error, label) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const mapped = mapAuthError(message);
    if (mapped) return mapped;
    console.error(`[${label}]`, error);
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        error: message || "Internal server error"
    }, {
        status: 500
    });
}
}),
"[project]/src/app/api/sales/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/session.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2d$error$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api-error.ts [app-route] (ecmascript)");
;
;
;
;
const VALID_PAYMENT_METHODS = [
    "Cash",
    "BARIDIMOB",
    "CARD",
    "CHEQUE",
    "CREDIT",
    // Legacy values kept so old records/clients still validate:
    "UPI",
    "Card"
];
function pad(n, width = 4) {
    return n.toString().padStart(width, "0");
}
function dateStamp(d) {
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1, 2);
    const day = pad(d.getDate(), 2);
    return `${y}${m}${day}`;
}
async function GET(request) {
    try {
        const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requireAuth"])();
        if (!session.storeId) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "No store associated with this account"
            }, {
                status: 403
            });
        }
        const { searchParams } = new URL(request.url);
        const where = {
            storeId: session.storeId
        };
        if (session.role === "STAFF") {
            where.sellerId = session.userId;
        } else if (session.role === "OWNER") {
            const sellerId = searchParams.get("sellerId");
            if (sellerId) {
                where.sellerId = sellerId;
            }
        }
        const sales = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].sale.findMany({
            where,
            include: {
                items: true,
                customer: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(sales);
    } catch (error) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2d$error$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["handleRouteError"])(error, "GET /api/sales");
    }
}
async function POST(request) {
    try {
        const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requireStoreOwner"])();
        const body = await request.json();
        if (!body || !Array.isArray(body.items) || body.items.length === 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Sale must contain at least one item"
            }, {
                status: 400
            });
        }
        const paymentMethod = body.paymentMethod;
        if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: `paymentMethod must be one of ${VALID_PAYMENT_METHODS.join(", ")}`
            }, {
                status: 400
            });
        }
        const discount = Number(body.discount ?? 0);
        if (Number.isNaN(discount) || discount < 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "discount must be a number >= 0"
            }, {
                status: 400
            });
        }
        for (const item of body.items){
            const qty = Number(item.quantity);
            if (!item.productId || typeof item.productId !== "string" || Number.isNaN(qty) || qty <= 0) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: "Each item must have a valid productId and a quantity > 0"
                }, {
                    status: 400
                });
            }
        }
        const storeId = session.storeId;
        // Determine sellerId:
        // - STAFF: forced to their own userId
        // - OWNER: optional from body, validated to belong to the same store
        let sellerId = null;
        if (session.role === "STAFF") {
            sellerId = session.userId;
        } else if (session.role === "OWNER" && body.sellerId) {
            const seller = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].user.findFirst({
                where: {
                    id: body.sellerId,
                    storeId,
                    role: "STAFF"
                },
                select: {
                    id: true
                }
            });
            if (seller) {
                sellerId = seller.id;
            }
        }
        // Fetch store (for taxRate + loyalty settings) — outside transaction to
        // avoid extra locks inside it.
        const store = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].store.findUnique({
            where: {
                id: storeId
            },
            select: {
                taxRate: true,
                loyaltyEnabled: true,
                loyaltyEarnRate: true,
                loyaltyPointValue: true
            }
        });
        if (!store) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Store not found"
            }, {
                status: 404
            });
        }
        const created = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].$transaction(async (tx)=>{
            const productIds = body.items.map((i)=>i.productId);
            const products = await tx.product.findMany({
                where: {
                    id: {
                        in: productIds
                    },
                    storeId
                }
            });
            const productMap = new Map(products.map((p)=>[
                    p.id,
                    p
                ]));
            const saleItemLines = [];
            for (const item of body.items){
                const product = productMap.get(item.productId);
                if (!product) {
                    throw new Error(`Product with id '${item.productId}' not found in your store`);
                }
                const rawQty = Number(item.quantity);
                // For count products, quantity must be an integer.
                // For kg products, quantity can be a float (e.g. 1.750).
                const qty = product.unitType === "kg" ? rawQty : Math.floor(rawQty);
                const lineTotal = product.price * qty;
                saleItemLines.push({
                    product,
                    quantity: qty,
                    lineTotal
                });
            }
            const subtotal = saleItemLines.reduce((sum, l)=>sum + l.lineTotal, 0);
            // ── Customer / credit / loyalty resolution ──────────────────────────
            let customer = null;
            if (body.customerId) {
                const found = await tx.customer.findFirst({
                    where: {
                        id: body.customerId,
                        storeId
                    },
                    select: {
                        id: true,
                        loyaltyPoints: true
                    }
                });
                if (!found) throw new Error("Customer not found in your store");
                customer = found;
            }
            if (paymentMethod === "CREDIT" && !customer) {
                throw new Error("CREDIT sales require a registered customer");
            }
            // Points redemption: only for non-credit sales with a customer.
            // Each point is worth store.loyaltyPointValue of discount; the redeemed
            // value is capped by the customer's balance and by the subtotal.
            const pointValue = store.loyaltyPointValue ?? 1;
            const loyaltyEnabled = store.loyaltyEnabled ?? true;
            let pointsRedeemed = 0;
            if (customer && loyaltyEnabled && paymentMethod !== "CREDIT") {
                const requested = Math.floor(Number(body.redeemPoints ?? 0));
                if (requested > 0) {
                    const maxByBalance = customer.loyaltyPoints;
                    const maxByValue = Math.floor(subtotal / pointValue);
                    pointsRedeemed = Math.max(0, Math.min(requested, maxByBalance, maxByValue));
                }
            }
            const pointsDiscount = pointsRedeemed * pointValue;
            const manualDiscount = Math.max(0, discount);
            const effectiveDiscount = Math.min(manualDiscount + pointsDiscount, subtotal);
            const taxableBase = Math.max(0, subtotal - effectiveDiscount);
            const taxRate = store.taxRate ?? 0;
            const taxAmount = taxableBase * taxRate / 100;
            const total = taxableBase + taxAmount;
            // Each distinct line item counts as 1 toward itemCount,
            // regardless of quantity (works for both count and kg products).
            const itemCount = saleItemLines.length;
            // Loyalty accrual: points for paid (non-credit) sales only.
            const earnRate = store.loyaltyEarnRate ?? 100;
            const pointsEarned = customer && loyaltyEnabled && paymentMethod !== "CREDIT" && total > 0 ? Math.floor(total / earnRate) : 0;
            // Generate receipt number unique per store: INV-YYYYMMDD-XXXX
            const today = new Date();
            const datePrefix = dateStamp(today);
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
            const todayCount = await tx.sale.count({
                where: {
                    storeId,
                    createdAt: {
                        gte: startOfDay,
                        lt: endOfDay
                    }
                }
            });
            const receiptNo = `INV-${datePrefix}-${pad(todayCount + 1, 4)}`;
            const sale = await tx.sale.create({
                data: {
                    receiptNo,
                    subtotal,
                    taxAmount,
                    discount: effectiveDiscount,
                    total,
                    paymentMethod,
                    itemCount,
                    loyaltyPointsEarned: pointsEarned,
                    loyaltyPointsRedeemed: pointsRedeemed,
                    store: {
                        connect: {
                            id: storeId
                        }
                    },
                    ...sellerId ? {
                        seller: {
                            connect: {
                                id: sellerId
                            }
                        }
                    } : {},
                    ...customer ? {
                        customer: {
                            connect: {
                                id: customer.id
                            }
                        }
                    } : {},
                    items: {
                        create: saleItemLines.map((l)=>({
                                productId: l.product.id,
                                productName: l.product.name,
                                unitPrice: l.product.price,
                                quantity: l.quantity,
                                total: l.lineTotal
                            }))
                    }
                },
                include: {
                    items: true
                }
            });
            for (const l of saleItemLines){
                const newStock = Math.max(0, l.product.stock - l.quantity);
                await tx.product.update({
                    where: {
                        id: l.product.id
                    },
                    data: {
                        stock: newStock
                    }
                });
            }
            // Apply loyalty balance change (+earned − redeemed) atomically.
            if (customer && (pointsEarned > 0 || pointsRedeemed > 0)) {
                await tx.customer.update({
                    where: {
                        id: customer.id
                    },
                    data: {
                        loyaltyPoints: {
                            increment: pointsEarned - pointsRedeemed
                        }
                    }
                });
            }
            return sale;
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(created, {
            status: 201
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create sale";
        if (/not found/i.test(message)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: message
            }, {
                status: 400
            });
        }
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2d$error$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["handleRouteError"])(error, "POST /api/sales");
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__a2cfba7e._.js.map