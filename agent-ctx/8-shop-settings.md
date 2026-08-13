# Task 8 — Shop Details + Settings Views

**Agent:** full-stack-developer (Shop + Settings)
**Task ID:** 8
**Files modified:**
- `src/components/views/shop-details.tsx` (overwrote stub)
- `src/components/views/settings-view.tsx` (overwrote stub)

## What was built

### ShopDetails (`shop-details.tsx`)
- Two-column responsive layout: form (flex-1) + sticky Live Receipt Preview (w-[320px]).
- Controlled form state synced from `useQuery(['shop'], shopApi.get)` using React's "adjust state during render" pattern (no `setState`-in-effect lint issues).
- Fields: Shop Name (required), Address Line 1 (required), Address Line 2, Phone, UPI ID (with hint), Receipt Footer Text (textarea, maxLength 80, char counter), Currency Symbol (input + ₹/$/€/£/¥ quick-pick chips), Tax Rate % (number 0-100).
- Live thermal-receipt preview: monospace card, dashed dividers, dummy item rows, computed subtotal/tax/total derived from form state, footer text, fake barcode strip.
- Save via `useMutation` -> `shopApi.update()`, success -> `toast.success("Shop details saved")` + invalidate `["shop"]`, error -> `toast.error`.
- Loading skeleton while fetching; framer-motion entrance animations.

### SettingsView (`settings-view.tsx`)
- 5 stacked section cards, single max-w-3xl column.
1. App Profile — emerald avatar with `initialsOf(shop.name)`, uppercase bold name, "SwiftBill POS v1.0.0", currency/tax badges, disabled "Edit Shop" button with Tooltip.
2. Quick Tax Config — current vs adjusting-to display, Slider 0-20% step 0.5, dirty-aware Save button -> `shopApi.update({taxRate})`.
3. Printer & Receipts — web-print note, Print Test button -> `window.print()` on hidden `.print-receipt` template, Auto-print Switch persisted to `localStorage` key `swiftbill_autoprint` via `useSyncExternalStore`.
4. Data Management (red `border-destructive/30`) — disabled destructive "Clear Sales" button with "Admin only" Tooltip, plus real working "Export CSV" button: fetches `/api/products`, builds escaped CSV, downloads via Blob anchor.
5. About — name, version, stack line, docs text.

## Key design decisions
- **No setState in effect**: Used React 19's "adjust state during render" pattern for server->form sync (avoids `react-hooks/set-state-in-effect` lint error).
- **AutoPrint via useSyncExternalStore**: Proper subscription to localStorage with `storage` event listener + manual `StorageEvent` dispatch on same-tab toggle so the Switch reflects the change immediately.
- **CSV export**: Real client-side implementation using `productsApi.list()` + `Blob` + anchor download. Filename: `swiftbill-products-YYYY-MM-DD.csv`.
- **Clear Sales**: Per spec, disabled with tooltip "Admin only" (safe default; no backend route to wire).

## Validation
- `bun run lint`: 0 errors in my two files. (One unrelated error remains in `pos-terminal.tsx` — not my task.)
- `tail dev.log`: My views compile cleanly; `PUT /api/shop` returns 200 for both full and partial payloads.
- Smoke-tested `PUT /api/shop` with full shop payload + reset `taxRate:0` — both 200.

## API endpoints used
- `GET /api/shop` (existing)
- `PUT /api/shop` (existing, full + partial payloads)
- `GET /api/products` (existing, for CSV export)

## Files NOT modified
- No backend changes (per spec).
- No new API routes (per spec).
- Other agents' files left untouched (pos-terminal.tsx still has its own lint error referencing `@/components/checkout-dialog`).
