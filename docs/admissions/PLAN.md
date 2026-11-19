# Online Admission Application & Payment: Plan

Status: implemented behind configuration. Live payments stay disabled until a payment
provider, credentials, the fee amount and the open questions below are confirmed by Bomas.

## 1. Audit of the existing project

| Area | Finding |
| --- | --- |
| Framework | TanStack Start (React 19, file-based routes in `src/routes`), Tailwind v4, shadcn/ui components, framer-motion. |
| Rendering | Server-rendered. Route loaders fetch content on the server (`src/lib/data.ts`). |
| Server code | `createServerFn` server functions (e.g. `src/lib/api/contact.functions.ts`) and server routes (`sitemap[.]xml.ts`). |
| Deployment | Vercel, built with the Nitro `vercel` preset (`vite.config.ts`). |
| CMS | Custom admin at `/admin` backed by Supabase tables `site_content`, `news_posts`, `staff`, `gallery_images` and a public `media` bucket. Admin role via `user_roles` + `has_role()`. It is a content editor: it has no place for private records, and admission data is kept out of it. |
| Supabase | Project `zlontmoisvivkudffqkp`. Browser client uses the publishable key; `client.server.ts` gives a service-role client for server-only code. |
| Email | Resend over its REST API (`RESEND_API_KEY`), sender `noreply@bomasacademy.org`, school inbox `bomasacademy@gmail.com` (the address published on the website and printed on the forms). |
| Payments | None in the project. |
| Other | The header links to a MySchool portal (`bomasacademy.myschooldomain.com`). See question Q1. |
| Design | Navy `oklch(0.22 0.09 264)` / gold `oklch(0.78 0.14 78)` on cream; Manrope (display), Hanken Grotesk (body), Geist Mono (labels). `PaperHeader`, `Button variant="gold"`. |

## 2. Architecture

```
Parent browser                               Server (Vercel function)                    Supabase / Paystack / Resend
-------------------------------------------  ------------------------------------------  ---------------------------------
/admissions/apply  (7-step form, no login)
  Review -> "Pay application fee"  ------->  createApplication (validate, rate-limit)  -> insert row PENDING_PAYMENT
                                    <-------  ref + secret token + signed upload URLs
  upload passport + birth cert directly ----------------------------------------------> private bucket (signed upload URL)
  startPayment(ref, token)          ------->  check files (type/size/magic bytes)
                                              create payment attempt, initialise      -> Paystack /transaction/initialize
                                    <-------  checkout URL
  pays on Paystack checkout
  redirect -> /admissions/application ---->  getApplicationStatus: verify with         -> Paystack /transaction/verify
                                              provider, finalise atomically (SQL fn)   -> SUBMITTED + receipt number
                                              send emails (once, retried)              -> Resend
Paystack webhook (signed) ------------------>  /api/payments/paystack/webhook: verify signature, re-verify, finalise
Vercel cron (daily) ------------------------>  /api/admissions/reconcile: re-check pending payments, retry emails
Downloads (POST, token in body) ------------>  /api/admissions/documents: PDF generated on demand (pdf-lib), ZIP (fflate),
                                              uploaded files via 60-second signed URLs
```

Key properties:
- No parent accounts. Each application gets a random reference (`BA-XXXX-XXXX`) plus two
  high-entropy secret tokens (parent and school). Only SHA-256 hashes are stored. Links carry the
  token in the URL fragment (`#...`), so it never reaches server logs.
- Payment state is only changed by server-side verification with the provider. Browser redirects
  are treated as "please check now", never as proof.
- Finalisation is one Postgres function with row locks: duplicate webhooks, a webhook racing the
  redirect, or a second payment can never create a second submission or receipt.
- Provider abstraction (`src/lib/admissions/payments`): `initialize`, `verify`, `parseWebhook`.
  Paystack is the only adapter; payments are disabled unless `PAYMENT_PROVIDER` and its keys are set.
- PDFs are rebuilt from the stored record on every download (no extra storage, always consistent).
- Emails are sent at most once per recipient (claim + Resend idempotency key) and retried on later
  visits/webhooks/cron. Email failure never affects the submission.

## 3. Database schema (migration `supabase/migrations/20261118120000_admissions.sql`)

