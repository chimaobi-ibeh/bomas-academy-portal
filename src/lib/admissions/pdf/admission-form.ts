import { PDFDocument } from "pdf-lib";
import {
  AILMENTS,
  ILLNESSES,
  INOCULATIONS,
  MARITAL_STATUSES,
  childName,
  fullName,
  type ApplicationData,
} from "../schema";
import {
  FORM1_ACCOMPANIED_BY,
  FORM1_AGREEMENT_LINE_1,
  FORM1_AGREEMENT_LINE_2,
  FORM1_NOTICE,
  FORM_HEADER,
} from "../original-text";
import {
  A4,
  C,
  Sheet,
  addContinuationSheet,
  embedLogo,
  embedPhoto,
  footer,
  formatDate,
  loadFonts,
  type Overflow,
} from "./kit";

export type DocumentInput = {
  reference: string;
  data: ApplicationData;
  submittedAt: string;
  passportPhoto?: Uint8Array | null;
};

const L = 62; // left text margin inside the frame
const R = 545; // right text margin inside the frame

/** Teal frame with dashes along the inner edge, as on the printed forms. */
function frame(s: Sheet, dash: "yellow" | "black") {
  const x = 22, top = 22, w = A4.w - 44, h = A4.h - 44;
  s.rect(x, top, w, h, { border: C.teal, borderWidth: 11 });
  s.rect(x + 7.5, top + 7.5, w - 15, h - 15, { border: C.tealDark, borderWidth: 0.6 });
  const dashColor = dash === "yellow" ? C.yellow : C.black;
  const innerX = x + 9, innerTop = top + 9, innerW = w - 18, innerH = h - 18;
  const pattern = [18, 7, 9, 7, 26, 7, 9, 7];
  const along = (len: number, draw: (pos: number, seg: number) => void) => {
    let pos = 6, i = 0;
    while (pos < len - 10) {
      const seg = Math.min(pattern[i % pattern.length], len - 6 - pos);
      if (i % 2 === 0) draw(pos, seg);
      pos += seg;
      i++;
    }
  };
  along(innerW, (p, seg) => {
    s.rect(innerX + p, innerTop, seg, 4, { fill: dashColor });
    s.rect(innerX + p, innerTop + innerH - 4, seg, 4, { fill: dashColor });
  });
  along(innerH, (p, seg) => {
    s.rect(innerX, innerTop + p, 4, seg, { fill: dashColor });
    s.rect(innerX + innerW - 4, innerTop + p, 4, seg, { fill: dashColor });
  });
}

function wave(s: Sheet, x: number, top: number, width: number, color = C.grey) {
  const steps = 48;
  let prevX = x, prevY = top;
  for (let i = 1; i <= steps; i++) {
    const px = x + (width * i) / steps;
    const py = top + Math.sin((i / steps) * Math.PI * 3) * 2.2;
    s.line(prevX, prevY, px, py, 1.1, color);
    prevX = px;
    prevY = py;
  }
}

/** Circles the chosen word in an inline list such as "Mr. / Mrs. / Ms." */
function circleChoice(s: Sheet, words: string[], chosenIndex: number, x: number, top: number, size: number, sep: string) {
  let cx = x;
  words.forEach((w, i) => {
    const ww = s.text(w, cx, top, { size });
    if (i === chosenIndex) s.ellipse(cx + ww / 2, top - size * 0.33, ww / 2 + 2.2, size * 0.66);
    cx += ww;
    if (i < words.length - 1) cx += s.text(sep, cx, top, { size });
  });
  return cx;
}

