import { randomUUID } from "node:crypto";
import type { AdmissionsConfig } from "./config.server";
import { duplicatePaymentEmail, parentEmail, schoolEmail, type Mailer } from "./email.server";
import type { PaymentProvider } from "./payments/types";
import { buildDocument, documentFileName, type DocumentKind } from "./pdf";
import {
  FORM_VERSION,
  UPLOADS,
  applicantName,
  applicationSchema,
  childName,
  type ApplicationData,
  type UploadKind,
} from "./schema";
import {
  accessToken,
  ipBucket,
  newPaymentReference,
  newReference,
  sniffFileType,
  tokenMatches,
  type Audience,
} from "./security.server";
import {
  DuplicateKeyError,
  StoreUnavailableError,
  type AdmissionsStore,
  type ApplicationRow,
  type AttemptRow,
  type DocumentStorage,
} from "./store";

export type Deps = {
  store: AdmissionsStore;
  storage: DocumentStorage;
  provider: PaymentProvider | null;
  mailer: Mailer;
  config: AdmissionsConfig;
  now?: () => Date;
};

export type ErrorCode =
  | "PAYMENTS_DISABLED"
  | "RATE_LIMITED"
  | "INVALID"
  | "NOT_FOUND"
  | "LINK_EXPIRED"
  | "DOCUMENTS_MISSING"
  | "DOCUMENTS_INVALID"
  | "UNAVAILABLE"
  | "PAYMENT_START_FAILED"
  | "NOT_SUBMITTED";

/** Errors that are safe to show to the parent (no internal details). */
export class AdmissionError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: Record<string, string>,
  ) {
    super(message);
  }
}

const REF_RE = /^BA-[0-9A-Z]{4}-[0-9A-Z]{4}$/;
const LIMITS = {
  create: { limit: 8, window: 3600 },
  pay: { limit: 20, window: 3600 },
  status: { limit: 120, window: 600 },
  download: { limit: 60, window: 600 },
};

function log(event: string, meta: Record<string, string | number | boolean | undefined> = {}) {
  // References and codes only: never names, contact details, health data or tokens.
  console.info(`[admissions] ${event}`, JSON.stringify(meta));
}

async function rateLimit(deps: Deps, action: keyof typeof LIMITS, headers: Headers) {
  const { limit, window } = LIMITS[action];
  const ok = await deps.store.rateLimitHit(ipBucket(action, headers), limit, window);
  if (!ok) throw new AdmissionError("RATE_LIMITED", "Too many attempts. Please wait a few minutes and try again.");
}

function extFor(type: string) {
  return type === "application/pdf" ? "pdf" : type === "image/png" ? "png" : "jpg";
}

export function accessLink(deps: Deps, app: Pick<ApplicationRow, "reference" | "id">, audience: Audience) {
  const token = accessToken(deps.config.linkSecret, audience, app.reference, app.id);
  const page = audience === "parent" ? "application" : "office";
  return `${deps.config.siteUrl}/admissions/${page}?ref=${app.reference}#t=${token}`;
}

/** Loads an application for a token holder. Wrong reference and wrong token look identical. */
async function authorize(deps: Deps, reference: string, token: string, audience: Audience) {
  const ref = String(reference ?? "").trim().toUpperCase();
  if (!REF_RE.test(ref)) throw new AdmissionError("NOT_FOUND", "We could not find that application.");
  const app = await deps.store.getApplicationByReference(ref);
  if (!app || !tokenMatches(deps.config.linkSecret, audience, app.reference, app.id, token)) {
    throw new AdmissionError("NOT_FOUND", "We could not find that application.");
  }
  if (app.submitted_at) {
    const days = audience === "parent" ? deps.config.parentLinkDays : deps.config.schoolLinkDays;
    const age = (deps.now?.() ?? new Date()).getTime() - new Date(app.submitted_at).getTime();
    if (age > days * 86_400_000) throw new AdmissionError("LINK_EXPIRED", "This link has expired. Please contact the school.");
  }
  return app;
}

// ---------------------------------------------------------------------------------------
// 1. Save the completed application (before payment)
// ---------------------------------------------------------------------------------------

export type DeclaredUpload = { type: string; size: number };

