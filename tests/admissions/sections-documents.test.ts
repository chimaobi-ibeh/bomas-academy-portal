import { afterEach, describe, expect, it } from "vitest";
import { getAdmissionsConfig } from "@/lib/admissions/config.server";
import { createPaystackProvider } from "@/lib/admissions/payments/paystack.server";
import {
  AdmissionError,
  createApplication,
  getApplicationStatus,
  getDocument,
  reconcile,
  startPayment,
} from "@/lib/admissions/service.server";
import { accessToken } from "@/lib/admissions/security.server";
import { applicationSchema, documentsToBring, schoolSection, type ApplicationInput } from "@/lib/admissions/schema";
import { JPEG, PDF, freshHeaders, setup } from "./harness";
import { sampleInput } from "./fixtures";

const base = {
  passport: { type: "image/jpeg", size: 50_000 },
  birthCertificate: { type: "application/pdf", size: 200_000 },
};

type Ctx = Awaited<ReturnType<typeof setup>>;

async function apply(ctx: Ctx, form: ApplicationInput, uploads: Record<string, { type: string; size: number }> = base) {
  const created = await createApplication(ctx.deps, { form, uploads }, freshHeaders());
  for (const [kind, target] of Object.entries(created.uploads)) {
    ctx.files.set(target!.path, kind === "birthCertificate" || kind === "immunisationCard" ? PDF : JPEG);
  }
  const started = await startPayment(ctx.deps, { reference: created.reference, token: created.token }, freshHeaders());
  return { ...created, started, attempt: ctx.pay.inputs.at(-1)! };
}

function issues(form: ApplicationInput) {
  const r = applicationSchema.safeParse(form);
  return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
}

describe("fees go to the right school account", () => {
  it("maps classes to sections", () => {
    expect(schoolSection("Pre-Dawn")).toBe("nursery-primary");
    expect(schoolSection("Nursery Two")).toBe("nursery-primary");
    expect(schoolSection("Primary Six")).toBe("nursery-primary");
    for (const c of ["JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3"]) expect(schoolSection(c)).toBe("secondary");
  });

  it("a primary application is paid into the nursery/primary subaccount", async () => {
    const ctx = await setup();
    const a = await apply(ctx, sampleInput());
    expect(a.attempt.subaccount).toBe("ACCT_nurseryprimary");
    const app = (await ctx.store.getApplicationByReference(a.reference))!;
    expect(app.school_section).toBe("nursery-primary");
    const [attempt] = await ctx.store.listAttempts(app.id);
    expect(attempt.subaccount).toBe("ACCT_nurseryprimary");
  });

  it("a secondary application is paid into the secondary subaccount, never the primary one", async () => {
    const ctx = await setup();
    const form = sampleInput();
    form.child.classSought = "SSS 1";
    const a = await apply(ctx, form);
    expect(a.attempt.subaccount).toBe("ACCT_secondary");
    expect(a.attempt.metadata.school_section).toBe("Secondary");

    ctx.pay.pay(a.attempt.reference, 1_000_000);
    const view = await getApplicationStatus(ctx.deps, { reference: a.reference, token: a.token, audience: "parent" }, freshHeaders());
    expect(view.status).toBe("SUBMITTED");
    expect(view.schoolSection).toBe("Secondary");
    const school = ctx.mail.sent.find((m) => m.to === "bomasacademy@gmail.com")!;
    expect(school.text).toContain("School section (fee account): Secondary");
  });

  it("refuses to open a checkout when a section has no subaccount", async () => {
    const ctx = await setup({ subaccounts: { "nursery-primary": "ACCT_nurseryprimary", secondary: "" } });
    const form = sampleInput();
    form.child.classSought = "JSS 2";
    const created = await createApplication(ctx.deps, { form, uploads: base }, freshHeaders());
    ctx.files.set(created.uploads.passport!.path, JPEG);
    ctx.files.set(created.uploads.birthCertificate!.path, PDF);
    const p = startPayment(ctx.deps, { reference: created.reference, token: created.token }, freshHeaders());
    await expect(p).rejects.toBeInstanceOf(AdmissionError);
    await p.catch((e: AdmissionError) => expect(e.code).toBe("PAYMENTS_DISABLED"));
    expect(ctx.pay.initialized).toHaveLength(0);
  });

  describe("configuration", () => {
    const saved = { ...process.env };
    afterEach(() => {
      process.env = { ...saved };
    });
    it("keeps payment off until both subaccounts are set", () => {
      Object.assign(process.env, {
        PAYMENT_PROVIDER: "paystack",
        PAYSTACK_SECRET_KEY: "sk_test_abc",
        ADMISSION_FEE_NGN: "10000",
        ADMISSIONS_LINK_SECRET: "x".repeat(40),
        PAYSTACK_SUBACCOUNT_NURSERY_PRIMARY: "ACCT_abc123",
        PAYSTACK_SUBACCOUNT_SECONDARY: "",
      });
      expect(getAdmissionsConfig().paymentsEnabled).toBe(false);
      process.env.PAYSTACK_SUBACCOUNT_SECONDARY = "ACCT_def456";
      expect(getAdmissionsConfig().paymentsEnabled).toBe(true);
      expect(getAdmissionsConfig().subaccounts).toEqual({ "nursery-primary": "ACCT_abc123", secondary: "ACCT_def456" });
    });
  });

  it("the Paystack adapter settles the whole payment to the subaccount", async () => {
    const calls: RequestInit[] = [];
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      calls.push(init!);
      return new Response(JSON.stringify({ status: true, data: { authorization_url: "https://checkout.paystack.com/x" } }));
    }) as unknown as typeof fetch;
    await createPaystackProvider("sk_test_abc", fetchImpl).initialize({
      reference: "R1", amountKobo: 1_000_000, currency: "NGN", email: "p@example.com",
      callbackUrl: "https://www.bomasacademy.org/x", subaccount: "ACCT_secondary", metadata: {},
    });
    expect(JSON.parse(String(calls[0].body))).toMatchObject({ subaccount: "ACCT_secondary", bearer: "subaccount" });
  });
});