async function form1(doc: PDFDocument, input: DocumentInput, overflow: Overflow[]) {
  const f = await loadFonts(doc);
  const page = doc.addPage([A4.w, A4.h]);
  const s = new Sheet(page, f, overflow);
  const d = input.data;
  const logo = await embedLogo(doc);
  const photo = await embedPhoto(doc, input.passportPhoto);
  frame(s, "yellow");

  // ---- Header ---------------------------------------------------------------------------
  s.image(logo, 48, 46, 78, 78);
  s.text(FORM_HEADER.motto, 50, 132, { size: 5.8, font: f.italic, color: C.red });
  s.text("BOMAS ACADEMY", 328, 92, { size: 33, font: f.bold, color: C.blueDark, align: "center" });
  s.text("BOMAS ACADEMY", 326.6, 90.8, { size: 33, font: f.bold, color: C.blue, align: "center" });
  wave(s, 205, 104, 245);
  s.text("Form 1", 507, 60, { size: 8, font: f.reg, color: C.red });
  s.text("APPLICATION FORM", 328, 124, { size: 13, font: f.bold, color: C.red, align: "center" });
  s.text("To be completed and returned to the head of School", 328, 136, {
    size: 8.6, font: f.boldItalic, align: "center",
  });
  FORM1_NOTICE.forEach((ln, i) =>
    s.text(ln, 328, 147 + i * 8.6, {
      size: i === 0 ? 7 : 6.6, font: i === 0 ? f.bold : f.boldItalic,
      color: i === 0 ? C.red : C.black, align: "center",
    }),
  );
  wave(s, 74, 145, 62);
  s.text("ADDRESS:", 104, 156, { size: 7.5, font: f.boldItalic, color: C.red, align: "center" });
  FORM_HEADER.address.forEach((a, i) => s.text(a, 104, 166 + i * 8.5, { size: 6.8, font: f.bold, align: "center" }));
  wave(s, 455, 117, 60);
  s.text("Tel. No:", 452, 136, { size: 7.4, font: f.bold, color: C.red });
  FORM_HEADER.phones.forEach((p, i) => s.text(p, 545, 136 + i * 9, { size: 7.4, font: f.bold, align: "right" }));
  const emailW = s.text(FORM_HEADER.email, 545, 170, { size: 6.6, font: f.reg, color: C.blue, align: "right" });
  s.text("E-mail:", 545 - emailW - 3, 170, { size: 6.6, font: f.reg, color: C.red, align: "right" });

  // Passport photograph box
  s.rect(52, 190, 90, 100, { border: C.black, borderWidth: 1.6 });
  s.rect(56, 194, 82, 92, { border: C.black, borderWidth: 0.6 });
  if (photo) s.imageContain(photo, 57, 195, 80, 90);
  else {
    s.text("Passports", 97, 236, { size: 8, font: f.reg, color: C.grey, align: "center" });
    s.text("Photograph", 97, 246, { size: 8, font: f.reg, color: C.grey, align: "center" });
  }

  // "This form must be accompanied by" box
  s.rect(400, 216, 145, 66, { fill: C.tealDark });
  FORM1_ACCOMPANIED_BY.forEach((ln, i) =>
    s.text(ln, 540, 227 + i * 9.6, { size: i === 0 ? 6.6 : 6.1, font: f.italic, color: C.white, align: "right" }),
  );

  // ---- Body -----------------------------------------------------------------------------
  let top = 312;
  const parentWordX = L + s.width("Name of ", 10);
  s.text("Name of Parent / Guardian", L, top, { size: 10 });
  if (d.applicant.relationship === "Other") {
    const pw = s.width("Parent", 10);
    s.line(parentWordX - 1, top - 3.5, parentWordX + pw + 1, top - 3.5, 1, C.ink);
    s.text(d.applicant.relationshipOther.toUpperCase(), parentWordX + pw / 2, top - 10.5, {
      size: 7.5, font: f.bold, color: C.ink, align: "center",
    });
  }

  top += 24;
  const titleIndex = ["Mr", "Mrs", "Ms"].indexOf(d.applicant.title);
  const afterTitles = circleChoice(s, ["Mr.", "Mrs.", "Ms."], titleIndex, L, top, 10, " / ");
  s.line(afterTitles + 3, top + 1.2, R, top + 1.2);
  const nameCols = [
    { label: "SURNAME", x: afterTitles + 40, value: d.applicant.surname },
    { label: "FIRST NAME", x: afterTitles + 150, value: d.applicant.firstName },
    { label: "MIDDLE NAME", x: afterTitles + 270, value: d.applicant.middleName },
  ];
  nameCols.forEach((c) => {
    s.answer(c.value.toUpperCase(), c.x - 20, top, 108, { label: c.label });
    s.text(c.label, c.x, top + 8, { size: 5.3, font: f.bold, align: "center" });
  });
  s.text("(Full name in block capital letters please)", R, top + 8, { size: 5.3, font: f.bold, align: "right" });

  top += 26;
  s.text(FORM1_AGREEMENT_LINE_1, L, top, { size: 10 });
  top += 22;
  const agreeW = s.text(FORM1_AGREEMENT_LINE_2, L, top, { size: 10 });
  const genderStart = R - s.width("( Male /  Female)", 10);
  s.line(L + agreeW + 2, top + 1.2, genderStart - 4, top + 1.2);
  s.answer(childName(d), L + agreeW + 5, top, genderStart - L - agreeW - 12, { label: "Child's full name" });
  s.text("(Full name in block capital letters please)", (L + agreeW + genderStart) / 2, top + 8, {
    size: 5.3, font: f.bold, align: "center",
  });
  s.text("(", genderStart, top, { size: 10 });
  circleChoice(s, ["Male", "Female"], d.child.gender === "Male" ? 0 : 1, genderStart + 7, top, 10, " /  ");
  s.text(")", R, top, { size: 10, align: "right" });

  const row = (gap: number) => (top += gap);
  row(22); s.field("Date of birth is:", formatDate(d.child.dateOfBirth), L + 6, top, R);
  row(20);
  s.field("State of Origin:", d.child.stateOfOrigin, L + 6, top, 280);
  s.field("Tribe:", d.child.tribe, 280, top, 398);
  s.field("Religion:", d.child.religion, 398, top, R);
  row(20); s.field("Class in which Admission is Sought:", d.child.classSought, L + 6, top, R);
  row(20); s.field("Name/Address of previous School:", d.previousSchool, L + 6, top, R);
  row(20); s.field("How did you hear about us?", d.heardAbout, L + 6, top, R);
  row(20); s.field("Name of the person who introduced you to the School:", d.introducerName, L + 6, top, R);
  row(18);
  s.line(L, top + 1.2, 352, top + 1.2);
  s.field("Phone No", d.introducerPhone, 352, top, R);
  row(20);
  s.text("Parent / Guardian's Signature:", L, top, { size: 10 });
  const sigX = L + s.width("Parent / Guardian's Signature:", 10) + 2;
  s.line(sigX, top + 1.2, 405, top + 1.2);
  s.esign(d.declarations.signatureName, sigX + 3, top, 405 - sigX - 6);
  s.field("Date:", formatDate(input.submittedAt), 410, top, R);
  row(19); s.field("Father's Occupation:", d.father.occupation, L, top, R);
  row(19); s.field("Mother's Occupation:", d.mother.occupation, L, top, R);
  row(20);
  s.field("Phone numbers:  Father:", d.father.phone, L, top, 368);
  s.field("Mother:", d.mother.phone, 383, top, R);
  const pairs: [string, string, string][] = [
    ["Home:", d.father.homePhone, d.mother.homePhone],
    ["Office:", d.father.officePhone, d.mother.officePhone],
    ["Mobile:", d.father.mobilePhone, d.mother.mobilePhone],
    ["Email:", d.father.email, d.mother.email],
  ];
  for (const [label, fa, mo] of pairs) {
    row(19);
    s.text(label, L, top, { size: 10 });
    s.line(170, top + 1.2, 310, top + 1.2);
    s.answer(fa, 172, top, 136, { label: `Father's ${label.replace(":", "").toLowerCase()}` });
    s.line(363, top + 1.2, 503, top + 1.2);
    s.answer(mo, 365, top, 136, { label: `Mother's ${label.replace(":", "").toLowerCase()}` });
  }
  row(20);
  let mx = L + s.text("Parental Marital Status: ", L, top, { size: 10 });
  MARITAL_STATUSES.forEach((m) => {
    mx += s.text(m, mx, top, { size: 10 }) + 3;
    s.box(mx, top - 8, d.maritalStatus === m);
    mx += 16;
  });
  row(18); s.field("If Divorced, who has custody of the Child?", d.custody, L, top, R);
  row(18); s.field("Full residential address in Nigeria:", d.residentialAddress, L, top, R);
  row(18); s.field("Who Does the Child Live With?", d.livesWith, L, top, R);
  row(18); s.field("Number of Children Already Attending Bomas Academy:", String(d.childrenAtBomas), L, top, R);
  row(14); s.line(L, top, R, top);
  row(18);
  s.field("Name:", childName(d), L, top, 395);
  s.field("Class:", d.child.classSought, 400, top, R);
  footer(s, input.reference);
}

