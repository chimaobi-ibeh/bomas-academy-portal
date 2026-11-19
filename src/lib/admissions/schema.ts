import { z } from "zod";

/**
 * One schema for the whole online application. The browser uses it to validate each step,
 * the server re-validates everything with it, and the PDF generators read the stored result.
 * Field names follow the original paper forms (see docs/admissions/PLAN.md, section 4).
 */

export const FORM_VERSION = 1;

/** Classes offered for admission (question Q4 in the plan: confirm with Bomas). */
export const CLASS_OPTIONS = [
  "Pre-Dawn",
  "Dawn",
  "Nursery One",
  "Nursery Two",
  "Nursery Three",
  "Primary One",
  "Primary Two",
  "Primary Three",
  "Primary Four",
  "Primary Five",
  "Primary Six",
  "JSS 1",
  "JSS 2",
  "JSS 3",
  "SSS 1",
  "SSS 2",
  "SSS 3",
] as const;

/** The ten boxes printed on the Class Form ("Pre-School - Grade 5"), in printed order. */
export const CLASS_FORM_GRADES = [
  "Pre-Dawn",
  "Dawn",
  "Nursery One",
  "Nursery Two",
  "Nursery Three",
  "Primary One",
  "Primary Two",
  "Primary Three",
  "Primary Four",
  "Primary Five",
] as const;

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT Abuja", "Gombe", "Imo",
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa",
  "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe",
  "Zamfara", "Not Nigerian",
] as const;

export const MARITAL_STATUSES = ["Married", "Separated", "Divorced", "Widowed"] as const;
export const TITLES = ["Mr", "Mrs", "Ms"] as const;
export const RELATIONSHIPS = ["Father", "Mother", "Other"] as const;

export const ILLNESSES = [
  { key: "measles", label: "Measles" },
  { key: "chickenPox", label: "Chicken pox" },
  { key: "whoopingCough", label: "Whooping cough" },
  { key: "rubella", label: "Rubella" },
  { key: "typhoid", label: "Typhoid" },
] as const;

export const INOCULATIONS = [
  { key: "smallPox", label: "Small pox" },
  { key: "measles", label: "Measles" },
  { key: "polio", label: "Polio" },
  { key: "tetanus", label: "Tetanus" },
  { key: "bcg", label: "BCG" },
] as const;

export const AILMENTS = [
  { key: "respiratory", label: "Respiratory infection?" },
  { key: "earNoseThroat", label: "Ear, nose or throat problem?" },
  { key: "eye", label: "Eye problem?" },
  { key: "otherInfirmityOrAllergy", label: "Any other infirmity or allergy?" },
] as const;

const t = (max: number) => z.string().trim().max(max);
/** A required choice. Unanswered radios/selects get a friendly message instead of zod's default. */
const choice = <T extends readonly [string, ...string[]]>(values: T, message: string) =>
  z.enum(values as unknown as [T[number], ...T[number][]], { errorMap: () => ({ message }) });
const opt = (max = 200) => t(max).optional().default("");
const req = (label: string, max = 200) => t(max).min(1, `Please enter ${label}`);
const phone = (label: string) =>
  t(30).refine((v) => v === "" || /^[+()\d\s-]{7,30}$/.test(v), `Enter a valid ${label}`);
const optPhone = (label: string) => phone(label).optional().default("");
const optEmail = t(200)
  .refine((v) => v === "" || z.string().email().safeParse(v).success, "Enter a valid email address")
  .optional()
  .default("");
const yesNo = choice(["yes", "no"] as const, "Please choose yes or no");
const isoDate = (label: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `Please enter ${label}`)
    .refine((v) => !Number.isNaN(Date.parse(v)), `Please enter a valid ${label}`);

const parentSchema = z.object({
  fullName: opt(120),
  occupation: opt(120),
  phone: optPhone("phone number"),
  homePhone: optPhone("home phone"),
  officePhone: optPhone("office phone"),
  mobilePhone: optPhone("mobile phone"),
  email: optEmail,
  address: opt(300),
});

const tickWithDate = z.object({ ticked: z.boolean().default(false), date: opt(40) });

