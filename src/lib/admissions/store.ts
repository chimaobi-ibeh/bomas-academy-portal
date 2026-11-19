import type { Database } from "@/integrations/supabase/types";

export type ApplicationRow = Database["public"]["Tables"]["admission_applications"]["Row"];
export type ApplicationInsert = Database["public"]["Tables"]["admission_applications"]["Insert"];
export type ApplicationPatch = Database["public"]["Tables"]["admission_applications"]["Update"];
export type AttemptRow = Database["public"]["Tables"]["admission_payment_attempts"]["Row"];
export type AttemptInsert = Database["public"]["Tables"]["admission_payment_attempts"]["Insert"];
export type AttemptStatus = AttemptRow["status"];

export type FinalizeResult = {
  applicationId: string;
  newlySubmitted: boolean;
  duplicatePayment: boolean;
  receiptNumber: string | null;
};

/** Raised when the database cannot be reached (e.g. a paused Supabase Free project). */
export class StoreUnavailableError extends Error {}
/** Raised on a unique-constraint clash (used to retry a new reference). */
export class DuplicateKeyError extends Error {}

/**
 * Everything the admissions workflow needs from the database. Implemented with Supabase in
 * production (store.server.ts) and with an in-process Postgres in the tests.
 */
export interface AdmissionsStore {
  insertApplication(row: ApplicationInsert): Promise<ApplicationRow>;
  getApplicationByReference(reference: string): Promise<ApplicationRow | null>;
  getApplicationById(id: string): Promise<ApplicationRow | null>;
  updateApplication(id: string, patch: ApplicationPatch): Promise<void>;
  /** Moves PENDING_PAYMENT -> PAYMENT_FAILED (or back) only from the expected status. */
  setApplicationStatusIf(id: string, from: ApplicationRow["status"], to: ApplicationRow["status"]): Promise<void>;

  insertAttempt(row: AttemptInsert): Promise<AttemptRow>;
  getAttempt(reference: string): Promise<AttemptRow | null>;
  listAttempts(applicationId: string): Promise<AttemptRow[]>;
  /** Changes an attempt's status only while it is still "initialized". */
  closeAttempt(reference: string, status: "failed" | "abandoned", gatewayResponse?: string): Promise<void>;
  markDuplicateNotified(attemptId: string): Promise<void>;
  finalizePayment(args: {
    attemptReference: string;
    amountKobo: number;
    currency: string;
    paidAt: string;
    transactionId: string;
  }): Promise<FinalizeResult>;

  /** Atomically takes the email lock if emails are outstanding; returns the row or null. */
  claimEmails(applicationId: string, lockSeconds: number, maxAttempts: number): Promise<ApplicationRow | null>;

  rateLimitHit(bucket: string, limit: number, windowSeconds: number): Promise<boolean>;

  /** For the daily reconciliation. */
  listOpenAttempts(olderThan: Date, newerThan: Date, limit: number): Promise<AttemptRow[]>;
  listSubmittedNeedingEmail(limit: number): Promise<ApplicationRow[]>;
  listUnnotifiedDuplicates(limit: number): Promise<AttemptRow[]>;
  listStaleUnpaid(olderThan: Date, limit: number): Promise<ApplicationRow[]>;
  deleteApplication(id: string): Promise<void>;
  purgeRateLimits(olderThan: Date): Promise<void>;
}

export interface DocumentStorage {
  createUploadUrl(path: string): Promise<{ path: string; token: string }>;
  download(path: string): Promise<Uint8Array | null>;
  signedDownloadUrl(path: string, seconds: number, fileName: string): Promise<string>;
  remove(paths: string[]): Promise<void>;
}

export const ADMISSIONS_BUCKET = "admission-documents";
