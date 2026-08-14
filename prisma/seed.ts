import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// SwiftBill POS — primary seed script.
//
// In the multi-tenant model, the Store + User + Subscription are created
// at runtime via `/api/auth/register`. The default shop and sample products
// seeded by an older version of this file are no longer appropriate (they
// were not tied to any tenant).
//
// This script simply ensures the SUPER_ADMIN account exists so the admin
// dashboard can be accessed. For the dedicated admin-only seeding entrypoint
// see `prisma/seed-superadmin.ts`.
//
// Run via `bun prisma/seed.ts` (alias: `bun run db:seed`).

const ADMIN_EMAIL = "admin@swiftbill.pos";
const ADMIN_PASSWORD = "admin123";

async function ensureSuperAdmin() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const existing = await db.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existing) {
    await db.user.update({
      where: { id: existing.id },
      data: {
        password: passwordHash,
        role: "SUPER_ADMIN",
        storeId: null,
        name: existing.name ?? "Super Admin",
      },
    });
    console.log(
      `✓ Super admin already existed — updated (id=${existing.id}, email=${existing.email}).`
    );
    return;
  }

  const admin = await db.user.create({
    data: {
      email: ADMIN_EMAIL,
      password: passwordHash,
      name: "Super Admin",
      role: "SUPER_ADMIN",
      storeId: null,
    },
  });
  console.log(
    `✓ Created super admin (id=${admin.id}, email=${admin.email}, role=${admin.role}).`
  );
  console.log("   Login with:");
  console.log(`     email:    ${ADMIN_EMAIL}`);
  console.log(`     password: ${ADMIN_PASSWORD}`);
}

async function main() {
  console.log("Seeding SwiftBill POS (multi-tenant)...");
  console.log(
    "Note: stores, users, products and sales are created per-tenant at registration time."
  );
  await ensureSuperAdmin();
  console.log("Seeding complete.");
}

main()
  .then(() => {
    console.log("Done. Disconnecting...");
    return db.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await db.$disconnect();
    process.exit(1);
  });
