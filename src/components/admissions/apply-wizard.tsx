import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FormProvider, useForm, useFormContext, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  AILMENTS,
  CLASS_OPTIONS,
  ILLNESSES,
  INOCULATIONS,
  MARITAL_STATUSES,
  NIGERIAN_STATES,
  REQUIRED_UPLOAD_KINDS,
  SCHOOL_SECTIONS,
  UPLOADS,
  UPLOAD_KINDS,
  applicationSchema,
  crossFieldIssues,
  documentsToBring,
  emptyApplication,
  optionalDocumentsFor,
  schoolSection,
  uploadsFor,
  type ApplicationData,
  type ApplicationInput,
  type UploadKind,
} from "@/lib/admissions/schema";
import { CLASS_FORM_DECLARATION, HOME_SCHOOL_AGREEMENT, PAYMENT_DISCLAIMER } from "@/lib/admissions/original-text";
import { formatNaira } from "@/lib/admissions/format";
import {
  createAdmissionApplication,
  refreshAdmissionUploads,
  startAdmissionPayment,
} from "@/lib/api/admissions.functions";
import { savePending } from "@/lib/admissions/pending";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, Pencil, TriangleAlert, Upload } from "@/components/icons";
import {
  CheckField,
  ChoiceField,
  SelectField,
  TextAreaField,
  TextField,
  TickDateField,
  YesNoField,
} from "./fields";
import { cn } from "@/lib/utils";

const Text = TextField<ApplicationInput>;
const Area = TextAreaField<ApplicationInput>;
const Select = SelectField<ApplicationInput>;
const Choice = ChoiceField<ApplicationInput>;
const YesNo = YesNoField<ApplicationInput>;
const Check = CheckField<ApplicationInput>;

type StepKey = "parent" | "child" | "education" | "health" | "documents" | "agreements" | "review";
const STEPS: { key: StepKey; title: string; short: string; fields: string[] }[] = [
  {
    key: "parent",
    title: "Parent or guardian",
    short: "Parent",
    fields: ["applicant", "father", "mother", "maritalStatus", "custody", "residentialAddress", "livesWith", "homePhone", "hasOtherCustodians", "otherCustodians"],
  },
  {
    key: "child",
    title: "About your child",
    short: "Child",
    fields: ["child", "heardAbout", "introduced", "introducerName", "introducerPhone", "childrenAtBomas", "hasOtherChildren", "otherChildren", "transport"],
  },
  { key: "education", title: "Educational background", short: "School", fields: ["education", "previousSchool", "reasonForChoosing"] },
  { key: "health", title: "Health record", short: "Health", fields: ["health"] },
  { key: "documents", title: "Documents", short: "Documents", fields: ["documents"] },
  { key: "agreements", title: "Declaration and agreement", short: "Agreement", fields: ["declarations"] },
  { key: "review", title: "Review and pay", short: "Pay", fields: [] },
];

const DRAFT_KEY = "bomas-admission-draft-v2";
const TODAY = new Date().toISOString().slice(0, 10);

type Info = { enabled: boolean; feeKobo: number | null; testMode: boolean };
type UploadTarget = { path: string; token: string };
type Pending = {
  reference: string;
  token: string;
  formJson: string;
  uploads: Partial<Record<UploadKind, UploadTarget>>;
  uploaded: Partial<Record<UploadKind, boolean>>;
};
type Files = Record<UploadKind, File | null>;

const noFiles = () => Object.fromEntries(UPLOAD_KINDS.map((k) => [k, null])) as Files;

/**
 * Removes answers that no longer apply (for example the rows of a question later answered
 * "No"), so the saved application and the PDFs only contain what the parent meant.
 */
function clean(v: ApplicationInput): ApplicationInput {
  const yes = (x: unknown) => x === "yes";
  const kinds = optionalDocumentsFor(v as never);
  return {
    ...v,
    custody: v.maritalStatus === "Divorced" || v.maritalStatus === "Separated" ? v.custody : "",
    otherCustodians: yes(v.hasOtherCustodians)
      ? (v.otherCustodians ?? []).filter((r) => r && (r.name || r.relationship || r.workPhone))
      : [],
    introducerName: yes(v.introduced) ? v.introducerName : "",
    introducerPhone: yes(v.introduced) ? v.introducerPhone : "",
    otherChildren: yes(v.hasOtherChildren) ? (v.otherChildren ?? []).filter((r) => r && (r.name || r.dateOfBirth)) : [],
    previousSchool: "",
    education: v.education && {
      ...v.education,
      difficulties: yes(v.education.hasDifficulties) ? v.education.difficulties : "",
    },
    health: v.health && {
      ...v.health,
      otherMedicalInfo: yes(v.health.hasOtherMedicalInfo) ? v.health.otherMedicalInfo : "",
      specialInformation: yes(v.health.hasSpecialInformation) ? v.health.specialInformation : "",
    },
    documents: Object.fromEntries(kinds.filter((k) => v.documents?.[k]).map((k) => [k, v.documents?.[k]])),
  };
}