describe("every question must be answered", () => {
  it("the complete sample is valid", () => {
    expect(issues(sampleInput())).toEqual([]);
  });

  it("rejects blanks that used to be optional", () => {
    const basic = sampleInput();
    basic.child.tribe = "";
    basic.child.religion = "";
    basic.childrenAtBomas = "" as never;
    expect(issues(basic)).toEqual(expect.arrayContaining(["child.tribe", "child.religion", "childrenAtBomas"]));

    // Rules that depend on other answers (zod runs them once the basic fields are valid)
    const form = sampleInput();
    form.father.occupation = "";
    form.mother.email = "";
    form.education.headTeacher = "";
    form.transport = { bus: "", parentDropOff: "", walksHome: "", other: "" };
    form.health.illnesses.measles = { ticked: true, date: "" };
    form.introducerName = "";
    expect(issues(form)).toEqual(
      expect.arrayContaining([
        "father.occupation",
        "mother.email",
        "education.headTeacher",
        "transport.parentDropOff",
        "health.illnesses.measles.date",
        "introducerName",
      ]),
    );
  });

  it("requires a yes/no answer for each follow-up question", () => {
    const form = sampleInput();
    for (const k of ["hasOtherCustodians", "introduced", "hasOtherChildren"] as const) form[k] = undefined as never;
    form.education.hasDifficulties = undefined as never;
    form.health.hasOtherMedicalInfo = undefined as never;
    form.health.hasSpecialInformation = undefined as never;
    expect(issues(form)).toEqual(
      expect.arrayContaining([
        "hasOtherCustodians",
        "introduced",
        "hasOtherChildren",
        "education.hasDifficulties",
        "health.hasOtherMedicalInfo",
        "health.hasSpecialInformation",
      ]),
    );
  });

  it("allows only genuinely missing answers: middle names, landlines and a school email", () => {
    const form = sampleInput();
    form.applicant.middleName = "";
    form.child.middleName = "";
    form.father.officePhone = "";
    form.father.homePhone = "";
    form.father.mobilePhone = "";
    form.homePhone = "";
    form.education.schoolEmail = "";
    expect(issues(form)).toEqual([]);
  });

  it("a parent whose details cannot be given needs a reason instead", () => {
    const form = sampleInput();
    form.father = { ...form.father, unavailable: true, unavailableReason: "", fullName: "", occupation: "", phone: "", email: "" };
    expect(issues(form)).toEqual(["father.unavailableReason"]);
    form.father.unavailableReason = "Deceased";
    form.documents = { motherPassport: "bring", immunisationCard: "bring" };
    expect(issues(form)).toEqual([]);
    // ...and no photograph is asked for that parent
    expect(documentsToBring(applicationSchema.parse(form))).not.toContain("The father's passport photograph");
  });

  it("a parent applicant must give at least one parent's details", () => {
    const form = sampleInput();
    form.father = { ...form.father, unavailable: true, unavailableReason: "Deceased" };
    form.mother = { ...form.mother, unavailable: true, unavailableReason: "Not in contact" };
    form.documents = { immunisationCard: "bring" };
    expect(issues(form)).toContain("father.unavailable");
  });

  it("each optional document is either uploaded or brought in", () => {
    const form = sampleInput();
    form.documents = { fatherPassport: "upload" };
    expect(issues(form)).toEqual(expect.arrayContaining(["documents.motherPassport", "documents.immunisationCard"]));
    form.health.surgery = "yes";
    form.health.surgeryDetails = "2022, appendix";
    expect(issues(form)).toContain("documents.surgicalReport");
  });
});

