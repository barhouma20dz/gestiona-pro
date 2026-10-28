// Inspect the production database (read-only) — Postgres/Neon
//
// SECURITY: credentials are NEVER hardcoded. Provide the connection string
// via the DATABASE_URL environment variable at invocation time:
//
//   DATABASE_URL='postgresql://user:pass@host/db?sslmode=require' node scripts/db-inspect.js
//
// You can find the current production DATABASE_URL in the Vercel dashboard
// (Project → Settings → Environment Variables) or ask the maintainer.

const { Client } = require("pg");

const url = process.env.DATABASE_URL;

if (!url || !/^(postgres|postgresql):\/\//.test(url)) {
  console.error(
    "ERROR: set DATABASE_URL to a postgres:// connection string before running.\n" +
      "Example: DATABASE_URL='postgresql://...' node scripts/db-inspect.js"
  );
  process.exit(1);
}

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
    const stores = await c.query(
      `SELECT id, name, "businessType", "createdAt" FROM "Store" ORDER BY "createdAt"`
    );
    console.log("\nSTORES (" + stores.rows.length + "):");
    stores.rows.forEach((s) =>
      console.log(" -", s.id, "|", s.name, "|", s.businessType, "|", s.createdAt)
    );

    const users = await c.query(
      `SELECT email, name, role, "storeId", "createdAt" FROM "User" ORDER BY "createdAt"`
    );
    console.log("\nUSERS (" + users.rows.length + "):");
    users.rows.forEach((u) =>
      console.log(" -", u.email, "|", u.role, "|", u.storeId, "|", u.createdAt)
    );

    const subs = await c.query(`SELECT "storeId", status, plan, "endDate" FROM "Subscription"`);
    console.log("\nSUBSCRIPTIONS (" + subs.rows.length + "):");
    subs.rows.forEach((s) =>
      console.log(" -", s.storeId, "|", s.status, "|", s.plan, "|", s.endDate)
    );
  } catch (e) {
    console.log("\n(detail queries skipped:", e.message.split("\n")[0] + ")");
  }

  await c.end();
  console.log("\nDone (read-only — nothing was modified).");
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
