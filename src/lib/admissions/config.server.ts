import process from "node:process";
import type { SchoolSection } from "./schema";

/**
 * Admissions configuration, read per request from environment variables (never at module
 * scope, see src/lib/config.server.ts). Nothing here reaches the browser.
 *
 *   ADMISSION_FEE_NGN       Application fee in naira, e.g. "10000". Required to enable payments.
 *   PAYMENT_PROVIDER        "paystack" to enable online payment. Anything else keeps it off.
 *   PAYSTACK_SECRET_KEY     sk_test_... (sandbox) or sk_live_... (live).
 *   PAYSTACK_SUBACCOUNT_NURSERY_PRIMARY  ACCT_... subaccount for the nursery/primary bank account.
 *   PAYSTACK_SUBACCOUNT_SECONDARY        ACCT_... subaccount for the secondary school bank account.
 *                           Both are required: without them payment stays off, so no fee can
 *                           land in the wrong account.
 *   ADMISSIONS_TO_EMAIL     School inbox for notifications (defaults to CONTACT_TO_EMAIL).
 *   ADMISSIONS_FROM_EMAIL   Sender on the verified Resend domain (defaults to CONTACT_FROM_EMAIL).
 *   RESEND_API_KEY          Already used by the contact form.
 *   SITE_URL                Public site address used in emails and payment callbacks.
 *   CRON_SECRET             Protects /api/admissions/reconcile (Vercel sends it automatically).
 *   ADMISSIONS_LINK_SECRET  32+ random characters. Signs the private links in emails.
 */
export function getAdmissionsConfig() {
  const feeNaira = Number.parseInt(process.env.ADMISSION_FEE_NGN ?? "", 10);
  const feeKobo = Number.isFinite(feeNaira) && feeNaira > 0 ? feeNaira * 100 : null;
  const provider = (process.env.PAYMENT_PROVIDER ?? "").trim().toLowerCase();
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY ?? "";
  const providerReady = provider === "paystack" && /^sk_(test|live)_/.test(paystackSecret);
  const subaccounts: Record<SchoolSection, string> = {
    "nursery-primary": (process.env.PAYSTACK_SUBACCOUNT_NURSERY_PRIMARY ?? "").trim(),
    secondary: (process.env.PAYSTACK_SUBACCOUNT_SECONDARY ?? "").trim(),
  };
  const subaccountsOk = Object.values(subaccounts).every((c) => /^ACCT_[A-Za-z0-9]+$/.test(c));
  const linkSecret = process.env.ADMISSIONS_LINK_SECRET ?? "";
  const linkSecretOk = linkSecret.length >= 32;
  return {
    linkSecret,
    feeKobo,
    currency: "NGN" as const,
    provider: providerReady ? ("paystack" as const) : null,
    paystackSecret,
    /** Paystack subaccount (settlement bank account) for each part of the school. */
    subaccounts,
    testMode: paystackSecret.startsWith("sk_test_"),
    paymentsEnabled: providerReady && subaccountsOk && feeKobo !== null && linkSecretOk,
    siteUrl: (process.env.SITE_URL ?? "https://www.bomasacademy.org").replace(/\/+$/, ""),
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    fromEmail:
      process.env.ADMISSIONS_FROM_EMAIL ??
      process.env.CONTACT_FROM_EMAIL ??
      "Bomas Academy Admissions <noreply@bomasacademy.org>",
    schoolEmail: process.env.ADMISSIONS_TO_EMAIL ?? process.env.CONTACT_TO_EMAIL ?? "bomasacademy@gmail.com",
    cronSecret: process.env.CRON_SECRET ?? "",
    /** How long the secret links in emails keep working. */
    parentLinkDays: 90,
    schoolLinkDays: 365,
  };
}

export type AdmissionsConfig = ReturnType<typeof getAdmissionsConfig>;
