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
"[externals]/node:crypto [external] (node:crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:crypto", () => require("node:crypto"));

module.exports = mod;
}),
"[project]/src/lib/license.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LICENSE_PLANS",
    ()=>LICENSE_PLANS,
    "LICENSE_PLANS_LIST",
    ()=>LICENSE_PLANS_LIST,
    "generateLicenseKey",
    ()=>generateLicenseKey,
    "isLicensePlan",
    ()=>isLicensePlan,
    "validateLicenseKey",
    ()=>validateLicenseKey
]);
// License key utilities — server-side only
// Generates HMAC-signed license keys for SwiftBill POS subscriptions.
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:crypto [external] (node:crypto, cjs)");
;
const JWT_SECRET = process.env.JWT_SECRET || "swiftbill-dev-secret-change-in-production";
const LICENSE_PLANS = {
    MONTHLY: {
        price: 499,
        durationDays: 30,
        label: "Monthly"
    },
    QUARTERLY: {
        price: 1299,
        durationDays: 90,
        label: "Quarterly"
    },
    YEARLY: {
        price: 4999,
        durationDays: 365,
        label: "Yearly"
    }
};
const LICENSE_PLANS_LIST = Object.keys(LICENSE_PLANS);
function isLicensePlan(plan) {
    return plan in LICENSE_PLANS;
}
// Alphabet excludes ambiguous chars (0/O, 1/I) for legibility
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomBlock(len = 4) {
    const bytes = __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["default"].randomBytes(len);
    let out = "";
    for(let i = 0; i < len; i++){
        out += ALPHABET[bytes[i] % ALPHABET.length];
    }
    return out;
}
/**
 * Compute the HMAC-SHA256 signature for a license key string.
 * Used both at generation time (to persist) and at validation time (to verify).
 */ function signKey(key) {
    return __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["default"].createHmac("sha256", JWT_SECRET).update(key).digest("hex");
}
function generateLicenseKey(plan, durationDays) {
    if (!isLicensePlan(plan)) {
        throw new Error(`Unknown plan: ${plan}`);
    }
    const duration = durationDays ?? LICENSE_PLANS[plan].durationDays;
    const key = `SB-${randomBlock(4)}-${randomBlock(4)}-${randomBlock(4)}`;
    const signature = signKey(key);
    return {
        key,
        signature,
        plan,
        durationDays: duration
    };
}
function validateLicenseKey(key, signature) {
    if (!key || !signature) return false;
    const expected = signKey(key);
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["default"].timingSafeEqual(a, b);
}
}),
"[project]/src/app/api/subscription/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/session.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2d$error$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api-error.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$license$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/license.ts [app-route] (ecmascript)");
;
;
;
;
;
async function GET() {
    try {
        const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requireStoreOwner"])();
        const store = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].store.findUnique({
            where: {
                id: session.storeId
            },
            include: {
                subscription: true
            }
        });
        if (!store) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Store not found"
            }, {
                status: 404
            });
        }
        const now = new Date();
        const endDate = store.subscription?.endDate ?? null;
        const daysRemaining = endDate ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))) : 0;
        // Effective status: if endDate < now and stored status is ACTIVE/TRIAL,
        // surface as "EXPIRED" without mutating the DB (callers can re-activate).
        const storedStatus = store.subscription?.status ?? "NONE";
        let effectiveStatus = storedStatus;
        if (endDate && endDate.getTime() < now.getTime() && (storedStatus === "ACTIVE" || storedStatus === "TRIAL")) {
            effectiveStatus = "EXPIRED";
        }
        const plan = store.subscription?.plan ?? "MONTHLY";
        const planInfo = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$license$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isLicensePlan"])(plan) ? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$license$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["LICENSE_PLANS"][plan] : undefined;
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            store: {
                id: store.id,
                name: store.name,
                status: store.status
            },
            subscription: store.subscription ? {
                id: store.subscription.id,
                status: effectiveStatus,
                storedStatus,
                plan: store.subscription.plan,
                startDate: store.subscription.startDate,
                endDate: store.subscription.endDate,
                trialEndsAt: store.subscription.trialEndsAt
            } : null,
            daysRemaining,
            planPrice: planInfo?.price ?? 0,
            planDurationDays: planInfo?.durationDays ?? 0
        });
    } catch (error) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2d$error$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["handleRouteError"])(error, "GET /api/subscription");
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__c95d7b1f._.js.map