export async function createApplication(
  deps: Deps,
  input: { form?: unknown; uploads: Record<UploadKind, DeclaredUpload> },
  headers: Headers,
) {
  const { config } = deps;
  if (!config.paymentsEnabled || !deps.provider || !config.feeKobo) {
    throw new AdmissionError("PAYMENTS_DISABLED", "Online applications are not open yet. Please contact the school office.");
  }
  await rateLimit(deps, "create", headers);

  const parsed = applicationSchema.safeParse(input.form);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new AdmissionError("INVALID", first?.message ?? "Please check the form.", {
      field: first?.path.join(".") ?? "",
    });
  }
  for (const kind of Object.keys(UPLOADS) as UploadKind[]) {
    const declared = input.uploads?.[kind];
    const rule = UPLOADS[kind];
    if (!declared || !(rule.types as readonly string[]).includes(declared.type) || !(declared.size > 0) || declared.size > rule.maxBytes) {
      throw new AdmissionError("DOCUMENTS_INVALID", `${rule.label}: ${rule.hint}`, { field: kind });
    }
  }

  const data = parsed.data;
  const id = randomUUID();
  const paths = {
    passport: `${id}/passport.${extFor(input.uploads.passport.type)}`,
    birthCertificate: `${id}/birth-certificate.${extFor(input.uploads.birthCertificate.type)}`,
  };

  let app: ApplicationRow | null = null;
  for (let tries = 0; tries < 5 && !app; tries++) {
    try {
      app = await deps.store.insertApplication({
        id,
        reference: newReference(),
        student_name: childName(data),
        parent_name: applicantName(data),
        parent_email: data.applicant.email.toLowerCase(),
        class_applied: data.child.classSought,
        form_version: FORM_VERSION,
        form_data: data as never,
        passport_path: paths.passport,
        birth_cert_path: paths.birthCertificate,
        fee_amount_kobo: config.feeKobo,
        currency: config.currency,
      });
    } catch (e) {
      if (!(e instanceof DuplicateKeyError)) throw e;
    }
  }
  if (!app) throw new AdmissionError("UNAVAILABLE", "Please try again.");
  log("application.created", { ref: app.reference });

  const [passport, birthCertificate] = await Promise.all([
    deps.storage.createUploadUrl(paths.passport),
    deps.storage.createUploadUrl(paths.birthCertificate),
  ]);
  return {
    reference: app.reference,
    token: accessToken(config.linkSecret, "parent", app.reference, app.id),
    feeKobo: app.fee_amount_kobo,
    uploads: { passport, birthCertificate },
  };
}

/** New upload URLs, e.g. when the first upload failed or a file was rejected. */
export async function prepareUploads(deps: Deps, input: { reference: string; token: string }, headers: Headers) {
  await rateLimit(deps, "pay", headers);
  const app = await authorize(deps, input.reference, input.token, "parent");
  if (app.status === "SUBMITTED") throw new AdmissionError("INVALID", "This application has already been submitted.");
  const [passport, birthCertificate] = await Promise.all([
    deps.storage.createUploadUrl(app.passport_path),
    deps.storage.createUploadUrl(app.birth_cert_path),
  ]);
  await deps.store.updateApplication(app.id, { documents_verified_at: null });
  return { passport, birthCertificate };
}

/** Server-side check of the uploaded files: present, real JPEG/PNG/PDF, within size limits. */
async function verifyDocuments(deps: Deps, app: ApplicationRow) {
  const checks = [
    { kind: "passport" as const, path: app.passport_path },
    { kind: "birthCertificate" as const, path: app.birth_cert_path },
  ];
  const patch: Record<string, string | number> = {};
  for (const c of checks) {
    const rule = UPLOADS[c.kind];
    const bytes = await deps.storage.download(c.path);
    if (!bytes) throw new AdmissionError("DOCUMENTS_MISSING", `Please upload the ${rule.label.toLowerCase()}.`, { field: c.kind });
    const type = sniffFileType(bytes);
    if (!type || !(rule.types as readonly string[]).includes(type) || bytes.length > rule.maxBytes) {
      await deps.storage.remove([c.path]);
      throw new AdmissionError("DOCUMENTS_INVALID", `${rule.label}: ${rule.hint}`, { field: c.kind });
    }
    const prefix = c.kind === "passport" ? "passport" : "birth_cert";
    patch[`${prefix}_type`] = type;
    patch[`${prefix}_size`] = bytes.length;
  }
  await deps.store.updateApplication(app.id, { ...patch, documents_verified_at: new Date().toISOString() });
}

// ---------------------------------------------------------------------------------------
// 2. Start (or retry) payment
// ---------------------------------------------------------------------------------------

