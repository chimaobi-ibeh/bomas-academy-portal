import { PDFDocument } from "pdf-lib";
import { FORM_HEADER, PAYMENT_DISCLAIMER } from "../original-text";
import { formatMoney } from "../format";
import { A4, C, Sheet, embedLogo, formatDateTime, loadFonts } from "./kit";

export type ReceiptInput = {
  receiptNumber: string;
  reference: string;
  parentName: string;
  studentName: string;
  classApplied: string;
  amountKobo: number;
  currency: string;
  paidAt: string;
  paymentReference: string;
  status: "PAID";
};

export { formatMoney };

export async function buildReceipt(r: ReceiptInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Bomas Academy Receipt ${r.receiptNumber}`);
  doc.setAuthor("Bomas Academy");
  const f = await loadFonts(doc);
  const s = new Sheet(doc.addPage([A4.w, A4.h]), f);
  const logo = await embedLogo(doc);

  // Navy band header in the website's colours
  s.rect(0, 0, A4.w, 128, { fill: C.navy });
  s.rect(0, 128, A4.w, 4, { fill: C.gold });
  s.image(logo, 50, 28, 72, 72);
  s.text("BOMAS ACADEMY", 140, 62, { size: 24, font: f.bold, color: C.white });
  s.text(FORM_HEADER.motto, 141, 78, { size: 8, font: f.italic, color: C.gold });
  s.text(`${FORM_HEADER.address.join(", ")}`, 141, 94, { size: 7.5, font: f.reg, color: C.white });
  s.text(`${FORM_HEADER.email}`, 141, 105, { size: 7.5, font: f.reg, color: C.white });

  s.text("APPLICATION FEE RECEIPT", 50, 178, { size: 17, font: f.bold, color: C.navy });
  s.text(`Receipt No. ${r.receiptNumber}`, 545, 178, { size: 10, font: f.bold, align: "right" });

  // Amount panel
  s.rect(50, 198, 495, 70, { fill: C.cream, border: C.gold, borderWidth: 1 });
  s.text("Amount paid", 66, 220, { size: 9, font: f.reg, color: C.grey });
  s.text(formatMoney(r.amountKobo, r.currency), 66, 250, { size: 24, font: f.bold, color: C.navy });
  s.rect(445, 220, 86, 26, { fill: C.navy });
  s.text(r.status, 488, 237.5, { size: 12, font: f.bold, color: C.white, align: "center" });

  const rows: [string, string][] = [
    ["Receipt number", r.receiptNumber],
    ["Application reference", r.reference],
    ["Parent / guardian", r.parentName],
    ["Student", r.studentName],
    ["Class applied for", r.classApplied],
    ["Payment for", "Admission application fee"],
    ["Amount paid", formatMoney(r.amountKobo, r.currency)],
    ["Payment date", formatDateTime(r.paidAt)],
    ["Payment reference", r.paymentReference],
    ["Payment status", "Paid (verified with the payment provider)"],
  ];
  let top = 300;
  rows.forEach(([k, v], i) => {
    if (i % 2 === 0) s.rect(50, top - 15, 495, 24, { fill: C.cream });
    s.text(k, 62, top, { size: 9.5, font: f.reg, color: C.grey });
    s.answer(v, 220, top + 1.5, 315, { size: 10, font: f.bold });
    top += 24;
  });

  top += 24;
  s.rect(50, top, 495, 50, { border: C.red, borderWidth: 1 });
  s.text("Important", 64, top + 18, { size: 9.5, font: f.bold, color: C.red });
  s.text(PAYMENT_DISCLAIMER, 64, top + 34, { size: 9.5, font: f.bold });

  top += 80;
  const notes = [
    "Please keep this receipt for your records. Bomas Academy will contact you about the next steps.",
  ];
  notes.forEach((n, i) => s.text(n, 50, top + i * 14, { size: 9, font: f.reg }));

  s.line(50, A4.h - 60, 545, A4.h - 60, 0.6, C.grey);
  s.text(
    `Bomas Academy | ${FORM_HEADER.email} | Tel. ${FORM_HEADER.phones.join(" ").replace(/,/g, "")}`,
    A4.w / 2,
    A4.h - 46,
    { size: 7.5, font: f.reg, color: C.grey, align: "center" },
  );
  s.text("This receipt was generated electronically and is valid without a signature.", A4.w / 2, A4.h - 34, {
    size: 7, font: f.italic, color: C.grey, align: "center",
  });
  return doc.save();
}
