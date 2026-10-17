import { db } from "../src/lib/db";
import { signToken } from "../src/lib/auth";

async function run() {
  console.log("--- TESTING LIVE PHASE 1 OPERATIONS ---");

  const user = await db.user.findFirst({ where: { role: "OWNER" } });
  if (!user || !user.storeId) throw new Error("No owner found");

  const token = await signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    storeId: user.storeId,
  });

  const product = await db.product.findFirst({ where: { storeId: user.storeId } });
  if (!product) throw new Error("No product found");

  console.log(`Using product: ${product.name} (Current Stock: ${product.stock})`);

  // 1. Create a near-expiry batch (expires in 2 days -> should be urgent_3)
  const expiryIn2Days = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const bRes = await fetch(`http://localhost:3001/api/products/${product.id}/batches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      batchNumber: "LOT-PHASE1-TEST",
      expiryDate: expiryIn2Days,
      quantity: 12,
      costPrice: product.costPrice ?? 50,
    }),
  });
  console.log("Create batch status:", bRes.status);
  const createdBatch = await bRes.json();
  console.log("Created batch ID:", createdBatch.id, "Batch#:", createdBatch.batchNumber);

  // 2. Fetch batches API to verify categorization
  const bListRes = await fetch("http://localhost:3001/api/batches", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const bList = await bListRes.json();
  console.log("Batches Stats after adding:", bList.stats);
  const urgentBatch = bList.batches.find((b: any) => b.id === createdBatch.id);
  console.log("Categorized urgency for test batch:", urgentBatch?.urgency, `(diffDays: ${urgentBatch?.diffDays})`);

  // 3. Test Stock Movement Ledger creation
  const smRes = await fetch("http://localhost:3001/api/stock-movements", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      productId: product.id,
      type: "ADJUSTMENT",
      quantity: 5,
      reason: "اختبار تسوية مخزنية آلية للمرحلة 1",
    }),
  });
  console.log("Stock movement POST status:", smRes.status);
  const smCreated = await smRes.json();
  console.log("Movement created:", smCreated.type, "Qty:", smCreated.quantity, "Before:", smCreated.beforeQty, "After:", smCreated.afterQty);

  // Verify product stock was updated
  const updatedProduct = await db.product.findUnique({ where: { id: product.id } });
  console.log("Product stock after adjustment:", updatedProduct?.stock);

  await db.$disconnect();
  console.log("--- PHASE 1 OPERATIONS TEST COMPLETED SUCCESSFULLY ---");
}

run().catch((e) => {
  console.error("Test error:", e);
  process.exit(1);
});