- `admission_applications`: reference, status (`PENDING_PAYMENT` / `PAYMENT_FAILED` / `SUBMITTED`),
  token hashes, summary columns (student, parent, email, class), `form_data` JSONB (validated
  server-side), document paths/types/sizes, fee, receipt number, payment details, email delivery state.
- `admission_payment_attempts`: one row per checkout attempt; unique provider reference; status,
  amount, currency, provider transaction id, duplicate-payment flag.
- `admission_rate_limits`: fixed-window counters for public endpoints.
- Functions: `finalize_admission_payment`, `admission_rate_limit_hit` (service role only).
- Private bucket `admission-documents` (5 MB, JPEG/PNG/PDF only).
- RLS enabled on every table with no policies, and all grants revoked from `anon`/`authenticated`:
  only server code with the service-role key can read or write.

## 4. Field mapping against the original PDFs

### Document group A: Admission Form

**Form 1, Application Form** (`Admission form.pdf`)

| Original field | Online field |
| --- | --- |
| Passport photograph box | Upload: child's passport photograph (placed in the box) |
| Name of Parent/Guardian, Mr./Mrs./Ms., surname / first / middle | Title, surname, first name, middle name |
| "Must delete the word PARENT and insert their own status" | Relationship to child. If not father/mother, "Parent" is struck through and the status (e.g. UNCLE) printed |
| Agreement statement + child's full name (block capitals), Male/Female | Child's surname / first / middle (printed in capitals), gender |
| Date of birth, State of origin, Tribe, Religion | Same |
| Class in which admission is sought | Class (dropdown, see Q4) |
| Name/Address of previous school | Same |
| How did you hear about us? / Person who introduced you + Phone No | Same |
| Parent/Guardian's signature + Date | Electronic signature (typed full name) + submission date (see Q6) |
| Father's / Mother's occupation | Same |
| Phone numbers Father / Mother; Home, Office, Mobile, Email per parent | Same, per parent |
| Parental marital status (4 boxes) / custody if divorced | Same; custody required when Divorced |
| Full residential address in Nigeria / Who does the child live with / Children already at Bomas | Same |
| Name / Class (bottom strip) | Child's name and class (see Q9) |

**Form 2, Educational Background & Health Record** (`Adm back.pdf`)

| Original field | Online field |
| --- | --- |
| Present school, Date / To, Reason for leaving | Same (skippable if the child has never attended school) |
| Head teacher (name, title), Address, Phone, Email, Language of instruction | Same |
| Head Teacher's signature & official stamp + Date | Left blank: to be signed and stamped by the previous school (see Q7) |
| Educational difficulties + parent signature/date | Same + electronic signature |
| Illnesses with dates: measles, chicken pox, whooping cough, rubella, typhoid | Tick + date for each |
| Inoculations with dates: small pox, measles, polio, tetanus, BCG | Tick + date for each |
| Other vaccination Yes/No + type | Same |
| Hospital admission: year, kind of illness, duration | Same |
| Surgical operation: year, type (+ attach surgical report) | Same; report submitted physically (Q3) |
| Ailments Yes/No: respiratory, ENT, eye, other infirmity/allergy | Same |
| Why choose Bomas | Same |
| Parent's signature & date | Electronic signature |
| FOR OFFICE USE ONLY box | Printed empty |

### Document group B: Class Form (`Class copy.pdf`)

**Page 1, Student Information Sheet (Pre-School to Grade 5)**

| Original field | Online field |
| --- | --- |
| FOR OFFICE USE box | Printed empty |
| Entering grade (10 boxes) | Ticked from the class chosen; classes not on the sheet are written in, not ticked (Q4) |
| Child's name, Male/Female, Address, Email, D.O.B. | Re-used from Form 1 answers (entered once) |
| Place of birth, Home phone | New fields |
| Father's / Mother's name, address, cell phone, work phone | Collected once in the parent step |
| Other custodial parents/guardians (2 rows: name, relationship, work phone) | Same |
| Other children in the family (Name, D.O.B., Name) | Up to 4 children (Q8) |
| Medication yes/no + specify; other medical information; special information | Same |
| Primary language, language at home, last school attended + Tel. | Same |
| Bus / Drop-off-pickup / Walks home / Other arrangements | Same |
| Declaration (school year ... to ..., no refunds, activities, late pick-up fee) | Wording reproduced exactly; parent ticks to accept + school year |
| Parent's signature/date | Electronic signature |

