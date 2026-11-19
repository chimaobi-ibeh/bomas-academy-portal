import { z } from "zod";

/**
 * One schema for the whole online application. The browser uses it to validate each step,
 * the server re-validates everything with it, and the PDF generators read the stored result.
 * Field names follow the original paper forms (see docs/admissions/PLAN.md, section 4).
 */

export const FORM_VERSION = 2;

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

/**
 * The school has two settlement accounts. The class chosen decides which one the
 * application fee is paid into: JSS and SSS classes go to the secondary school account,
 * everything else to the nursery/primary account.
 */
export const SCHOOL_SECTIONS = {
  "nursery-primary": { label: "Nursery and Primary" },
  secondary: { label: "Secondary" },
} as const;
export type SchoolSection = keyof typeof SCHOOL_SECTIONS;

export function schoolSection(classSought: string): SchoolSection {
  return /^(JSS|SSS) /.test(classSought) ? "secondary" : "nursery-primary";
}

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

/**
 * Documents accepted online (question Q3 in the plan). The child's passport photograph and
 * birth certificate must be uploaded. Each of the others is either uploaded or brought to the
 * school when the family is called in. One passport photograph of the child is enough: the
 * school prints any extra copies it needs from the upload.
 */
const PHOTO = { types: ["image/jpeg", "image/png"], maxBytes: 3 * 1024 * 1024 } as const;
const SCAN = { types: ["application/pdf", "image/jpeg", "image/png"], maxBytes: 5 * 1024 * 1024 } as const;
const PHOTO_HINT = "A clear, recent, front-facing photo. JPG or PNG, up to 3 MB.";
export const UPLOADS = {
  passport: {
    ...PHOTO,
    label: "Child's passport photograph",
    hint: PHOTO_HINT,
    bring: "",
    file: "Passport-Photo",
  },
  birthCertificate: {
    ...SCAN,
    label: "Child's birth certificate",
    hint: "A scan or clear photo of the certificate. PDF, JPG or PNG, up to 5 MB.",
    bring: "",
    file: "Birth-Certificate",
  },
  fatherPassport: {
    ...PHOTO,
    label: "Father's passport photograph",
    hint: PHOTO_HINT,
    bring: "The father's passport photograph",
    file: "Father-Passport-Photo",
  },
  motherPassport: {
    ...PHOTO,
    label: "Mother's passport photograph",
    hint: PHOTO_HINT,
    bring: "The mother's passport photograph",
    file: "Mother-Passport-Photo",
  },
  immunisationCard: {
    ...SCAN,
    label: "Child's immunisation card",
    hint: "A scan or clear photo of the card. PDF, JPG or PNG, up to 5 MB.",
    bring: "A photocopy of the child's immunisation card",
    file: "Immunisation-Card",
  },
  surgicalReport: {
    ...SCAN,
    label: "Surgical report",
    hint: "The report of your child's operation. PDF, JPG or PNG, up to 5 MB.",
    bring: "The surgical report of your child's operation",
    file: "Surgical-Report",
  },
} as const;
export type UploadKind = keyof typeof UPLOADS;
export const UPLOAD_KINDS = Object.keys(UPLOADS) as UploadKind[];
export const REQUIRED_UPLOAD_KINDS = ["passport", "birthCertificate"] as const;
export const OPTIONAL_UPLOAD_KINDS = ["fatherPassport", "motherPassport", "immunisationCard", "surgicalReport"] as const;
export type OptionalUploadKind = (typeof OPTIONAL_UPLOAD_KINDS)[number];

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

// Parent fields are checked in crossFieldIssues: everything is required unless the
// applicant says this parent's details cannot be given (for example, deceased).
const parentSchema = z.object({
  unavailable: z.boolean().default(false),
  unavailableReason: opt(120),
  sameAddress: z.boolean().default(false),
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
    hasOtherCustodians: yesNo,
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
      tribe: req("the child's tribe", 60),
      religion: req("the child's religion", 60),
      classSought: choice(CLASS_OPTIONS, "Please choose a class"),
      primaryLanguage: req("the child's primary language", 60),
      homeLanguage: req("the language spoken at home", 60),
    }),
    homePhone: optPhone("home phone"),
    previousSchool: opt(300),
    heardAbout: req("how you heard about us", 200),
    introduced: yesNo,
    introducerName: opt(120),
    introducerPhone: optPhone("phone number"),
    childrenAtBomas: z.preprocess(
      (x) => (x === "" || x === null || x === undefined ? undefined : Number(x)),
      z
        .number({ required_error: "Please enter a number (0 if none)", invalid_type_error: "Please enter a number (0 if none)" })
        .int("Please enter a whole number")
        .min(0, "Please enter 0 or more")
        .max(20, "Please check this number"),
    ),
    hasOtherChildren: yesNo,
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
      hasDifficulties: yesNo,
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
      hasOtherMedicalInfo: yesNo,
      otherMedicalInfo: opt(600),
      hasSpecialInformation: yesNo,
      specialInformation: opt(800),
    }),

    // ---- Step 5: Documents that may be uploaded or brought to the school -------------
    documents: z
      .object(
        Object.fromEntries(
          OPTIONAL_UPLOAD_KINDS.map((k) => [k, z.enum(["upload", "bring"]).optional()]),
        ) as Record<OptionalUploadKind, z.ZodOptional<z.ZodEnum<["upload", "bring"]>>>,
      )
      .default({}),

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
type PartialApplication = DeepPartial<z.output<typeof baseShapeForIssues>>;

