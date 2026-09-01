// License key utilities — server-side only
// Generates HMAC-signed license keys for Gestiona Pro subscriptions.
import crypto from "node:crypto";

const JWT_SECRET =
  process.env.JWT_SECRET || "swiftbill-dev-secret-change-in-production";

// Subscription plan definitions (price in INR + duration in days)
export const LICENSE_PLANS = {
  MONTHLY: { price: 499, durationDays: 30, label: "Monthly" },
  QUARTERLY: { price: 1299, durationDays: 90, label: "Quarterly" },
  YEARLY: { price: 4999, durationDays: 365, label: "Yearly" },
} as const;

export type LicensePlan = keyof typeof LICENSE_PLANS;

export const LICENSE_PLANS_LIST = Object.keys(LICENSE_PLANS) as LicensePlan[];

export function isLicensePlan(plan: string): plan is LicensePlan {
  return plan in LICENSE_PLANS;
}

// Alphabet excludes ambiguous chars (0/O, 1/I) for legibility
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomBlock(len = 4): string {
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/**
 * Compute the HMAC-SHA256 signature for a license key string.
 * Used both at generation time (to persist) and at validation time (to verify).
 */
function signKey(key: string): string {
  return crypto.createHmac("sha256", JWT_SECRET).update(key).digest("hex");
}

export interface GeneratedLicense {
  key: string;
  signature: string;
  plan: LicensePlan;
  durationDays: number;
}

/**
 * Generate a new license key in the form `SB-XXXX-XXXX-XXXX`
 * plus an HMAC-SHA256 signature that the server can verify later.
 */
export function generateLicenseKey(
  plan: LicensePlan,
  durationDays?: number
): GeneratedLicense {
  if (!isLicensePlan(plan)) {
    throw new Error(`Unknown plan: ${plan}`);
  }
  const duration =
    durationDays ?? LICENSE_PLANS[plan].durationDays;

  const key = `SB-${randomBlock(4)}-${randomBlock(4)}-${randomBlock(4)}`;
  const signature = signKey(key);

  return { key, signature, plan, durationDays: duration };
}

/**
 * Verify that the supplied signature matches the supplied key
 * using a constant-time comparison (timing-safe).
 * Returns true if the signature is valid.
 */
export function validateLicenseKey(
  key: string,
  signature: string
): boolean {
  if (!key || !signature) return false;
  const expected = signKey(key);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
