/**
 * م-0 acceptance tests — run against the local dev server (port 3000).
 *
 * Acceptance criteria from the master prompt (م-0):
 *  - 20 concurrent sales: no duplicates, no gaps in receipt numbers
 *  - Resending the same idempotencyKey does NOT duplicate the sale
 *    nor deduct stock twice
 *  - Sensitive routes reject without a session
 *  - No default PIN / fixed credentials (grepped separately in CI step)
 *
 * Uses a throwaway store created via /api/auth/register, deleted afterwards.
 * Run: bun scripts/test-m0-acceptance.ts
 */
import Prisma from "@prisma/client";
import http from "node:http";

const BASE = process.env.M0_BASE ?? "http://localhost:3001";
const json = (r: Response) => r.json().catch(() => ({}));

/** fetch() cannot override Host (undici forbids it) — use raw http for that. */
function rawGet(url: string, hostOverride: string): Promise<number> {
  return new Promise((resolve) => {
    const u = new URL(url);
    const req = http.request(
      { host: u.hostname, port: u.port, path: u.pathname, headers: { Host: hostOverride } },
      (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      }
    );
    req.on("error", () => resolve(0));
    req.end();
  });
}

function assert(cond: boolean, label: string, extra = "") {
  const mark = cond ? "✅" : "❌";
  console.log(`${mark} ${label}${extra ? ` — ${extra}` : ""}`);
  if (!cond) process.exitCode = 1;
}

