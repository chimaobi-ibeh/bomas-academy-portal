import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import type { AdmissionsConfig } from "@/lib/admissions/config.server";
import type { Mailer, OutgoingEmail } from "@/lib/admissions/email.server";
import type { PaymentProvider, VerifyResult } from "@/lib/admissions/payments/types";
import type { Deps } from "@/lib/admissions/service.server";
import {
  DuplicateKeyError,
  StoreUnavailableError,
  type AdmissionsStore,
  type ApplicationRow,
  type AttemptRow,
  type DocumentStorage,
} from "@/lib/admissions/store";

/**
 * Test doubles. The database is a real Postgres (PGlite) running the real migration, so the
 * locking and idempotency of finalize_admission_payment are exercised for real.
 */

const MIGRATION = readFileSync(
  join(__dirname, "../../supabase/migrations/20261118120000_admissions.sql"),
  "utf8",
);

export async function createDb() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets (id text primary key, name text, public boolean,
      file_size_limit bigint, allowed_mime_types text[]);
    CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
  `);
  await db.exec(MIGRATION);
  return db;
}

const JSON_COLS = new Set(["form_data"]);

function toIso<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = v instanceof Date ? v.toISOString() : typeof v === "bigint" ? Number(v) : v;
  }
  return out as T;
}

export function createPgStore(db: PGlite, opts: { down?: () => boolean } = {}): AdmissionsStore {
  async function q<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (opts.down?.()) throw new StoreUnavailableError("database paused");
    try {
      const r = await db.query<T>(sql, params);
      return r.rows.map((x) => toIso(x as Record<string, unknown>) as T);
    } catch (e) {
      if ((e as { code?: string }).code === "23505") throw new DuplicateKeyError("duplicate");
      throw e;
    }
  }
  const set = (patch: Record<string, unknown>, start = 2) => {
    const keys = Object.keys(patch);
    return {
      sql: keys.map((k, i) => `${k} = $${i + start}`).join(", "),
      values: keys.map((k) => (JSON_COLS.has(k) ? JSON.stringify(patch[k]) : patch[k])),
    };
  };

  return {
    async insertApplication(row) {
      const keys = Object.keys(row);
      const vals = keys.map((k) => (JSON_COLS.has(k) ? JSON.stringify((row as never)[k]) : (row as never)[k]));
      const [r] = await q<ApplicationRow>(
        `INSERT INTO admission_applications (${keys.join(",")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(",")}) RETURNING *`,
        vals,
      );
      return r;
    },
    async getApplicationByReference(reference) {
      return (await q<ApplicationRow>(`SELECT * FROM admission_applications WHERE reference = $1`, [reference]))[0] ?? null;
    },
    async getApplicationById(id) {
      return (await q<ApplicationRow>(`SELECT * FROM admission_applications WHERE id = $1`, [id]))[0] ?? null;
    },
    async updateApplication(id, patch) {
      const s = set(patch as Record<string, unknown>);
      await q(`UPDATE admission_applications SET ${s.sql} WHERE id = $1`, [id, ...s.values]);
    },
    async setApplicationStatusIf(id, from, to) {
      await q(`UPDATE admission_applications SET status = $3 WHERE id = $1 AND status = $2`, [id, from, to]);
    },
    async insertAttempt(row) {
      const keys = Object.keys(row);
      const [r] = await q<AttemptRow>(
        `INSERT INTO admission_payment_attempts (${keys.join(",")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(",")}) RETURNING *`,
        keys.map((k) => (row as never)[k]),
      );
      return r;
    },
    async getAttempt(reference) {
      return (await q<AttemptRow>(`SELECT * FROM admission_payment_attempts WHERE reference = $1`, [reference]))[0] ?? null;
    },
    async listAttempts(applicationId) {
      return q<AttemptRow>(
        `SELECT * FROM admission_payment_attempts WHERE application_id = $1 ORDER BY created_at DESC, id DESC`,
        [applicationId],
      );
    },
    async closeAttempt(reference, status, gatewayResponse) {
      await q(
        `UPDATE admission_payment_attempts SET status = $2, gateway_response = $3 WHERE reference = $1 AND status = 'initialized'`,
        [reference, status, gatewayResponse ?? null],
      );
    },
    async markDuplicateNotified(id) {
      await q(`UPDATE admission_payment_attempts SET duplicate_notified_at = now() WHERE id = $1`, [id]);
    },
    async finalizePayment(a) {
      const [r] = await q<{ application_id: string; newly_submitted: boolean; duplicate_payment: boolean; receipt_number: string }>(
        `SELECT * FROM finalize_admission_payment($1, $2, $3, $4, $5)`,
        [a.attemptReference, a.amountKobo, a.currency, a.paidAt, a.transactionId],
      );
      return {
        applicationId: r.application_id,
        newlySubmitted: r.newly_submitted,
        duplicatePayment: r.duplicate_payment,
        receiptNumber: r.receipt_number,
      };
    },
    async claimEmails(id, lockSeconds, maxAttempts) {
      const [r] = await q<ApplicationRow>(
        `UPDATE admission_applications SET email_locked_until = now() + make_interval(secs => $2)
         WHERE id = $1 AND status = 'SUBMITTED' AND email_attempts < $3
           AND (email_locked_until IS NULL OR email_locked_until < now()) RETURNING *`,
        [id, lockSeconds, maxAttempts],
      );
      if (r && r.school_email_sent_at && r.parent_email_sent_at) return null;
      return r ?? null;
    },
    async rateLimitHit(bucket, limit, windowSeconds) {
      const [r] = await q<{ ok: boolean }>(`SELECT admission_rate_limit_hit($1, $2, $3) AS ok`, [bucket, limit, windowSeconds]);
      return r.ok;
    },
    async listOpenAttempts(olderThan, newerThan, limit) {
      return q<AttemptRow>(
        `SELECT * FROM admission_payment_attempts WHERE status = 'initialized' AND created_at < $1 AND created_at > $2 ORDER BY created_at LIMIT $3`,
        [olderThan.toISOString(), newerThan.toISOString(), limit],
      );
    },
    async listSubmittedNeedingEmail(limit) {
      return q<ApplicationRow>(
        `SELECT * FROM admission_applications WHERE status = 'SUBMITTED' AND (school_email_sent_at IS NULL OR parent_email_sent_at IS NULL) AND email_attempts < 8 LIMIT $1`,
        [limit],
      );
    },
    async listUnnotifiedDuplicates(limit) {
      return q<AttemptRow>(
        `SELECT * FROM admission_payment_attempts WHERE duplicate_payment AND duplicate_notified_at IS NULL LIMIT $1`,
        [limit],
      );
    },
    async listStaleUnpaid(olderThan, limit) {
      return q<ApplicationRow>(
        `SELECT * FROM admission_applications WHERE status IN ('PENDING_PAYMENT','PAYMENT_FAILED') AND created_at < $1 LIMIT $2`,
        [olderThan.toISOString(), limit],
      );
    },
    async deleteApplication(id) {
      await q(`DELETE FROM admission_applications WHERE id = $1 AND status <> 'SUBMITTED'`, [id]);
    },
    async purgeRateLimits(olderThan) {
      await q(`DELETE FROM admission_rate_limits WHERE window_start < $1`, [olderThan.toISOString()]);
    },
  };
}

export function createMemoryStorage() {
  const files = new Map<string, Uint8Array>();
  const storage: DocumentStorage = {
    async createUploadUrl(path) {
      return { path, token: `upload-token-${path}` };
    },
    async download(path) {
      return files.get(path) ?? null;
    },
    async signedDownloadUrl(path, seconds) {
      return `https://storage.example/${path}?expires=${seconds}`;
    },
    async remove(paths) {
      paths.forEach((p) => files.delete(p));
    },
  };
  return { storage, files };
}

