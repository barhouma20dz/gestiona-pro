# Task WEIGHT-1 — Weight-based product system

## Summary
Implemented support for products sold by weight (kg) alongside the existing count-based (piece) flow.

## Files modified
- `prisma/schema.prisma` — `SaleItem.quantity` Int → Float
- `src/lib/i18n.ts` — added 14 keys (unitType, byCount, byWeight, pricePerKg, stockKg, weighProduct, enterWeight, weight, totalPrice, unit, countUnit, kgUnit, kg, perKg, inStockKg) to ar + en
- `src/lib/cart-store.ts` — added `addWeightedProduct(product, weight)` + `isKgProduct(item)` helper; updated `addByBarcode` for kg items
- `src/app/api/products/route.ts` — POST parses `unitType`, stores float stock for kg, floored stock for count
- `src/app/api/products/[id]/route.ts` — PUT handles `unitType` + float stock for kg
- `src/app/api/sales/route.ts` — POST allows fractional qty for kg, `itemCount` = number of line items (was sum of quantities)
- `src/components/views/product-manager.tsx` — added `unitType` to FormState + emptyForm + toForm + duplicateProduct + handleSubmit; added Unit type selector with two buttons (Package/Scale icons); added Unit column to product table; stock badge shows kg formatting
- `src/components/views/pos-terminal.tsx` — added WeightDialog component (outer+inner body pattern); handleAddProduct opens WeightDialog for kg products; ProductTile shows kg badge + /kg suffix; CartItemRow shows weight with kg suffix; stepper step 0.25 for kg / 1 for count; held-order resume uses addWeightedProduct for kg items

## Verification
- `bun run lint`: clean (exit 0)
- API smoke tests: all passing (kg product creation, count product flooring, unit type switching, fractional kg sale with line-item-count rule, integer count sale)
- Dev.log: no runtime errors after restart

## Notes
- Dev server had to be restarted after `prisma db push` to pick up the regenerated Prisma client. The Turbopack-cached globalThis.prisma instance in `src/lib/db.ts` was using the pre-migration schema.
