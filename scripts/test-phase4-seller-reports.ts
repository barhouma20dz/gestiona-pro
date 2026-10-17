import { db } from "../src/lib/db";
import { signToken } from "../src/lib/auth";

async function main() {
  console.log("=== VERIFYING PHASE 4: SELLER SALES PERFORMANCE REPORTS ===");

  // 1. Fetch store owner
  const owner = await db.user.findFirst({ where: { role: "OWNER" }, include: { store: true } });
  if (!owner || !owner.storeId) {
    throw new Error("No store owner found");
  }
  console.log(`[+] Using Store: ${owner.store?.name} (${owner.storeId})`);

  const ownerToken = await signToken({
    userId: owner.id,
    email: owner.email,
    role: owner.role,
    storeId: owner.storeId,
  });

  // 2. Query reports for today
  console.log("[+] Fetching report for period=today...");
  const todayRes = await fetch("http://localhost:3001/api/reports/sellers?period=today", {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  if (!todayRes.ok) {
    throw new Error(`Failed GET /api/reports/sellers?period=today (${todayRes.status})`);
  }
  const todayData = await todayRes.json();
  if (!todayData.summary || !Array.isArray(todayData.sellers)) {
    throw new Error("Invalid structure for todayData");
  }
  console.log(`[PASS] Today's report returned. Sellers count=${todayData.sellers.length}, Total sales=${todayData.summary.totalSalesCount}`);

  // 3. Query reports for week and month
  console.log("[+] Fetching report for period=week and period=month...");
  const weekRes = await fetch("http://localhost:3001/api/reports/sellers?period=week", {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const weekData = await weekRes.json();
  if (!weekData.summary || weekData.period !== "week") {
    throw new Error("Invalid weekData response");
  }

  const monthRes = await fetch("http://localhost:3001/api/reports/sellers?period=month", {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const monthData = await monthRes.json();
  if (!monthData.summary || monthData.period !== "month") {
    throw new Error("Invalid monthData response");
  }
  console.log(`[PASS] Week & Month reports returned successfully.`);

  // 4. Query custom date range
  console.log("[+] Fetching report for custom date range (2026-01-01 to 2026-12-31)...");
  const customRes = await fetch("http://localhost:3001/api/reports/sellers?period=custom&startDate=2026-01-01&endDate=2026-12-31", {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const customData = await customRes.json();
  if (customData.period !== "custom" || typeof customData.summary.totalNetRevenue !== "number") {
    throw new Error("Invalid customData response");
  }
  console.log(
    `[PASS] Custom report verified. Total Net Revenue=${customData.summary.totalNetRevenue}, Profit=${customData.summary.totalProfit}`
  );

  // 5. Verify seller item fields
  if (customData.sellers.length > 0) {
    const s = customData.sellers[0];
    if (
      typeof s.sellerId !== "string" ||
      typeof s.salesCount !== "number" ||
      typeof s.totalGrossSales !== "number" ||
      typeof s.netSales !== "number" ||
      typeof s.averageTicket !== "number" ||
      typeof s.grossProfit !== "number" ||
      typeof s.profitMarginPercent !== "number"
    ) {
      throw new Error(`Seller performance item missing required fields: ${JSON.stringify(s)}`);
    }
    console.log(`[PASS] Seller performance item schema verified on top seller "${s.sellerName}" (Net: ${s.netSales}, Margin: ${s.profitMarginPercent}%)`);
  }

  console.log("\n=== ALL PHASE 4 TESTS PASSED PERFECTLY (100%) ===");
}

main().catch((e) => {
  console.error("TEST FAILED:", e);
  process.exit(1);
});
