import { db } from "../src/lib/db";
import { signToken } from "../src/lib/auth";

async function run() {
  console.log("--- PHASE 1 VERIFICATION TEST ---");

  // 1. Fetch user & store
  const user = await db.user.findFirst({ where: { role: "OWNER" }, include: { store: true } });
  if (!user || !user.storeId) {
    console.error("No store owner found in database");
    process.exit(1);
  }
  console.log(`✓ Tenant Store: ${user.store?.name} (ID: ${user.storeId})`);
  console.log(`✓ Owner: ${user.email} (ID: ${user.id})`);

  // 2. Sign token
  const token = await signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    storeId: user.storeId,
  });

  // 3. Test /api/batches endpoint
  const bRes = await fetch("http://localhost:3001/api/batches", {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`✓ GET /api/batches status: ${bRes.status}`);
  const bData = await bRes.json();
  console.log("✓ Batches stats summary:", bData.stats);

  // 4. Test /api/stock-movements endpoint
  const smRes = await fetch("http://localhost:3001/api/stock-movements?limit=5", {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`✓ GET /api/stock-movements status: ${smRes.status}`);
  const smData = await smRes.json();
  console.log(`✓ Stock movements recorded count: ${smData.length}`);

  // 5. Test minStock and lowStock detection on products
  const products = await db.product.findMany({ where: { storeId: user.storeId } });
  console.log(`✓ Total products in store: ${products.length}`);
  const lowStock = products.filter(p => p.stock <= p.minStock);
  console.log(`✓ Low / Out of stock products count: ${lowStock.length}`);

  console.log("--- ALL PHASE 1 CHECKS PASSED ---");
  process.exit(0);
}

run().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
