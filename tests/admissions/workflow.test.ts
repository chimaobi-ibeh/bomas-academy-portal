import { describe, expect, it } from "vitest";
import {
  AdmissionError,
  createApplication,
  getApplicationStatus,
  getDocument,
  handleWebhook,
  reconcile,
  startPayment,
} from "@/lib/admissions/service.server";
import { newReference, accessToken } from "@/lib/admissions/security.server";
import { DuplicateKeyError } from "@/lib/admissions/store";
import { EXE, JPEG, PDF, freshHeaders, setup } from "./harness";
import { sampleInput } from "./fixtures";

const uploads = {
  passport: { type: "image/jpeg", size: 50_000 },
  birthCertificate: { type: "application/pdf", size: 200_000 },
};

type Ctx = Awaited<ReturnType<typeof setup>>;

/** Fills in the form, uploads both documents, and opens a checkout. */
async function applyAndStartPayment(ctx: Ctx, files = { passport: JPEG, birth: PDF }) {
  const created = await createApplication(ctx.deps, { form: sampleInput(), uploads }, freshHeaders());
  ctx.files.set(created.uploads.passport.path, files.passport);
  ctx.files.set(created.uploads.birthCertificate.path, files.birth);
  const started = await startPayment(ctx.deps, { reference: created.reference, token: created.token }, freshHeaders());
  const attemptRef = ctx.pay.initialized.at(-1)!;
  return { ...created, started, attemptRef };
}

async function expectError(p: Promise<unknown>, code: string) {
  await expect(p).rejects.toBeInstanceOf(AdmissionError);
  await p.catch((e: AdmissionError) => expect(e.code).toBe(code));
}

function webhook(ref: string, signature = "valid") {
  return {
    body: JSON.stringify({ event: "charge.success", data: { reference: ref } }),
    headers: new Headers({ "x-test-signature": signature }),
  };
}

describe("1, 7. successful application and payment", () => {
  it("submits only after verified payment, issues one receipt and emails both parties once", async () => {
    const ctx = await setup();
    const a = await applyAndStartPayment(ctx);
    expect(a.started).toEqual({ status: "REDIRECT", checkoutUrl: `https://checkout.example/${a.attemptRef}` });

    // Before payment: pending, nothing sent
    let view = await getApplicationStatus(ctx.deps, { reference: a.reference, token: a.token, audience: "parent" }, freshHeaders());
    expect(view.status).toBe("PENDING_PAYMENT");
    expect(ctx.mail.sent).toHaveLength(0);

    ctx.pay.pay(a.attemptRef, 1_000_000);
    view = await getApplicationStatus(ctx.deps, { reference: a.reference, token: a.token, audience: "parent" }, freshHeaders());
    expect(view.status).toBe("SUBMITTED");
    expect(view.payment).toBe("paid");
    expect(view.receiptNumber).toMatch(/^BA-RCT-\d{4}-00001$/);

    expect(ctx.mail.sent.map((m) => m.to).sort()).toEqual(["bomasacademy@gmail.com", "grace.dung@example.com"]);
    const school = ctx.mail.sent.find((m) => m.to === "bomasacademy@gmail.com")!;
    expect(school.subject).toBe(`New Admission Application — ${a.reference}`);
    // No health or identity details in the school email
    expect(school.text).not.toMatch(/allergy|groundnut|Yellow fever|birth certificate/i);
    expect(school.text).toContain("DANIEL NANMWA DUNG");

    // Checking again changes nothing
    await getApplicationStatus(ctx.deps, { reference: a.reference, token: a.token, audience: "parent" }, freshHeaders());
    expect(ctx.mail.sent).toHaveLength(2);
  });
});

