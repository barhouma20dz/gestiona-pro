// Reset the production database: wipe all rows and seed a fresh SUPER_ADMIN.
//
// ⚠️ DESTRUCTIVE — this truncates every table. Double protection:
//   1. Credentials come ONLY from the environment (never hardcoded):
//        DATABASE_URL='postgresql://...' node scripts/db-reset.js
//   2. The --yes flag must be passed explicitly:
//        node scripts/db-reset.js --yes
//
// The SUPER_ADMIN credentials are read from env (explicit, no defaults):
//        SEED_ADMIN_EMAIL='...' SEED_ADMIN_PASSWORD='...'

const { Client } = require("pg");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const url = process.env.DATABASE_URL;
const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;

if (!url || !/^(postgres|postgresql):\/\//.test(url)) {
  console.error("ERROR: set DATABASE_URL (postgres:// connection string) first.");
  process.exit(1);
}
if (!email || !password) {
  console.error("ERROR: set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD explicitly (no defaults).");
  process.exit(1);
}
if (!process.argv.includes("--yes")) {
  console.error("REFUSING to run: this wipes ALL data. Re-run with --yes to confirm.");
  process.exit(1);
}

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // 1. Wipe all rows
  const t = await c.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_type='BASE TABLE'`
  );
  const tables = t.rows.map((r) => `"${r.table_name}"`).join(", ");
  console.log("Truncating tables:", tables);
  await c.query(`TRUNCATE TABLE ${tables} CASCADE`);
  console.log("OK — all tables truncated");

  // 2. Seed super admin
  const hash = await bcrypt.hash(password, 10);
  const id = "usr_" + crypto.randomBytes(10).toString("hex");
  await c.query(
    `INSERT INTO "User" ("id","email","password","name","role","storeId","createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5,NULL,NOW(),NOW())`,
    [id, email, hash, "مدير التطبيق", "SUPER_ADMIN"]
  );
  console.log(`OK — super admin seeded: ${email} (id=${id})`);

  await c.end();
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
