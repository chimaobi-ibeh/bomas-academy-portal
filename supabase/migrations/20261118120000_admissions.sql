-- Online admission applications and payments.
-- Everything here is private: RLS is on with no policies and anon/authenticated have no
-- grants, so only server code using the service-role key can read or write it.

CREATE TYPE public.admission_status AS ENUM ('PENDING_PAYMENT', 'PAYMENT_FAILED', 'SUBMITTED');

CREATE SEQUENCE public.admission_receipt_seq START 1;

CREATE TABLE public.admission_applications (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference             TEXT NOT NULL UNIQUE CHECK (reference ~ '^BA-[0-9A-Z]{4}-[0-9A-Z]{4}$'),
  status                public.admission_status NOT NULL DEFAULT 'PENDING_PAYMENT',
  -- Access links use HMAC tokens derived from ADMISSIONS_LINK_SECRET + reference + id,
  -- so no token is stored here at all.
  -- Summary columns (also inside form_data) so the school email and receipts need no parsing.
  student_name          TEXT NOT NULL,
  parent_name           TEXT NOT NULL,
  parent_email          TEXT NOT NULL,
  class_applied         TEXT NOT NULL,
  form_version          INT  NOT NULL,
  form_data             JSONB NOT NULL,
  -- Uploaded documents in the private bucket "admission-documents".
  passport_path         TEXT NOT NULL,
  passport_type         TEXT,
  passport_size         INT,
  birth_cert_path       TEXT NOT NULL,
  birth_cert_type       TEXT,
  birth_cert_size       INT,
  documents_verified_at TIMESTAMPTZ,
  -- Fee fixed when the application is created, so a later fee change cannot break verification.
  fee_amount_kobo       BIGINT NOT NULL CHECK (fee_amount_kobo > 0),
  currency              TEXT NOT NULL DEFAULT 'NGN',
  -- Set only by finalize_admission_payment().
  receipt_number        TEXT UNIQUE,
  paid_amount_kobo      BIGINT,
  paid_at               TIMESTAMPTZ,
  payment_reference     TEXT,
  submitted_at          TIMESTAMPTZ,
  -- Email delivery (sent at most once each; retried on later events).
  school_email_sent_at  TIMESTAMPTZ,
  parent_email_sent_at  TIMESTAMPTZ,
  email_attempts        INT NOT NULL DEFAULT 0,
  email_locked_until    TIMESTAMPTZ,
  last_email_error      TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX admission_applications_status_idx ON public.admission_applications (status, created_at);

CREATE TABLE public.admission_payment_attempts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id          UUID NOT NULL REFERENCES public.admission_applications (id) ON DELETE CASCADE,
  provider                TEXT NOT NULL,
  reference               TEXT NOT NULL UNIQUE,
  amount_kobo             BIGINT NOT NULL CHECK (amount_kobo > 0),
  currency                TEXT NOT NULL DEFAULT 'NGN',
  status                  TEXT NOT NULL DEFAULT 'initialized'
                            CHECK (status IN ('initialized', 'success', 'failed', 'abandoned')),
  provider_transaction_id TEXT,
  gateway_response        TEXT,
  paid_at                 TIMESTAMPTZ,
  verified_at             TIMESTAMPTZ,
  duplicate_payment       BOOLEAN NOT NULL DEFAULT false,
  duplicate_notified_at   TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX admission_payment_attempts_app_idx ON public.admission_payment_attempts (application_id, created_at DESC);
CREATE INDEX admission_payment_attempts_pending_idx ON public.admission_payment_attempts (status, created_at)
  WHERE status = 'initialized';

CREATE TABLE public.admission_rate_limits (
  bucket       TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  hits         INT NOT NULL DEFAULT 0
);

CREATE TRIGGER trg_admission_applications_updated BEFORE UPDATE ON public.admission_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_admission_payment_attempts_updated BEFORE UPDATE ON public.admission_payment_attempts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.admission_applications, public.admission_payment_attempts, public.admission_rate_limits
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.admission_applications, public.admission_payment_attempts, public.admission_rate_limits
  TO service_role;
REVOKE ALL ON SEQUENCE public.admission_receipt_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SEQUENCE public.admission_receipt_seq TO service_role;

-- Marks a verified payment. Safe to call any number of times, from the webhook, the browser
-- return and the daily reconciliation at once: row locks serialise the calls, and only the
-- first one moves the application to SUBMITTED and issues a receipt number.
CREATE OR REPLACE FUNCTION public.finalize_admission_payment(
  p_attempt_reference TEXT,
  p_amount_kobo       BIGINT,
  p_currency          TEXT,
  p_paid_at           TIMESTAMPTZ,
  p_transaction_id    TEXT
)
RETURNS TABLE (application_id UUID, newly_submitted BOOLEAN, duplicate_payment BOOLEAN, receipt_number TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.admission_payment_attempts;
  v_app     public.admission_applications;
  v_receipt TEXT;
BEGIN
  SELECT * INTO v_attempt FROM public.admission_payment_attempts a
    WHERE a.reference = p_attempt_reference FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown payment reference' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_app FROM public.admission_applications x
    WHERE x.id = v_attempt.application_id FOR UPDATE;

  IF v_attempt.status = 'success' THEN
    RETURN QUERY SELECT v_app.id, false, v_attempt.duplicate_payment, v_app.receipt_number;
    RETURN;
  END IF;

  IF p_amount_kobo <> v_attempt.amount_kobo OR upper(p_currency) <> upper(v_attempt.currency) THEN
    RAISE EXCEPTION 'amount or currency mismatch' USING ERRCODE = 'P0001';
  END IF;

  IF v_app.status = 'SUBMITTED' THEN
    -- The parent paid twice: record it and let the server alert the school to refund.
    UPDATE public.admission_payment_attempts a SET
      status = 'success', duplicate_payment = true, paid_at = p_paid_at,
      provider_transaction_id = p_transaction_id, verified_at = now()
    WHERE a.id = v_attempt.id;
    RETURN QUERY SELECT v_app.id, false, true, v_app.receipt_number;
    RETURN;
  END IF;

  UPDATE public.admission_payment_attempts a SET
    status = 'success', paid_at = p_paid_at, provider_transaction_id = p_transaction_id, verified_at = now()
  WHERE a.id = v_attempt.id;

  v_receipt := 'BA-RCT-' || to_char(now() AT TIME ZONE 'Africa/Lagos', 'YYYY') || '-'
               || lpad(nextval('public.admission_receipt_seq')::TEXT, 5, '0');

  UPDATE public.admission_applications x SET
    status = 'SUBMITTED', receipt_number = v_receipt, paid_amount_kobo = p_amount_kobo,
    paid_at = p_paid_at, payment_reference = p_attempt_reference, submitted_at = now()
  WHERE x.id = v_app.id;

  -- Any other open checkout for this application can no longer be completed.
  UPDATE public.admission_payment_attempts a SET status = 'abandoned'
  WHERE a.application_id = v_app.id AND a.id <> v_attempt.id AND a.status = 'initialized';

  RETURN QUERY SELECT v_app.id, true, false, v_receipt;
END;
$$;

-- Fixed-window rate limiter. Returns true while the caller is within the limit.
CREATE OR REPLACE FUNCTION public.admission_rate_limit_hit(p_bucket TEXT, p_limit INT, p_window_seconds INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hits INT;
BEGIN
  INSERT INTO public.admission_rate_limits AS r (bucket, window_start, hits)
  VALUES (p_bucket, now(), 1)
  ON CONFLICT (bucket) DO UPDATE SET
    hits = CASE WHEN r.window_start < now() - make_interval(secs => p_window_seconds) THEN 1 ELSE r.hits + 1 END,
    window_start = CASE WHEN r.window_start < now() - make_interval(secs => p_window_seconds) THEN now() ELSE r.window_start END
  RETURNING hits INTO v_hits;
  RETURN v_hits <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_admission_payment(TEXT, BIGINT, TEXT, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admission_rate_limit_hit(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_admission_payment(TEXT, BIGINT, TEXT, TIMESTAMPTZ, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admission_rate_limit_hit(TEXT, INT, INT) TO service_role;

-- Private bucket for passport photographs and birth certificates. No storage policies are
-- added, so files can only be reached through server-issued signed URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('admission-documents', 'admission-documents', false, 5242880,
        ARRAY['image/jpeg', 'image/png', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;
