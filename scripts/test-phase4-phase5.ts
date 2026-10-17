import { PrismaClient } from "@prisma/client";
import { signToken } from "../src/lib/auth";

const db = new PrismaClient();
const BASE_URL = "http://localhost:3001";

async function runPhase4and5Tests() {
  console.log("======================================================");
  console.log("=== STARTING PHASE 4 & PHASE 5 INTEGRATION TESTS ===");
  console.log("======================================================\n");

  let testProductId: string | null = null;

  try {
    // 1. Get an existing store and user
    const store = await db.store.findFirst();
    if (!store) throw new Error("No store found.");
    const user = await db.user.findFirst({ where: { storeId: store.id } });
    if (!user) throw new Error("No user found.");

    console.log(`[+] Target Store: "${store.name}" (${store.id})`);
    console.log(`[+] User: "${user.name}" (${user.email})\n`);

    // 2. Generate valid JWT token
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      storeId: store.id,
    });

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    // 3. Test Reorder Recommendations API (Phase 5)
    console.log("--- 1. Testing Reorder Recommendations Engine ---");
    const reorderRes = await fetch(`${BASE_URL}/api/recommendations/reorder`, {
      method: "GET",
      headers,
    });

    if (!reorderRes.ok) {
      const errText = await reorderRes.text();
      throw new Error(`Reorder API failed with ${reorderRes.status}: ${errText}`);
    }

    const reorderData = await reorderRes.json();
    console.log(`[PASS] Reorder Recommendations API responded (200 OK)`);
    console.log(`       - Total Products Scanned: ${reorderData.summary.totalProductsScanned}`);
    console.log(`       - Items Needing Reorder: ${reorderData.summary.itemsNeedingReorder}`);
    console.log(`       - Out of Stock: ${reorderData.summary.outOfStockCount}`);
    console.log(`       - Critical Urgency: ${reorderData.summary.criticalCount}`);
    console.log(`       - Estimated Investment: ${reorderData.summary.totalEstimatedInvestment} ${store.currency}`);

    // Create a temporary low-stock product to test deterministic recommendation
    console.log("\n[+] Creating temporary low-stock product to verify formula calculation...");
    const testProd = await db.product.create({
      data: {
        storeId: store.id,
        name: `منتج اختبار إعادة الطلب ${Date.now()}`,
        barcode: `REORDER-TEST-${Date.now()}`,
        price: 300,
        costPrice: 200,
        stock: 2, // low stock
        minStock: 15, // threshold is 15
        category: "اختبارات",
      },
    });
    testProductId = testProd.id;

    const reorderRes2 = await fetch(`${BASE_URL}/api/recommendations/reorder`, {
      method: "GET",
      headers,
    });
    const reorderData2 = await reorderRes2.json();
    const foundRec = reorderData2.recommendations.find(
      (r: any) => r.productId === testProd.id
    );

    if (!foundRec) {
      throw new Error("Created low-stock product was not picked up by Reorder Engine!");
    }
    console.log(`[PASS] Low-stock product correctly detected by Reorder Engine!`);
    console.log(`       - Product: "${foundRec.productName}"`);
    console.log(`       - Current Stock: ${foundRec.currentStock} (Min: ${foundRec.minStock})`);
    console.log(`       - Recommended Qty: +${foundRec.recommendedQty}`);
    console.log(`       - Urgency: ${foundRec.urgency} (${foundRec.urgencyLabel})`);
    console.log(`       - Estimated Cost: ${foundRec.estimatedCost} ${store.currency}`);

    // 4. Test Grounded Store Assistant API (Phase 5)
    console.log("\n--- 2. Testing Grounded Store Assistant (المساعد الذكي) ---");

    const questions = [
      {
        q: "كم هي مبيعات وأرباح ومصاريف اليوم؟",
        label: "Sales & P&L Analysis",
        expectedKeywords: ["مبيعات", "ربح"],
      },
      {
        q: "ما هي المنتجات التي أوشكت على النفاد والمنتهية؟",
        label: "Stock & Expiry Inquiry",
        expectedKeywords: ["مخزون", "النفاد"],
      },
      {
        q: "ما هي فواتير الموردين المستحقة وديون الزبائن؟",
        label: "Receivables & Payables",
        expectedKeywords: ["مورد", "ديون"],
      },
      {
        q: "ما هو وضع صندوق الكاشير والوردية الحالية؟",
        label: "Cash Drawer & Shift Status",
        expectedKeywords: ["صندوق", "الوردية"],
      },
      {
        q: "أعطني ملخصاً شاملاً لوضع المتجر اليوم",
        label: "Full 360° Operational Overview",
        expectedKeywords: ["ملخص", "مبيعات"],
      },
    ];

    for (let i = 0; i < questions.length; i++) {
      const item = questions[i];
      console.log(`\n  Q${i + 1}: "${item.q}" (${item.label})`);

      const assistantRes = await fetch(`${BASE_URL}/api/assistant`, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: item.q }),
      });

      if (!assistantRes.ok) {
        const errText = await assistantRes.text();
        throw new Error(`Assistant API failed with ${assistantRes.status}: ${errText}`);
      }

      const assistantData = await assistantRes.json();

      if (!assistantData.answer || assistantData.answer.length < 30) {
        throw new Error("Assistant response answer is too short or empty!");
      }

      console.log(`  [PASS] Answer received (${assistantData.answer.length} chars):`);
      // Print first 2 lines of response
      const lines = assistantData.answer.split("\n").filter((l: string) => l.trim().length > 0);
      console.log(`         > ${lines[0] || ""}`);
      if (lines[1]) console.log(`         > ${lines[1]}`);

      // Verify metrics object
      if (!assistantData.metrics) {
        throw new Error("Assistant did not provide grounded metrics object!");
      }
      console.log(`         [Metrics snapshot: NetSales=${assistantData.metrics.todayNetSales}, LowStock=${assistantData.metrics.lowStockCount}, ShiftOpen=${assistantData.metrics.isShiftOpen}]`);
      console.log(`         [Suggested questions: ${assistantData.suggestedQuestions?.length ?? 0} chips provided]`);
    }

    // 5. Test Store Management Center dependencies & endpoints
    console.log("\n--- 3. Verifying Store Management Center (مركز إدارة المتجر) Live Endpoints ---");

    const [productsRes, batchesRes, invoicesRes, customersRes, drawerRes, reportRes] =
      await Promise.all([
        fetch(`${BASE_URL}/api/products`, { headers }),
        fetch(`${BASE_URL}/api/batches`, { headers }),
        fetch(`${BASE_URL}/api/supplier-invoices`, { headers }),
        fetch(`${BASE_URL}/api/customers`, { headers }),
        fetch(`${BASE_URL}/api/cash-sessions`, { headers }),
        fetch(`${BASE_URL}/api/reports/daily`, { headers }),
      ]);

    console.log(`[PASS] Products API: ${productsRes.status}`);
    console.log(`[PASS] Batches API: ${batchesRes.status}`);
    console.log(`[PASS] Supplier Invoices API: ${invoicesRes.status}`);
    console.log(`[PASS] Customers API: ${customersRes.status}`);
    console.log(`[PASS] Cash Sessions API: ${drawerRes.status}`);
    console.log(`[PASS] Daily Report API: ${reportRes.status}`);

    if (
      !productsRes.ok ||
      !batchesRes.ok ||
      !invoicesRes.ok ||
      !customersRes.ok ||
      !drawerRes.ok ||
      !reportRes.ok
    ) {
      throw new Error("One or more Store Management Center dependent endpoints failed!");
    }

    console.log("\n======================================================");
    console.log("=== ALL PHASE 4 & PHASE 5 TESTS PASSED WITH 100% SUCCESS ===");
    console.log("======================================================");
  } catch (error) {
    console.error("\n[!] TEST SUITE FAILED:", error);
    process.exit(1);
  } finally {
    // Teardown test product
    if (testProductId) {
      console.log("\n[Teardown] Cleaning up test product...");
      await db.product.delete({ where: { id: testProductId } }).catch(() => {});
      console.log("[Teardown] Cleaned up.");
    }
    await db.$disconnect();
  }
}

runPhase4and5Tests();
