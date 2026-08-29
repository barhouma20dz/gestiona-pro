import { db } from "@/lib/db";

async function main() {
  const users = await db.user.findMany({
    select: { email: true, role: true, name: true, storeId: true },
    orderBy: { email: "asc" },
  });
  console.log("=== USERS ===");
  for (const u of users) {
    console.log(`${u.email} | ${u.role} | ${u.name} | store=${u.storeId ?? "-"}`);
  }

  const stores = await db.store.findMany({
    select: { id: true, name: true, businessType: true, status: true },
  });
  console.log("\n=== STORES ===");
  for (const s of stores) {
    const counts = {
      products: await db.product.count({ where: { storeId: s.id } }),
      sales: await db.sale.count({ where: { storeId: s.id } }),
      customers: await db.customer.count({ where: { storeId: s.id } }),
    };
    console.log(`${s.name} | ${s.businessType} | ${s.status} | products=${counts.products} sales=${counts.sales} customers=${counts.customers}`);
  }

  const subs = await db.subscription.findMany({
    select: { storeId: true, status: true, plan: true, endDate: true },
  });
  console.log("\n=== SUBSCRIPTIONS ===");
  for (const x of subs) {
    console.log(`${x.storeId} | ${x.status} | ${x.plan} | until ${x.endDate.toISOString().slice(0, 10)}`);
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
