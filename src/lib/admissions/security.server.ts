import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Crockford-style alphabet without look-alikes (no 0/O, 1/I/L) so references are easy to read out.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function randomChars(n: number): string {
  const bytes = randomBytes(n * 2);
  let out = "";
  for (let i = 0; out.length < n && i < bytes.length; i++) {
    const b = bytes[i];
    if (b < 248) out += ALPHABET[b % ALPHABET.length]; // 248 = 8 * 31, no modulo bias
  }
  return out.length === n ? out : randomChars(n);
}

/** Application reference, e.g. BA-7KQ4-M9XP (31^8, about 8.5e11 combinations). */
export function newReference() {
  return `BA-${randomChars(4)}-${randomChars(4)}`;
}

/** Unique reference for one checkout attempt. */
export function newPaymentReference(applicationReference: string) {
  return `${applicationReference}-${randomChars(6)}`;
}

export type Audience = "parent" | "school";

/**
 * 256-bit access token for one application and one audience, derived with HMAC-SHA256 from
 * ADMISSIONS_LINK_SECRET. Nothing is stored; rotating the secret revokes every link.
 */
export function accessToken(secret: string, audience: Audience, reference: string, applicationId: string) {
  return createHmac("sha256", secret).update(`${audience}:${reference}:${applicationId}`).digest("base64url");
}

/** Constant-time check of a presented token. */
export function tokenMatches(
  secret: string,
  audience: Audience,
  reference: string,
  applicationId: string,
  presented: string | undefined | null,
) {
  if (!presented || presented.length > 100 || !secret) return false;
  return safeEqual(presented, accessToken(secret, audience, reference, applicationId));
}

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Best-effort client IP behind Vercel's proxy. Hashed before it is stored anywhere. */
export function clientIp(headers: Headers) {
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || headers.get("x-real-ip") || "unknown";
}

export function ipBucket(action: string, headers: Headers) {
  return `${action}:${createHash("sha256").update(clientIp(headers)).digest("hex").slice(0, 32)}`;
}

/** Checks the first bytes of a file so a renamed file cannot pass as a photo or PDF. */
export function sniffFileType(bytes: Uint8Array): "image/jpeg" | "image/png" | "application/pdf" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-") return "application/pdf";
  return null;
}
