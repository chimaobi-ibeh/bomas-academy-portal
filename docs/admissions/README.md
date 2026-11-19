# Online Admission Application & Payment: Setup and Handover

Read [PLAN.md](PLAN.md) first for the audit, architecture, schema, field mapping and the open
questions for Bomas. This file covers setup, configuration, testing and what is still needed.

**Current state:** built and tested. Online payment is **off** until the settings below are added,
and it must stay in Paystack **test mode** until Bomas approves going live.

## What parents get

`/admissions` -> **Apply online** -> `/admissions/apply`, a 7-step form (parent, child, school,
health, documents, agreement, review) -> secure Paystack checkout -> `/admissions/application`,
which shows success with downloads (receipt, Admission Form, Class Form, ZIP), or a clear
failed / waiting / retry state. No account, no password.

Emails: the school gets "New Admission Application — BA-XXXX-XXXX" with a summary and a private
link to `/admissions/office` (all documents, including the uploaded photo and birth certificate
through 60-second signed links). The parent gets a confirmation with a private download link.

## Files

| Area | Files |
| --- | --- |
| Data model and validation | `src/lib/admissions/schema.ts` (single schema for form, server and PDFs), `original-text.ts` (wording copied from the paper forms) |
| Workflow | `src/lib/admissions/service.server.ts`, `store.ts`, `store.server.ts`, `security.server.ts`, `config.server.ts`, `deps.server.ts`, `email.server.ts` |
| Payments | `src/lib/admissions/payments/` (`types.ts` interface, `paystack.server.ts` adapter) |
| PDFs | `src/lib/admissions/pdf/` (`admission-form.ts`, `class-form.ts`, `receipt.ts`, `kit.ts`) |
| Pages | `src/routes/admissions_.apply.tsx`, `admissions_.application.tsx`, `admissions_.office.tsx`, `src/components/admissions/*` |
| Endpoints | `src/lib/api/admissions.functions.ts`, `src/routes/api/payments/paystack-webhook.ts`, `src/routes/api/admissions/documents.ts`, `src/routes/api/admissions/reconcile.ts` |
| Database | `supabase/migrations/20261118120000_admissions.sql`, `supabase/migrations/20261119120000_admissions_sections_documents.sql` |
| Ops | `scripts/export-admissions.mjs`, `.env.example`, daily cron in `vite.config.ts` |
| Tests | `tests/admissions/*` (`npm test`) |
| Changed | `src/routes/admissions.tsx` (Apply online button), `src/components/site-header.tsx` (menu link), `src/integrations/supabase/types.ts` (new tables), `package.json` (pdf-lib, fflate; vitest, pglite for tests) |

## 1. Supabase setup

1. Apply both migrations, in order, to project `zlontmoisvivkudffqkp`: Supabase dashboard -> SQL Editor ->
   paste `supabase/migrations/20261118120000_admissions.sql` -> Run, then
   `supabase/migrations/20261119120000_admissions_sections_documents.sql` -> Run (or `supabase db push`).
2. Check: Table Editor shows `admission_applications`, `admission_payment_attempts`,
   `admission_rate_limits`, each with RLS **enabled** and **no policies**. Storage shows a
   **private** bucket `admission-documents` (5 MB, JPEG/PNG/PDF).
3. Vercel must have `SUPABASE_SERVICE_ROLE_KEY` (server only, never `VITE_`).

## 2. Environment variables (Vercel -> Settings -> Environment Variables)