const filled = (x: unknown) => typeof x === "string" && x.trim().length > 0;

/**
 * Rules that depend on more than one answer. Shared by the schema and by the form, which runs
 * them per step (zod only runs refinements once every other field is valid).
 * Tolerates a half-completed form.
 *
 * Every question must be answered. The only blanks allowed are answers that cannot exist for
 * some families: a middle name, a landline or office phone, a school email address, and the
 * follow-up details of a question answered "No".
 */
export function crossFieldIssues(v: PartialApplication) {
  const issues: { path: (string | number)[]; message: string }[] = [];
  const needs = (cond: unknown, path: (string | number)[], message: string) => {
    if (cond) issues.push({ path, message });
  };
  const required = (value: unknown, path: (string | number)[], message: string) => needs(!filled(value), path, message);

  needs(
    v.applicant?.relationship === "Other" && !filled(v.applicant?.relationshipOther),
    ["applicant", "relationshipOther"],
    "Please say how you are related to the child (for example UNCLE)",
  );

  // Parents
  for (const who of ["father", "mother"] as const) {
    const p = v[who];
    if (p?.unavailable) {
      required(p.unavailableReason, [who, "unavailableReason"], `Please say why the ${who}'s details cannot be given`);
      continue;
    }
    required(p?.fullName, [who, "fullName"], `Please enter the ${who}'s full name`);
    required(p?.occupation, [who, "occupation"], `Please enter the ${who}'s occupation`);
    required(p?.phone, [who, "phone"], `Please enter the ${who}'s phone number`);
    required(p?.email, [who, "email"], `Please enter the ${who}'s email address`);
    if (!p?.sameAddress) {
      required(p?.address, [who, "address"], `Please enter the ${who}'s address, or tick "Same as the child's home address"`);
    }
  }
  needs(
    v.father?.unavailable && v.mother?.unavailable && v.applicant?.relationship !== "Other",
    ["father", "unavailable"],
    "Please give the details of at least one parent",
  );

  needs(
    (v.maritalStatus === "Divorced" || v.maritalStatus === "Separated") && !filled(v.custody),
    ["custody"],
    "Please say who has custody of the child",
  );
  if (v.hasOtherCustodians === "yes") {
    const rows = v.otherCustodians ?? [];
    for (let i = 0; i < Math.max(1, rows.length); i++) {
      const g = rows[i];
      if (i > 0 && !filled(g?.name) && !filled(g?.relationship) && !filled(g?.workPhone)) continue;
      required(g?.name, ["otherCustodians", i, "name"], "Please enter their name");
      required(g?.relationship, ["otherCustodians", i, "relationship"], "Please enter their relationship to the child");
      required(g?.workPhone, ["otherCustodians", i, "workPhone"], "Please enter their phone number");
    }
  }

  // Child
  const dob = Date.parse(v.child?.dateOfBirth ?? "");
  if (!Number.isNaN(dob)) {
    const ageYears = (Date.now() - dob) / (365.25 * 24 * 3600 * 1000);
    needs(ageYears < 1 || ageYears > 25, ["child", "dateOfBirth"], "Please check the date of birth");
  }
  if (v.introduced === "yes") {
    required(v.introducerName, ["introducerName"], "Please enter the name of the person who introduced you");
    required(v.introducerPhone, ["introducerPhone"], "Please enter their phone number");
  }
  if (v.hasOtherChildren === "yes") {
    const rows = v.otherChildren ?? [];
    for (let i = 0; i < Math.max(1, rows.length); i++) {
      const c = rows[i];
      if (i > 0 && !filled(c?.name) && !filled(c?.dateOfBirth)) continue;
      required(c?.name, ["otherChildren", i, "name"], "Please enter the child's name");
      required(c?.dateOfBirth, ["otherChildren", i, "dateOfBirth"], "Please enter the date of birth");
    }
  }
  const t = v.transport;
  needs(
    ![t?.bus, t?.parentDropOff, t?.walksHome, t?.other].some(filled),
    ["transport", "parentDropOff"],
    "Please say how your child will get to school and home (fill in at least one)",
  );

  // Education
  const e = v.education;
  if (!e?.neverAttended) {
    const school = [
      ["presentSchool", "the name of the present school"],
      ["dateFrom", "when your child started at this school"],
      ["dateTo", "when your child leaves (or left) this school"],
      ["reasonForLeaving", "the reason for leaving"],
      ["headTeacher", "the head teacher's name and title"],
      ["schoolAddress", "the school's address"],
      ["schoolPhone", "the school's phone number"],
      ["languageOfInstruction", "the language of instruction"],
    ] as const;
    for (const [key, what] of school) required(e?.[key], ["education", key], `Please enter ${what}`);
  }
  needs(e?.hasDifficulties === "yes" && !filled(e?.difficulties), ["education", "difficulties"], "Please describe the difficulties");

  // Health
  const h = v.health;
  for (const group of ["illnesses", "inoculations"] as const) {
    for (const [key, item] of Object.entries(h?.[group] ?? {})) {
      needs(item?.ticked && !filled(item?.date), ["health", group, key, "date"], "Please add the date or year");
    }
  }
  needs(h?.otherVaccination === "yes" && !filled(h?.otherVaccinationType), ["health", "otherVaccinationType"], "Please state the type of vaccination");
  needs(h?.hospitalAdmission === "yes" && !filled(h?.hospitalAdmissionYear), ["health", "hospitalAdmissionYear"], "Please give the year of admission");
  needs(h?.hospitalAdmission === "yes" && !filled(h?.hospitalAdmissionDetails), ["health", "hospitalAdmissionDetails"], "Please give the kind of illness and duration");
  needs(h?.surgery === "yes" && !filled(h?.surgeryDetails), ["health", "surgeryDetails"], "Please give the year and type of operation");
  needs(h?.medication === "yes" && !filled(h?.medicationDetails), ["health", "medicationDetails"], "Please say which medication");
  needs(h?.hasOtherMedicalInfo === "yes" && !filled(h?.otherMedicalInfo), ["health", "otherMedicalInfo"], "Please give the medical information");
  needs(h?.hasSpecialInformation === "yes" && !filled(h?.specialInformation), ["health", "specialInformation"], "Please give the information");

  // Documents: each one that applies is either uploaded now or brought to the school.
  for (const kind of optionalDocumentsFor(v)) {
    needs(!v.documents?.[kind], ["documents", kind], "Please choose to upload it now or bring it to the school");
  }

  const sig = (v.declarations?.signatureName ?? "").toLowerCase().replace(/\s+/g, " ");
  const surname = (v.applicant?.surname ?? "").trim().toLowerCase();
  needs(sig && surname && !sig.includes(surname), ["declarations", "signatureName"], "Please type your full name, including your surname");
  return issues;
}

