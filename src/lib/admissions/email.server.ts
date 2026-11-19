import type { AdmissionsConfig } from "./config.server";
import { PAYMENT_DISCLAIMER } from "./original-text";
import { SCHOOL_SECTIONS, documentsToBring, schoolSection } from "./schema";
import { formatMoney } from "./format";
import type { ApplicationRow } from "./store";

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Resend de-duplicates sends with the same key for 24 hours. */
  idempotencyKey: string;
};

export interface Mailer {
  send(email: OutgoingEmail): Promise<void>;
}

export function createResendMailer(config: AdmissionsConfig): Mailer {
  return {
    async send(email) {
      if (!config.resendApiKey) throw new Error("RESEND_API_KEY is not set");
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.resendApiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": email.idempotencyKey,
        },
        body: JSON.stringify({
          from: config.fromEmail,
          to: [email.to],
          reply_to: email.replyTo,
          subject: email.subject,
          html: email.html,
          text: email.text,
        }),
      });
      if (!res.ok) throw new Error(`Resend responded ${res.status}`);
    },
  };
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function lagosDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Africa/Lagos", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function layout(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f4ee;font-family:Arial,Helvetica,sans-serif;color:#1b2340">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4ee;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden">
<tr><td style="background:#1c2a5c;padding:20px 24px;border-bottom:4px solid #d9a833">
<div style="font-size:20px;font-weight:bold;color:#ffffff">Bomas Academy</div>
<div style="font-size:13px;color:#e9d9a8">${esc(title)}</div></td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.55">${bodyHtml}</td></tr>
<tr><td style="padding:16px 24px;background:#faf8f2;font-size:12px;color:#6b7280">Bomas Academy, Jos, Plateau State. This email was sent automatically by the school's online application system.</td></tr>
</table></td></tr></table></body></html>`;
}

function rows(items: [string, string][]) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:12px 0">${items
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;font-size:14px;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;font-weight:bold;font-size:14px">${esc(v)}</td></tr>`,
    )
    .join("")}</table>`;
}

function button(href: string, label: string) {
  return `<p style="margin:20px 0"><a href="${esc(href)}" style="display:inline-block;background:#d9a833;color:#1c2a5c;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:6px">${esc(label)}</a></p>`;
}

function sectionLabel(app: ApplicationRow) {
  return SCHOOL_SECTIONS[app.school_section ?? schoolSection(app.class_applied)].label;
}

function toBring(app: ApplicationRow) {
  return documentsToBring(app.form_data as never);
}

/** School notification: summary only. No health, identity or document contents. */
export function schoolEmail(app: ApplicationRow, link: string, config: AdmissionsConfig): OutgoingEmail {
  const summary: [string, string][] = [
    ["Student", app.student_name],
    ["Parent / guardian", app.parent_name],
    ["Class applied for", app.class_applied],
    ["School section (fee account)", sectionLabel(app)],
    ["Application reference", app.reference],
    ["Payment amount", formatMoney(app.paid_amount_kobo ?? app.fee_amount_kobo, app.currency)],
    ["Payment status", "Paid (verified)"],
    ["Receipt number", app.receipt_number ?? ""],
    ["Submitted", lagosDate(app.submitted_at)],
  ];
  const html = layout(
    "New admission application",
    `<p>A new admission application has been submitted and paid.</p>${rows(summary)}
<p>Open the secure link below to download the completed Admission Form, Class Form, receipt and the documents the parent uploaded. The link is private to the school; please do not forward it.</p>
${button(link, "View application documents")}
<p><b>To collect from the family in person:</b></p>
<ul style="padding-left:18px">${toBring(app).map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
<p style="font-size:13px;color:#6b7280">Health details and documents are not included in this email for privacy.${config.testMode ? " <b>TEST MODE: no real money was taken.</b>" : ""}</p>`,
  );
  const text = `A new admission application has been submitted and paid.

${summary.map(([k, v]) => `${k}: ${v}`).join("\n")}

Secure link to the documents (private to the school, do not forward):
${link}

To collect from the family in person:
${toBring(app).map((b) => `- ${b}`).join("\n")}
${config.testMode ? "\nTEST MODE: no real money was taken.\n" : ""}`;
  return {
    to: config.schoolEmail,
    replyTo: app.parent_email,
    subject: `New Admission Application — ${app.reference}`,
    html,
    text,
    idempotencyKey: `admission-school-${app.id}`,
  };
}

/** Parent confirmation with the download link. */
export function parentEmail(app: ApplicationRow, link: string, config: AdmissionsConfig): OutgoingEmail {
  const summary: [string, string][] = [
    ["Application reference", app.reference],
    ["Student", app.student_name],
    ["Class applied for", app.class_applied],
    ["Amount paid", formatMoney(app.paid_amount_kobo ?? app.fee_amount_kobo, app.currency)],
    ["Receipt number", app.receipt_number ?? ""],
    ["Payment date", lagosDate(app.paid_at)],
  ];
  const html = layout(
    "Application received",
    `<p>Thank you. Your application to Bomas Academy has been received and your payment has been confirmed.</p>${rows(summary)}
<p>Use the button below to download your payment receipt, the completed Admission Form and the completed Class Form.</p>
${button(link, "Download your documents")}
<p><b>Please bring the following to the school office when the school calls you in:</b></p>
<ul style="padding-left:18px">${toBring(app).map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
<p style="font-size:14px"><b>${esc(PAYMENT_DISCLAIMER)}</b> The school will contact you about the next steps.</p>
<p style="font-size:13px;color:#6b7280">Keep this email private: the link gives access to your child's application. If you have questions, reply to this email or contact ${esc(config.schoolEmail)}.${config.testMode ? " <b>TEST MODE: no real money was taken.</b>" : ""}</p>`,
  );
  const text = `Thank you. Your application to Bomas Academy has been received and your payment has been confirmed.

${summary.map(([k, v]) => `${k}: ${v}`).join("\n")}

Download your receipt, Admission Form and Class Form:
${link}

Please bring the following to the school office when the school calls you in:
${toBring(app).map((b) => `- ${b}`).join("\n")}

${PAYMENT_DISCLAIMER} The school will contact you about the next steps.
Keep this email private: the link gives access to your child's application.`;
  return {
    to: app.parent_email,
    replyTo: config.schoolEmail,
    subject: `Bomas Academy application received — ${app.reference}`,
    html,
    text,
    idempotencyKey: `admission-parent-${app.id}`,
  };
}

/** Sent to the school when a parent has paid twice, so the second payment can be refunded. */
export function duplicatePaymentEmail(app: ApplicationRow, attemptReference: string, amountKobo: number, config: AdmissionsConfig): OutgoingEmail {
  const text = `A second successful payment was received for an application that was already submitted.

Application reference: ${app.reference}
Student: ${app.student_name}
Parent / guardian: ${app.parent_name} (${app.parent_email})
Duplicate payment reference: ${attemptReference}
Amount: ${formatMoney(amountKobo, app.currency)}

Please refund this payment from the payment provider's dashboard.`;
  return {
    to: config.schoolEmail,
    subject: `Duplicate application payment — ${app.reference}`,
    html: layout("Duplicate payment: refund needed", text.split("\n").map((l) => `<p style="margin:4px 0">${esc(l)}</p>`).join("")),
    text,
    idempotencyKey: `admission-duplicate-${attemptReference}`,
  };
}
