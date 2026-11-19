import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { buildDocument, type ReceiptInput } from "@/lib/admissions/pdf";
import { pdfSafe } from "@/lib/admissions/pdf/kit";
import { applicationSchema } from "@/lib/admissions/schema";
import { sampleData, sampleInput } from "./fixtures";

const photo = new Uint8Array(readFileSync(join(__dirname, "../../src/assets/hero-campus.jpg")));
const OUT = process.env.PDF_SAMPLE_DIR; // set to write the PDFs somewhere for visual review

const receipt: ReceiptInput = {
  receiptNumber: "BA-RCT-2026-00001",
  reference: "BA-7KQ4-M9XP",
  parentName: "Mrs Grace Naomi Dung",
  studentName: "DANIEL NANMWA DUNG",
  classApplied: "Primary One",
  amountKobo: 1_000_000,
  currency: "NGN",
  paidAt: "2026-11-18T10:15:00.000Z",
  paymentReference: "BA-7KQ4-M9XP-K3D9QX",
  status: "PAID",
};

async function pages(bytes: Uint8Array) {
  return (await PDFDocument.load(bytes)).getPageCount();
}

function save(name: string, bytes: Uint8Array) {
  if (!OUT) return;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, name), bytes);
}

describe("PDF generation", () => {
  const doc = { reference: "BA-7KQ4-M9XP", data: sampleData(), submittedAt: "2026-11-18T10:15:00.000Z", passportPhoto: photo };

  it("builds the Admission Form as Form 1 + Form 2 (two A4 pages)", async () => {
    const out = await buildDocument("admission-form", doc, receipt);
    expect(out.contentType).toBe("application/pdf");
    expect(out.fileName).toBe("Bomas-Admission-Form-BA-7KQ4-M9XP.pdf");
    const pdf = await PDFDocument.load(out.bytes);
    expect(pdf.getPageCount()).toBe(2);
    const { width, height } = pdf.getPage(0).getSize();
    expect(Math.round(width)).toBe(595);
    expect(Math.round(height)).toBe(842);
    save(out.fileName, out.bytes);
  });

  it("builds the Class Form as Student Information Sheet + Home/School Agreement", async () => {
    const out = await buildDocument("class-form", doc, receipt);
    expect(await pages(out.bytes)).toBe(2);
    save(out.fileName, out.bytes);
  });

  it("builds a one-page receipt", async () => {
    const out = await buildDocument("receipt", doc, receipt);
    expect(await pages(out.bytes)).toBe(1);
    save(out.fileName, out.bytes);
  });

  it("packages exactly the three separate documents in the ZIP", async () => {
    const out = await buildDocument("all", doc, receipt);
    const files = Object.keys(unzipSync(out.bytes)).sort();
    expect(files).toEqual([
      "Bomas-Admission-Form-BA-7KQ4-M9XP.pdf",
      "Bomas-Class-Form-BA-7KQ4-M9XP.pdf",
      "Bomas-Payment-Receipt-BA-7KQ4-M9XP.pdf",
    ]);
  });

  it("adds a continuation sheet instead of cutting off long answers", async () => {
    const input = sampleInput();
    input.reasonForChoosing = "We value character education. ".repeat(30).trim();
    input.health.specialInformation = "Needs extra support settling in. ".repeat(20).trim();
    input.child.classSought = "JSS 1";
    input.applicant.relationship = "Other";
    input.applicant.relationshipOther = "Uncle";
    input.child.firstName = "Ọlá"; // characters outside the standard PDF font
    const data = applicationSchema.parse(input);
    const a = await buildDocument("admission-form", { ...doc, data, passportPhoto: null }, receipt);
    const c = await buildDocument("class-form", { ...doc, data }, receipt);
    expect(await pages(a.bytes)).toBe(3);
    expect(await pages(c.bytes)).toBe(3);
    save("long-answers-" + a.fileName, a.bytes);
    save("long-answers-" + c.fileName, c.bytes);
  });

  it("makes any text printable with the standard fonts", () => {
    expect(pdfSafe("Ọlá Adébáyọ̀ – “Bomas” 👋")).toBe('Olá Adébáyo - "Bomas" ?');
  });
});
