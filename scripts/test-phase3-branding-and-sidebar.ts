import { db } from "../src/lib/db";
import { signToken } from "../src/lib/auth";

async function main() {
  console.log("=== VERIFYING PHASE 3: STORE BRANDING & SIDEBAR CUSTOMIZATION ===");

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

  // 2. Test Store Branding Updates via PUT /api/shop
  console.log("[+] Updating Store Branding (logoUrl, storePhotoUrl, primaryDisplayImage)...");
  const testLogo = "/uploads/branding/test-logo.png";
  const testPhoto = "/uploads/store/test-storefront.jpg";
  const putBrandingRes = await fetch("http://localhost:3001/api/shop", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      logoUrl: testLogo,
      storePhotoUrl: testPhoto,
      primaryDisplayImage: "STORE_PHOTO",
    }),
  });

  if (!putBrandingRes.ok) {
    const err = await putBrandingRes.text();
    throw new Error(`Failed to update branding! Status: ${putBrandingRes.status}, Error: ${err}`);
  }
  const updatedShop = await putBrandingRes.json();
  if (
    updatedShop.logoUrl !== testLogo ||
    updatedShop.storePhotoUrl !== testPhoto ||
    updatedShop.primaryDisplayImage !== "STORE_PHOTO"
  ) {
    throw new Error(
      `Branding mismatch! Got logo=${updatedShop.logoUrl}, photo=${updatedShop.storePhotoUrl}, primary=${updatedShop.primaryDisplayImage}`
    );
  }
  console.log("[PASS] Store branding updated and verified in PUT response.");

  // 3. Verify persistence with GET /api/shop
  console.log("[+] Verifying persistence via GET /api/shop...");
  const getShopRes = await fetch("http://localhost:3001/api/shop", {
    headers: {
      Authorization: `Bearer ${ownerToken}`,
    },
  });
  const shopData = await getShopRes.json();
  if (
    shopData.logoUrl !== testLogo ||
    shopData.storePhotoUrl !== testPhoto ||
    shopData.primaryDisplayImage !== "STORE_PHOTO"
  ) {
    throw new Error(`GET /api/shop mismatch on branding!`);
  }
  console.log("[PASS] Branding persisted and verified via GET /api/shop.");

  // 4. Test Sidebar Customization via PUT /api/shop
  console.log("[+] Updating Sidebar Customization (sidebarConfig)...");
  const customSidebar = [
    { id: "dashboard", visible: true, order: 0 },
    { id: "sales", visible: true, order: 1 },
    { id: "pos", visible: true, order: 2 },
    { id: "products", visible: true, order: 3 },
    { id: "zakat", visible: false, order: 4 },
    { id: "settings", visible: true, order: 5 },
  ];
  const putSidebarRes = await fetch("http://localhost:3001/api/shop", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify({
      sidebarConfig: customSidebar,
    }),
  });

  if (!putSidebarRes.ok) {
    const err = await putSidebarRes.text();
    throw new Error(`Failed to update sidebar! Status: ${putSidebarRes.status}, Error: ${err}`);
  }
  const shopAfterSidebar = await putSidebarRes.json();
  const parsedSidebar = JSON.parse(shopAfterSidebar.sidebarConfig);
  if (!Array.isArray(parsedSidebar) || parsedSidebar.length !== 6 || parsedSidebar[1].id !== "sales") {
    throw new Error(`Sidebar config mismatch! Got: ${shopAfterSidebar.sidebarConfig}`);
  }
  console.log("[PASS] Sidebar configuration updated and persisted.");

  // 5. Verify /api/auth/me returns branding and sidebarConfig
  console.log("[+] Verifying GET /api/auth/me returns branding and sidebarConfig...");
  const meRes = await fetch("http://localhost:3001/api/auth/me", {
    headers: {
      Authorization: `Bearer ${ownerToken}`,
    },
  });
  const meData = await meRes.json();
  if (!meData.store?.storePhotoUrl || !meData.store?.primaryDisplayImage || !meData.store?.sidebarConfig) {
    throw new Error(`GET /api/auth/me missing branding or sidebar data! Got: ${JSON.stringify(meData)}`);
  }
  console.log("[PASS] GET /api/auth/me successfully returned branding and sidebar configuration!");

  console.log("\n=== ALL PHASE 3 TESTS PASSED PERFECTLY (100%) ===");
}

main().catch((e) => {
  console.error("TEST FAILED:", e);
  process.exit(1);
});
