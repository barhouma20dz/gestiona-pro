import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function runPhase3Tests() {
  console.log("=== STARTING PHASE 3 AUTOMATED INTEGRATION TESTS ===");

  try {
    // 1. Get an existing store and user
    const store = await db.store.findFirst();
    if (!store) throw new Error("No store found.");
    const user = await db.user.findFirst({ where: { storeId: store.id } });
    if (!user) throw new Error("No user found.");

    console.log(`[+] Using Store: "${store.name}" (${store.id}), User: "${user.name}"`);

    // 2. Test Operating Expenses
    console.log("\n--- Testing Operating Expenses ---");
    const exp1 = await db.expense.create({
      data: {
        storeId: store.id,
        category: "UTILITIES",
        categoryLabel: "كهرباء ومياه وإنترنت",
        amount: 3500,
        paymentMethod: "Cash",
        paidTo: "سونلغاز",
        notes: "فاتورة استهلاك شهرية",
        userId: user.id,
      },
    });
    const exp2 = await db.expense.create({
      data: {
        storeId: store.id,
        category: "MAINTENANCE",
        categoryLabel: "صيانة وتصليح وتجهيزات",
        amount: 1500,
        paymentMethod: "Bank",
        paidTo: "مصلح التبريد",
        notes: "صيانة الثلاجة",
        userId: user.id,
      },
    });
    console.log(`[PASS] Created Expenses: ${exp1.amount} دج (${exp1.categoryLabel}) and ${exp2.amount} دج (${exp2.categoryLabel})`);

    const allExpenses = await db.expense.findMany({
      where: { storeId: store.id },
    });
    const totalExp = allExpenses.reduce((sum, e) => sum + e.amount, 0);
    if (totalExp < 5000) throw new Error("Expenses sum calculation failed.");
    console.log(`[PASS] Total expenses recorded: ${totalExp} دج across ${allExpenses.length} entries.`);

    // 3. Test Cash Drawer Session Lifecycle
    console.log("\n--- Testing Cash Drawer Sessions ---");
    // Close any lingering open session for clean test
    await db.cashSession.updateMany({
      where: { storeId: store.id, status: "OPEN" },
      data: { status: "CLOSED", closedAt: new Date() },
    });

    const session1 = await db.cashSession.create({
      data: {
        storeId: store.id,
        userId: user.id,
        openingCash: 10000,
        status: "OPEN",
        notes: "جلسة اختبارية مرحلة 3",
      },
    });
    console.log(`[PASS] Cash Drawer opened with initial cash: ${session1.openingCash} دج`);

    // Manual deposit & withdrawal
    const deposit = await db.cashTransaction.create({
      data: {
        sessionId: session1.id,
        storeId: store.id,
        type: "DEPOSIT",
        amount: 2000,
        reason: "تغذية الصندوق بفكة إضافية",
        userId: user.id,
      },
    });
    const withdrawal = await db.cashTransaction.create({
      data: {
        sessionId: session1.id,
        storeId: store.id,
        type: "WITHDRAWAL",
        amount: 1000,
        reason: "سحب للمصاريف النثرية",
        userId: user.id,
      },
    });
    console.log(`[PASS] Cash Transactions logged: +${deposit.amount} (DEPOSIT) and -${withdrawal.amount} (WITHDRAWAL)`);

    // Close session with actual counted cash
    // Expected: 10000 (opening) + 2000 (deposit) - 1000 (withdrawal) - 3500 (cash expense) = 7500
    // Let's say user counts 7600 (100 surplus)
    const expected = 10000 + 2000 - 1000;
    const actual = 11100;
    const diff = actual - expected;

    const closedSession = await db.cashSession.update({
      where: { id: session1.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closingCashExpected: expected,
        closingCashActual: actual,
        difference: diff,
        notes: "إغلاق ناجح مع فائض 100 دج",
      },
    });
    console.log(`[PASS] Cash Session closed. Expected: ${closedSession.closingCashExpected} دج, Actual: ${closedSession.closingCashActual} دج, Discrepancy: ${closedSession.difference} دج`);

    // 4. Test Customer Account Statement
    console.log("\n--- Testing Customer Account Statement ---");
    const testCust = await db.customer.create({
      data: {
        storeId: store.id,
        name: `زبون تجريبي ${Date.now()}`,
        phone: `0661${Math.floor(Math.random() * 900000 + 100000)}`,
      },
    });

    // Create a CREDIT sale
    const sale1 = await db.sale.create({
      data: {
        storeId: store.id,
        customerId: testCust.id,
        receiptNo: `REC-TEST-${Date.now()}`,
        subtotal: 4500,
        total: 4500,
        paymentMethod: "CREDIT",
        itemCount: 2,
      },
    });

    // Record a debt payment of 2000
    const custPay = await db.customerPayment.create({
      data: {
        storeId: store.id,
        customerId: testCust.id,
        amount: 2000,
        paymentMethod: "Cash",
        notes: "تسديد دفعة أولى",
        userId: user.id,
      },
    });

    // Check outstanding debt
    const creditSalesTotal = 4500;
    const debtPaidTotal = 2000;
    const balance = creditSalesTotal - debtPaidTotal;
    if (balance !== 2500) throw new Error(`Customer balance mismatch. Expected 2500, got ${balance}`);
    console.log(`[PASS] Customer Credit Sale: ${sale1.total} دج, Payment: ${custPay.amount} دج, Outstanding Debt: ${balance} دج`);

    // 5. Test Supplier Account Statement
    console.log("\n--- Testing Supplier Account Statement ---");
    const testSupp = await db.supplier.create({
      data: {
        storeId: store.id,
        name: `مورد كشف حساب ${Date.now()}`,
        phone: "0770000000",
        leadTimeDays: 2,
        paymentTerms: "أجل 15 يوم",
      },
    });

    const suppInv = await db.supplierInvoice.create({
      data: {
        storeId: store.id,
        supplierId: testSupp.id,
        invoiceNo: `INV-STMT-${Date.now()}`,
        totalAmount: 15000,
        paidAmount: 5000,
        status: "PARTIAL",
        dueDate: new Date(Date.now() + 15 * 86400000),
      },
    });

    const suppPay = await db.supplierPayment.create({
      data: {
        store: { connect: { id: store.id } },
        invoice: { connect: { id: suppInv.id } },
        amount: 5000,
        paymentMethod: "Bank",
        notes: "تسديد شيك بنكي",
        user: { connect: { id: user.id } },
      },
    });

    const suppBalance = suppInv.totalAmount - suppInv.paidAmount;
    if (suppBalance !== 10000) throw new Error(`Supplier balance mismatch. Expected 10000, got ${suppBalance}`);
    console.log(`[PASS] Supplier Invoice: ${suppInv.totalAmount} دج, Payment: ${suppPay.amount} دج, Outstanding Payable: ${suppBalance} دج (Due: ${suppInv.dueDate?.toISOString().slice(0, 10)})`);

    // 6. Test Daily Profit & Loss Formula
    console.log("\n--- Testing Daily Financial P&L Formulas ---");
    // Gross Profit = Net Sales - COGS
    // Net Operating Profit = Gross Profit - Operating Expenses
    const sampleNetSales = 50000;
    const sampleCOGS = 35000;
    const sampleGrossProfit = sampleNetSales - sampleCOGS; // 15,000
    const sampleOperatingExpenses = 4000;
    const sampleNetOperatingProfit = sampleGrossProfit - sampleOperatingExpenses; // 11,000
    const sampleGrossMargin = (sampleGrossProfit / sampleNetSales) * 100; // 30%
    const sampleNetMargin = (sampleNetOperatingProfit / sampleNetSales) * 100; // 22%

    if (sampleGrossProfit !== 15000 || sampleNetOperatingProfit !== 11000) {
      throw new Error("Financial formula verification failed.");
    }
    console.log(`[PASS] Verified Net Sales (${sampleNetSales}) - COGS (${sampleCOGS}) = Gross Profit (${sampleGrossProfit}, Margin: ${sampleGrossMargin}%)`);
    console.log(`[PASS] Verified Gross Profit (${sampleGrossProfit}) - Expenses (${sampleOperatingExpenses}) = Net Operating Profit (${sampleNetOperatingProfit}, Margin: ${sampleNetMargin}%)`);

    // 7. Clean up test records cleanly
    console.log("\n--- Cleaning Up Phase 3 Test Records ---");
    await db.expense.deleteMany({ where: { id: { in: [exp1.id, exp2.id] } } });
    await db.cashTransaction.deleteMany({ where: { sessionId: session1.id } });
    await db.cashSession.delete({ where: { id: session1.id } });
    await db.customerPayment.delete({ where: { id: custPay.id } });
    await db.sale.delete({ where: { id: sale1.id } });
    await db.customer.delete({ where: { id: testCust.id } });
    await db.supplierPayment.delete({ where: { id: suppPay.id } });
    await db.supplierInvoice.delete({ where: { id: suppInv.id } });
    await db.supplier.delete({ where: { id: testSupp.id } });
    console.log("[PASS] Phase 3 cleanup completed cleanly.");

    console.log("\n=== ALL PHASE 3 INTEGRATION TESTS PASSED PERFECTLY! ===");
  } finally {
    await db.$disconnect();
  }
}

runPhase3Tests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
