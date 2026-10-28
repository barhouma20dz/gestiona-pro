import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// Gestiona Pro — Demo data seeder (Algerian retail context, DZD)
// Run via: bun prisma/seed-demo.ts
//
// Creates:
//   - SUPER_ADMIN:      via SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env (م-0)
//   - Demo store:       سوق الأمانة — سلسلة مواد غذائية (DZD)
//   - Owner:            owner@gestiona.dz / owner123 (demo-only credentials)
//   - Staff (seller):   caissier@gestiona.dz / caissier123 (demo-only credentials)
//   - 18 realistic products (Algerian brands, DZD prices, kg/count units,
//     some expiring soon, some low stock)
//   - Suppliers + one invoice with payments
//   - ~40 sales spread over the last 7 days (for dashboard charts)
//   - Active subscription (YEARLY)
//
// Idempotent: if the demo store already exists, nothing is created.

const DEMO_EMAIL = "owner@gestiona.dz";

type SeedProduct = {
  name: string;
  barcode: string;
  price: number;
  costPrice: number;
  stock: number;
  unitType: "count" | "kg";
  category: string;
  expiresInDays?: number; // days from now; omit => no expiry
  lowStock?: boolean;
};

const PRODUCTS: SeedProduct[] = [
  // Épicerie / بقالة
  { name: "زيت مائدة إيليو 5 لتر", barcode: "6130010000015", price: 1250, costPrice: 1180, stock: 42, unitType: "count", category: "مواد غذائية" },
  { name: "سكر سيفيتال 1 كغ", barcode: "6130010000022", price: 110, costPrice: 96, stock: 120, unitType: "count", category: "مواد غذائية" },
  { name: "قهوة بوندين 250 غ", barcode: "6130010000039", price: 480, costPrice: 430, stock: 35, unitType: "count", category: "مواد غذائية" },
  { name: "طماطم مصبرة كابرين 400 غ", barcode: "6130010000046", price: 95, costPrice: 80, stock: 88, unitType: "count", category: "مواد غذائية", expiresInDays: 240 },
  { name: "تونة مرسى الشلف 160 غ", barcode: "6130010000053", price: 210, costPrice: 185, stock: 54, unitType: "count", category: "مواد غذائية", expiresInDays: 400 },
  // اللبن ومشتقاته
  { name: "لبن سمعيل 1 لتر", barcode: "6130020000011", price: 120, costPrice: 110, stock: 65, unitType: "count", category: "اللبن والأجبان", expiresInDays: 12 },
  { name: "لبن مجفف لوي 400 غ", barcode: "6130020000028", price: 340, costPrice: 305, stock: 28, unitType: "count", category: "اللبن والأجبان", expiresInDays: 150 },
  { name: "جبن ثقيل بيل 200 غ", barcode: "6130020000035", price: 260, costPrice: 235, stock: 9, unitType: "count", category: "اللبن والأجبان", lowStock: true, expiresInDays: 20 },
  { name: "زبدة حلوة 250 غ", barcode: "6130020000042", price: 390, costPrice: 360, stock: 16, unitType: "count", category: "اللبن والأجبان", expiresInDays: 45 },
  // السميد والفرينة
  { name: "سميد إيسر 10 كغ", barcode: "6130030000017", price: 980, costPrice: 920, stock: 22, unitType: "count", category: "المخبوزات والحبوب" },
  { name: "فرينة استير 5 كغ", barcode: "6130030000024", price: 420, costPrice: 385, stock: 30, unitType: "count", category: "المخبوزات والحبوب" },
  { name: "أرز بسمتي 1 كغ", barcode: "6130030000031", price: 320, costPrice: 290, stock: 47, unitType: "count", category: "المخبوزات والحبوب" },
  // خضر وفواكه (بالوزن)
  { name: "طماطم", barcode: "6130040000013", price: 140, costPrice: 100, stock: 55.5, unitType: "kg", category: "خضر وفواكه" },
  { name: "بطاطا", barcode: "6130040000020", price: 90, costPrice: 70, stock: 120, unitType: "kg", category: "خضر وفواكه" },
  { name: "بصل", barcode: "6130040000037", price: 80, costPrice: 60, stock: 8.2, unitType: "kg", category: "خضر وفواكه", lowStock: true },
  { name: "برتقال", barcode: "6130040000044", price: 180, costPrice: 140, stock: 40, unitType: "kg", category: "خضر وفواكه" },
  // تنظيف وعناية
  { name: "مسحوق غسيل جدو 3 كغ", barcode: "6130050000019", price: 690, costPrice: 640, stock: 26, unitType: "count", category: "منظفات وعناية" },
  { name: "صابون يدين آفيا 500 مل", barcode: "6130050000026", price: 250, costPrice: 220, stock: 5, unitType: "count", category: "منظفات وعناية", lowStock: true },
];