describe("2-4. validation", () => {
  it("rejects missing required fields", async () => {
    const ctx = await setup();
    const form = sampleInput();
    form.child.firstName = "";
    form.declarations.homeSchoolAgreement = false as never;
    await expectError(createApplication(ctx.deps, { form, uploads }, freshHeaders()), "INVALID");
  });

  it("rejects a passport photograph of the wrong type or size (declared)", async () => {
    const ctx = await setup();
    await expectError(
      createApplication(ctx.deps, { form: sampleInput(), uploads: { ...uploads, passport: { type: "application/pdf", size: 1000 } } }, freshHeaders()),
      "DOCUMENTS_INVALID",
    );
    await expectError(
      createApplication(ctx.deps, { form: sampleInput(), uploads: { ...uploads, passport: { type: "image/jpeg", size: 9_000_000 } } }, freshHeaders()),
      "DOCUMENTS_INVALID",
    );
  });

  it("rejects a passport photograph whose bytes are not an image, and removes it", async () => {
    const ctx = await setup();
    const created = await createApplication(ctx.deps, { form: sampleInput(), uploads }, freshHeaders());
    ctx.files.set(created.uploads.passport.path, PDF); // a PDF renamed to .jpg
    ctx.files.set(created.uploads.birthCertificate.path, PDF);
    await expectError(startPayment(ctx.deps, { reference: created.reference, token: created.token }, freshHeaders()), "DOCUMENTS_INVALID");
    expect(ctx.files.has(created.uploads.passport.path)).toBe(false);
    expect(ctx.pay.initialized).toHaveLength(0);
  });

  it("rejects an invalid birth certificate (an executable)", async () => {
    const ctx = await setup();
    const created = await createApplication(ctx.deps, { form: sampleInput(), uploads }, freshHeaders());
    ctx.files.set(created.uploads.passport.path, JPEG);
    ctx.files.set(created.uploads.birthCertificate.path, EXE);
    await expectError(startPayment(ctx.deps, { reference: created.reference, token: created.token }, freshHeaders()), "DOCUMENTS_INVALID");
  });

  it("refuses to start payment until the documents are uploaded", async () => {
    const ctx = await setup();
    const created = await createApplication(ctx.deps, { form: sampleInput(), uploads }, freshHeaders());
    await expectError(startPayment(ctx.deps, { reference: created.reference, token: created.token }, freshHeaders()), "DOCUMENTS_MISSING");
  });

  it("does not accept applications while payments are not configured", async () => {
    const ctx = await setup({ paymentsEnabled: false });
    await expectError(createApplication(ctx.deps, { form: sampleInput(), uploads }, freshHeaders()), "PAYMENTS_DISABLED");
  });
});

describe("5-6. failed and abandoned payments", () => {
  it("a failed payment never produces a submitted application, and a retry can succeed", async () => {
    const ctx = await setup();
    const a = await applyAndStartPayment(ctx);
    ctx.pay.fail(a.attemptRef);
    let view = await getApplicationStatus(ctx.deps, { reference: a.reference, token: a.token, audience: "parent" }, freshHeaders());
    expect(view.status).toBe("PAYMENT_FAILED");
    expect(view.receiptNumber).toBeNull();
    expect(ctx.mail.sent).toHaveLength(0);
    await expectError(
      getDocument(ctx.deps, { reference: a.reference, token: a.token, audience: "parent", kind: "receipt" }, freshHeaders()),
      "NOT_SUBMITTED",
    );

    const retry = await startPayment(ctx.deps, { reference: a.reference, token: a.token }, freshHeaders());
    expect(retry.status).toBe("REDIRECT");
    const second = ctx.pay.initialized.at(-1)!;
    expect(second).not.toBe(a.attemptRef);
    ctx.pay.pay(second, 1_000_000);
    view = await getApplicationStatus(ctx.deps, { reference: a.reference, token: a.token, audience: "parent" }, freshHeaders());
    expect(view.status).toBe("SUBMITTED");
    const count = await ctx.db.query<{ n: number }>("SELECT count(*)::int AS n FROM admission_applications");
    expect(count.rows[0].n).toBe(1);
  });

  it("an abandoned checkout stays pending and can be retried without a second application", async () => {
    const ctx = await setup();
    const a = await applyAndStartPayment(ctx);
    ctx.pay.abandon(a.attemptRef);
    const view = await getApplicationStatus(ctx.deps, { reference: a.reference, token: a.token, audience: "parent" }, freshHeaders());
    expect(view.status).toBe("PENDING_PAYMENT");
    await startPayment(ctx.deps, { reference: a.reference, token: a.token }, freshHeaders());
    expect(ctx.pay.initialized).toHaveLength(2);
    const count = await ctx.db.query<{ n: number }>("SELECT count(*)::int AS n FROM admission_applications");
    expect(count.rows[0].n).toBe(1);
  });

  it("retrying after paying (but before the confirmation arrived) does not open a second checkout", async () => {
    const ctx = await setup();
    const a = await applyAndStartPayment(ctx);
    ctx.pay.pay(a.attemptRef, 1_000_000); // paid, but the parent never came back
    const retry = await startPayment(ctx.deps, { reference: a.reference, token: a.token }, freshHeaders());
    expect(retry).toEqual({ status: "SUBMITTED" });
    expect(ctx.pay.initialized).toHaveLength(1);
  });

  it("a payment for the wrong amount is not accepted", async () => {
    const ctx = await setup();
    const a = await applyAndStartPayment(ctx);
    ctx.pay.pay(a.attemptRef, 100); // NGN 1 instead of the fee
    const view = await getApplicationStatus(ctx.deps, { reference: a.reference, token: a.token, audience: "parent" }, freshHeaders());
    expect(view.status).not.toBe("SUBMITTED");
  });
});

