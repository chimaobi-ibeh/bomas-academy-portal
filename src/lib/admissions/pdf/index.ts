import { zipSync } from "fflate";
import { buildAdmissionForm, type DocumentInput } from "./admission-form";
import { buildClassForm } from "./class-form";
import { buildReceipt, type ReceiptInput } from "./receipt";

export { buildAdmissionForm, buildClassForm, buildReceipt };
export type { DocumentInput, ReceiptInput };

export const DOCUMENT_KINDS = ["admission-form", "class-form", "receipt", "all"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export function documentFileName(kind: Exclude<DocumentKind, "all">, reference: string) {
  const names = {
    "admission-form": "Bomas-Admission-Form",
    "class-form": "Bomas-Class-Form",
    receipt: "Bomas-Payment-Receipt",
  } as const;
  return `${names[kind]}-${reference}.pdf`;
}

/** Builds one document, or a ZIP of all three. */
export async function buildDocument(
  kind: DocumentKind,
  doc: DocumentInput,
  receipt: ReceiptInput,
): Promise<{ bytes: Uint8Array; fileName: string; contentType: string }> {
  if (kind === "admission-form") {
    return { bytes: await buildAdmissionForm(doc), fileName: documentFileName(kind, doc.reference), contentType: "application/pdf" };
  }
  if (kind === "class-form") {
    return { bytes: await buildClassForm(doc), fileName: documentFileName(kind, doc.reference), contentType: "application/pdf" };
  }
  if (kind === "receipt") {
    return { bytes: await buildReceipt(receipt), fileName: documentFileName(kind, doc.reference), contentType: "application/pdf" };
  }
  const [a, c, r] = await Promise.all([buildAdmissionForm(doc), buildClassForm(doc), buildReceipt(receipt)]);
  const zip = zipSync(
    {
      [documentFileName("admission-form", doc.reference)]: a,
      [documentFileName("class-form", doc.reference)]: c,
      [documentFileName("receipt", doc.reference)]: r,
    },
    { level: 6 },
  );
  return { bytes: zip, fileName: `Bomas-Application-${doc.reference}.zip`, contentType: "application/zip" };
}