describe("optional documents", () => {
  it("uploads the documents the parent chose to upload, checks them and gives them to the school only", async () => {
    const ctx = await setup();
    const form = sampleInput();
    form.documents = { fatherPassport: "upload", motherPassport: "bring", immunisationCard: "upload" };

    // Choosing "upload" without declaring the file is refused.
    const missing = createApplication(ctx.deps, { form, uploads: base }, freshHeaders());
    await expect(missing).rejects.toBeInstanceOf(AdmissionError);
    await missing.catch((e: AdmissionError) => expect(e.details?.field).toBe("fatherPassport"));

    const uploads = {
      ...base,
      fatherPassport: { type: "image/jpeg", size: 40_000 },
      immunisationCard: { type: "application/pdf", size: 90_000 },
    };
    const a = await apply(ctx, form, uploads);
    expect(Object.keys(a.uploads).sort()).toEqual(["birthCertificate", "fatherPassport", "immunisationCard", "passport"]);
    expect(a.started.status).toBe("REDIRECT");

    ctx.pay.pay(a.attempt.reference, 1_000_000);
    const view = await getApplicationStatus(ctx.deps, { reference: a.reference, token: a.token, audience: "parent" }, freshHeaders());
    expect(view.documents.sort()).toEqual(["birthCertificate", "fatherPassport", "immunisationCard", "passport"]);
    expect(view.toBring).toContain("The mother's passport photograph");
    expect(view.toBring).not.toContain("A photocopy of the child's immunisation card");
    const parentEmail = ctx.mail.sent.find((m) => m.to === "grace.dung@example.com")!;
    expect(parentEmail.text).toContain("The mother's passport photograph");

    const app = (await ctx.store.getApplicationByReference(a.reference))!;
    const school = accessToken(ctx.deps.config.linkSecret, "school", app.reference, app.id);
    const card = await getDocument(ctx.deps, { reference: a.reference, token: school, audience: "school", kind: "immunisationCard" }, freshHeaders());
    expect(card).toEqual({ type: "redirect", url: expect.stringContaining("immunisation-card") });
    const notUploaded = getDocument(ctx.deps, { reference: a.reference, token: school, audience: "school", kind: "motherPassport" }, freshHeaders());
    await expect(notUploaded).rejects.toBeInstanceOf(AdmissionError);
    const parent = getDocument(ctx.deps, { reference: a.reference, token: a.token, audience: "parent", kind: "fatherPassport" }, freshHeaders());
    await expect(parent).rejects.toBeInstanceOf(AdmissionError);
  });

  it("rejects an optional upload that is not really an image", async () => {
    const ctx = await setup();
    const form = sampleInput();
    form.documents = { fatherPassport: "upload", motherPassport: "bring", immunisationCard: "bring" };
    const created = await createApplication(
      ctx.deps,
      { form, uploads: { ...base, fatherPassport: { type: "image/jpeg", size: 40_000 } } },
      freshHeaders(),
    );
    ctx.files.set(created.uploads.passport!.path, JPEG);
    ctx.files.set(created.uploads.birthCertificate!.path, PDF);
    ctx.files.set(created.uploads.fatherPassport!.path, PDF);
    const p = startPayment(ctx.deps, { reference: created.reference, token: created.token }, freshHeaders());
    await expect(p).rejects.toBeInstanceOf(AdmissionError);
    await p.catch((e: AdmissionError) => {
      expect(e.code).toBe("DOCUMENTS_INVALID");
      expect(e.details?.field).toBe("fatherPassport");
    });
  });

  it("deletes the optional uploads too when an unpaid application expires", async () => {
    const ctx = await setup();
    const form = sampleInput();
    form.documents = { fatherPassport: "upload", motherPassport: "bring", immunisationCard: "bring" };
    await apply(ctx, form, { ...base, fatherPassport: { type: "image/jpeg", size: 40_000 } });
    expect(ctx.files.size).toBe(3);
    await ctx.db.query("UPDATE admission_applications SET created_at = now() - interval '31 days'");
    await ctx.db.query("UPDATE admission_payment_attempts SET created_at = now() - interval '31 days'");
    await reconcile(ctx.deps);
    expect(ctx.files.size).toBe(0);
  });
});
