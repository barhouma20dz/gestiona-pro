#!/usr/bin/env python3
"""Fix hardcoded light-only colors for dark-mode support in gestiona-pro UI.

Safe transformations:
  A. Hero CTA buttons: white bg + emerald text -> adaptive card/primary tokens
  B. Barcode scanner CTA -> adaptive tokens
  C. Regex: append dark: variants to text colors lacking them (guard against
     hover:/prefix matches and strings that already carry a dark: variant).
"""
import re
from pathlib import Path

ROOT = Path("/home/z/my-project/src/components")

# ── A. exact replacements ────────────────────────────────────────────────
EXACT = {
    # hero CTA buttons on emerald gradient banners (adaptive in dark mode)
    "views/inventory-audit.tsx": [
        ('className="bg-white text-emerald-700 shadow-md hover:bg-emerald-50"',
         'className="bg-card text-primary shadow-md hover:bg-primary/10"'),
    ],
    "views/dashboard.tsx": [
        ('className="bg-white text-emerald-700 shadow-md hover:bg-emerald-50"',
         'className="bg-card text-primary shadow-md hover:bg-primary/10"'),
    ],
    "views/seller-dashboard.tsx": [
        ('className="bg-white text-emerald-700 shadow-md hover:bg-emerald-50"',
         'className="bg-card text-primary shadow-md hover:bg-primary/10"'),
    ],
    "views/suppliers.tsx": [
        ('className="bg-white text-emerald-700 shadow-md hover:bg-emerald-50"',
         'className="bg-card text-primary shadow-md hover:bg-primary/10"'),
    ],
    "views/seller-management.tsx": [
        ('className="bg-white text-emerald-700 shadow-md hover:bg-emerald-50"',
         'className="bg-card text-primary shadow-md hover:bg-primary/10"'),
    ],
    "views/product-manager.tsx": [
        ('className="bg-white text-emerald-700 shadow-md hover:bg-emerald-50"',
         'className="bg-card text-primary shadow-md hover:bg-primary/10"'),
    ],
    "views/expiry-tracking.tsx": [
        ('className="bg-white text-emerald-700 shadow-md hover:bg-emerald-50"',
         'className="bg-card text-primary shadow-md hover:bg-primary/10"'),
    ],
    "views/admin-dashboard.tsx": [
        ('className="bg-white text-emerald-700 shadow-md hover:bg-emerald-50"',
         'className="bg-card text-primary shadow-md hover:bg-primary/10"'),
    ],
    "barcode-scanner.tsx": [
        ('className="shrink-0 bg-white text-emerald-600 hover:bg-emerald-50"',
         'className="shrink-0 bg-card text-primary hover:bg-primary/10"'),
    ],
}

# ── B. regex appends (only when no dark: variant later in same string) ───
# guard (?<![:\w-]) prevents matching inside hover:text-… / md:text-… prefixes
REGEX_APPENDS = [
    (re.compile(r'(?<![:\w-])text-red-600(?![^"\n]*dark:)'), "text-red-600 dark:text-red-400"),
    (re.compile(r'(?<![:\w-])text-red-700(?![^"\n]*dark:)'), "text-red-700 dark:text-red-400"),
    (re.compile(r'(?<![:\w-])text-slate-600(?![^"\n]*dark:)'), "text-slate-600 dark:text-slate-300"),
    (re.compile(r'(?<![:\w-])text-slate-700(?![^"\n]*dark:)'), "text-slate-700 dark:text-slate-300"),
    (re.compile(r'(?<![:\w-])text-slate-500(?![^"\n]*dark:)'), "text-slate-500 dark:text-slate-400"),
]

REGEX_FILES = [
    "views/dashboard.tsx",
    "views/sales-history.tsx",
    "views/seller-dashboard.tsx",
    "views/suppliers.tsx",
    "views/product-manager.tsx",
    "views/admin-dashboard.tsx",
    "views/inventory-audit.tsx",
    "views/expiry-tracking.tsx",
    "views/zakat.tsx",
    "views/settings-view.tsx",
    "views/customers.tsx",
    "views/shop-details.tsx",
    "views/seller-management.tsx",
    "views/seller-settings.tsx",
    "views/pos-terminal.tsx",
    "checkout-dialog.tsx",
    "barcode-scanner.tsx",
]

total = 0
for rel, subs in EXACT.items():
    p = ROOT / rel
    src = p.read_text()
    for old, new in subs:
        n = src.count(old)
        if n:
            src = src.replace(old, new)
            print(f"[exact] {rel}: {n}x  {old[:52]}…")
            total += n
    p.write_text(src)

for rel in REGEX_FILES:
    p = ROOT / rel
    src = p.read_text()
    for rx, repl in REGEX_APPENDS:
        src, n = rx.subn(repl, src)
        if n:
            print(f"[regex] {rel}: {n}x  +dark variant  /{rx.pattern[:44]}/")
            total += n
    p.write_text(src)

print(f"\nDone — {total} replacements.")
