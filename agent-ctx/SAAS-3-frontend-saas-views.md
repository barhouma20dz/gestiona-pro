# SAAS-3 — Frontend SaaS Views

**Agent:** full-stack-developer (frontend)
**Task ID:** SAAS-3
**Date:** 2026-08-14

## Scope
Build the frontend views for SwiftBill POS's new SaaS features on top of an already-built backend API.

## What was delivered

### New files
| File | Purpose |
|------|---------|
| `src/components/views/suppliers.tsx` | Suppliers + purchase-invoice management (CRUD, invoice dialog with line items, invoices viewer, delete confirmations) |
| `src/components/views/expiry-tracking.tsx` | Expired + near-expiry product tabs with color-coded cards, value-at-risk stat, reorder CTA |
| `src/components/views/admin-dashboard.tsx` | Super Admin: SaaS stats, license key generator with copy, stores table with suspend/activate toggle |

### Modified files
| File | Change |
|------|--------|
| `src/lib/types.ts` | Added SaaS types (`Supplier`, `SupplierInvoice`, `ExpiryData`, `SubscriptionInfo`, `AdminStats`, `AdminStore`, `LicenseKey`, etc.); extended `ViewKey` with `suppliers`/`expiry`/`admin`; extended `Product` with `expiryDate?` + `supplierId?` |
| `src/lib/api.ts` | Added `suppliersApi`, `supplierInvoicesApi`, `expiryApi`, `subscriptionApi`, `adminApi` |
| `src/lib/i18n.ts` | Added ~140 translation keys mirrored in `ar` + `en` |
| `src/components/views/settings-view.tsx` | Added `SubscriptionCard` at the top of the settings page (status badge + plan + days remaining + progress bar + license-key activation) |
| `src/components/app-shell.tsx` | Added 3 NAV items (`suppliers`, `expiry`, `admin`); imports + renderView cases; SUPER_ADMIN-only visibility for admin nav via `useAuth()` |

## API contract (consumed)
- `GET/POST /api/suppliers`, `PUT/DELETE /api/suppliers/:id`, `GET /api/suppliers/:id/invoices`
- `GET/POST /api/supplier-invoices`, `GET/PUT/DELETE /api/supplier-invoices/:id`
- `GET /api/products/expiry` → `{ expired, nearExpiry, thresholdDays }`
- `GET /api/subscription`, `POST /api/subscription/activate` (body: `{ key }`)
- `GET /api/admin/stats`, `GET /api/admin/stores`, `POST /api/admin/licenses` (body: `{ plan }`), `GET /api/admin/licenses`, `POST /api/admin/stores/:id/suspend`

## Notes for downstream agents
- The `Product` type now includes `expiryDate?: string | null` and `supplierId?: string | null`. Any agent that imports `Product` should pick these up automatically.
- The `useAuth()` hook (in `@/lib/auth-context`) returns `user.role` as a string; we compare with the literal `"SUPER_ADMIN"`.
- `adminDashboard.tsx` also exports an `AdminAccessDenied` component (currently unused — kept for future use if you want to render a forbidden page instead of silently redirecting).
- The `app-shell.tsx` filters the admin nav item with `NAV.filter((item) => !item.superAdminOnly || isSuperAdmin)` and re-checks `isSuperAdmin` in `renderView` for the `admin` case as defense-in-depth.

## Lint
`bun run lint` → **PASS** (0 errors, 0 warnings).

## Dev log
Tail of `/home/z/my-project/dev.log` shows the new modules compile cleanly (only the expected `EADDRINUSE` note because the auto dev server already holds port 3000, plus the informational "Fast Refresh had to perform a full reload when i18n.ts changed" notice). No compile or runtime errors from the new code.
