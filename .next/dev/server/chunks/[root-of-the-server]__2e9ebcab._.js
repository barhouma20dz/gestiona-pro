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
"[project]/src/app/api/products/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
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
async function GET() {
    try {
        const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requireStoreOwner"])();
        const products = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.findMany({
            where: {
                storeId: session.storeId
            },
            orderBy: {
                createdAt: "desc"
            }
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(products);
    } catch (error) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2d$error$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["handleRouteError"])(error, "GET /api/products");
    }
}
async function POST(request) {
    try {
        const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$session$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["requireStoreOwner"])();
        const body = await request.json();
        const name = typeof body?.name === "string" ? body.name.trim() : "";
        const barcode = typeof body?.barcode === "string" ? body.barcode.trim() : "";
        const price = Number(body?.price);
        const costPrice = body?.costPrice === undefined || body?.costPrice === null ? 0 : Number(body?.costPrice);
        const stock = body?.stock === undefined || body?.stock === null ? 0 : Number(body?.stock);
        const unitTypeRaw = typeof body?.unitType === "string" ? body.unitType.trim() : "count";
        const unitType = unitTypeRaw === "kg" ? "kg" : "count";
        const category = typeof body?.category === "string" && body.category.trim() ? body.category.trim() : "General";
        // New optional fields
        const expiryDate = typeof body?.expiryDate === "string" && body.expiryDate.trim() ? new Date(body.expiryDate) : null;
        const expiryDate2 = typeof body?.expiryDate2 === "string" && body.expiryDate2.trim() ? new Date(body.expiryDate2) : null;
        const supplierId = typeof body?.supplierId === "string" && body.supplierId.trim() ? body.supplierId.trim() : null;
        const imageUrl = typeof body?.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null;
        if (!name) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Product name is required"
            }, {
                status: 400
            });
        }
        if (!barcode) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Barcode is required"
            }, {
                status: 400
            });
        }
        if (Number.isNaN(price) || price < 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Price must be a number >= 0"
            }, {
                status: 400
            });
        }
        if (Number.isNaN(costPrice) || costPrice < 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Cost price must be a number >= 0"
            }, {
                status: 400
            });
        }
        if (Number.isNaN(stock) || stock < 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Stock must be a number >= 0"
            }, {
                status: 400
            });
        }
        // For count products, stock must be a non-negative integer.
        // For kg products, stock is a float (e.g. 50.5).
        const stockValue = unitType === "kg" ? stock : Math.floor(stock);
        if (expiryDate && Number.isNaN(expiryDate.getTime())) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "expiryDate must be a valid ISO date string"
            }, {
                status: 400
            });
        }
        // Verify supplier belongs to the same store (if provided)
        if (supplierId) {
            const supplier = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].supplier.findFirst({
                where: {
                    id: supplierId,
                    storeId: session.storeId
                },
                select: {
                    id: true
                }
            });
            if (!supplier) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: "Supplier not found in your store"
                }, {
                    status: 400
                });
            }
        }
        // Enforce unique [storeId, barcode]
        const existing = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.findFirst({
            where: {
                storeId: session.storeId,
                barcode
            },
            select: {
                id: true
            }
        });
        if (existing) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: `Product with barcode '${barcode}' already exists in your store`
            }, {
                status: 409
            });
        }
        const data = {
            name,
            barcode,
            price,
            costPrice,
            stock: stockValue,
            unitType,
            category,
            store: {
                connect: {
                    id: session.storeId
                }
            }
        };
        if (expiryDate) data.expiryDate = expiryDate;
        if (expiryDate2) data.expiryDate2 = expiryDate2;
        if (supplierId) data.supplier = {
            connect: {
                id: supplierId
            }
        };
        if (imageUrl) data.imageUrl = imageUrl;
        const product = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.create({
            data
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(product, {
            status: 201
        });
    } catch (error) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2d$error$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["handleRouteError"])(error, "POST /api/products");
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__2e9ebcab._.js.map