function readDraft(): ApplicationInput | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as ApplicationInput) : null;
  } catch {
    return null;
  }
}

/** Photos are scaled down before upload so families on mobile data are not held up. */
async function shrinkIfLarge(file: File, maxBytes: number): Promise<File> {
  if (!["image/jpeg", "image/png"].includes(file.type) || file.size <= Math.min(maxBytes, 1_500_000)) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

function checkFile(kind: UploadKind, file: File | null): string | null {
  const rule = UPLOADS[kind];
  if (!file) return `Please choose the ${rule.label.toLowerCase()}.`;
  if (!(rule.types as readonly string[]).includes(file.type)) return `${rule.label}: ${rule.hint}`;
  if (file.size > rule.maxBytes) return `${rule.label} is too large. ${rule.hint}`;
  if (file.size === 0) return `${rule.label} appears to be empty. Please choose it again.`;
  return null;
}

export function ApplyWizard({ info }: { info: Info }) {
  const navigate = useNavigate();
  const methods = useForm<ApplicationInput, unknown, ApplicationData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: emptyApplication(),
    mode: "onTouched",
  });
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<Files>(noFiles);
  const [fileErrors, setFileErrors] = useState<Partial<Record<UploadKind, string>>>({});
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const problemRef = useRef<HTMLParagraphElement>(null);

  // Make sure a problem message is never hidden below the fold.
  useEffect(() => {
    if (problem) problemRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [problem]);

  // Restore an unfinished draft from this browser tab (files cannot be restored).
  useEffect(() => {
    const draft = readDraft();
    if (draft) methods.reset({ ...emptyApplication(), ...draft });
    const sub = methods.watch((values) => {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(values));
      } catch {
        /* storage full or blocked: the form still works */
      }
    });
    return () => sub.unsubscribe();
  }, [methods]);

  const goTo = (i: number) => {
    setStep(i);
    setProblem(null);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  async function validateStep(i: number) {
    const s = STEPS[i];
    if (!s.fields.length) return true;
    const ok = await methods.trigger(s.fields as FieldPath<ApplicationInput>[], { shouldFocus: true });
    const extra = crossFieldIssues(methods.getValues() as never).filter((x) => s.fields.includes(String(x.path[0])));
    extra.forEach((x) => methods.setError(x.path.join(".") as FieldPath<ApplicationInput>, { type: "custom", message: x.message }));
    if (ok && extra.length) {
      document.getElementsByName(extra[0].path.join("."))[0]?.focus();
    }
    let filesOk = true;
    if (s.key === "documents") {
      const errs: Partial<Record<UploadKind, string>> = {};
      for (const k of uploadsFor(methods.getValues() as never)) {
        const e = checkFile(k, files[k]);
        if (e) errs[k] = e;
      }
      setFileErrors(errs);
      filesOk = Object.keys(errs).length === 0;
    }
    return ok && extra.length === 0 && filesOk;
  }

  async function next() {
    if (await validateStep(step)) goTo(Math.min(step + 1, STEPS.length - 1));
    else setProblem("Please answer the highlighted questions.");
  }

  /** Full check before payment; jumps to the first step with a problem. */
  async function validateAll() {
    for (let i = 0; i < STEPS.length - 1; i++) {
      if (!(await validateStep(i))) {
        goTo(i);
        setProblem("Please answer the highlighted questions on this step.");
        return null;
      }
    }
    const parsed = applicationSchema.safeParse(clean(methods.getValues()));
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const idx = STEPS.findIndex((s) => s.fields.includes(String(first.path[0])));
      goTo(idx >= 0 ? idx : 0);
      setProblem(first.message);
      return null;
    }
    return parsed.data;
  }

  async function upload(p: Pending, prepared: Partial<Record<UploadKind, File>>) {
    for (const kind of Object.keys(prepared) as UploadKind[]) {
      if (p.uploaded[kind]) continue;
      const target = p.uploads[kind];
      const file = prepared[kind];
      if (!target || !file) throw new Error("upload");
      setBusy(`Uploading the ${UPLOADS[kind].label.toLowerCase()}...`);
      const { error } = await supabase.storage
        .from("admission-documents")
        .uploadToSignedUrl(target.path, target.token, file, { contentType: file.type, upsert: true });
      if (error) throw new Error("upload");
      p.uploaded[kind] = true;
    }
  }

  async function submit() {
    setProblem(null);
    if (!info.enabled || !info.feeKobo) {
      setProblem("Online submission is not available yet. Please contact the admissions office to apply.");
      return;
    }
    const data = await validateAll();
    if (!data) return;
    const form = clean(methods.getValues());
    const formJson = JSON.stringify(form);
    try {
      setBusy("Preparing your documents...");
      const prepared: Partial<Record<UploadKind, File>> = {};
      for (const kind of uploadsFor(data)) prepared[kind] = await shrinkIfLarge(files[kind]!, UPLOADS[kind].maxBytes);

      // Save the application once. A retry with unchanged answers reuses it.
      let p = pending && pending.formJson === formJson ? pending : null;
      if (!p) {
        setBusy("Saving your application...");
        const declared = Object.fromEntries(
          Object.entries(prepared).map(([k, f]) => [k, { type: f.type, size: f.size }]),
        ) as { passport: { type: string; size: number }; birthCertificate: { type: string; size: number } };
        const res = await createAdmissionApplication({ data: { form, uploads: declared } });
        if (!res.ok) return handleError(res);
        p = { reference: res.reference, token: res.token, formJson, uploads: res.uploads, uploaded: {} };
        setPending(p);
        savePending({ reference: p.reference, token: p.token });
      }
      const saved = p;

      try {
        await upload(saved, prepared);
      } catch {
        setPending({ ...saved });
        setProblem("A document did not upload. Please check your internet connection and press the button again. Nothing has been charged.");
        return;
      }

      setBusy("Opening the secure payment page...");
      const pay = await startAdmissionPayment({ data: { reference: saved.reference, token: saved.token } });
      if (!pay.ok) {
        if (pay.code === "DOCUMENTS_INVALID" || pay.code === "DOCUMENTS_MISSING") {
          const fresh = await refreshAdmissionUploads({ data: { reference: saved.reference, token: saved.token } });
          if (fresh.ok) setPending({ ...saved, uploads: fresh.uploads, uploaded: {} });
          const field = (UPLOAD_KINDS as string[]).includes(pay.field ?? "") ? (pay.field as UploadKind) : "passport";
          setFileErrors({ [field]: pay.message });
          goTo(STEPS.findIndex((s) => s.key === "documents"));
          setProblem(pay.message);
          return;
        }
        return handleError(pay);
      }
      if (pay.status === "SUBMITTED") {
        sessionStorage.removeItem(DRAFT_KEY);
        await navigate({ to: "/admissions/application", search: { ref: saved.reference, reference: undefined }, hash: `t=${saved.token}` });
        return;
      }
      setBusy("Taking you to the payment page...");
      window.location.assign(pay.checkoutUrl);
    } catch {
      setProblem("We could not reach the school's system. Please check your internet connection and try again. Nothing has been charged.");
    } finally {
      setBusy((b) => (b === "Taking you to the payment page..." ? b : null));
    }
  }

  function handleError(res: { code: string; message: string; field?: string }) {
    if (res.code === "INVALID" && res.field) {
      const idx = STEPS.findIndex((s) => s.fields.includes(res.field!.split(".")[0]));
      if (idx >= 0) goTo(idx);
      methods.setError(res.field as FieldPath<ApplicationInput>, { type: "server", message: res.message });
    }
    if (res.code === "DOCUMENTS_INVALID" && res.field) {
      setFileErrors({ [res.field]: res.message });
      goTo(STEPS.findIndex((s) => s.key === "documents"));
    }
    setProblem(res.message);
  }

  const current = STEPS[step];
  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <FormProvider {...methods}>
      <div ref={topRef} className="scroll-mt-24" />
      {info.testMode && (
        <p className="mb-6 rounded-md border border-gold bg-gold-soft px-4 py-3 text-sm font-semibold text-navy-deep">
          Test mode: payments use the provider's sandbox and no real money is taken.
        </p>
      )}

      {/* Progress */}
      <nav aria-label="Application progress" className="mb-8">
        <div className="flex items-baseline justify-between gap-4">
          <p className="label-mono text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </p>
          <p className="label-mono text-muted-foreground">{progress}%</p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
          <div className="h-full rounded-full bg-gold transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
        <ol className="mt-4 hidden gap-1 md:flex">
          {STEPS.map((s, i) => (
            <li key={s.key} className="flex-1">
              <button
                type="button"
                disabled={i > step}
                onClick={() => i < step && goTo(i)}
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "w-full border-t-[3px] pt-2 text-left font-display text-xs font-semibold",
                  i < step && "border-navy text-navy hover:underline",
                  i === step && "border-gold text-foreground",
                  i > step && "border-border text-muted-foreground",
                )}
              >
                {s.short}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (current.key === "review") void submit();
          else void next();
        }}
      >
        <h2 className="section-title">{current.title}</h2>
        {current.key !== "review" && (
          <p className="mt-2 text-sm text-muted-foreground">
            Every question marked <span className="text-destructive">*</span> must be answered.
          </p>
        )}
        <div className="mt-6 grid gap-8">
          {current.key === "parent" && <ParentStep />}
          {current.key === "child" && <ChildStep />}
          {current.key === "education" && <EducationStep />}
          {current.key === "health" && <HealthStep />}
          {current.key === "documents" && (
            <DocumentsStep files={files} errors={fileErrors} onChange={(k, f) => {
              setFiles((prev) => ({ ...prev, [k]: f }));
              setFileErrors((prev) => ({ ...prev, [k]: f ? checkFile(k, f) ?? undefined : undefined }));
              if (pending) setPending({ ...pending, uploaded: { ...pending.uploaded, [k]: false } });
            }} />
          )}
          {current.key === "agreements" && <AgreementsStep />}
          {current.key === "review" && <ReviewStep info={info} files={files} onEdit={goTo} />}
        </div>

        {problem && (
          <p ref={problemRef} role="alert" className="mt-8 flex gap-2 rounded-md border border-destructive/30 bg-danger-soft px-4 py-3 text-sm font-medium text-destructive">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {problem}
          </p>
        )}

        <div className="sticky bottom-0 z-10 -mx-4 mt-10 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
          {step > 0 ? (
            <Button type="button" variant="outline" size="lg" onClick={() => goTo(step - 1)} disabled={!!busy}>
              <ArrowLeft aria-hidden="true" /> Back
            </Button>
          ) : (
            <span />
          )}
          {current.key === "review" ? (
            <Button type="submit" variant="gold" size="lg" disabled={!!busy || !info.enabled || !info.feeKobo}>
              <Lock aria-hidden="true" />
              {info.enabled && info.feeKobo
                ? (busy ?? `Pay ${formatNaira(info.feeKobo)} and submit`)
                : "Submission opens soon"}
            </Button>
          ) : (
            <Button type="submit" size="lg">
              Continue <ArrowRight aria-hidden="true" />
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}

// ---------------------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------------------

function Section({ title, children, note }: { title: string; children: ReactNode; note?: ReactNode }) {
  return (
    <section className="grid gap-5 rounded-lg border bg-surface p-5 sm:p-7">
      <div>
        <h3 className="font-display text-lg font-bold tracking-tight">{title}</h3>
        {note && <p className="mt-1 text-sm text-muted-foreground">{note}</p>}
      </div>
      {children}
    </section>
  );
}

const grid2 = "grid gap-5 sm:grid-cols-2";
const grid3 = "grid gap-5 sm:grid-cols-3";
const IF_ANY = "(if you have one)";

function ParentStep() {
  const { watch } = useFormContextTyped();
  const relationship = watch("applicant.relationship");
  const marital = watch("maritalStatus");
  const otherCustodians = watch("hasOtherCustodians");
  const parentFields = (who: "father" | "mother", label: string) => {
    const unavailable = watch(`${who}.unavailable`);
    const same = watch(`${who}.sameAddress`);
    return (
      <Section title={label}>
        <Check
          name={`${who}.unavailable`}
          label={`I cannot give the ${label.toLowerCase()}'s details (for example, deceased or not in contact)`}
        />
        {unavailable ? (
          <Text name={`${who}.unavailableReason`} label="Please say why" required placeholder="e.g. Deceased" />
        ) : (
          <>
            <div className={grid2}>
              <Text name={`${who}.fullName`} label={`${label}'s full name`} required autoComplete="off" />
              <Text name={`${who}.occupation`} label="Occupation" required />
              <Text name={`${who}.phone`} label="Main phone number" required type="tel" inputMode="tel" />
              <Text name={`${who}.email`} label="Email" required type="email" inputMode="email" />
              <Text name={`${who}.mobilePhone`} label="Another mobile number" optionalText={IF_ANY} type="tel" inputMode="tel" />
              <Text name={`${who}.officePhone`} label="Office (work) phone" optionalText={IF_ANY} type="tel" inputMode="tel" />
              <Text name={`${who}.homePhone`} label="Home (landline) phone" optionalText={IF_ANY} type="tel" inputMode="tel" />
            </div>
            <Check name={`${who}.sameAddress`} label={`The ${label.toLowerCase()}'s address is the same as the child's home address`} />
            {!same && <Text name={`${who}.address`} label={`${label}'s address`} required />}
          </>
        )}
      </Section>
    );
  };
  return (
    <>
      <Section title="You, the person applying" note="Your receipt and documents will be sent to your email address.">
        <Choice
          name="applicant.title"
          label="Title"
          options={[{ value: "Mr", label: "Mr." }, { value: "Mrs", label: "Mrs." }, { value: "Ms", label: "Ms." }]}
          columns="grid-cols-3 sm:flex"
        />
        <div className={grid3}>
          <Text name="applicant.surname" label="Surname" required autoComplete="family-name" uppercase />
          <Text name="applicant.firstName" label="First name" required autoComplete="given-name" uppercase />
          <Text name="applicant.middleName" label="Middle name" optionalText={IF_ANY} autoComplete="additional-name" uppercase />
        </div>
        <Choice
          name="applicant.relationship"
          label="Your relationship to the child"
          options={[{ value: "Father", label: "Father" }, { value: "Mother", label: "Mother" }, { value: "Other", label: "Other guardian" }]}
          columns="grid-cols-1 sm:flex"
        />
        {relationship === "Other" && (
          <Text
            name="applicant.relationshipOther"
            label="How are you related to the child?"
            required
            placeholder="e.g. UNCLE, COUSIN"
            hint="As the paper form asks, your status replaces the word PARENT on the Admission Form."
            uppercase
          />
        )}
        <div className={grid2}>
          <Text name="applicant.email" label="Your email address" required type="email" inputMode="email" autoComplete="email" />
          <Text name="applicant.phone" label="Your phone number" required type="tel" inputMode="tel" autoComplete="tel" />
        </div>
      </Section>
      {parentFields("father", "Father")}
      {parentFields("mother", "Mother")}
      <Section title="Family and home">
        <Choice
          name="maritalStatus"
          label="Parental marital status"
          options={MARITAL_STATUSES.map((m) => ({ value: m, label: m }))}
        />
        {(marital === "Divorced" || marital === "Separated") && <Text name="custody" label="Who has custody of the child?" required />}
        <Area name="residentialAddress" label="Full residential address in Nigeria" required rows={2} />
        <div className={grid2}>
          <Text name="livesWith" label="Who does the child live with?" required placeholder="e.g. Both parents" />
          <Text name="homePhone" label="Home (landline) phone" optionalText={IF_ANY} type="tel" inputMode="tel" />
        </div>
      </Section>
      <Section title="Other custodial parents or guardians">
        <YesNo name="hasOtherCustodians" label="Apart from the parents above, does anyone else have custody of or look after the child?" />
        {otherCustodians === "yes" &&
          [0, 1].map((i) => (
            <div key={i} className="grid gap-3">
              <p className="font-display text-sm font-semibold text-muted-foreground">
                {i === 0 ? "First person" : "Second person (if there is one)"}
              </p>
              <div className={grid3}>
                <Text name={`otherCustodians.${i}.name`} label="Name" required={i === 0} />
                <Text name={`otherCustodians.${i}.relationship`} label="Relationship" required={i === 0} />
                <Text name={`otherCustodians.${i}.workPhone`} label="Phone number" required={i === 0} type="tel" inputMode="tel" />
              </div>
            </div>
          ))}
      </Section>
    </>
  );
}

function ChildStep() {
  const { watch } = useFormContextTyped();
  const introduced = watch("introduced");
  const siblings = watch("hasOtherChildren");
  const cls = watch("child.classSought");
  return (
    <>
      <Section title="The child" note="Please write the child's names exactly as on the birth certificate.">
        <div className={grid3}>
          <Text name="child.surname" label="Surname" required uppercase autoComplete="off" />
          <Text name="child.firstName" label="First name" required uppercase autoComplete="off" />
          <Text name="child.middleName" label="Middle name" optionalText={IF_ANY} uppercase autoComplete="off" />
        </div>
        <div className={grid2}>
          <Choice name="child.gender" label="Gender" options={[{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }]} />
          <Text name="child.dateOfBirth" label="Date of birth" required type="date" max={TODAY} />
        </div>
        <div className={grid2}>
          <Text name="child.placeOfBirth" label="Place of birth" required />
          <Select name="child.stateOfOrigin" label="State of origin" required options={NIGERIAN_STATES} />
          <Text name="child.tribe" label="Tribe" required />
          <Text name="child.religion" label="Religion" required />
          <Select
            name="child.classSought"
            label="Class in which admission is sought"
            required
            options={CLASS_OPTIONS}
            hint={cls ? `The application fee is paid to the ${SCHOOL_SECTIONS[schoolSection(cls)].label} school account.` : undefined}
          />
          <Text
            name="childrenAtBomas"
            label="Number of children already attending Bomas Academy"
            required
            type="number"
            inputMode="numeric"
            hint="Enter 0 if none."
          />
          <Text name="child.primaryLanguage" label="Child's primary language" required />
          <Text name="child.homeLanguage" label="Primary language spoken at home" required />
        </div>
      </Section>
      <Section title="How you found us">
        <Text name="heardAbout" label="How did you hear about us?" required />
        <YesNo name="introduced" label="Did someone introduce you to the school?" />
        {introduced === "yes" && (
          <div className={grid2}>
            <Text name="introducerName" label="Name of the person who introduced you to the school" required />
            <Text name="introducerPhone" label="Their phone number" required type="tel" inputMode="tel" />
          </div>
        )}
      </Section>
      <Section title="Other children in the family">
        <YesNo name="hasOtherChildren" label="Does the child have brothers or sisters?" />
        {siblings === "yes" &&
          [0, 1, 2, 3].map((i) => (
            <div key={i} className={grid2}>
              <Text
                name={`otherChildren.${i}.name`}
                label={i === 0 ? "Name" : `Name (child ${i + 1}, if any)`}
                required={i === 0}
                optionalText=""
              />
              <Text
                name={`otherChildren.${i}.dateOfBirth`}
                label="Date of birth"
                required={i === 0}
                optionalText=""
                type="date"
                max={TODAY}
              />
            </div>
          ))}
      </Section>
      <Section title="How does your child get to school and home every day?" note="Fill in at least one.">
        <div className={grid2}>
          <Text name="transport.bus" label="Bus" optionalText="" placeholder="e.g. School bus, Rayfield route" />
          <Text name="transport.parentDropOff" label="Parent's drop-off / pick-up" optionalText="" placeholder="e.g. Mother drops off" />
          <Text name="transport.walksHome" label="Walks home" optionalText="" placeholder="e.g. With an older sibling" />
          <Text name="transport.other" label="Other arrangements" optionalText="" />
        </div>
      </Section>
    </>
  );
}

function EducationStep() {
  const { watch } = useFormContextTyped();
  const never = watch("education.neverAttended");
  const difficulties = watch("education.hasDifficulties");
  return (
    <>
      <Section title="Present school" note="This is Form 2 of the Admission Form.">
        <Check name="education.neverAttended" label="My child has not attended any school yet" />
        {!never && (
          <>
            <Text name="education.presentSchool" label="Present (or most recent) school" required />
            <div className={grid2}>
              <Text name="education.dateFrom" label="Attended from" required placeholder="e.g. September 2023" />
              <Text name="education.dateTo" label="To" required placeholder="e.g. July 2026" />
            </div>
            <Text name="education.reasonForLeaving" label="Reason for leaving" required />
            <Text name="education.headTeacher" label="Head teacher (name and title)" required />
            <Text name="education.schoolAddress" label="School address" required />
            <div className={grid3}>
              <Text name="education.schoolPhone" label="School phone" required type="tel" inputMode="tel" />
              <Text name="education.schoolEmail" label="School email" optionalText="(if the school has one)" type="email" inputMode="email" />
              <Text name="education.languageOfInstruction" label="Language of instruction" required />
            </div>
            <p className="rounded-md bg-secondary px-4 py-3 text-sm">
              Form 2 has a space for the present head teacher's signature and official stamp. After you apply, please
              print the Admission Form and ask the school to sign and stamp it.
            </p>
          </>
        )}
      </Section>
      <Section title="Learning and choosing Bomas">
        <YesNo name="education.hasDifficulties" label="Are there any educational difficulties you would like to mention (for example: dyslexia)?" />
        {difficulties === "yes" && <Area name="education.difficulties" label="Please describe them" required />}
        <Area name="reasonForChoosing" label="Why do you choose to enroll your child in Bomas Academy?" required rows={4} />
      </Section>
    </>
  );
}

function HealthStep() {
  const { watch } = useFormContextTyped();
  const h = watch("health");
  return (
    <>
      <p className="flex gap-2 rounded-md border border-navy/20 bg-navy/5 px-4 py-3 text-sm">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
        This report will be treated strictly in confidence. It is stored privately and is not included in emails.
      </p>
      <Section title="Illnesses" note="Tick any your child has had, and add the date or year for each one you tick.">
        <div className="grid gap-2 sm:grid-cols-2">
          {ILLNESSES.map((i) => <TickDateField<ApplicationInput> key={i.key} name={`health.illnesses.${i.key}`} label={i.label} />)}
        </div>
      </Section>
      <Section title="Inoculations" note="Tick the inoculations already given, and add the date or year for each one you tick.">
        <div className="grid gap-2 sm:grid-cols-2">
          {INOCULATIONS.map((i) => <TickDateField<ApplicationInput> key={i.key} name={`health.inoculations.${i.key}`} label={i.label} />)}
        </div>
        <YesNo name="health.otherVaccination" label="Has the child been given any other vaccination apart from the ones above?" />
        {h?.otherVaccination === "yes" && <Text name="health.otherVaccinationType" label="Please state the type" required />}
      </Section>
      <Section title="Hospital and operations">
        <YesNo name="health.hospitalAdmission" label="Has your child been admitted to hospital for any illness?" />
        {h?.hospitalAdmission === "yes" && (
          <div className={grid2}>
            <Text name="health.hospitalAdmissionYear" label="Year of admission" required inputMode="numeric" />
            <Text name="health.hospitalAdmissionDetails" label="Kind of illness and duration of admission" required />
          </div>
        )}
        <YesNo name="health.surgery" label="Has your child ever undergone a surgical operation?" />
        {h?.surgery === "yes" && (
          <Text
            name="health.surgeryDetails"
            label="Year and type of operation"
            required
            hint="You will be asked for the surgical report on the Documents step."
          />
        )}
      </Section>
      <Section title="Does your child suffer from any of these?">
        <div className={grid2}>
          {AILMENTS.map((a) => <YesNo key={a.key} name={`health.ailments.${a.key}`} label={a.label} />)}
        </div>
      </Section>
      <Section title="Medication and other information">
        <YesNo name="health.medication" label="Is your child taking any medication at this time?" />
        {h?.medication === "yes" && <Text name="health.medicationDetails" label="Please specify" required />}
        <YesNo name="health.hasOtherMedicalInfo" label="Is there any other medical information you would like us to be aware of?" />
        {h?.hasOtherMedicalInfo === "yes" && <Area name="health.otherMedicalInfo" label="Please give the details" required />}
        <YesNo
          name="health.hasSpecialInformation"
          label="Is there any special information that the school should know about this child or other family members that would be of help in providing services for the child?"
        />
        {h?.hasSpecialInformation === "yes" && <Area name="health.specialInformation" label="Please give the details" required />}
      </Section>
    </>
  );
}

function DocumentsStep({
  files,
  errors,
  onChange,
}: {
  files: Files;
  errors: Partial<Record<UploadKind, string>>;
  onChange: (kind: UploadKind, file: File | null) => void;
}) {
  const { watch } = useFormContextTyped();
  const values = watch();
  const optional = optionalDocumentsFor(values as never);
  const toBring = documentsToBring(values as never);
  return (
    <>
      <Section
        title="Required uploads"
        note="One passport photograph of your child is enough. The school prints any extra copies it needs from it."
      >
        {REQUIRED_UPLOAD_KINDS.map((kind) => (
          <FileDrop key={kind} kind={kind} file={files[kind]} error={errors[kind]} onChange={(f) => onChange(kind, f)} />
        ))}
      </Section>
      <Section
        title="Other documents"
        note="For each one, upload it now or choose to bring it to the school office when the school calls you in."
      >
        {optional.map((kind) => (
          <div key={kind} className="grid gap-3 border-t pt-5 first:border-t-0 first:pt-0">
            <Choice
              name={`documents.${kind}`}
              label={UPLOADS[kind].label}
              options={[
                { value: "upload", label: "Upload it now" },
                { value: "bring", label: "I will bring it when called in" },
              ]}
              columns="grid-cols-1 sm:flex"
            />
            {values.documents?.[kind] === "upload" && (
              <FileDrop kind={kind} file={files[kind]} error={errors[kind]} onChange={(f) => onChange(kind, f)} hideLabel />
            )}
          </div>
        ))}
      </Section>
      <Section title="Please bring these to the school office when called in" note="They cannot be submitted online.">
        <ul className="grid gap-2 text-[15px]">
          {toBring.map((b) => (
            <li key={b} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-navy" aria-hidden="true" />
              {b}
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

function FileDrop({
  kind,
  file,
  error,
  onChange,
  hideLabel,
}: {
  kind: UploadKind;
  file: File | null;
  error?: string;
  onChange: (f: File | null) => void;
  hideLabel?: boolean;
}) {
  const rule = UPLOADS[kind];
  const preview = useMemo(() => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const id = `upload-${kind}`;
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className={cn("font-display text-[15px] font-semibold", hideLabel && "sr-only")}>
        {rule.label}
        <span className="text-destructive" aria-hidden="true"> *</span>
      </label>
      <p className="text-sm text-muted-foreground">{rule.hint}</p>
      <label
        htmlFor={id}
        className={cn(
          "flex min-h-28 cursor-pointer items-center gap-4 rounded-lg border-2 border-dashed bg-surface p-4 hover:border-navy has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-navy/30",
          error ? "border-destructive" : file ? "border-navy" : "border-input",
        )}
      >
        {preview ? (
          <img src={preview} alt="" className="h-24 w-20 shrink-0 rounded object-cover" />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-secondary text-navy">
            <Upload className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        <span className="min-w-0">
          <span className="block break-words font-display font-semibold">{file ? file.name : "Choose a file or take a photo"}</span>
          <span className="text-sm text-muted-foreground">
            {file
              ? `${file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`}. Tap to change.`
              : "Tap here to choose"}
          </span>
        </span>
        <input
          id={id}
          type="file"
          accept={rule.types.join(",")}
          className="sr-only"
          aria-invalid={!!error}
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function AgreementsStep() {
  return (
    <>
      <Section title="Class Form declaration" note="From the Student Information Sheet.">
        <div className={grid2}>
          <Text name="declarations.schoolYearFrom" label="Complete the school year: from" required inputMode="numeric" />
          <Text name="declarations.schoolYearTo" label="to" required inputMode="numeric" />
        </div>
        <blockquote className="rounded-md bg-secondary px-4 py-3 text-[15px] leading-relaxed">
          {CLASS_FORM_DECLARATION.start} ____ to ____. {CLASS_FORM_DECLARATION.rest}
        </blockquote>
        <Check name="declarations.classFormDeclaration" label="I have read and I agree with the declaration above." />
      </Section>
      <Section title="Home/School Agreement">
        <div className="max-h-96 overflow-y-auto rounded-md border bg-background px-4 py-4 text-[15px] leading-relaxed" tabIndex={0}>
          <p className="font-display font-bold">{HOME_SCHOOL_AGREEMENT.convention.heading}</p>
          {HOME_SCHOOL_AGREEMENT.convention.lines.map((l) => <p key={l}>{l}</p>)}
          {HOME_SCHOOL_AGREEMENT.sections.map((s) => (
            <div key={s.heading} className="mt-4">
              <p className="font-display font-bold">{s.heading}</p>
              <ul className="mt-1 list-disc pl-5">
                {s.items.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <Check
          name="declarations.homeSchoolAgreement"
          label="I have read, understood and agreed to the conditions set out in the Home/School Agreement."
        />
      </Section>
      <Section title="Consent and signature">
        <Check
          name="declarations.dataConsent"
          label="I consent to Bomas Academy keeping and using the information and documents in this application, including my child's health information, to consider my child for admission."
        />
        <Text
          name="declarations.signatureName"
          label="Type your full name as your signature"
          required
          autoComplete="name"
          hint="This is your electronic signature on the Admission Form, the Class Form and the Home/School Agreement."
        />
      </Section>
    </>
  );
}

function ReviewStep({ info, files, onEdit }: { info: Info; files: Files; onEdit: (i: number) => void }) {
  const { getValues } = useFormContextTyped();
  const v = getValues();
  const name = (p: { firstName?: string; middleName?: string; surname?: string }) =>
    [p.firstName, p.middleName, p.surname].filter(Boolean).join(" ");
  const parent = (p: ApplicationInput["father"]) =>
    p?.unavailable ? `Not given (${p.unavailableReason})` : [p?.fullName, p?.phone].filter(Boolean).join(", ");
  const row = (k: string, val: ReactNode) =>
    val ? (
      <div className="grid gap-0.5 py-2 sm:grid-cols-[14rem_1fr] sm:gap-4">
        <dt className="text-sm text-muted-foreground">{k}</dt>
        <dd className="break-words font-medium">{val}</dd>
      </div>
    ) : null;
  const block = (title: string, stepIndex: number, rows: ReactNode) => (
    <section className="rounded-lg border bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-bold">{title}</h3>
        <Button type="button" variant="outline" size="sm" onClick={() => onEdit(stepIndex)}>
          <Pencil aria-hidden="true" /> Edit
        </Button>
      </div>
      <dl className="mt-2 divide-y">{rows}</dl>
    </section>
  );
  const cls = v.child?.classSought;
  return (
    <>
      <p className="text-[15px] text-muted-foreground">
        Please check your answers. Your completed Admission Form, Class Form and receipt will be ready to download as
        soon as the payment is confirmed.
      </p>
      {block("Parent or guardian", 0, <>
        {row("Name", `${v.applicant?.title ?? ""} ${name(v.applicant ?? {})}`)}
        {row("Relationship", v.applicant?.relationship === "Other" ? v.applicant?.relationshipOther : v.applicant?.relationship)}
        {row("Email", v.applicant?.email)}
        {row("Phone", v.applicant?.phone)}
        {row("Father", parent(v.father))}
        {row("Mother", parent(v.mother))}
        {row("Marital status", v.maritalStatus)}
        {row("Address", v.residentialAddress)}
      </>)}
      {block("Child", 1, <>
        {row("Name", name(v.child ?? {}).toUpperCase())}
        {row("Gender", v.child?.gender)}
        {row("Date of birth", v.child?.dateOfBirth)}
        {row("Class", cls)}
        {row("Fee paid to", cls ? `${SCHOOL_SECTIONS[schoolSection(cls)].label} school account` : "")}
        {row("State of origin", v.child?.stateOfOrigin)}
      </>)}
      {block("Educational background", 2, <>
        {row("Present school", v.education?.neverAttended ? "Has not attended school" : v.education?.presentSchool)}
        {row("Why Bomas", v.reasonForChoosing)}
      </>)}
      {block("Health record", 3, <>{row("Completed", "Yes (kept confidential)")}</>)}
      {block("Documents", 4, <>
        {uploadsFor(v as never).map((k) => (
          <Fragment key={k}>{row(UPLOADS[k].label, files[k]?.name ?? "Not chosen yet")}</Fragment>
        ))}
        {row(
          "To bring when called in",
          <ul className="list-disc pl-5">
            {documentsToBring(v as never).map((b) => <li key={b}>{b}</li>)}
          </ul>,
        )}
      </>)}
      {block("Declaration and agreement", 5, <>
        {row("Signed by", v.declarations?.signatureName)}
        {row("School year", `${v.declarations?.schoolYearFrom} to ${v.declarations?.schoolYearTo}`)}
      </>)}
      <section className="rounded-lg bg-navy-deep p-6 text-white">
        <p className="label-mono text-gold">Application fee</p>
        {info.enabled && info.feeKobo ? (
          <>
            <p className="mt-1 font-display text-4xl font-bold">{formatNaira(info.feeKobo)}</p>
            <p className="mt-3 text-sm text-white/80">
              You will pay on a secure payment page. We never see or store your card details. {PAYMENT_DISCLAIMER}
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 font-display text-2xl font-bold">Online payment is opening soon</p>
            <p className="mt-3 text-sm text-white/80">
              You cannot submit this application online yet. To apply now, please contact the admissions office.{" "}
              {PAYMENT_DISCLAIMER}
            </p>
          </>
        )}
      </section>
    </>
  );
}

function useFormContextTyped() {
  return useFormContext<ApplicationInput>();
}