| Variable | Value | Required |
| --- | --- | --- |
| `PAYMENT_PROVIDER` | `paystack` | Yes, to enable payment |
| `PAYSTACK_SECRET_KEY` | `sk_test_...` first; `sk_live_...` only after approval | Yes |
| `PAYSTACK_SUBACCOUNT_NURSERY_PRIMARY` | Subaccount code (`ACCT_...`) for the nursery/primary bank account | Yes |
| `PAYSTACK_SUBACCOUNT_SECONDARY` | Subaccount code (`ACCT_...`) for the secondary school bank account | Yes |
| `ADMISSION_FEE_NGN` | Fee in naira, e.g. `10000` (**not yet confirmed by Bomas**) | Yes |
| `ADMISSIONS_LINK_SECRET` | 32+ random characters (e.g. `openssl rand -base64 48`) | Yes |
| `CRON_SECRET` | Random string; Vercel sends it to the daily job | Yes |
| `RESEND_API_KEY` | Already used by the contact form | Yes, for emails |
| `ADMISSIONS_TO_EMAIL` | Defaults to `CONTACT_TO_EMAIL`, then `bomasacademy@gmail.com` | No |
| `ADMISSIONS_FROM_EMAIL` | Defaults to `CONTACT_FROM_EMAIL` (a verified Resend domain address) | No |
| `SITE_URL` | Defaults to `https://www.bomasacademy.org` | No |

Payment stays off (the apply page shows "opening soon") until all the required ones are set,
including both subaccounts, so a fee can never be settled to the wrong school account.

## 3. Paystack configuration

1. Bomas creates or uses its own Paystack business account (the school must own it).
2. Settings -> API Keys & Webhooks:
   - Copy the **Test Secret Key** into `PAYSTACK_SECRET_KEY`.
   - Webhook URL: `https://www.bomasacademy.org/api/payments/paystack-webhook`
   - Callback URL can stay empty; the site sends its own per payment.
3. Two school bank accounts: Paystack dashboard -> Settings -> Subaccounts (or Payments ->
   Subaccounts) -> create one subaccount per bank account:
   - "Bomas Academy Nursery and Primary": the nursery/primary bank account.
   - "Bomas Academy Secondary": the secondary school bank account.
   - Set the main account's share (percentage charge) to **0**, so the whole fee settles to the
     subaccount. The site sends `bearer: subaccount`, so the Paystack fee comes out of that payment.
   - Copy each subaccount code (`ACCT_...`) into `PAYSTACK_SUBACCOUNT_NURSERY_PRIMARY` and
     `PAYSTACK_SUBACCOUNT_SECONDARY`. Test mode needs its own test subaccounts; live mode needs live ones.
   The class chosen decides the account: Pre-Dawn to Primary Six -> nursery/primary; JSS 1 to SSS 3 ->
   secondary. It is fixed when the application is saved, recorded on every payment attempt, shown in
   the school email and on the school page, and sent to Paystack as metadata ("school_section").
4. Test with Paystack's test cards (success, decline, and so on) on the live site while test keys are set.
   A yellow "Test mode" banner shows on the form and "TEST MODE" in emails.
5. Go live only after Bomas approves: complete Paystack business verification, then swap in
   `sk_live_...` and set the live webhook URL. Redeploy.

## 4. Email configuration

Uses the Resend setup the contact form already relies on. Before launch, verify the
`bomasacademy.org` domain in Resend (Domains -> Add -> add the DNS records) or emails from
`noreply@bomasacademy.org` will be rejected. Resend Free: 3,000 emails/month, 100/day.
A failed email never affects the application: it is retried on the next status check, webhook,
or the daily job (up to 8 tries), and sent at most once per recipient.

## 5. Deployment

1. Merge to `main` and let Vercel build as usual (no new build settings).
2. The daily cron (`/api/admissions/reconcile`, 06:00 WAT) is registered automatically from
   `vite.config.ts`. Check Vercel -> Settings -> Cron Jobs after the first deploy.
3. Smoke test in test mode: apply, pay with a test card, confirm both emails arrive, download all
   documents from the success page and from the school link.

## 6. Backups

Supabase Free has no automatic backups. Monthly:

```powershell
$env:SUPABASE_URL="https://zlontmoisvivkudffqkp.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service role key>"
npm run export:admissions -- ./admissions-backup-2026-12
```