/** Scripted payment provider: tests decide what "Paystack" says for each reference. */
export function createFakeProvider() {
  const outcomes = new Map<string, VerifyResult>();
  const initialized: string[] = [];
  const provider: PaymentProvider = {
    name: "paystack",
    async initialize(input) {
      initialized.push(input.reference);
      return { checkoutUrl: `https://checkout.example/${input.reference}` };
    },
    async verify(reference) {
      return outcomes.get(reference) ?? { status: "pending", reference };
    },
    parseWebhook(rawBody, headers) {
      if (headers.get("x-test-signature") !== "valid") return null;
      const e = JSON.parse(rawBody) as { event: string; data: { reference: string } };
      return { type: e.event === "charge.success" ? "charge.success" : "other", reference: e.data.reference };
    },
  };
  const pay = (reference: string, amountKobo: number, currency = "NGN") =>
    outcomes.set(reference, {
      status: "success", reference, amountKobo, currency,
      paidAt: "2026-11-18T10:15:00.000Z", transactionId: `txn-${reference}`,
    });
  const fail = (reference: string) => outcomes.set(reference, { status: "failed", reference, gatewayResponse: "Declined" });
  const abandon = (reference: string) => outcomes.set(reference, { status: "abandoned", reference });
  return { provider, initialized, pay, fail, abandon };
}

export function createFakeMailer() {
  const sent: OutgoingEmail[] = [];
  let failing = false;
  const mailer: Mailer = {
    async send(email) {
      if (failing) throw new Error("Resend responded 500");
      sent.push(email);
    },
  };
  return { mailer, sent, setFailing: (v: boolean) => (failing = v) };
}

export function testConfig(over: Partial<AdmissionsConfig> = {}): AdmissionsConfig {
  return {
    linkSecret: "test-link-secret-test-link-secret-0123",
    feeKobo: 1_000_000,
    currency: "NGN",
    provider: "paystack",
    paystackSecret: "sk_test_x",
    testMode: true,
    paymentsEnabled: true,
    siteUrl: "https://www.bomasacademy.org",
    resendApiKey: "re_test",
    fromEmail: "Bomas Academy <noreply@bomasacademy.org>",
    schoolEmail: "bomasacademy@gmail.com",
    cronSecret: "cron",
    parentLinkDays: 90,
    schoolLinkDays: 365,
    ...over,
  };
}

export async function setup(over: Partial<AdmissionsConfig> = {}) {
  const db = await createDb();
  let down = false;
  const store = createPgStore(db, { down: () => down });
  const { storage, files } = createMemoryStorage();
  const pay = createFakeProvider();
  const mail = createFakeMailer();
  const deps: Deps = { store, storage, provider: pay.provider, mailer: mail.mailer, config: testConfig(over) };
  return { db, deps, store, files, pay, mail, setDown: (v: boolean) => (down = v) };
}

// Minimal valid file bytes
export const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
export const PDF = new TextEncoder().encode("%PDF-1.4\n%test\n");
export const EXE = new Uint8Array([0x4d, 0x5a, 0x90, 0, 3, 0, 0, 0]);

let ipCounter = 0;
/** Each call looks like a new visitor so the rate limits do not interfere with other tests. */
export function freshHeaders() {
  return new Headers({ "x-forwarded-for": `10.0.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}` });
}