async function ensureSuperAdmin() {
  // م-0: admin credentials come from the environment — no compiled defaults.
  const email = process.env.SEED_ADMIN_EMAIL?.trim();
  const plain = process.env.SEED_ADMIN_PASSWORD?.trim();
  if (!email || !plain) {
    console.warn(
      "⚠ Skipping SUPER_ADMIN (set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD to create one)."
    );
    return null;
  }
  const hash = await bcrypt.hash(plain, 10);
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    await db.user.update({
      where: { id: existing.id },
      data: { password: hash, role: "SUPER_ADMIN", storeId: null },
    });
    return existing.id;
  }
  const admin = await db.user.create({
    data: { email, password: hash, name: "Super Admin", role: "SUPER_ADMIN", storeId: null },
  });
  return admin.id;
}

async function main() {
  await ensureSuperAdmin();

  const already = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (already) {
    console.log("Demo store already seeded — skipping (delete owner@gestiona.dz to re-seed).");
    return;
  }

  console.log("Seeding Gestiona Pro demo data (DZD, Algerian retail)...");

  // ── Store ────────────────────────────────────────────────────────────────
  const store = await db.store.create({
    data: {
      name: "سوق الأمانة",
      businessType: "Grocery",
      phone: "+213 555 12 34 56",
      email: DEMO_EMAIL,
      addressLine1: "حي 1000 مسكن، بئر مراد رايس",
      addressLine2: "الجزائر العاصمة",
      footerText: "شكراً لزيارتكم — نتشرف بخدمتكم دائماً",
      currency: "دج",
      taxRate: 0,
      timezone: "Africa/Algiers",
      status: "ACTIVE",
    },
  });

  // ── Users ────────────────────────────────────────────────────────────────
  const ownerHash = await bcrypt.hash("owner123", 10);
  const staffHash = await bcrypt.hash("caissier123", 10);
  const owner = await db.user.create({
    data: { email: DEMO_EMAIL, password: ownerHash, name: "أمين قاسمي", role: "OWNER", storeId: store.id },
  });
  await db.user.create({
    data: { email: "caissier@gestiona.dz", password: staffHash, name: "سارة بن علي", role: "STAFF", storeId: store.id },
  });

  // ── Subscription (ACTIVE yearly) ─────────────────────────────────────────
  const now = new Date();
  await db.subscription.create({
    data: {
      storeId: store.id,
      status: "ACTIVE",
      plan: "YEARLY",
      startDate: new Date(now.getTime() - 60 * 24 * 3600 * 1000),
      endDate: new Date(now.getTime() + 305 * 24 * 3600 * 1000),
    },
  });

  // ── Suppliers ────────────────────────────────────────────────────────────
  const supplier1 = await db.supplier.create({
    data: { storeId: store.id, name: "مؤسسة توزيع الجملة — الجزائر الوسطى", phone: "+213 661 45 67 89", email: "contact@gros-dz.com", address: "المنطقة الصناعية، رويبة" },
  });
  const supplier2 = await db.supplier.create({
    data: { storeId: store.id, name: "شركة سيفيتال للتوزيع", phone: "+213 770 22 33 44", email: "ventes@cevital.dz", address: "وادي سوف، الطريق الوطني 5" },
  });

  // ── Products ─────────────────────────────────────────────────────────────
  const day = 24 * 3600 * 1000;
  const productIds: { id: string; price: number; costPrice: number; name: string; unitType: string }[] = [];
  for (const p of PRODUCTS) {
    const created = await db.product.create({
      data: {
        storeId: store.id,
        name: p.name,
        barcode: p.barcode,
        price: p.price,
        costPrice: p.costPrice,
        stock: p.lowStock ? Math.max(2, Math.round(p.stock / 4)) : p.stock,
        unitType: p.unitType,
        category: p.category,
        expiryDate: p.expiresInDays ? new Date(Date.now() + p.expiresInDays * day) : null,
      },
    });
    productIds.push({ id: created.id, price: p.price, costPrice: p.costPrice, name: p.name, unitType: p.unitType });
  }

  // ── Supplier invoice + payments ──────────────────────────────────────────
  const invoiceItems = productIds.slice(0, 5).map((p, i) => ({
    productId: p.id,
    productName: p.name,
    quantity: 24 + i * 6,
    unitPrice: p.costPrice,
    total: (24 + i * 6) * p.costPrice,
  }));
  const invoiceTotal = invoiceItems.reduce((s, it) => s + it.total, 0);
  const invoice = await db.supplierInvoice.create({
    data: {
      storeId: store.id,
      supplierId: supplier1.id,
      invoiceNo: "FAC-2026-0148",
      invoiceDate: new Date(now.getTime() - 20 * day),
      totalAmount: invoiceTotal,
      paidAmount: Math.round(invoiceTotal * 0.4),
      status: "PARTIAL",
      notes: "دفعة أولى بعد 12 يوماً — الباقي بعد 10 أيام",
      items: { create: invoiceItems },
    },
  });
  await db.supplierPayment.create({
    data: {
      invoiceId: invoice.id,
      storeId: store.id,
      amount: Math.round(invoiceTotal * 0.4),
      paymentDate: new Date(now.getTime() - 12 * day),
      paymentMethod: "Cash",
      notes: "دفعة أولى نقداً",
      userId: owner.id,
    },
  });

  // ── Sales over the last 7 days ───────────────────────────────────────────
  // Deterministic pseudo-random for stable demo output
  let seedNum = 42;
  const rand = () => {
    seedNum = (seedNum * 9301 + 49297) % 233280;
    return seedNum / 233280;
  };
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

  const paymentMethods = ["Cash", "Cash", "Cash", "CARD", "BARIDIMOB"];
  let receiptCounter = 1;

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const salesToday = 4 + Math.floor(rand() * 4); // 4..7 sales per day
    for (let s = 0; s < salesToday; s++) {
      const hour = 8 + Math.floor(rand() * 12); // 8:00–20:00
      const createdAt = new Date(now.getTime() - dayOffset * day);
      createdAt.setHours(hour, Math.floor(rand() * 60), 0, 0);

      const lineCount = 1 + Math.floor(rand() * 4);
      const chosen = new Set<number>();
      const items: { productId: string; productName: string; unitPrice: number; quantity: number; total: number }[] = [];
      while (items.length < lineCount) {
        const idx = Math.floor(rand() * productIds.length);
        if (chosen.has(idx)) continue;
        chosen.add(idx);
        const p = productIds[idx];
        const qty = p.unitType === "kg" ? Math.round(rand() * 4 * 10) / 10 + 0.5 : 1 + Math.floor(rand() * 3);
        items.push({ productId: p.id, productName: p.name, unitPrice: p.price, quantity: qty, total: Math.round(qty * p.price * 100) / 100 });
      }
      const subtotal = items.reduce((acc, it) => acc + it.total, 0);
      const discount = rand() < 0.15 ? Math.round(subtotal * 0.05) : 0;
      const total = Math.round((subtotal - discount) * 100) / 100;
      const sellerId = rand() < 0.5 ? owner.id : (await db.user.findFirst({ where: { storeId: store.id, role: "STAFF" } }))?.id ?? null;

      const dateStr = createdAt.toISOString().slice(0, 10).replace(/-/g, "");
      await db.sale.create({
        data: {
          storeId: store.id,
          sellerId,
          receiptNo: `INV-${dateStr}-${String(receiptCounter++).padStart(4, "0")}`,
          subtotal: Math.round(subtotal * 100) / 100,
          taxAmount: 0,
          discount,
          total,
          paymentMethod: pick(paymentMethods),
          itemCount: items.reduce((acc, it) => acc + it.quantity, 0),
          createdAt,
          items: { create: items },
        },
      });
    }
  }

  // ── Supplier 2 invoice (fully paid) ──────────────────────────────────────
  const inv2Items = productIds.slice(5, 9).map((p, i) => ({
    productId: p.id,
    productName: p.name,
    quantity: 12 + i * 4,
    unitPrice: p.costPrice,
    total: (12 + i * 4) * p.costPrice,
  }));
  const inv2Total = inv2Items.reduce((s, it) => s + it.total, 0);
  const invoice2 = await db.supplierInvoice.create({
    data: {
      storeId: store.id,
      supplierId: supplier2.id,
      invoiceNo: "CV-2026-0912",
      invoiceDate: new Date(now.getTime() - 35 * day),
      totalAmount: inv2Total,
      paidAmount: inv2Total,
      status: "PAID",
      notes: "مسدد بالكامل",
      items: { create: inv2Items },
    },
  });
  await db.supplierPayment.create({
    data: {
      invoiceId: invoice2.id,
      storeId: store.id,
      amount: inv2Total,
      paymentDate: new Date(now.getTime() - 6 * day),
      paymentMethod: "Bank",
      notes: "تحويل بنائي — بريدي موب",
      userId: owner.id,
    },
  });

  // ── Customers (العملاء) ──────────────────────────────────────────────────
  const customerDefs = [
    { name: "خالد مرابط", phone: "0550 11 22 33", address: "بئر مراد رايس", notes: "عميل دائم — مقهى", points: 34 },
    { name: "نادية حمدي", phone: "0661 44 55 66", address: "الحراش", notes: "", points: 12 },
    { name: "مطعم الأصدقاء", phone: "0770 77 88 99", address: "رويبة — الحي التجاري", notes: "طلبيات أسبوعية", points: 58 },
    { name: "عموري بلقاسم", phone: "0540 10 20 30", address: "القبة", notes: "يدفع نقداً دائماً", points: 5 },
    { name: "سعاد بوعلام", phone: "0698 33 22 11", address: "حسين داي", notes: "", points: 21 },
  ];
  const customers = [];
  for (const c of customerDefs) {
    customers.push(
      await db.customer.create({
        data: {
          storeId: store.id,
          name: c.name,
          phone: c.phone,
          address: c.address,
          notes: c.notes,
          loyaltyPoints: c.points,
        },
      })
    );
  }

  // ── Credit sales (بيع آجل) + partial repayment ──────────────────────────
  const creditItems1 = productIds.slice(0, 3).map((p) => ({
    productId: p.id,
    productName: p.name,
    unitPrice: p.price,
    quantity: 2,
    total: 2 * p.price,
  }));
  const creditTotal1 = creditItems1.reduce((s, it) => s + it.total, 0);
  const creditSale1 = await db.sale.create({
    data: {
      storeId: store.id,
      customerId: customers[2].id, // مطعم الأصدقاء
      receiptNo: `INV-${new Date(now.getTime() - 3 * day).toISOString().slice(0, 10).replace(/-/g, "")}-9001`,
      subtotal: creditTotal1,
      taxAmount: 0,
      discount: 0,
      total: creditTotal1,
      paymentMethod: "CREDIT",
      itemCount: 3,
      createdAt: new Date(now.getTime() - 3 * day),
      items: { create: creditItems1 },
    },
  });
  await db.customerPayment.create({
    data: {
      storeId: store.id,
      customerId: customers[2].id,
      saleId: creditSale1.id,
      amount: Math.round(creditTotal1 * 0.5),
      paymentMethod: "Cash",
      notes: "تسديد جزئي — الباقي نهاية الشهر",
      userId: owner.id,
    },
  });

  const creditItems2 = productIds.slice(3, 5).map((p) => ({
    productId: p.id,
    productName: p.name,
    unitPrice: p.price,
    quantity: 3,
    total: 3 * p.price,
  }));
  const creditTotal2 = creditItems2.reduce((s, it) => s + it.total, 0);
  await db.sale.create({
    data: {
      storeId: store.id,
      customerId: customers[0].id, // خالد مرابط
      receiptNo: `INV-${new Date(now.getTime() - 1 * day).toISOString().slice(0, 10).replace(/-/g, "")}-9002`,
      subtotal: creditTotal2,
      taxAmount: 0,
      discount: 0,
      total: creditTotal2,
      paymentMethod: "CREDIT",
      itemCount: 2,
      createdAt: new Date(now.getTime() - 1 * day),
      items: { create: creditItems2 },
    },
  });

  console.log("  Customers: 5 (2 with outstanding credit)");

    console.log("✓ Demo data created:");
  console.log("  Store:    سوق الأمانة (DZD)");
  console.log("  Owner:    owner@gestiona.dz / owner123");
  console.log("  Staff:    caissier@gestiona.dz / caissier123");
  console.log(`  Products: ${PRODUCTS.length}, Sales: ~7 days history`);
  console.log(`  Admin:    from SEED_ADMIN_EMAIL (SUPER_ADMIN)`);
}

main()
  .then(() => {
    console.log("Done. Disconnecting...");
    return db.$disconnect();
  })
  .catch(async (e) => {
    console.error("Demo seed failed:", e);
    await db.$disconnect();
    process.exit(1);
  });
