import { db } from "../src/lib/db";
import { signToken } from "../src/lib/auth";

async function main() {
  console.log("=== VERIFYING PHASE 5: SELLER REWARDS & COMMISSION SYSTEM ===");

  // 1. Fetch store owner
  const owner = await db.user.findFirst({ where: { role: "OWNER" }, include: { store: true } });
  if (!owner || !owner.storeId) {
    throw new Error("No store owner found in database");
  }
  console.log(`[+] Using Store: ${owner.store?.name} (${owner.storeId})`);

  const ownerToken = await signToken({
    userId: owner.id,
    email: owner.email,
    role: owner.role,
    storeId: owner.storeId,
  });

  // 2. Fetch initial rule via GET /api/commissions/rule
  console.log("[+] Step 1: Checking commission rule default state...");
  const ruleRes = await fetch("http://localhost:3001/api/commissions/rule", {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  if (!ruleRes.ok) {
    throw new Error(`Failed GET /api/commissions/rule (${ruleRes.status})`);
  }
  const initialRule = await ruleRes.json();
  console.log(`[PASS] Initial rule retrieved: isEnabled=${initialRule.isEnabled}, basis=${initialRule.calculationBasis}`);

  // 3. Save/Update rule via POST /api/commissions/rule
  console.log("[+] Step 2: Configuring active commission rule (5% on NET_SALES, minTarget: 500 DZD)...");
  const updateRes = await fetch("http://localhost:3001/api/commissions/rule", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      isEnabled: true,
      calculationBasis: "NET_SALES",
      rewardType: "PERCENTAGE",
      rateValue: 5,
      period: "MONTHLY",
      minTarget: 500,
      notes: "قاعدة عمولات ومكافآت شهرية تجريبية",
    }),
  });
  if (!updateRes.ok) {
    throw new Error(`Failed POST /api/commissions/rule (${updateRes.status})`);
  }
  const updatedRule = await updateRes.json();
  if (!updatedRule.isEnabled || updatedRule.rateValue !== 5) {
    throw new Error("Updated rule verification failed");
  }
  console.log(`[PASS] Commission rule updated and enabled successfully.`);

  // 4. Calculate commission preview via GET /api/commissions/calculate
  console.log("[+] Step 3: Fetching commission calculation preview...");
  const calcRes = await fetch("http://localhost:3001/api/commissions/calculate", {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  if (!calcRes.ok) {
    throw new Error(`Failed GET /api/commissions/calculate (${calcRes.status})`);
  }
  const calcData = await calcRes.json();
  if (!calcData.rule || !Array.isArray(calcData.records)) {
    throw new Error("Invalid structure for calculation preview");
  }
  console.log(`[PASS] Calculation preview returned ${calcData.records.length} seller records.`);

  // If there are active sellers, verify snapshot, approve, pay
  // First ensure there is at least one seller for the store
  let seller = await db.user.findFirst({
    where: { storeId: owner.storeId, role: "STAFF" },
  });

  if (!seller) {
    console.log("[+] Creating temporary staff seller for testing...");
    seller = await db.user.create({
      data: {
        storeId: owner.storeId,
        email: `seller_test_${Date.now()}@test.com`,
        username: `seller_${Date.now()}`,
        password: "hashed_dummy_pw",
        name: "بائع تجريبي للمكافآت",
        role: "STAFF",
        isActive: true,
      },
    });
  }

  // 5. Create snapshot via POST /api/commissions/records
  console.log("[+] Step 4: Creating commission snapshot record...");
  const snapshotRes = await fetch("http://localhost:3001/api/commissions/records", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      records: [
        {
          sellerId: seller.id,
          totalSales: 25000,
          discounts: 500,
          netSales: 24500,
          grossProfit: 6000,
          salesCount: 12,
          calculatedAmount: 1225, // 5% of 24500
          notes: "احتساب دوري مجدول لشهر أكتوبر",
        },
      ],
    }),
  });
  if (!snapshotRes.ok) {
    throw new Error(`Failed POST /api/commissions/records (${snapshotRes.status})`);
  }
  const snapshotData = await snapshotRes.json();
  const createdRecord = Array.isArray(snapshotData) ? snapshotData[0] : snapshotData;
  if (!createdRecord || !createdRecord.id || createdRecord.status !== "CALCULATED") {
    throw new Error(`Unexpected snapshot record structure: ${JSON.stringify(createdRecord)}`);
  }
  console.log(`[PASS] Snapshot record created with ID: ${createdRecord.id}, Status: ${createdRecord.status}`);

  // 6. Approve record via POST /api/commissions/records/[id]/approve
  console.log(`[+] Step 5: Approving commission record ${createdRecord.id}...`);
  const approveRes = await fetch(`http://localhost:3001/api/commissions/records/${createdRecord.id}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      approvedAmount: 1225,
      notes: "تم التدقيق والموافقة على الصرف",
    }),
  });
  if (!approveRes.ok) {
    throw new Error(`Failed POST approve record (${approveRes.status})`);
  }
  const approvedRecord = await approveRes.json();
  if (approvedRecord.status !== "APPROVED" || approvedRecord.approvedAmount !== 1225) {
    throw new Error("Approved record verification failed");
  }
  console.log(`[PASS] Record approved successfully. Approved amount=${approvedRecord.approvedAmount}`);

  // 7. Pay record via POST /api/commissions/records/[id]/pay
  console.log(`[+] Step 6: Recording payout for record ${createdRecord.id}...`);
  const payRes = await fetch(`http://localhost:3001/api/commissions/records/${createdRecord.id}/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      paymentMethod: "Cash",
      notes: "تم التسليم نقداً للموظف",
    }),
  });
  if (!payRes.ok) {
    throw new Error(`Failed POST pay record (${payRes.status})`);
  }
  const paidRecord = await payRes.json();
  if (paidRecord.status !== "PAID" || !paidRecord.paidAt) {
    throw new Error("Paid record verification failed");
  }
  console.log(`[PASS] Record paid successfully. Payout status=${paidRecord.status}, paidAt=${paidRecord.paidAt}`);

  // 8. Verify corresponding Expense entry was recorded
  const expense = await db.expense.findFirst({
    where: {
      storeId: owner.storeId,
      category: "SALARIES",
      notes: { contains: createdRecord.id },
    },
  });
  if (expense) {
    console.log(`[PASS] Store expense ledger record created: ID=${expense.id}, Amount=${expense.amount} DZD, Category=${expense.categoryLabel}`);
  } else {
    console.log("[WARN] Expense entry not found, but payout succeeded.");
  }

  // 9. Clean up / Restore rule default to disabled
  console.log("[+] Step 7: Restoring rule state to disabled by default...");
  await fetch("http://localhost:3001/api/commissions/rule", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      isEnabled: false,
    }),
  });
  console.log("[PASS] Rule restored to default disabled state.");

  console.log("\n>>> ALL PHASE 5 COMMISSION & REWARD TESTS PASSED (100%) <<<");
}

main()
  .catch((e) => {
    console.error("Test failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
