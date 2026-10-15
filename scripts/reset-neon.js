// Reset Neon production DB: wipe junk test registrations, seed fresh SUPER_ADMIN
const { Client } = require("pg");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const url =
  "postgresql://neondb_owner:npg_lqZ37XOTAKbt@ep-broad-poetry-b13vghx7-pooler.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=require";

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // 1. Wipe all rows (junk test stores from the old template-era schema)
  const t = await c.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`
  );
  const tables = t.rows.map((r) => `"${r.table_name}"`).join(", ");
  console.log("Truncating tables:", tables);
  await c.query(`TRUNCATE TABLE ${tables} CASCADE`);
  console.log("OK — all tables truncated");

  // 2. Seed super admin (same credentials as local: admin@swiftbill.pos / admin123)
  const hash = await bcrypt.hash("admin123", 10);
  const id = "usr_" + crypto.randomBytes(10).toString("hex");
  await c.query(
    `INSERT INTO "User" ("id","email","password","name","role","storeId","createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5,NULL,NOW(),NOW())`,
    [id, "admin@swiftbill.pos", hash, "مدير التطبيق", "SUPER_ADMIN"]
  );
  console.log("OK — super admin seeded: admin@swiftbill.pos / admin123 (id=" + id + ")");

  // 3. Quick verification
  const v = await c.query(`SELECT email, role FROM "User"`);
  console.log("Users now:", JSON.stringify(v.rows));
  const s = await c.query(`SELECT count(*)::int AS n FROM "Store"`);
  console.log("Stores now:", s.rows[0].n);

  await c.end();
})().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