const baseShapeForIssues = z
  .object({
    // ---- Step 1: Parent / guardian (Form 1, Class Form) -------------------------------
    applicant: z.object({
      title: choice(TITLES, "Please choose a title"),
      surname: req("your surname", 80),
      firstName: req("your first name", 80),
      middleName: opt(80),
      relationship: choice(RELATIONSHIPS, "Please choose your relationship"),
      relationshipOther: opt(40),
      email: t(200).email("Enter a valid email address. Your receipt will be sent here."),
      phone: phone("phone number").refine((v) => v.length > 0, "Please enter your phone number"),
    }),
    father: parentSchema,
    mother: parentSchema,
    maritalStatus: choice(MARITAL_STATUSES, "Please choose a marital status"),
    custody: opt(200),
    residentialAddress: req("your full residential address", 300),
    livesWith: req("who the child lives with", 120),
    otherCustodians: z
      .array(z.object({ name: opt(120), relationship: opt(60), workPhone: optPhone("work phone") }))
      .max(2)
      .default([]),

    // ---- Step 2: The child (Form 1, Class Form) ---------------------------------------
    child: z.object({
      surname: req("the child's surname", 80),
      firstName: req("the child's first name", 80),
      middleName: opt(80),
      gender: choice(["Male", "Female"] as const, "Please choose the child's gender"),
      dateOfBirth: isoDate("the child's date of birth"),
      placeOfBirth: req("the place of birth", 120),
      stateOfOrigin: choice(NIGERIAN_STATES, "Please choose a state of origin"),
      tribe: opt(60),
      religion: opt(60),
      classSought: choice(CLASS_OPTIONS, "Please choose a class"),
      primaryLanguage: req("the child's primary language", 60),
      homeLanguage: req("the language spoken at home", 60),
    }),
    homePhone: optPhone("home phone"),
    previousSchool: opt(300),
    heardAbout: req("how you heard about us", 200),
    introducerName: opt(120),
    introducerPhone: optPhone("phone number"),
    childrenAtBomas: z.coerce.number().int().min(0).max(20).default(0),
    otherChildren: z
      .array(z.object({ name: opt(120), dateOfBirth: opt(20) }))
      .max(4)
      .default([]),
    transport: z.object({
      bus: opt(120),
      parentDropOff: opt(120),
      walksHome: opt(120),
      other: opt(200),
    }),

    // ---- Step 3: Educational background (Form 2) -------------------------------------
    education: z.object({
      neverAttended: z.boolean().default(false),
      presentSchool: opt(160),
      dateFrom: opt(40),
      dateTo: opt(40),
      reasonForLeaving: opt(300),
      headTeacher: opt(160),
      schoolAddress: opt(300),
      schoolPhone: optPhone("school phone"),
      schoolEmail: optEmail,
      languageOfInstruction: opt(60),
      difficulties: opt(600),
    }),
    reasonForChoosing: req("why you chose Bomas Academy", 1000),

    // ---- Step 4: Health record (Form 2, Class Form) ----------------------------------
    health: z.object({
      illnesses: z.object(
        Object.fromEntries(ILLNESSES.map((i) => [i.key, tickWithDate])) as Record<
          (typeof ILLNESSES)[number]["key"],
          typeof tickWithDate
        >,
      ),
      inoculations: z.object(
        Object.fromEntries(INOCULATIONS.map((i) => [i.key, tickWithDate])) as Record<
          (typeof INOCULATIONS)[number]["key"],
          typeof tickWithDate
        >,
      ),
      otherVaccination: yesNo,
      otherVaccinationType: opt(200),
      hospitalAdmission: yesNo,
      hospitalAdmissionYear: opt(20),
      hospitalAdmissionDetails: opt(300),
      surgery: yesNo,
      surgeryDetails: opt(300),
      ailments: z.object(
        Object.fromEntries(AILMENTS.map((a) => [a.key, yesNo])) as Record<
          (typeof AILMENTS)[number]["key"],
          typeof yesNo
        >,
      ),
      medication: yesNo,
      medicationDetails: opt(300),
      otherMedicalInfo: opt(600),
      specialInformation: opt(800),
    }),

    // ---- Step 6: Declarations and agreement ------------------------------------------
    declarations: z.object({
      schoolYearFrom: req("the first school year", 20),
      schoolYearTo: req("the last school year", 20),
      classFormDeclaration: z.literal(true, {
        errorMap: () => ({ message: "Please tick to accept the declaration" }),
      }),
      homeSchoolAgreement: z.literal(true, {
        errorMap: () => ({ message: "Please tick to accept the Home/School Agreement" }),
      }),
      dataConsent: z.literal(true, {
        errorMap: () => ({ message: "Please tick to consent so we can process the application" }),
      }),
      signatureName: req("your full name as your signature", 160),
    }),
  });

export const applicationSchema = baseShapeForIssues.superRefine((v, ctx) => {
  for (const issue of crossFieldIssues(v)) ctx.addIssue({ code: "custom", ...issue });
});

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/**
 * Rules that depend on more than one answer. Shared by the schema and by the form, which runs
 * them per step (zod only runs refinements once every other field is valid).
 * Tolerates a half-completed form.
 */