export type ApplicationData = z.infer<typeof applicationSchema>;
export type ApplicationInput = z.input<typeof applicationSchema>;

/** The optional documents that apply to this application (no photo for a parent whose details are not given). */
export function optionalDocumentsFor(v: PartialApplication): OptionalUploadKind[] {
  const out: OptionalUploadKind[] = [];
  if (!v.father?.unavailable) out.push("fatherPassport");
  if (!v.mother?.unavailable) out.push("motherPassport");
  out.push("immunisationCard");
  if (v.health?.surgery === "yes") out.push("surgicalReport");
  return out;
}

/** Every file this application uploads: the two required ones plus those the parent chose to upload. */
export function uploadsFor(v: PartialApplication): UploadKind[] {
  return [...REQUIRED_UPLOAD_KINDS, ...optionalDocumentsFor(v).filter((k) => v.documents?.[k] === "upload")];
}

/** What the parent must bring to the school office when called in, for this application. */
export function documentsToBring(v: PartialApplication): string[] {
  const out = ["The original birth certificate (for sighting only)"];
  for (const kind of optionalDocumentsFor(v)) {
    if (v.documents?.[kind] !== "upload") out.push(UPLOADS[kind].bring);
  }
  if (!v.education?.neverAttended) {
    out.push("Form 2 signed and stamped by the head teacher of your child's present school");
  }
  return out;
}

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
    unavailable: false, unavailableReason: "", sameAddress: false,
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
    hasOtherCustodians: undefined as never,
    otherCustodians: [],
    child: {
      surname: "", firstName: "", middleName: "", gender: undefined as never, dateOfBirth: "",
      placeOfBirth: "", stateOfOrigin: undefined as never, tribe: "", religion: "",
      classSought: undefined as never, primaryLanguage: "", homeLanguage: "",
    },
    homePhone: "",
    previousSchool: "",
    heardAbout: "",
    introduced: undefined as never,
    introducerName: "",
    introducerPhone: "",
    childrenAtBomas: "" as never,
    hasOtherChildren: undefined as never,
    otherChildren: [],
    transport: { bus: "", parentDropOff: "", walksHome: "", other: "" },
    education: {
      neverAttended: false, presentSchool: "", dateFrom: "", dateTo: "", reasonForLeaving: "",
      headTeacher: "", schoolAddress: "", schoolPhone: "", schoolEmail: "",
      languageOfInstruction: "", hasDifficulties: undefined as never, difficulties: "",
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
      hasOtherMedicalInfo: undefined as never,
      otherMedicalInfo: "",
      hasSpecialInformation: undefined as never,
      specialInformation: "",
    },
    documents: {},
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
