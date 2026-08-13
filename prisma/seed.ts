import { db } from "@/lib/db";

// Note: run via `bun prisma/seed.ts`. Bun executes TS natively.
// For `prisma db seed` compatibility we also export it as the default function.

const SEED_SHOP = {
  name: "SwiftMart Grocery",
  addressLine1: "123 Market Street",
  addressLine2: "",
  phoneNumber: "+919876543210",
  upiId: "shop@upi",
  footerText: "Thank you, visit again!",
  currency: "₹",
  taxRate: 0,
};

interface SeedProduct {
  name: string;
  barcode: string;
  price: number;
  stock: number;
  category: string;
}

const SEED_PRODUCTS: SeedProduct[] = [
  // Beverages
  {
    name: "Coca-Cola 750ml",
    barcode: "8901030867531",
    price: 45,
    stock: 120,
    category: "Beverages",
  },
  {
    name: "Tata Tea Gold 1kg",
    barcode: "8901058859123",
    price: 480,
    stock: 40,
    category: "Beverages",
  },
  {
    name: "Nescafe Classic Coffee 100g",
    barcode: "8901058521098",
    price: 320,
    stock: 60,
    category: "Beverages",
  },
  // Snacks
  {
    name: "Lay's Classic Salted 52g",
    barcode: "8901491502227",
    price: 20,
    stock: 200,
    category: "Snacks",
  },
  {
    name: "Britannia Marie Gold 250g",
    barcode: "8901063165021",
    price: 35,
    stock: 80,
    category: "Snacks",
  },
  {
    name: "Haldiram's Aloo Bhujia 200g",
    barcode: "8904004400123",
    price: 52,
    stock: 75,
    category: "Snacks",
  },
  // Dairy
  {
    name: "Amul Taaza Toned Milk 500ml",
    barcode: "8901107000234",
    price: 27,
    stock: 150,
    category: "Dairy",
  },
  {
    name: "Amul Butter 500g",
    barcode: "8901107023456",
    price: 265,
    stock: 35,
    category: "Dairy",
  },
  {
    name: "Mother Dairy Curd 400g",
    barcode: "8901030456789",
    price: 40,
    stock: 90,
    category: "Dairy",
  },
  // Bakery
  {
    name: "Britannia Brown Bread 400g",
    barcode: "8901063556781",
    price: 45,
    stock: 50,
    category: "Bakery",
  },
  // Household
  {
    name: "Surf Excel Easy Wash Detergent 1kg",
    barcode: "8901030789012",
    price: 120,
    stock: 65,
    category: "Household",
  },
  {
    name: "Colgate Strong Teeth Toothpaste 200g",
    barcode: "8901314010232",
    price: 95,
    stock: 110,
    category: "Household",
  },
];

async function main() {
  console.log("Seeding SwiftBill POS database...");

  // --- Upsert default shop (idempotent: only create if none exists) ---
  const existingShop = await db.shop.findFirst();
  if (!existingShop) {
    await db.shop.create({ data: SEED_SHOP });
    console.log(`✓ Created default shop: ${SEED_SHOP.name}`);
  } else {
    console.log(
      `• Shop already exists (id=${existingShop.id}, name=${existingShop.name}) — skipping.`
    );
  }

  // --- Upsert sample products (only create if products table is empty) ---
  const productCount = await db.product.count();
  if (productCount > 0) {
    console.log(
      `• Products table already has ${productCount} rows — skipping product seeding.`
    );
  } else {
    const result = await db.product.createMany({
      data: SEED_PRODUCTS.map((p) => ({
        name: p.name,
        barcode: p.barcode,
        price: p.price,
        stock: p.stock,
        category: p.category,
      })),
    });
    console.log(`✓ Created ${result.count} sample products.`);
  }

  console.log("Seeding complete.");
}

main()
  .then(() => {
    console.log("Done. Disconnecting...");
    return db.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await db.$disconnect();
    process.exit(1);
  });