Store the folder privately (it contains children's personal and health data). The school's
notification emails are a second record of every submission.

## 7. Testing results

`npm test`: **48 tests, all passing**. The database tests run the real migration on an in-process
Postgres (PGlite), so the payment locking and idempotency are exercised for real.

| # | Brief requirement | Result |
| --- | --- | --- |
| 1, 7 | Successful submission and payment | Pass: submitted only after verified payment; one receipt; one email each to school and parent |
| 2 | Missing required fields | Pass: rejected client- and server-side |
| 3 | Invalid passport photograph | Pass: wrong declared type/size rejected; a PDF renamed as a photo is detected by its bytes and deleted |
| 4 | Invalid birth certificate | Pass: an executable is rejected |
| 5 | Failed payment | Pass: PAYMENT_FAILED, no receipt, no documents; retry succeeds without a second application |
| 6 | Abandoned payment | Pass: stays pending; retry opens a new checkout; still one application |
| 8 | Duplicate webhook | Pass: three concurrent webhooks give one submission, one receipt number, one set of emails |
| 9 | Webhook before redirect | Pass |
| 10 | Connection lost after payment | Pass: the daily reconciliation submits it and sends the emails |
| 11 | Email failure | Pass: stays submitted; retried later; no second charge |
| 12-14 | PDFs, separation, office-use boxes | Pass: two 2-page A4 documents plus a 1-page receipt; ZIP holds exactly three files; office boxes blank (visually checked against the originals) |
| 15 | Secure retrieval | Pass: wrong token, wrong audience, unknown reference all give the same "not found"; originals are school-only via 60-second links; rate limiting works |
| 16 | Mobile usability | Checked in Edge at 390 px: all 7 steps, no horizontal scrolling, large touch targets, native date/select pickers, errors shown inline and scrolled into view |
| 17 | Reference uniqueness | Pass: 20,000 generated without collision; database rejects duplicates and the server retries |
| extra | Wrong amount paid / second payment / paused database / 30-day clean-up | Pass |

Not yet tested: a real Paystack sandbox payment and real email delivery, because no credentials
have been supplied. Do this in step 5.3 before going live.

## 8. Needs Bomas approval before launch

- The open questions Q1 to Q13 in PLAN.md, especially the **fee**, the **address on the forms**
  (Q10), the **class list** (Q4), **electronic signatures** (Q6) and the **document discrepancy** (Q3).
- **Privacy notice and retention.** Unpaid applications are deleted automatically after 30 days.
  Retention of submitted applications is not automated until Bomas decides.
- Three printing errors on the paper forms were corrected in the generated PDFs:
  "pervious" -> "previous", "Signature fo Parent" -> "Signature of Parent",
  "How does your chilcl get" -> "How does your child get". All other wording is unchanged.
- Going live with real payments (Paystack live keys).

## 9. Costs and free-tier limits

| Service | Plan | Notes |
| --- | --- | --- |
| Vercel | **Pro required** (about US$20/member/month) | Hobby is for non-commercial use only; a school collecting fees is commercial. |
| Supabase | Free works for low traffic | Pauses after about 7 days of inactivity (the daily job normally prevents this, not guaranteed); no backups; 500 MB DB / 1 GB storage (about 1,000+ applications at around 1 MB of files each). Pro is US$25/month. |
| Paystack | No monthly fee | Local cards 1.5% + NGN 100 (NGN 100 waived under NGN 2,500), capped at NGN 2,000 per transaction. Confirm current pricing. |
| Resend | Free | 3,000 emails/month, 100/day. |

## Notes for developers

- TanStack Start warns at dev start-up that server functions are not behind its CSRF middleware.
  This applies to the whole site, not just admissions. The admissions endpoints authenticate
  with per-application tokens in the request body (no cookies), so cross-site requests cannot act on
  someone else's application. Adding Start's CSRF middleware site-wide is still a good idea.
- `src/integrations/supabase/types.ts` was extended by hand for the new tables. Regenerating it
  with the Supabase CLI after applying the migration gives the same result.