export function crossFieldIssues(v: DeepPartial<z.output<typeof baseShapeForIssues>>) {
  const issues: { path: (string | number)[]; message: string }[] = [];
  const needs = (cond: unknown, path: (string | number)[], message: string) => {
    if (cond) issues.push({ path, message });
  };
  needs(
    v.applicant?.relationship === "Other" && !v.applicant?.relationshipOther,
    ["applicant", "relationshipOther"],
    "Please say how you are related to the child (for example UNCLE)",
  );
  needs(v.maritalStatus === "Divorced" && !v.custody, ["custody"], "Please say who has custody");
  needs(!v.father?.phone && !v.mother?.phone, ["father", "phone"], "Please give a phone number for at least one parent");
  needs(!v.father?.fullName && !v.mother?.fullName, ["father", "fullName"], "Please give the name of at least one parent");
  const dob = Date.parse(v.child?.dateOfBirth ?? "");
  if (!Number.isNaN(dob)) {
    const ageYears = (Date.now() - dob) / (365.25 * 24 * 3600 * 1000);
    needs(ageYears < 1 || ageYears > 25, ["child", "dateOfBirth"], "Please check the date of birth");
  }
  const h = v.health;
  needs(h?.otherVaccination === "yes" && !h?.otherVaccinationType, ["health", "otherVaccinationType"], "Please state the type of vaccination");
  needs(h?.hospitalAdmission === "yes" && !h?.hospitalAdmissionDetails, ["health", "hospitalAdmissionDetails"], "Please give the kind of illness and duration");
  needs(h?.surgery === "yes" && !h?.surgeryDetails, ["health", "surgeryDetails"], "Please give the year and type of operation");
  needs(h?.medication === "yes" && !h?.medicationDetails, ["health", "medicationDetails"], "Please say which medication");
  const sig = (v.declarations?.signatureName ?? "").toLowerCase().replace(/\s+/g, " ");
  const surname = (v.applicant?.surname ?? "").trim().toLowerCase();
  needs(sig && surname && !sig.includes(surname), ["declarations", "signatureName"], "Please type your full name, including your surname");
  return issues;
}

export type ApplicationData = z.infer<typeof applicationSchema>;
export type ApplicationInput = z.input<typeof applicationSchema>;

/** Document uploads accepted online (question Q3 in the plan). */
export const UPLOADS = {
  passport: {
    label: "Child's passport photograph",
    types: ["image/jpeg", "image/png"],
    maxBytes: 3 * 1024 * 1024,
    hint: "A clear, recent, front-facing photo. JPG or PNG, up to 3 MB.",
  },
  birthCertificate: {
    label: "Child's birth certificate",
    types: ["application/pdf", "image/jpeg", "image/png"],
    maxBytes: 5 * 1024 * 1024,
    hint: "A scan or clear photo of the certificate. PDF, JPG or PNG, up to 5 MB.",
  },
} as const;
export type UploadKind = keyof typeof UPLOADS;

export function fullName(p: { surname: string; firstName: string; middleName?: string }) {
  return [p.firstName, p.middleName, p.surname].filter(Boolean).join(" ").trim();
}

export function childName(d: ApplicationData) {
  return fullName(d.child).toUpperCase();
}

export function applicantName(d: ApplicationData) {
  return `${d.applicant.title} ${fullName(d.applicant)}`;
}

/** Empty starting values for the form. */
export function emptyApplication(): ApplicationInput {
  const parent = {
    fullName: "", occupation: "", phone: "", homePhone: "", officePhone: "",
    mobilePhone: "", email: "", address: "",
  };
  const year = new Date().getFullYear();
  return {
    applicant: {
      title: undefined as never, surname: "", firstName: "", middleName: "",
      relationship: undefined as never, relationshipOther: "", email: "", phone: "",
    },
    father: { ...parent },
    mother: { ...parent },
    maritalStatus: undefined as never,
    custody: "",
    residentialAddress: "",
    livesWith: "",
    otherCustodians: [],
    child: {
      surname: "", firstName: "", middleName: "", gender: undefined as never, dateOfBirth: "",
      placeOfBirth: "", stateOfOrigin: undefined as never, tribe: "", religion: "",
      classSought: undefined as never, primaryLanguage: "", homeLanguage: "",
    },
    homePhone: "",
    previousSchool: "",
    heardAbout: "",
    introducerName: "",
    introducerPhone: "",
    childrenAtBomas: 0,
    otherChildren: [],
    transport: { bus: "", parentDropOff: "", walksHome: "", other: "" },
    education: {
      neverAttended: false, presentSchool: "", dateFrom: "", dateTo: "", reasonForLeaving: "",
      headTeacher: "", schoolAddress: "", schoolPhone: "", schoolEmail: "",
      languageOfInstruction: "", difficulties: "",
    },
    reasonForChoosing: "",
    health: {
      illnesses: Object.fromEntries(ILLNESSES.map((i) => [i.key, { ticked: false, date: "" }])) as never,
      inoculations: Object.fromEntries(
        INOCULATIONS.map((i) => [i.key, { ticked: false, date: "" }]),
      ) as never,
      otherVaccination: undefined as never,
      otherVaccinationType: "",
      hospitalAdmission: undefined as never,
      hospitalAdmissionYear: "",
      hospitalAdmissionDetails: "",
      surgery: undefined as never,
      surgeryDetails: "",
      ailments: Object.fromEntries(AILMENTS.map((a) => [a.key, undefined])) as never,
      medication: undefined as never,
      medicationDetails: "",
      otherMedicalInfo: "",
      specialInformation: "",
    },
    declarations: {
      schoolYearFrom: String(year),
      schoolYearTo: String(year + 1),
      classFormDeclaration: false as never,
      homeSchoolAgreement: false as never,
      dataConsent: false as never,
      signatureName: "",
    },
  };
}
