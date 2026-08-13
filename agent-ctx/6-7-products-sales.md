# Task 6-7 — Product Manager + Sales History views

## Scope
Overwrote the stub views:
- `src/components/views/product-manager.tsx`
- `src/components/views/sales-history.tsx`

## Decisions
- Emerald-only color palette (emerald/amber/red/slate accents on stat tiles + badges). No indigo/blue.
- Mobile: products/sales switch to a card-list layout inside the same Card container (cleaner than horizontal-scroll tables at narrow widths).
- Used `useQuery` (`["products"]`, `["sales"]`, `["salesStats"]`, `["shop"]`, `["sale", id]`) + `useMutation` for create/update/delete with `qc.invalidateQueries` + sonner toasts.
- Form validation is local (non-empty name & barcode, numeric price >= 0, stock >= 0).
- Receipt dialog fetches the full sale (`salesApi.get(id)`) only when opened, and only renders the `<Receipt>` once both `shop` and `sale` are present.
- Lightweight 7-day revenue bar chart: pure inline divs with `height: %`, today's bar highlighted in solid emerald, others in emerald/35.

## Lint status
- `bunx eslint src/components/views/product-manager.tsx src/components/views/sales-history.tsx` → exit 0, clean.
- `bun run lint` for the whole repo fails with 1 error in `src/components/views/shop-details.tsx` (setState in effect) — that file belongs to a different task/agent and was NOT touched by me.

## Dev server status
`tail dev.log` shows clean compiles, `GET / 200` repeatedly. No runtime errors from my files.
