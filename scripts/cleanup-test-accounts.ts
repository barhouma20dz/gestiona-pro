import { db } from "@/lib/db";

// Remove temporary browser-test accounts created while verifying
// registration (test-temp@gestiona.dz, test2-temp@gestiona.dz) along
// with their stores and dependent rows.

const TEST_EMAILS = ["test-temp@gestiona.dz", "test2-temp@gestiona.dz"];

async function main() {
  for (const email of TEST_EMAILS) {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`skip ${email} (not found)`);
      continue;
    }
    const storeId = user.storeId;
    await db.user.delete({ where: { id: user.id } });
    if (storeId) {
      // Delete dependents in order
      await db.saleItem.deleteMany({ where: { sale: { storeId } } });
      await db.sale.deleteMany({ where: { storeId } });
      await db.supplierPayment.deleteMany({ where: { storeId } });
      await db.supplierInvoiceItem.deleteMany({ where: { invoice: { storeId } } });
      await db.supplierInvoice.deleteMany({ where: { storeId } });
      await db.customerPayment.deleteMany({ where: { storeId } });
      await db.customer.deleteMany({ where: { storeId } });
      await db.product.deleteMany({ where: { storeId } });
      await db.supplier.deleteMany({ where: { storeId } });
      await db.subscription.deleteMany({ where: { storeId } });
      await db.store.delete({ where: { id: storeId } });
    }
    console.log(`deleted ${email} + store ${storeId}`);
  }
  const remaining = await db.user.findMany({ select: { email: true } });
  console.log("remaining users:", remaining.map((u) => u.email).join(", "));
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
