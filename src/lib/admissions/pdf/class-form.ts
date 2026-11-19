import { PDFDocument } from "pdf-lib";
import { CLASS_FORM_GRADES, childName, fullName } from "../schema";
import { CLASS_FORM_DECLARATION, FORM_HEADER, HOME_SCHOOL_AGREEMENT } from "../original-text";
import {
  A4,
  C,
  Sheet,
  addContinuationSheet,
  embedLogo,
  footer,
  formatDate,
  loadFonts,
  type Overflow,
} from "./kit";
import type { DocumentInput } from "./admission-form";

const L = 50;
const R = 548;
const S = 8.8; // label size

async function studentInformationSheet(doc: PDFDocument, input: DocumentInput, overflow: Overflow[]) {
  const f = await loadFonts(doc);
  const s = new Sheet(doc.addPage([A4.w, A4.h]), f, overflow);
  const d = input.data;
  const logo = await embedLogo(doc);

  // ---- Header ---------------------------------------------------------------------------
  s.image(logo, 50, 40, 74, 74);
  s.text(FORM_HEADER.motto, 52, 121, { size: 5.5, font: f.italic, color: C.red });
  s.text("BOMAS ACADEMY", 262, 74, { size: 29, font: f.bold, align: "center" });
  s.text(FORM_HEADER.classFormAddress, 262, 90, { size: 9.5, font: f.reg, align: "center" });
  s.text("STUDENT INFORMATION SHEET", 262, 108, { size: 12.5, font: f.serifBold, align: "center" });
  s.text("PRE-SCHOOL - GRADE 5", 262, 124, { size: 12.5, font: f.serifBold, align: "center" });

  // FOR OFFICE USE: always left blank
  s.rect(402, 42, 146, 84, { fill: C.officeBlue, border: C.black, borderWidth: 0.8 });
  s.text("FOR OFFICE USE", 475, 54, { size: 7.5, align: "center" });
  const office = (label: string, t: number, from: number) => {
    s.text(label, 410, t, { size: 5.8 });
    s.line(from, t + 1, 540, t + 1, 0.6);
  };
  office("Birth Certificate", 72, 462);
  office("Immunization OK", 90, 462);
  office("ADM. No.", 108, 462);
  s.text("Date Rec'd", 410, 120, { size: 5.8 });
  s.text("School", 488, 120, { size: 5.8 });
  s.line(440, 123, 482, 123, 0.6);
  s.line(510, 123, 540, 123, 0.6);

  // Entering grade
  s.text("Entering Grade:", 52, 138, { size: 7.8 });
  const listed = (CLASS_FORM_GRADES as readonly string[]).includes(d.child.classSought);
  if (!listed) {
    s.text(`${d.child.classSought} (class not listed on this sheet)`, 120, 138, {
      size: 8, font: f.reg, color: C.ink,
    });
  }
  s.rect(L, 145, R - L, 48, { border: C.black, borderWidth: 1.4 });
  const gradeRow = (items: readonly string[], t: number) => {
    let x = L + 14;
    items.forEach((g) => {
      s.box(x, t - 8.5, g === d.child.classSought, 9);
      x += 14;
      x += s.text(g.toUpperCase(), x, t, { size: 8.6, font: f.reg }) + 12;
    });
  };
  gradeRow(CLASS_FORM_GRADES.slice(0, 5), 164);
  gradeRow(CLASS_FORM_GRADES.slice(5), 184);

  // ---- Fields ---------------------------------------------------------------------------
  let top = 214;
  const o = { size: S, answerSize: 9 };
  const step = (n = 20.5) => (top += n);
  s.field("Child's Name:", childName(d), L, top, 405, o);
  s.box(430, top - 8.5, d.child.gender === "Male", 9);
  s.text("Male", 442, top, { size: S, font: f.reg });
  s.box(495, top - 8.5, d.child.gender === "Female", 9);
  s.text("Female", 507, top, { size: S, font: f.reg });
  step();
  s.field("Address:", d.residentialAddress, L, top, 340, o);
  s.field("Email:", d.applicant.email, 345, top, R, o);
  step();
  s.field("D.O.B.", formatDate(d.child.dateOfBirth), L, top, 160, o);
  s.field("Place of Birth:", d.child.placeOfBirth, 165, top, 340, o);
  s.field("Home Phone:", d.homePhone, 345, top, R, o);
  const parent = (label: string, p: typeof d.father) => {
    step();
    s.field(`${label}'s Name:`, p.fullName, L, top, 340, o);
    s.field("Cell Phone:", p.mobilePhone || p.phone, 345, top, R, o);
    step();
    s.field("Address:", p.address || (p.fullName ? d.residentialAddress : ""), L, top, 340, o);
    s.field("Work Phone:", p.officePhone, 345, top, R, o);
  };
  parent("Father", d.father);
  parent("Mother", d.mother);

  const subhead = (label: string, gap = 18) => {
    step(gap);
    const w = s.text(label, L + 4, top, { size: S, font: f.boldItalic });
    s.line(L + 4, top + 1.5, L + 4 + w, top + 1.5, 0.6, C.black);
  };
  subhead("Other Custodial Parents/Guardians");
  for (let i = 0; i < 2; i++) {
    const g = d.otherCustodians[i];
    step(i === 0 ? 22 : 20.5);
    s.field("Name:", g?.name ?? "", L + 4, top, 255, o);
    s.field("Relationship:", g?.relationship ?? "", 258, top, 400, o);
    s.field("Work Phone:", g?.workPhone ?? "", 403, top, R, o);
  }
  subhead("Other Children in the Family:", 16);
  // Q8: the sheet prints "Name / D.O.B. / Name". Children 1-2 fill Name + D.O.B.; 3-4 go in the
  // right-hand "Name" column.
  for (let i = 0; i < 2; i++) {
    const c = d.otherChildren[i];
    const extra = d.otherChildren[i + 2];
    step(i === 0 ? 22 : 20.5);
    s.field("Name:", c?.name ?? "", L + 4, top, 300, o);
    s.field("D.O.B.", c?.dateOfBirth ? formatDate(c.dateOfBirth) : "", 300, top, 400, o);
    s.field("Name:", extra ? `${extra.name}${extra.dateOfBirth ? ` (${formatDate(extra.dateOfBirth)})` : ""}` : "", 403, top, R, o);
  }

  const h = d.health;
  step(24);
  let x = L + s.text("Is your child taking any medication at this time?", L, top, { size: S });
  s.box(x + 2, top - 8.5, h.medication === "yes", 9);
  x += s.text("yes", x + 13, top, { size: S, font: f.reg }) + 22;
  s.box(x, top - 8.5, h.medication === "no", 9);
  s.text("no", x + 12, top, { size: S, font: f.reg });
  s.field("If yes, specify:", h.medication === "yes" ? h.medicationDetails : "", x + 28, top, R, o);

  step(24);
  const medLabel = "Is there any other medical information you would like us to be aware of?";
  const mw = s.text(medLabel, L, top, { size: S });
  s.line(L + mw + 2, top + 1.2, R, top + 1.2);
  step(20);
  s.line(L, top + 1.2, R, top + 1.2);
  s.answerLines(h.otherMedicalInfo, L, top, 20, 1, R - L, "Other medical information");

  step(24);
  s.text("Is there any special information that the school should know about this child or other family members that would", L, top, { size: S });
  step(18);
  const spw = s.text("be of help in providing services for the child?", L, top, { size: S });
  s.line(L + spw + 2, top + 1.2, R, top + 1.2);
  step(20);
  s.line(L, top + 1.2, R, top + 1.2);
  s.answerLines(h.specialInformation, L, top, 20, 1, R - L, "Special information about the child");

  step(24);
  s.field("Child's Primary Language:", d.child.primaryLanguage, L, top, 280, o);
  s.field("Primary Language Spoken at Home:", d.child.homeLanguage, 285, top, R, o);
  step(22);
  const lastSchool = d.education.neverAttended ? "None" : d.education.presentSchool || d.previousSchool;
  s.field("Last School Attended by Pupil:", lastSchool, L, top, 425, o);
  s.field("Tel. No:", d.education.schoolPhone, 430, top, R, o);
  step(22);
  const tw = s.text("How does your child get to school/home everyday?", L, top, { size: S, font: f.boldItalic });
  s.line(L, top + 1.5, L + tw, top + 1.5, 0.6, C.black);
  step(22);
  s.field("Bus?", d.transport.bus, L, top, 300, o);
  s.field("Parent's Drop off/Pickup:", d.transport.parentDropOff, 305, top, R, o);
  step(20.5);
  s.field("Walks home?", d.transport.walksHome, L, top, 300, o);
  s.field("Other arrangements:", d.transport.other, 305, top, R, o);

  // ---- Declaration (original wording) ---------------------------------------------------
  step(16);
  const boxTop = top;
  const boxH = A4.h - 32 - boxTop;
  s.rect(L, boxTop, R - L, boxH, { border: C.black, borderWidth: 1.2 });
  let dt = boxTop + 16;
  const startW = s.text(CLASS_FORM_DECLARATION.start, L + 8, dt, { size: 7.9, font: f.reg });
  let yx = L + 8 + startW + 3;
  s.line(yx, dt + 1, yx + 32, dt + 1);
  s.answer(d.declarations.schoolYearFrom, yx + 1, dt, 31, { size: 7.9 });
  s.text("to", yx + 34, dt, { size: 7.9, font: f.reg });
  yx += 44;
  s.line(yx, dt + 1, yx + 32, dt + 1);
  s.answer(d.declarations.schoolYearTo, yx + 1, dt, 31, { size: 7.9 });
  const rest = s.wrap(CLASS_FORM_DECLARATION.rest, R - L - 16, 7.9, f.reg);
  rest.forEach((ln) => {
    dt += 13.5;
    s.text(ln, L + 8, dt, { size: 7.9, font: f.reg });
  });
  const sigTop = boxTop + boxH - 18;
  s.line(355, sigTop, 538, sigTop, 0.9);
  s.esign(`${d.declarations.signatureName}, ${formatDate(input.submittedAt)}`, 357, sigTop, 180);
  s.text("Parent's Signature/Date", 446, sigTop + 11, { size: 7.8, align: "center" });
  footer(s, input.reference);
}

