import { db } from "../src/lib/db";
async function clean() {
  await db.productBatch.deleteMany({ where: { batchNumber: "LOT-PHASE1-TEST" } });
  await db.stockMovement.deleteMany({ where: { reason: "اختبار تسوية مخزنية آلية للمرحلة 1" } });
  const p = await db.product.findFirst({ where: { name: "بيض" } });
  if (p) await db.product.update({ where: { id: p.id }, data: { stock: 1990 } });
  await db.$disconnect();
  console.log("✓ Database pristine and test data cleaned.");
}
clean();