export async function startPayment(deps: Deps, input: { reference: string; token: string }, headers: Headers) {
  await rateLimit(deps, "pay", headers);
  let app = await authorize(deps, input.reference, input.token, "parent");
  if (app.status === "SUBMITTED") return { status: "SUBMITTED" as const };
  if (!deps.config.paymentsEnabled || !deps.provider) {
    throw new AdmissionError("PAYMENTS_DISABLED", "Online payment is not available at the moment. Please contact the school office.");
  }
  if (!app.documents_verified_at) await verifyDocuments(deps, app);

  // Never open a second checkout if an earlier one has in fact been paid.
  const open = (await deps.store.listAttempts(app.id)).filter((a) => a.status === "initialized").slice(0, 3);
  for (const a of open) {
    const r = await confirmAttempt(deps, a.reference);
    if (r.outcome === "submitted") return { status: "SUBMITTED" as const };
  }
  app = (await deps.store.getApplicationById(app.id)) ?? app;
  if (app.status === "SUBMITTED") return { status: "SUBMITTED" as const };

  const attempt = await deps.store.insertAttempt({
    application_id: app.id,
    provider: deps.provider.name,
    reference: newPaymentReference(app.reference),
    amount_kobo: app.fee_amount_kobo,
    currency: app.currency,
  });
  try {
    const { checkoutUrl } = await deps.provider.initialize({
      reference: attempt.reference,
      amountKobo: attempt.amount_kobo,
      currency: "NGN",
      email: app.parent_email,
      callbackUrl: `${deps.config.siteUrl}/admissions/application?ref=${app.reference}`,
      metadata: { application_reference: app.reference, purpose: "Admission application fee" },
    });
    if (app.status === "PAYMENT_FAILED") await deps.store.setApplicationStatusIf(app.id, "PAYMENT_FAILED", "PENDING_PAYMENT");
    log("payment.started", { ref: app.reference, attempt: attempt.reference });
    return { status: "REDIRECT" as const, checkoutUrl };
  } catch (e) {
    await deps.store.closeAttempt(attempt.reference, "failed", "could not start checkout");
    log("payment.start_failed", { ref: app.reference, error: (e as Error).message.slice(0, 120) });
    throw new AdmissionError("PAYMENT_START_FAILED", "We could not open the payment page. Nothing was charged. Please try again.");
  }
}

// ---------------------------------------------------------------------------------------
// 3. Confirm a payment with the provider (browser return, webhook and reconciliation)
// ---------------------------------------------------------------------------------------

export type ConfirmOutcome = "submitted" | "duplicate" | "failed" | "abandoned" | "pending" | "unknown";

export async function confirmAttempt(deps: Deps, attemptReference: string): Promise<{ outcome: ConfirmOutcome; applicationId?: string }> {
  const attempt = await deps.store.getAttempt(attemptReference);
  if (!attempt) return { outcome: "unknown" };
  if (attempt.status === "success") {
    await ensureEmails(deps, attempt.application_id);
    return { outcome: attempt.duplicate_payment ? "duplicate" : "submitted", applicationId: attempt.application_id };
  }
  if (!deps.provider) return { outcome: "pending", applicationId: attempt.application_id };

  const v = await deps.provider.verify(attempt.reference);
  if (v.status === "success") {
    if (v.amountKobo !== attempt.amount_kobo || v.currency.toUpperCase() !== attempt.currency.toUpperCase()) {
      log("payment.amount_mismatch", { attempt: attempt.reference, expected: attempt.amount_kobo, got: v.amountKobo });
      await deps.store.closeAttempt(attempt.reference, "failed", "amount or currency mismatch");
      return { outcome: "failed", applicationId: attempt.application_id };
    }
    const result = await deps.store.finalizePayment({
      attemptReference: attempt.reference,
      amountKobo: v.amountKobo,
      currency: v.currency,
      paidAt: v.paidAt,
      transactionId: v.transactionId,
    });
    log(result.newlySubmitted ? "application.submitted" : "payment.already_recorded", {
      attempt: attempt.reference,
      duplicate: result.duplicatePayment,
    });
    if (result.duplicatePayment) await notifyDuplicates(deps);
    await ensureEmails(deps, result.applicationId);
    return { outcome: result.duplicatePayment ? "duplicate" : "submitted", applicationId: result.applicationId };
  }
  if (v.status === "failed") {
    await deps.store.closeAttempt(attempt.reference, "failed", v.gatewayResponse);
    await deps.store.setApplicationStatusIf(attempt.application_id, "PENDING_PAYMENT", "PAYMENT_FAILED");
    return { outcome: "failed", applicationId: attempt.application_id };
  }
  // "abandoned" checkouts can still be completed by the parent, so they stay open for reconciliation.
  return { outcome: v.status, applicationId: attempt.application_id };
}

