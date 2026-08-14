# SAAS-2 — Multi-Tenant API Layer

**Agent**: full-stack-developer (backend)
**Task ID**: SAAS-2
**Date**: 2026-08-14

## Summary

Rewrote all existing API routes to be multi-tenant (scoped by `session.storeId`) and added the new Subscription/License, Suppliers, Supplier-Invoices, Expiry-tracking, and Admin API surface for the SwiftBill POS SaaS.

## What was done

### Multi-tenant rewrite (all routes now call `requireStoreOwner()`)
- `src/app/api/products/route.ts` — GET + POST (now supports `expiryDate`, `supplierId`, `imageUrl`)
- `src/app/api/products/[id]/route.ts` — PUT + DELETE
- `src/app/api/products/barcode/[code]/route.ts` — GET
- `src/app/api/shop/route.ts` — GET (with subscription) + PUT
- `src/app/api/sales/route.ts` — GET + POST (transaction, per-store `receiptNo`)
- `src/app/api/sales/[id]/route.ts` — GET
- `src/app/api/sales/stats/route.ts` — GET
- **Deleted** `src/app/api/shop/seed/route.ts` (store now created at registration)

### New shared helpers
- `src/lib/license.ts` — `LICENSE_PLANS`, `generateLicenseKey()`, `validateLicenseKey()` (HMAC-SHA256 + `timingSafeEqual`)
- `src/lib/api-error.ts` — `handleRouteError()` maps `UNAUTHORIZED/NO_STORE/FORBIDDEN` to 401/403/403

### Subscription & License APIs
- `src/app/api/subscription/route.ts` — GET
- `src/app/api/subscription/activate/route.ts` — POST (HMAC verification, idempotent activation, extends endDate)

### Admin APIs (all call `requireSuperAdmin()`)
- `src/app/api/admin/licenses/route.ts` — GET + POST (generate key)
- `src/app/api/admin/stores/route.ts` — GET (with subscription + user/product/sale counts)
- `src/app/api/admin/stores/[id]/suspend/route.ts` — POST (toggle ACTIVE/SUSPENDED)
- `src/app/api/admin/stats/route.ts` — GET (totalStores, active/trial/expired subs, suspended stores, est. MRR, recent stores)

### Suppliers APIs
- `src/app/api/suppliers/route.ts` — GET + POST
- `src/app/api/suppliers/[id]/route.ts` — PUT + DELETE (400 if has invoices)
- `src/app/api/suppliers/[id]/invoices/route.ts` — GET

### Supplier-Invoice APIs
- `src/app/api/supplier-invoices/route.ts` — GET + POST (transaction: create invoice + items + increment product stock)
- `src/app/api/supplier-invoices/[id]/route.ts` — GET + PUT + DELETE

### Expiry tracking
- `src/app/api/products/expiry/route.ts` — GET (returns `{ expired, nearExpiry, thresholdDays: 30 }`)

### Seed
- `prisma/seed.ts` — now super-admin only (idempotent upsert); removed per-tenant default shop + sample products seeding (those are created at registration time)

## Key decisions / gotchas
- Used relation helpers (`supplier: { connect: { id } }`, `product: { connect: { id } }`) instead of raw scalar FK fields on `supplierInvoice.create()` — Prisma 6.x rejected the scalar-only form when the relation is required.
- For supplier-invoice items with `productId = null`, omit the `product` relation entirely (don't pass `productId: null`) — cleanest way to satisfy Prisma's nested create typing.
- For subscription activation, when an existing ACTIVE subscription is being extended, compute the new `endDate` from the existing `endDate` (not `now`) so users don't lose paid days when re-activating early.
- For admin stats `estimatedMonthlyRevenue`: normalizes each plan to a monthly equivalent (monthly=full, quarterly=/3, yearly=/12) before summing.
- Effective subscription status: if `endDate < now` and stored status is ACTIVE/TRIAL, surface as "EXPIRED" in the GET response without mutating the DB (callers can re-activate via license key).

## Verification
- `bun run lint` — exit 0, no warnings
- Live smoke tests via fetch against the dev server (port 3000):
  - Register → 201, GET /api/shop → 200, products POST/PUT → 200/201, expiry GET → 200, sales POST → 201, sales/stats GET → 200, subscription GET → 200
  - Admin route as store owner → 403, products GET with no auth → 401
  - License: generate (admin) → 201; activate → 200; reuse → 409; invalid key → 400; empty key → 400
  - Suppliers POST/GET → 201/200; supplier-invoice POST (with productId) → 201, stock incremented by 20 (verified), total computed correctly, status=PAID derived from paidAmount >= totalAmount; PUT → 200; GET → 200; DELETE → 204
  - Suspend store → 200 (status toggled)
- Dev server log: clean, no runtime errors during testing.

## Lint status
`bun run lint` exits 0 with no errors or warnings.