**Page 2, Home/School Agreement**: reproduced word for word (UN Convention articles, child's,
family's and school's responsibilities). Parent ticks to accept and signs electronically. The
head teacher's signature line is left blank.

Note: the website's School Life page shows a different "2026 Home/School Agreement" wording.
The online application uses the wording on the paper form (Q5).

## 5. Open questions for Bomas (implementation uses the safe default shown)

| # | Question | Default used |
| --- | --- | --- |
| Q1 | The website links to a MySchool portal. Does MySchool already offer online admission/payment? If so, should this feature still go ahead? | Built as requested. |
| Q2 | Application fee amount? | Not set. Payments stay disabled until `ADMISSION_FEE_NGN` is set. |
| Q3 | Form 1 asks for **two** child passport photos, the **original** birth certificate for sighting, **parents' passport photos** and the **immunisation card**. Online we collect one child photo and a birth certificate copy. Are the rest brought physically? | Told to parents: bring the remaining items to the school office. |
| Q4 | Class list: Pre-Dawn, Dawn, Nursery 1-3, Primary 1-6, JSS 1-3, SSS 1-3? The Class Form covers only Pre-School to Primary Five. Should applicants above Primary Five fill the Class Form? | List as shown; Class Form generated for everyone, with the class written in when it is not on the sheet. |
| Q5 | Which Home/School Agreement wording is current: the paper form or the website version? | Paper form. |
| Q6 | Is an electronic signature (typed full name + tick + timestamp) acceptable on all signature lines, including the agreement? | Yes, with "Signed electronically" printed. |
| Q7 | Form 2 requires the previous head teacher's signature and stamp. Should parents print and take the form to the previous school? | Left blank on the PDF; parents told to get it signed and stamped. |
| Q8 | "Other children in the family" has columns Name / D.O.B. / Name. What is the second "Name" column? | Up to four children: name + D.O.B. in the first two rows; extra names in the right-hand column. |
| Q9 | Form 1 bottom strip "Name / Class": child or office? | Filled with the child's name and class. |
| Q10 | The forms print **No. 16 Naraguta Avenue, G.R.A., Jos** and phones 08036058313, 08168262600, 08111487859. The website shows **No 10 Metropolitan Crescent, G.R.A, Jos**. Which is current? | Forms reproduced exactly as printed (one config file to change). |
| Q11 | Privacy notice and how long applications and documents are kept. | Short consent statement shown; retention not automated until approved. |
| Q12 | Payment provider: Paystack confirmed? Who owns the account? | Paystack adapter ready; disabled until keys are supplied. |
| Q13 | Refund handling if a parent pays twice. | Second payment is recorded, flagged, and the school is emailed to refund it. |

## 6. Deployment and free-tier limitations

- **Vercel Hobby is for non-commercial personal use only.** A school collecting fees is commercial
  use, so Vercel's terms require the **Pro plan** (about US$20 per member per month). Hobby also
  limits cron to once a day.
- Vercel function request bodies are limited to 4.5 MB, so files go straight to Supabase Storage
  through signed upload URLs.
- **Supabase Free pauses after about a week without activity**, has no automatic backups, and gives
  500 MB database / 1 GB storage. The daily reconcile cron touches the database, which normally
  prevents pausing, but this is not guaranteed. When paused, the form shows a clear "temporarily
  unavailable, nothing was charged" message, and the parent's typed answers stay in the browser tab.
  Supabase Pro (US$25/month) adds daily backups and no pausing.
- Backups: `scripts/export-admissions.mjs` exports every application (JSON) and its files to a local
  folder. Run it monthly, and keep the copy somewhere safe.
- Paystack: no monthly fee; per-transaction fee (local cards 1.5% + NGN 100, NGN 100 waived under
  NGN 2,500, capped at NGN 2,000; check current pricing).
- Resend Free: 3,000 emails/month, 100/day; the `bomasacademy.org` domain must be verified.
