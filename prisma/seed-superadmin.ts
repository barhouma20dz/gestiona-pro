import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// Seed a SUPER_ADMIN account for SwiftBill POS.
// Run via `bun prisma/seed-superadmin.ts`.
//
// م-0: credentials come from the environment — no compiled-in defaults.
//   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... bun prisma/seed-superadmin.ts
//
// Role:     SUPER_ADMIN
// storeId:  null (super admin is not bound to any tenant)

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL?.trim();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD?.trim();

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    "✗ Refusing to seed: set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD explicitly (م-0)."
  );
  process.exit(1);
}

async function main(adminEmail: string, adminPassword: string) {
  console.log("Seeding SwiftBill POS super admin...");

  const existing = await db.user.findUnique({
    where: { email: adminEmail },
  });

  if (existing) {
    // Make sure existing record has the correct role + password
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const updated = await db.user.update({
      where: { id: existing.id },
      data: {
        password: passwordHash,
        role: "SUPER_ADMIN",
        storeId: null,
        name: existing.name ?? "Super Admin",
      },
    });
    console.log(
      `✓ Super admin already existed — updated (id=${updated.id}, email=${updated.email}, role=${updated.role}).`
    );
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await db.user.create({
    data: {
      email: adminEmail,
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
  console.log(`     email:    ${adminEmail}`);
  console.log(`     password: ${adminPassword}`);
}

main(ADMIN_EMAIL, ADMIN_PASSWORD)
  .then(async () => {
    console.log("Done. Disconnecting...");
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error("Super admin seed failed:", e);
    await db.$disconnect();
    process.exit(1);
  });
