-- ============================================================
-- EIS RECEIPT AUTHENTICATION
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.receipt_authentication (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    payment_id uuid NOT NULL UNIQUE,
    receipt_number text NOT NULL UNIQUE,

    verification_token text NOT NULL UNIQUE,
    receipt_hash text NOT NULL,

    created_at timestamptz NOT NULL DEFAULT now(),
    verified_at timestamptz,

    CONSTRAINT receipt_auth_payment_fk
        FOREIGN KEY (payment_id)
        REFERENCES public.payments(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_receipt_auth_receipt_number
    ON public.receipt_authentication(receipt_number);

CREATE INDEX IF NOT EXISTS idx_receipt_auth_verification_token
    ON public.receipt_authentication(verification_token);

CREATE INDEX IF NOT EXISTS idx_receipt_auth_payment_id
    ON public.receipt_authentication(payment_id);

ALTER TABLE public.receipt_authentication ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can verify receipt authentication"
ON public.receipt_authentication;

CREATE POLICY "Public can verify receipt authentication"
ON public.receipt_authentication
FOR SELECT
USING (true);

CREATE OR REPLACE FUNCTION public.generate_receipt_verification_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

GRANT EXECUTE
ON FUNCTION public.generate_receipt_verification_token()
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.generate_receipt_verification_token()
TO anon;

COMMENT ON TABLE public.receipt_authentication IS
'Authentication records for digitally verifiable school payment receipts.';