/** Sends whichever emails are still outstanding. Never throws: email trouble must not affect the submission. */
export async function ensureEmails(deps: Deps, applicationId: string) {
  let app: ApplicationRow | null = null;
  try {
    app = await deps.store.claimEmails(applicationId, 60, 8);
    if (!app) return;
    let schoolSent = app.school_email_sent_at;
    let parentSent = app.parent_email_sent_at;
    let error: string | null = null;
    if (!schoolSent) {
      try {
        await deps.mailer.send(schoolEmail(app, accessLink(deps, app, "school"), deps.config));
        schoolSent = new Date().toISOString();
      } catch (e) {
        error = `school: ${(e as Error).message}`.slice(0, 200);
      }
    }
    if (!parentSent) {
      try {
        await deps.mailer.send(parentEmail(app, accessLink(deps, app, "parent"), deps.config));
        parentSent = new Date().toISOString();
      } catch (e) {
        error = `${error ? `${error}; ` : ""}parent: ${(e as Error).message}`.slice(0, 200);
      }
    }
    await deps.store.updateApplication(app.id, {
      school_email_sent_at: schoolSent,
      parent_email_sent_at: parentSent,
      email_attempts: app.email_attempts + 1,
      last_email_error: error,
      email_locked_until: null,
    });
    log(error ? "email.failed" : "email.sent", { ref: app.reference });
  } catch (e) {
    log("email.error", { app: applicationId, error: (e as Error).message.slice(0, 120) });
  }
}

async function notifyDuplicates(deps: Deps) {
  try {
    for (const a of await deps.store.listUnnotifiedDuplicates(10)) {
      const app = await deps.store.getApplicationById(a.application_id);
      if (!app) continue;
      await deps.mailer.send(duplicatePaymentEmail(app, a.reference, a.amount_kobo, deps.config));
      await deps.store.markDuplicateNotified(a.id);
    }
  } catch (e) {
    log("duplicate.notify_failed", { error: (e as Error).message.slice(0, 120) });
  }
}

// ---------------------------------------------------------------------------------------
// 4. Status for the parent's return page and the school's link
// ---------------------------------------------------------------------------------------

export type ApplicationView = {
  reference: string;
  status: ApplicationRow["status"];
  payment: "paid" | "failed" | "pending" | "not_started";
  studentName: string;
  classApplied: string;
  parentName: string;
  feeKobo: number;
  receiptNumber: string | null;
  paidAt: string | null;
  submittedAt: string | null;
  testMode: boolean;
  documentsUploaded: boolean;
};

function toView(app: ApplicationRow, attempts: AttemptRow[], testMode: boolean): ApplicationView {
  const latest = attempts[0];
  const payment =
    app.status === "SUBMITTED" ? "paid"
    : app.status === "PAYMENT_FAILED" ? "failed"
    : latest ? "pending"
    : "not_started";
  return {
    reference: app.reference,
    status: app.status,
    payment,
    studentName: app.student_name,
    classApplied: app.class_applied,
    parentName: app.parent_name,
    feeKobo: app.fee_amount_kobo,
    receiptNumber: app.receipt_number,
    paidAt: app.paid_at,
    submittedAt: app.submitted_at,
    testMode,
    documentsUploaded: !!app.documents_verified_at,
  };
}

export async function getApplicationStatus(
  deps: Deps,
  input: { reference: string; token: string; audience: Audience },
  headers: Headers,
): Promise<ApplicationView> {
  await rateLimit(deps, "status", headers);
  let app = await authorize(deps, input.reference, input.token, input.audience);
  if (app.status !== "SUBMITTED") {
    const open = (await deps.store.listAttempts(app.id)).filter((a) => a.status === "initialized").slice(0, 2);
    for (const a of open) {
      try {
        await confirmAttempt(deps, a.reference);
      } catch (e) {
        log("status.verify_failed", { attempt: a.reference, error: (e as Error).message.slice(0, 120) });
      }
    }
    app = (await deps.store.getApplicationById(app.id)) ?? app;
  } else if (!app.school_email_sent_at || !app.parent_email_sent_at) {
    await ensureEmails(deps, app.id);
  }
  return toView(app, await deps.store.listAttempts(app.id), deps.config.testMode);
}

// ---------------------------------------------------------------------------------------
// 5. Documents
// ---------------------------------------------------------------------------------------

