import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  ADMISSIONS_BUCKET,
  DuplicateKeyError,
  StoreUnavailableError,
  type AdmissionsStore,
  type ApplicationRow,
  type AttemptRow,
  type DocumentStorage,
} from "./store";

type PgError = { code?: string; message?: string } | null;

/** Turns Supabase errors into errors the workflow understands, without leaking details. */
function check(error: PgError, what: string): void {
  if (!error) return;
  if (error.code === "23505") throw new DuplicateKeyError(what);
  const msg = error.message ?? "";
  // fetch failures, 5xx, or a paused project all surface as connection problems
  if (!error.code || /fetch failed|ECONNREFUSED|timeout|paused|503|502|504/i.test(msg)) {
    throw new StoreUnavailableError(`${what}: database unavailable`);
  }
  throw new Error(`${what} failed (${error.code})`);
}

async function guard<T>(what: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof DuplicateKeyError || e instanceof StoreUnavailableError) throw e;
    if (e instanceof TypeError) throw new StoreUnavailableError(`${what}: network error`);
    throw e;
  }
}

export function createSupabaseStore(): AdmissionsStore {
  const db = supabaseAdmin;
  const apps = () => db.from("admission_applications");
  const attempts = () => db.from("admission_payment_attempts");

  return {
    insertApplication: (row) =>
      guard("insert application", async () => {
        const { data, error } = await apps().insert(row).select("*").single();
        check(error, "insert application");
        return data as ApplicationRow;
      }),
    getApplicationByReference: (reference) =>
      guard("load application", async () => {
        const { data, error } = await apps().select("*").eq("reference", reference).maybeSingle();
        check(error, "load application");
        return data;
      }),
    getApplicationById: (id) =>
      guard("load application", async () => {
        const { data, error } = await apps().select("*").eq("id", id).maybeSingle();
        check(error, "load application");
        return data;
      }),
    updateApplication: (id, patch) =>
      guard("update application", async () => {
        const { error } = await apps().update(patch).eq("id", id);
        check(error, "update application");
      }),
    setApplicationStatusIf: (id, from, to) =>
      guard("update status", async () => {
        const { error } = await apps().update({ status: to }).eq("id", id).eq("status", from);
        check(error, "update status");
      }),
    insertAttempt: (row) =>
      guard("insert attempt", async () => {
        const { data, error } = await attempts().insert(row).select("*").single();
        check(error, "insert attempt");
        return data as AttemptRow;
      }),
    getAttempt: (reference) =>
      guard("load attempt", async () => {
        const { data, error } = await attempts().select("*").eq("reference", reference).maybeSingle();
        check(error, "load attempt");
        return data;
      }),
    listAttempts: (applicationId) =>
      guard("list attempts", async () => {
        const { data, error } = await attempts()
          .select("*")
          .eq("application_id", applicationId)
          .order("created_at", { ascending: false })
          .limit(20);
        check(error, "list attempts");
        return data ?? [];
      }),
    closeAttempt: (reference, status, gatewayResponse) =>
      guard("close attempt", async () => {
        const { error } = await attempts()
          .update({ status, gateway_response: gatewayResponse?.slice(0, 200) ?? null })
          .eq("reference", reference)
          .eq("status", "initialized");
        check(error, "close attempt");
      }),
    markDuplicateNotified: (attemptId) =>
      guard("mark duplicate", async () => {
        const { error } = await attempts().update({ duplicate_notified_at: new Date().toISOString() }).eq("id", attemptId);
        check(error, "mark duplicate");
      }),
    finalizePayment: (a) =>
      guard("finalize payment", async () => {
        const { data, error } = await db.rpc("finalize_admission_payment", {
          p_attempt_reference: a.attemptReference,
          p_amount_kobo: a.amountKobo,
          p_currency: a.currency,
          p_paid_at: a.paidAt,
          p_transaction_id: a.transactionId,
        });
        check(error, "finalize payment");
        const r = (data ?? [])[0];
        if (!r) throw new Error("finalize payment returned nothing");
        return {
          applicationId: r.application_id,
          newlySubmitted: r.newly_submitted,
          duplicatePayment: r.duplicate_payment,
          receiptNumber: r.receipt_number,
        };
      }),
    claimEmails: (applicationId, lockSeconds, maxAttempts) =>
      guard("claim emails", async () => {
        const now = new Date();
        const { data, error } = await apps()
          .update({ email_locked_until: new Date(now.getTime() + lockSeconds * 1000).toISOString() })
          .eq("id", applicationId)
          .eq("status", "SUBMITTED")
          .lt("email_attempts", maxAttempts)
          .or(`email_locked_until.is.null,email_locked_until.lt.${now.toISOString()}`)
          .select("*")
          .maybeSingle();
        check(error, "claim emails");
        // The caller only sends what is still unsent; a row with nothing outstanding is a no-op.
        if (data && data.school_email_sent_at && data.parent_email_sent_at) return null;
        return data;
      }),
    rateLimitHit: (bucket, limit, windowSeconds) =>
      guard("rate limit", async () => {
        const { data, error } = await db.rpc("admission_rate_limit_hit", {
          p_bucket: bucket,
          p_limit: limit,
          p_window_seconds: windowSeconds,
        });
        check(error, "rate limit");
        return data === true;
      }),
    listOpenAttempts: (olderThan, newerThan, limit) =>
      guard("list open attempts", async () => {
        const { data, error } = await attempts()
          .select("*")
          .eq("status", "initialized")
          .lt("created_at", olderThan.toISOString())
          .gt("created_at", newerThan.toISOString())
          .order("created_at", { ascending: true })
          .limit(limit);
        check(error, "list open attempts");
        return data ?? [];
      }),
    listSubmittedNeedingEmail: (limit) =>
      guard("list unsent emails", async () => {
        const { data, error } = await apps()
          .select("*")
          .eq("status", "SUBMITTED")
          .or("school_email_sent_at.is.null,parent_email_sent_at.is.null")
          .lt("email_attempts", 8)
          .limit(limit);
        check(error, "list unsent emails");
        return data ?? [];
      }),
    listUnnotifiedDuplicates: (limit) =>
      guard("list duplicates", async () => {
        const { data, error } = await attempts()
          .select("*")
          .eq("duplicate_payment", true)
          .is("duplicate_notified_at", null)
          .limit(limit);
        check(error, "list duplicates");
        return data ?? [];
      }),
    listStaleUnpaid: (olderThan, limit) =>
      guard("list stale", async () => {
        const { data, error } = await apps()
          .select("*")
          .in("status", ["PENDING_PAYMENT", "PAYMENT_FAILED"])
          .lt("created_at", olderThan.toISOString())
          .limit(limit);
        check(error, "list stale");
        return data ?? [];
      }),
    deleteApplication: (id) =>
      guard("delete application", async () => {
        const { error } = await apps().delete().eq("id", id).neq("status", "SUBMITTED");
        check(error, "delete application");
      }),
    purgeRateLimits: (olderThan) =>
      guard("purge rate limits", async () => {
        const { error } = await db.from("admission_rate_limits").delete().lt("window_start", olderThan.toISOString());
        check(error, "purge rate limits");
      }),
  };
}

export function createSupabaseStorage(): DocumentStorage {
  const bucket = () => supabaseAdmin.storage.from(ADMISSIONS_BUCKET);
  return {
    async createUploadUrl(path) {
      const { data, error } = await bucket().createSignedUploadUrl(path, { upsert: true });
      if (error || !data) throw new StoreUnavailableError("could not prepare upload");
      return { path: data.path, token: data.token };
    },
    async download(path) {
      const { data, error } = await bucket().download(path);
      if (error || !data) return null;
      return new Uint8Array(await data.arrayBuffer());
    },
    async signedDownloadUrl(path, seconds, fileName) {
      const { data, error } = await bucket().createSignedUrl(path, seconds, { download: fileName });
      if (error || !data) throw new StoreUnavailableError("could not sign download");
      return data.signedUrl;
    },
    async remove(paths) {
      if (paths.length) await bucket().remove(paths);
    },
  };
}