async function homeSchoolAgreement(doc: PDFDocument, input: DocumentInput) {
  const f = await loadFonts(doc);
  const s = new Sheet(doc.addPage([A4.w, A4.h]), f);
  const d = input.data;
  const a = HOME_SCHOOL_AGREEMENT;

  s.rect(170, 52, 255, 30, { fill: C.black });
  s.text(a.title, A4.w / 2, 72.5, { size: 15, font: f.bold, color: C.white, align: "center" });
  let top = 106;
  s.text(a.convention.heading, 140, top, { size: 10.5, font: f.bold });
  a.convention.lines.forEach((ln) => {
    top += 13.5;
    s.text(ln, 140, top, { size: 8.8, font: f.reg });
  });
  for (const section of a.sections) {
    top += 17;
    s.text(section.heading, 140, top, { size: 10.5, font: f.bold });
    for (const item of section.items) {
      const lines = s.wrap(item, 420, 9, f.reg);
      top += 16.5;
      s.page.drawCircle({ x: 112, y: A4.h - top + 3, size: 1.9, color: C.black });
      lines.forEach((ln, i) => s.text(ln, 124, top + i * 13, { size: 9, font: f.reg }));
      top += (lines.length - 1) * 13;
    }
  }
  const sigTop = Math.max(top + 46, 772);
  s.line(80, sigTop, 245, sigTop, 0.9);
  s.esign(`${d.declarations.signatureName}, ${formatDate(input.submittedAt)}`, 82, sigTop, 162);
  s.text("Parent's Signature/Date", 95, sigTop + 15, { size: 8.5 });
  s.line(375, sigTop, 540, sigTop, 0.9); // head teacher signs on paper
  s.text("Head teacher's Signature/Date", 380, sigTop + 15, { size: 8.5 });
  s.text(
    `Agreement accepted online by ${d.declarations.signatureName} on ${formatDate(input.submittedAt)}.`,
    A4.w / 2,
    sigTop + 32,
    { size: 6.5, font: f.italic, color: C.grey, align: "center" },
  );
  footer(s, input.reference);
}

/** Class Form = Student Information Sheet + Home/School Agreement. */
export async function buildClassForm(input: DocumentInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Bomas Academy Class Form - ${fullName(input.data.child)}`);
  doc.setAuthor("Bomas Academy");
  doc.setSubject(`Application ${input.reference}`);
  doc.setCreator("Bomas Academy online application");
  const overflow: Overflow[] = [];
  await studentInformationSheet(doc, input, overflow);
  await homeSchoolAgreement(doc, input);
  addContinuationSheet(doc, await loadFonts(doc), "Class Form", input.reference, overflow);
  return doc.save();
}