export type DownloadKind = DocumentKind | "passport" | "birth-certificate";

export async function getDocument(
  deps: Deps,
  input: { reference: string; token: string; audience: Audience; kind: DownloadKind },
  headers: Headers,
): Promise<
  | { type: "file"; bytes: Uint8Array; fileName: string; contentType: string }
  | { type: "redirect"; url: string }
> {
  await rateLimit(deps, "download", headers);
  const app = await authorize(deps, input.reference, input.token, input.audience);
  if (app.status !== "SUBMITTED" || !app.submitted_at || !app.receipt_number || !app.paid_at) {
    throw new AdmissionError("NOT_SUBMITTED", "Documents are available once payment has been confirmed.");
  }

  if (input.kind === "passport" || input.kind === "birth-certificate") {
    // Original uploads are for the school only, through a 60-second signed URL.
    if (input.audience !== "school") throw new AdmissionError("NOT_FOUND", "We could not find that document.");
    const path = input.kind === "passport" ? app.passport_path : app.birth_cert_path;
    const ext = path.split(".").pop();
    const name = `${input.kind === "passport" ? "Passport-Photo" : "Birth-Certificate"}-${app.reference}.${ext}`;
    return { type: "redirect", url: await deps.storage.signedDownloadUrl(path, 60, name) };
  }

  const data = app.form_data as unknown as ApplicationData;
  const needsPhoto = input.kind === "admission-form" || input.kind === "all";
  const passportPhoto = needsPhoto ? await deps.storage.download(app.passport_path) : null;
  const out = await buildDocument(
    input.kind,
    { reference: app.reference, data, submittedAt: app.submitted_at, passportPhoto },
    {
      receiptNumber: app.receipt_number,
      reference: app.reference,
      parentName: app.parent_name,
      studentName: app.student_name,
      classApplied: app.class_applied,
      amountKobo: app.paid_amount_kobo ?? app.fee_amount_kobo,
      currency: app.currency,
      paidAt: app.paid_at,
      paymentReference: app.payment_reference ?? "",
      status: "PAID",
    },
  );
  return { type: "file", ...out };
}

export { documentFileName };

// ---------------------------------------------------------------------------------------
// 6. Webhook and daily reconciliation
// ---------------------------------------------------------------------------------------

export async function handleWebhook(deps: Deps, rawBody: string, headers: Headers): Promise<number> {
  if (!deps.provider) return 404;
  const event = deps.provider.parseWebhook(rawBody, headers);
  if (!event) return 401;
  if (event.type !== "charge.success" || !event.reference) return 200;
  try {
    const r = await confirmAttempt(deps, event.reference);
    log("webhook.processed", { attempt: event.reference, outcome: r.outcome });
    return 200;
  } catch (e) {
    log("webhook.error", { attempt: event.reference, error: (e as Error).message.slice(0, 120) });
    // A 5xx makes the provider retry later, e.g. while the database is paused.
    return e instanceof StoreUnavailableError ? 503 : 500;
  }
}

export async function reconcile(deps: Deps) {
  const now = deps.now?.() ?? new Date();
  const summary = { checked: 0, submitted: 0, emailsRetried: 0, purged: 0 };
  const open = await deps.store.listOpenAttempts(
    new Date(now.getTime() - 15 * 60_000),
    new Date(now.getTime() - 7 * 86_400_000),
    25,
  );
  for (const a of open) {
    summary.checked++;
    try {
      const r = await confirmAttempt(deps, a.reference);
      if (r.outcome === "submitted") summary.submitted++;
    } catch (e) {
      log("reconcile.verify_failed", { attempt: a.reference, error: (e as Error).message.slice(0, 120) });
    }
  }
  for (const app of await deps.store.listSubmittedNeedingEmail(25)) {
    summary.emailsRetried++;
    await ensureEmails(deps, app.id);
  }
  await notifyDuplicates(deps);
  // Unpaid applications are deleted (with their files) after 30 days: data minimisation.
  for (const app of await deps.store.listStaleUnpaid(new Date(now.getTime() - 30 * 86_400_000), 25)) {
    const attempts = await deps.store.listAttempts(app.id);
    if (attempts.some((a) => a.status === "success")) continue;
    await deps.storage.remove([app.passport_path, app.birth_cert_path]);
    await deps.store.deleteApplication(app.id);
    summary.purged++;
  }
  await deps.store.purgeRateLimits(new Date(now.getTime() - 86_400_000));
  log("reconcile.done", summary);
  return summary;
}