describe("8-10. webhooks, ordering and lost connections", () => {
  it("duplicate webhooks produce one submission, one receipt and one set of emails", async () => {
    const ctx = await setup();
    const a = await applyAndStartPayment(ctx);
    ctx.pay.pay(a.attemptRef, 1_000_000);
    const w = webhook(a.attemptRef);
    const results = await Promise.all([1, 2, 3].map(() => handleWebhook(ctx.deps, w.body, w.headers)));
    expect(results).toEqual([200, 200, 200]);
    const apps = await ctx.db.query<{ status: string; receipt_number: string }>("SELECT status, receipt_number FROM admission_applications");
    expect(apps.rows).toHaveLength(1);
    expect(apps.rows[0].status).toBe("SUBMITTED");
    expect(ctx.mail.sent).toHaveLength(2);
    const seq = await ctx.db.query<{ last_value: number }>("SELECT last_value::int FROM admission_receipt_seq");
    expect(seq.rows[0].last_value).toBe(1);
  });

  it("rejects webhooks with an invalid signature", async () => {
    const ctx = await setup();
    const a = await applyAndStartPayment(ctx);
    ctx.pay.pay(a.attemptRef, 1_000_000);
    const w = webhook(a.attemptRef, "forged");
    expect(await handleWebhook(ctx.deps, w.body, w.headers)).toBe(401);
    const app = await ctx.store.getApplicationByReference(a.reference);
    expect(app?.status).toBe("PENDING_PAYMENT");
  });

  it("a webhook that arrives before the browser redirect is handled, and the redirect then just shows success", async () => {
    const ctx = await setup();
    const a = await applyAndStartPayment(ctx);
    ctx.pay.pay(a.attemptRef, 1_000_000);
    const w = webhook(a.attemptRef);
    await handleWebhook(ctx.deps, w.body, w.headers);
    const view = await getApplicationStatus(ctx.deps, { reference: a.reference, token: a.token, audience: "parent" }, freshHeaders());
    expect(view.status).toBe("SUBMITTED");
    expect(ctx.mail.sent).toHaveLength(2);
  });

  it("if the parent loses connection after paying and no webhook arrives, the daily reconciliation submits it", async () => {
    const ctx = await setup();
    const a = await applyAndStartPayment(ctx);
    ctx.pay.pay(a.attemptRef, 1_000_000);
    await ctx.db.query("UPDATE admission_payment_attempts SET created_at = now() - interval '1 hour'");
    const summary = await reconcile(ctx.deps);
    expect(summary.submitted).toBe(1);
    const app = await ctx.store.getApplicationByReference(a.reference);
    expect(app?.status).toBe("SUBMITTED");
    expect(ctx.mail.sent).toHaveLength(2);
  });

  it("a second successful payment is recorded as a duplicate and the school is told to refund it", async () => {
    const ctx = await setup();
    const a = await applyAndStartPayment(ctx);
    // Parent opened two checkouts (two tabs) and paid both
    await ctx.db.query("UPDATE admission_applications SET status = 'PAYMENT_FAILED'");
    await ctx.db.query("UPDATE admission_payment_attempts SET status = 'failed'");
    await startPayment(ctx.deps, { reference: a.reference, token: a.token }, freshHeaders());
    const second = ctx.pay.initialized.at(-1)!;
    ctx.pay.pay(second, 1_000_000);
    ctx.pay.pay(a.attemptRef, 1_000_000);
    await handleWebhook(ctx.deps, webhook(second).body, webhook(second).headers);
    await handleWebhook(ctx.deps, webhook(a.attemptRef).body, webhook(a.attemptRef).headers);
    const dup = await ctx.db.query<{ n: number }>("SELECT count(*)::int AS n FROM admission_payment_attempts WHERE duplicate_payment");
    expect(dup.rows[0].n).toBe(1);
    expect(ctx.mail.sent.some((m) => m.subject.startsWith("Duplicate application payment"))).toBe(true);
    const apps = await ctx.db.query("SELECT 1 FROM admission_applications WHERE status = 'SUBMITTED'");
    expect(apps.rows).toHaveLength(1);
  });
});

