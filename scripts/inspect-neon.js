// Inspect what data currently exists in the Neon production DB (read-only)
const { Client } = require("pg");

const url =
  "postgresql://neondb_owner:npg_lqZ37XOTAKbt@ep-broad-poetry-b13vghx7-pooler.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=require";

(async () => {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const tables = await c.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1`
  );
  console.log("TABLES:", tables.rows.map((r) => r.table_name).join(", "));

  const storeCols = await c.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='Store' ORDER BY ordinal_position`
  );
  console.log("\nStore columns:", storeCols.rows.map((r) => r.column_name).join(", "));

  try {
    const stores = await c.query(`SELECT id, name, "businessType", "createdAt" FROM "Store" ORDER BY "createdAt"`);
    console.log("\nSTORES (" + stores.rows.length + "):");
    stores.rows.forEach((s) => console.log(" -", s.id, "|", s.name, "|", s.businessType, "|", s.createdAt));

    const users = await c.query(`SELECT email, name, role, "storeId", "createdAt" FROM "User" ORDER BY "createdAt"`);
    console.log("\nUSERS (" + users.rows.length + "):");
    users.rows.forEach((u) => console.log(" -", u.email, "|", u.role, "|", u.storeId, "|", u.createdAt));

    const subs = await c.query(`SELECT "storeId", status, plan, "endDate" FROM "Subscription"`);
    console.log("\nSUBSCRIPTIONS (" + subs.rows.length + "):");
    subs.rows.forEach((s) => console.log(" -", s.storeId, "|", s.status, "|", s.plan, "|", s.endDate));

    for (const t of ["Product", "Sale", "Customer", "Supplier", "LicenseKey"]) {
      try {
        const r = await c.query(`SELECT count(*)::int AS n FROM "${t}"`);
        console.log(`${t}: ${r.rows[0].n}`);
      } catch (e) {
        console.log(`${t}: (no table)`);
      }
    }
  } catch (e) {
    console.log("Data read error:", e.message);
  }

  await c.end();
})().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
