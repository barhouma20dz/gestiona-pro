import { db } from "../src/lib/db";
import { signToken } from "../src/lib/auth";

async function main() {
  console.log("=== VERIFYING PHASE 2: USERS & GRANULAR PERMISSIONS & AUDIT LOG ===");

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

  // 2. Create Seller with Username and Custom Permissions via POST /api/sellers
  const testUsername = `seller_${Date.now()}`;
  const testPassword = "Password123!";
  const testPermissions = ["sales.view", "sales.create", "sales.view_own", "products.view"];

  console.log(`[+] Creating seller via POST /api/sellers with username: @${testUsername}...`);
  const createRes = await fetch("http://localhost:3001/api/sellers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      username: testUsername,
      name: "بائع تجريبي للمرحلة 2",
      password: testPassword,
      isActive: true,
      permissions: testPermissions,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Failed to create seller! Status: ${createRes.status}, Error: ${err}`);
  }
  const createdSeller = await createRes.json();
  console.log(`[PASS] Seller created successfully! ID=${createdSeller.id}, Username=${createdSeller.username}`);

  // 3. Test Login with Username & Password via POST /api/auth/login
  console.log(`[+] Testing login with username: "${testUsername}"...`);
  const loginRes = await fetch("http://localhost:3001/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: testUsername,
      password: testPassword,
    }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed! Status: ${loginRes.status}`);
  }
  const loginData = await loginRes.json();
  console.log(`[PASS] Login successful! User: ${loginData.user.name}, Role: ${loginData.user.role}`);
  console.log(`[+] User permissions received on login:`, loginData.user.permissions);
  if (!Array.isArray(loginData.user.permissions) || loginData.user.permissions.length !== testPermissions.length) {
    throw new Error(`Permissions mismatch! Expected ${testPermissions.length}, got ${loginData.user.permissions?.length}`);
  }

  // 4. Test Updating Seller (Disable Account) via PUT /api/sellers/:id
  console.log(`[+] Disabling seller account (isActive: false)...`);
  const putRes = await fetch(`http://localhost:3001/api/sellers/${createdSeller.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      isActive: false,
    }),
  });

  if (!putRes.ok) {
    throw new Error(`Failed to update seller! Status: ${putRes.status}`);
  }
  const updatedSeller = await putRes.json();
  if (updatedSeller.isActive !== false) {
    throw new Error(`isActive was not set to false!`);
  }
  console.log(`[PASS] Seller isActive successfully updated to: ${updatedSeller.isActive}`);

  // 5. Verify Disabled Account CANNOT Login (Expect 403)
  console.log(`[+] Verifying disabled account cannot login...`);
  const disabledLoginRes = await fetch("http://localhost:3001/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: testUsername,
      password: testPassword,
    }),
  });

  if (disabledLoginRes.status === 403) {
    console.log(`[PASS] Disabled user login rejected with 403 Forbidden as expected!`);
  } else {
    throw new Error(`Disabled login expected 403, got ${disabledLoginRes.status}`);
  }

  // 6. Test GET /api/audit-logs
  console.log(`[+] Fetching audit logs from /api/audit-logs...`);
  const auditRes = await fetch("http://localhost:3001/api/audit-logs?limit=5", {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });

  if (!auditRes.ok) {
    throw new Error(`Failed to fetch audit logs! Status: ${auditRes.status}`);
  }
  const auditLogs = await auditRes.json();
  console.log(`[PASS] Fetched ${auditLogs.length} audit logs. Latest actions:`);
  auditLogs.slice(0, 3).forEach((log: any) => {
    console.log(`  - [${log.action}] ${log.details}`);
  });

  // Verify that USER_CREATE and USER_UPDATE exist in audit logs
  const hasUserCreate = auditLogs.some((l: any) => l.action === "USER_CREATE");
  const hasUserUpdate = auditLogs.some((l: any) => l.action === "USER_UPDATE");
  if (!hasUserCreate || !hasUserUpdate) {
    throw new Error(`Missing expected audit log entries!`);
  }
  console.log(`[PASS] Both USER_CREATE and USER_UPDATE recorded in audit trail.`);

  // 7. Cleanup test user
  console.log(`[+] Cleaning up test seller ${createdSeller.id}...`);
  await db.user.delete({ where: { id: createdSeller.id } });
  console.log(`[PASS] Test seller cleaned up.`);

  console.log("\n=== ALL PHASE 2 REQUIREMENTS VERIFIED SUCCESSFULLY ===");
  await db.$disconnect();
}

main().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