async function form2(doc: PDFDocument, input: DocumentInput, overflow: Overflow[]) {
  const f = await loadFonts(doc);
  const page = doc.addPage([A4.w, A4.h]);
  const s = new Sheet(page, f, overflow);
  const d = input.data;
  const e = d.education;
  const h = d.health;
  frame(s, "black");

  let top = 66;
  s.text("EDUCATIONAL BACKGROUND", L, top, { size: 10.5 });
  s.text("Form 2", 515, top - 6, { size: 8, font: f.reg, color: C.red });
  top += 14;
  const school = e.neverAttended ? "Not applicable (has not attended school)" : e.presentSchool;
  s.field("1. Present School:", school, L, top, 340, { size: 9.5 });
  s.field("Date:", e.dateFrom, 345, top, 440, { size: 9.5 });
  s.field("To:", e.dateTo, 445, top, R, { size: 9.5 });
  const lines: [string, string][] = [
    ["Reason for leaving:", e.reasonForLeaving],
    ["Head Teacher (Name, Title):", e.headTeacher],
    ["Address:", e.schoolAddress],
  ];
  for (const [label, value] of lines) {
    top += 17;
    s.field(label, value, L, top, R, { size: 9.5 });
  }
  top += 17;
  s.field("Phone No:", e.schoolPhone, L, top, 330, { size: 9.5 });
  s.field("Email:", e.schoolEmail, 335, top, R, { size: 9.5 });
  top += 17;
  // Completed by the present school, never by the parent.
  s.field("Head Teacher's  Signature & Official Stamp:", "", L, top, 410, { size: 9.5 });
  s.field("Date:", "", 415, top, R, { size: 9.5 });
  top += 17;
  s.field("Language of Instruction:", e.languageOfInstruction, L, top, R, { size: 9.5 });
  top += 15;
  s.line(L, top, R, top);
  top += 17;
  s.text("2. Are there any educational difficulties you would like to mention (for example: dyslexia)?", L, top, {
    size: 8.3, font: f.bold,
  });
  top += 14;
  s.line(L, top + 1.2, R, top + 1.2);
  s.answer(e.difficulties || "None", L + 3, top, R - L - 6, { label: "Educational difficulties" });
  top += 16;
  s.text("Signature of Parent ( Guardian):", L, top, { size: 9.5 });
  const sigX = L + s.width("Signature of Parent ( Guardian):", 9.5) + 2;
  s.line(sigX, top + 1.2, 425, top + 1.2);
  s.esign(d.declarations.signatureName, sigX + 3, top, 425 - sigX - 6);
  s.field("Date:", formatDate(input.submittedAt), 430, top, R, { size: 9.5 });

  top += 18;
  s.text("HEALTH RECORD", L, top, { size: 10 });
  top += 13;
  s.text("This report will be treated strictly in confidence*", L, top, { size: 9.5, color: C.teal });
  top += 16;
  const illW = s.text("Has he/she suffered from any of the following ILLNESSES? Please tick", L, top, { size: 9.5 });
  s.box(L + illW + 3, top - 8);
  s.text("and include dates.", L + illW + 15, top, { size: 9.5 });

  const tickRow = (items: { label: string; ticked: boolean; date: string; overflowLabel: string }[], rowTop: number) => {
    const cols = [L + 24, 250, 392];
    items.forEach((it, i) => {
      const x = cols[i];
      s.box(x, rowTop - 8, it.ticked);
      const lw = s.text(it.label, x + 13, rowTop, { size: 9.5 });
      const boxX = x + 13 + lw + 3;
      const boxW = i === 2 ? R - boxX : Math.min(110, (cols[i + 1] ?? R) - boxX - 8);
      s.rect(boxX, rowTop - 10, boxW, 13, { border: C.black, borderWidth: 0.8 });
      s.answer(it.ticked ? it.date || "Yes" : "", boxX + 3, rowTop, boxW - 6, { size: 8.5, label: it.overflowLabel });
    });
  };
  const ill = ILLNESSES.map((i) => ({
    label: i.label, ticked: h.illnesses[i.key].ticked, date: h.illnesses[i.key].date, overflowLabel: `${i.label} (illness)`,
  }));
  top += 16; tickRow(ill.slice(0, 3), top);
  top += 16; tickRow(ill.slice(3), top);
  top += 18;
  let ix = L + s.text("Please tick the ", L, top, { size: 9.5 });
  ix += s.text("INOCULATIONS", ix, top, { size: 9.5, color: C.teal });
  s.text(" already given to the child with dates.", ix, top, { size: 9.5 });
  const ino = INOCULATIONS.map((i) => ({
    label: i.label, ticked: h.inoculations[i.key].ticked, date: h.inoculations[i.key].date, overflowLabel: `${i.label} (inoculation)`,
  }));
  top += 16; tickRow(ino.slice(0, 3), top);
  top += 16; tickRow(ino.slice(3), top);

  top += 19;
  const ovW = s.text("Has the child been given any other vaccination apart from the ones stated above ", L, top, { size: 9.2 });
  circleChoice(s, ["Yes", "No"], h.otherVaccination === "yes" ? 0 : 1, L + ovW + 3, top, 9.2, "/");
  top += 16;
  s.field("If yes, please state type:", h.otherVaccination === "yes" ? h.otherVaccinationType : "", L, top, R, { size: 9.2 });
  top += 17;
  const haW = s.text("Has he / she been admitted in the hospital for any illness? If yes, state year  admission", L, top, { size: 9.2 });
  s.answer(h.hospitalAdmission === "yes" ? h.hospitalAdmissionYear || "Yes" : "No", L + haW + 4, top, R - L - haW - 4, {
    size: 8.5, label: "Hospital admission year",
  });
  top += 16;
  s.field("Kind of illness and duration of admission:", h.hospitalAdmission === "yes" ? h.hospitalAdmissionDetails : "", L, top, R, { size: 9.2 });
  top += 17;
  s.text("Has he / she ever undergone any surgical operation? If yes, state year and type of  operation", L, top, { size: 9.2 });
  top += 15;
  s.field("and attach surgical report:", h.surgery === "yes" ? h.surgeryDetails : "No", L, top, R, { size: 9.2 });
  top += 17;
  s.text("Please tick below if your child/ward suffers from the following ailments:", L, top, { size: 9.2 });
  const ailment = (key: (typeof AILMENTS)[number]["key"], label: string, x: number, yesX: number, rowTop: number) => {
    s.text(label, x, rowTop, { size: 9.2 });
    const v = h.ailments[key];
    s.box(yesX, rowTop - 8, v === "yes");
    s.text("Yes", yesX + 11, rowTop, { size: 9.2 });
    s.box(yesX + 35, rowTop - 8, v === "no");
    s.text("No", yesX + 46, rowTop, { size: 9.2 });
  };
  top += 16;
  ailment("respiratory", "Respiratory infection?", L, 168, top);
  ailment("earNoseThroat", "Ear, nose or throat problem?", 242, 425, top);
  top += 16;
  ailment("eye", "Eye problem?", L, 128, top);
  ailment("otherInfirmityOrAllergy", "Any other infirmity or allergy?", 242, 425, top);
  top += 18;
  s.text("Why do you choose to enroll your child/Children in BOMAS Academy?", L, top, { size: 9.5 });
  const firstLine = top + 18;
  [0, 1, 2].forEach((i) => s.line(L, firstLine + i * 16 + 1.2, R, firstLine + i * 16 + 1.2));
  s.answerLines(d.reasonForChoosing, L, firstLine, 16, 3, R - L, "Why do you choose to enroll your child in BOMAS Academy?");

  top = firstLine + 3 * 16 + 14;
  s.line(205, top, 385, top, 0.9);
  s.esign(d.declarations.signatureName + ", " + formatDate(input.submittedAt), 208, top, 175);
  s.text("PARENT'S SIGNATURE & DATE", 295, top + 12, { size: 8.5, align: "center" });

  // ---- FOR OFFICE USE ONLY: always left blank -------------------------------------------
  top += 22;
  const boxX = 76, boxW = A4.w - 2 * 76, rowH = 16.5;
  const rows = ["Name:", "Grade Entered:", "Academic year:", "Date of Reg.", "Ger. Fee Receipt no.:", "Account Dept:", "Referral No:"];
  s.rect(boxX, top, boxW, rowH * (rows.length + 1), { border: C.black, borderWidth: 1 });
  s.text("FOR OFFICE USE ONLY", A4.w / 2, top + 11.5, { size: 9, align: "center" });
  rows.forEach((r, i) => {
    const rt = top + rowH * (i + 1);
    s.line(boxX, rt, boxX + boxW, rt, 0.8);
    s.text(r, boxX + 6, rt + 11.5, { size: i === rows.length - 1 ? 7.5 : 8.5 });
    if (r === "Date of Reg.") s.text("No:", 375, rt + 11.5, { size: 8.5 });
  });
  footer(s, input.reference, "Completed online. Strictly confidential");
}

/** Admission Form = Form 1 (Application Form) + Form 2 (Educational Background & Health Record). */
export async function buildAdmissionForm(input: DocumentInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Bomas Academy Admission Form - ${fullName(input.data.child)}`);
  doc.setAuthor("Bomas Academy");
  doc.setSubject(`Application ${input.reference}`);
  doc.setCreator("Bomas Academy online application");
  const overflow: Overflow[] = [];
  await form1(doc, input, overflow);
  await form2(doc, input, overflow);
  addContinuationSheet(doc, await loadFonts(doc), "Admission Form", input.reference, overflow);
  return doc.save();
}