describe("11. email delivery failure", () => {
  it("keeps the application submitted and retries the emails later without re-charging", async () => {
    const ctx = await setup();
    ctx.mail.setFailing(true);
    const a = await applyAndStartPayment(ctx);
    ctx.pay.pay(a.attemptRef, 1_000_000);
    const view = await getApplicationStatus(ctx.deps, { reference: a.reference, token: a.token, audience: "parent" }, freshHeaders());
    expect(view.status).toBe("SUBMITTED");
    let app = await ctx.store.getApplicationByReference(a.reference);
    expect(app?.school_email_sent_at).toBeNull();
    expect(app?.email_attempts).toBe(1);

    ctx.mail.setFailing(false);
    await reconcile(ctx.deps);
    app = await ctx.store.getApplicationByReference(a.reference);
    expect(app?.school_email_sent_at).not.toBeNull();
    expect(app?.parent_email_sent_at).not.toBeNull();
    expect(ctx.pay.initialized).toHaveLength(1);
    expect(ctx.mail.sent).toHaveLength(2);
  });
});

describe("15. secure document retrieval", () => {
  it("only the right token, for a submitted application, can download; originals are school-only", async () => {
    const ctx = await setup();
    const a = await applyAndStartPayment(ctx);
    ctx.pay.pay(a.attemptRef, 1_000_000);
    await getApplicationStatus(ctx.deps, { reference: a.reference, token: a.token, audience: "parent" }, freshHeaders());

    const receipt = await getDocument(ctx.deps, { reference: a.reference, token: a.token, audience: "parent", kind: "receipt" }, freshHeaders());
    expect(receipt.type).toBe("file");

    await expectError(
      getDocument(ctx.deps, { reference: a.reference, token: "wrong", audience: "parent", kind: "receipt" }, freshHeaders()),
      "NOT_FOUND",
    );
    // A parent token is not a school token
    await expectError(
      getDocument(ctx.deps, { reference: a.reference, token: a.token, audience: "school", kind: "receipt" }, freshHeaders()),
      "NOT_FOUND",
    );
    await expectError(
      getDocument(ctx.deps, { reference: a.reference, token: a.token, audience: "parent", kind: "birth-certificate" }, freshHeaders()),
      "NOT_FOUND",
    );
    const app = (await ctx.store.getApplicationByReference(a.reference))!;
    const schoolToken = accessToken(ctx.deps.config.linkSecret, "school", app.reference, app.id);
    const original = await getDocument(ctx.deps, { reference: a.reference, token: schoolToken, audience: "school", kind: "birth-certificate" }, freshHeaders());
    expect(original).toEqual({ type: "redirect", url: expect.stringContaining("expires=60") });

    // An unknown reference looks exactly like a wrong token
    await expectError(
      getDocument(ctx.deps, { reference: "BA-ZZZZ-ZZZZ", token: a.token, audience: "parent", kind: "receipt" }, freshHeaders()),
      "NOT_FOUND",
    );
  });

  it("rate-limits repeated guesses from one address", async () => {
    const ctx = await setup();
    const h = new Headers({ "x-forwarded-for": "203.0.113.9" });
    let limited = false;
    for (let i = 0; i < 130 && !limited; i++) {
      try {
        await getApplicationStatus(ctx.deps, { reference: "BA-AAAA-AAAA", token: "x", audience: "parent" }, h);
      } catch (e) {
        if ((e as AdmissionError).code === "RATE_LIMITED") limited = true;
      }
    }
    expect(limited).toBe(true);
  });

  it("reports a paused database clearly instead of failing silently", async () => {
    const ctx = await setup();
    ctx.setDown(true);
    await expect(createApplication(ctx.deps, { form: sampleInput(), uploads }, freshHeaders())).rejects.toThrow(/paused/);
  });
});

describe("17. application references", () => {
  it("are well-formed and unique", () => {
    const refs = new Set(Array.from({ length: 20_000 }, () => newReference()));
    expect(refs.size).toBe(20_000);
    for (const r of [...refs].slice(0, 200)) expect(r).toMatch(/^BA-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
  });

  it("are unique in the database", async () => {
    const ctx = await setup();
    const a = await applyAndStartPayment(ctx);
    const app = (await ctx.store.getApplicationByReference(a.reference))!;
    const { id: _id, created_at: _c, updated_at: _u, ...copy } = app;
    await expect(ctx.store.insertApplication({ ...copy, id: crypto.randomUUID() })).rejects.toBeInstanceOf(DuplicateKeyError);
  });

  it("unpaid applications and their files are deleted after 30 days", async () => {
    const ctx = await setup();
    const a = await applyAndStartPayment(ctx);
    await ctx.db.query("UPDATE admission_applications SET created_at = now() - interval '31 days'");
    await ctx.db.query("UPDATE admission_payment_attempts SET created_at = now() - interval '31 days'");
    const s = await reconcile(ctx.deps);
    expect(s.purged).toBe(1);
    expect(await ctx.store.getApplicationByReference(a.reference)).toBeNull();
    expect(ctx.files.size).toBe(0);
  });
});