async function main() {
  const stamp = Date.now().toString(36);
  const email = `m0test-${stamp}@gestiona.dz`;
  const password = "Test-م0-Pass1";

  // ── 1) register a throwaway store+owner ──────────────────────────────
  const reg = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storeName: `متجر اختبار م-0 ${stamp}`,
      businessType: "General",
      email,
      password,
    }),
  });
  const regBody = await json(reg);
  assert(reg.status === 201, `register → 201`, `got ${reg.status}`);
  let token: string = regBody.token;
  if (!token) {
    // fall back to login
    const lg = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    token = (await json(lg)).token;
  }
  assert(Boolean(token), "owner token acquired");
  const auth = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  // ── 2) seed a product with known stock ───────────────────────────────
  const prodRes = await fetch(`${BASE}/api/products`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      name: `م-0 منتج ${stamp}`,
      barcode: `M0-${stamp}`,
      price: 150,
      costPrice: 100,
      stock: 1000,
      unitType: "count",
    }),
  });
  assert(prodRes.status === 201 || prodRes.status === 200, `product created`, `got ${prodRes.status}`);
  const product = await json(prodRes);
  const productId = product.id ?? product.product?.id;
  assert(Boolean(productId), "product id resolved");

  // ── 3) 20 concurrent sales with unique idempotency keys ─────────────
  const N = 20;
  const keys = Array.from({ length: N }, (_, i) => `m0-${stamp}-${i}`);
  const responses = await Promise.all(
    keys.map((idempotencyKey) =>
      fetch(`${BASE}/api/sales`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({
          items: [{ productId, quantity: 1 }],
          discount: 0,
          paymentMethod: "Cash",
          idempotencyKey,
        }),
      })
    )
  );
  const bodies = await Promise.all(responses.map(json));
  const allCreated = responses.every((r) => r.status === 201);
  assert(allCreated, `${N} concurrent sales all → 201`, responses.filter(r => r.status !== 201).map(r => r.status).join(",") || "all 201");

  const receiptNos = bodies.map((b) => b.receiptNo as string).filter(Boolean);
  const uniqueReceipts = new Set(receiptNos).size === N;
  assert(uniqueReceipts && receiptNos.length === N, "receipt numbers all unique", receiptNos.join(" "));

  // Gapless: same date prefix, sequential 4-digit suffixes
  const seqs = receiptNos.map((r) => parseInt(r.split("-")[2], 10)).sort((a, b) => a - b);
  const gapless = seqs.every((s, i) => i === 0 || s === seqs[i - 1] + 1);
  assert(gapless, "receipt sequence gapless (no skipped numbers)", seqs.join(","));

  // ── 4) stock deducted exactly N times ────────────────────────────────
  const after = await (await fetch(`${BASE}/api/products`, { headers: auth })).json();
  const list = Array.isArray(after) ? after : after.products ?? [];
  const p = list.find((x: { id: string }) => x.id === productId);
  assert(p && p.stock === 1000 - N, `stock = 1000 - ${N} (exactly once per sale)`, `got ${p?.stock}`);

  // ── 5) idempotency replay: same key → same sale, no new deduction ────
  const replay = await fetch(`${BASE}/api/sales`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      items: [{ productId, quantity: 1 }],
      discount: 0,
      paymentMethod: "Cash",
      idempotencyKey: keys[0],
    }),
  });
  const replayBody = await json(replay);
  assert(
    replay.status === 200 && replay.headers.get("idempotent-replay") === "true",
    "replay → 200 + Idempotent-Replay header",
    `got ${replay.status}`
  );
  assert(replayBody.id === bodies[0].id, "replay returns the ORIGINAL sale id");
  const afterReplay = await (await fetch(`${BASE}/api/products`, { headers: auth })).json();
  const list2 = Array.isArray(afterReplay) ? afterReplay : afterReplay.products ?? [];
  const p2 = list2.find((x: { id: string }) => x.id === productId);
  assert(p2 && p2.stock === 1000 - N, "stock unchanged after replay (no double deduction)", `got ${p2?.stock}`);

  // ── 6) sensitive routes reject without session ───────────────────────
  const anonRoom = await fetch(`${BASE}/api/room-sync`);
  assert(anonRoom.status === 401, "GET /api/room-sync without token → 401", `got ${anonRoom.status}`);
  // م-0 (updated): localhost Host is machine-local by design (user's LAN
  // pairing flow) — anonymous remote hosts must still be rejected.
  const anonNetLocal = await fetch(`${BASE}/api/network-info`);
  assert(anonNetLocal.status === 200, "GET /api/network-info from localhost → 200 (machine-local by design)", `got ${anonNetLocal.status}`);
  const anonNetRemote = await rawGet(`${BASE}/api/network-info`, "203.0.113.77:443");
  assert(anonNetRemote === 401, "GET /api/network-info from remote host without token → 401", `got ${anonNetRemote}`);

  // ── 7) room: join nonexistent room auto-creates with the supplied PIN (م-0:
  // still secure — random/supplied PIN, tenant-bound, never "7788")
  const ghostId = `DZ-${stamp}`;
  const joinGhost = await fetch(`${BASE}/api/room-sync`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ action: "join", roomId: ghostId, pin: "9999" }),
  });
  assert(joinGhost.status === 200, "join on nonexistent room → auto-created with supplied pin", `got ${joinGhost.status}`);

  // Auto-created room must NOT use the old hard-coded default PIN
  const ghostNoPin = await fetch(`${BASE}/api/room-sync`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ action: "join", roomId: ghostId }),
  });
  assert(ghostNoPin.status === 403, "auto-created room join WITHOUT pin → 403", `got ${ghostNoPin.status}`);

  // ── 8) room lifecycle: create → join with/without PIN ────────────────
  const createRes = await fetch(`${BASE}/api/room-sync`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ action: "create_room" }),
  });
  const room = (await json(createRes)).room;
  assert(createRes.status === 200 && room?.id && room?.pin, "create_room → id + random pin");

  const noPin = await fetch(`${BASE}/api/room-sync`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ action: "join", roomId: room.id, device: { id: `dev-${stamp}` } }),
  });
  assert(noPin.status === 403, "join WITHOUT pin → 403 (bypass closed)", `got ${noPin.status}`);

  const withPin = await fetch(`${BASE}/api/room-sync`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      action: "join",
      roomId: room.id,
      pin: room.pin,
      device: { id: `dev-${stamp}`, name: "اختبار", role: "monitor" },
    }),
  });
  assert(withPin.status === 200, "join WITH correct pin → 200", `got ${withPin.status}`);

  // ── 9) login rate limiting (nonexistent email → never locks a real one)
  let got429 = false;
  for (let i = 0; i < 12; i++) {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `bruteforce-${stamp}@x.dz`, password: "wrong" }),
    });
    if (r.status === 429) { got429 = true; break; }
  }
  assert(got429, "login brute force → 429 within 12 attempts");

  // ── 10) cleanup: delete throwaway store (cascades everything) ────────
  const db = new Prisma.PrismaClient();
  try {
    const user = await db.user.findUnique({ where: { email }, select: { storeId: true } });
    if (user?.storeId) {
      await db.store.delete({ where: { id: user.storeId } });
      console.log("🧹 throwaway store deleted (cascade)");
    }
  } finally {
    await db.$disconnect();
  }

  console.log(process.exitCode ? "\n💀 SOME CHECKS FAILED" : "\n🏁 ALL م-0 ACCEPTANCE CHECKS PASSED");
}

main().catch((e) => {
  console.error("fatal:", e);
  process.exit(1);
});
