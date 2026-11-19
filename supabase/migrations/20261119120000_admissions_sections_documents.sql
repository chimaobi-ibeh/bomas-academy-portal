-- Two settlement accounts and more documents for online admissions.
--
-- school_section: which part of the school the class belongs to. The application fee is paid
--   into that section's Paystack subaccount (JSS/SSS: secondary; everything else:
--   nursery-primary).
-- extra_documents: the optional uploads the parent chose to upload instead of bringing them
--   to the school, as { "<kind>": { "path": "...", "type": "...", "size": 123 } }.
-- subaccount: the Paystack subaccount each checkout was opened for, kept for auditing.

ALTER TABLE public.admission_applications
  ADD COLUMN IF NOT EXISTS school_section TEXT
    CHECK (school_section IN ('nursery-primary', 'secondary')),
  ADD COLUMN IF NOT EXISTS extra_documents JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.admission_payment_attempts
  ADD COLUMN IF NOT EXISTS subaccount TEXT;
