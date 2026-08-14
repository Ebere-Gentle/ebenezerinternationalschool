#!/usr/bin/env bash
set -e

echo "=============================================="
echo " EBENEZER SMS RECEIPT SECURITY INSTALLER"
echo "=============================================="

PROJECT_ROOT="$(pwd)"

echo
echo "Project: $PROJECT_ROOT"
echo

if [ ! -f "package.json" ]; then
  echo "ERROR: package.json was not found."
  echo "Run this script from the root of your React project."
  exit 1
fi

echo "[1/8] Creating backup..."

BACKUP_DIR="../sms-backup-before-receipt-security-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

cp -R . "$BACKUP_DIR" 2>/dev/null || true

echo "Backup created at:"
echo "$BACKUP_DIR"

echo
echo "[2/8] Installing barcode and QR dependencies..."

npm install jsbarcode qrcode
npm install -D @types/jsbarcode @types/qrcode

echo
echo "[3/8] Creating receipt security directories..."

mkdir -p src/components/receipt-security
mkdir -p src/services
mkdir -p src/pages
mkdir -p supabase/migrations
mkdir -p supabase/functions/create-receipt-signature
mkdir -p supabase/functions/verify-receipt

echo
echo "[4/8] Creating barcode component..."

cat <<'FILE' > src/components/receipt-security/ReceiptBarcode.tsx
import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface ReceiptBarcodeProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
}

export default function ReceiptBarcode({
  value,
  width = 2,
  height = 55,
  displayValue = true,
}: ReceiptBarcodeProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;

    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        width,
        height,
        displayValue,
        fontSize: 12,
        font: 'monospace',
        textMargin: 4,
        margin: 6,
        background: '#ffffff',
        lineColor: '#111827',
      });
    } catch (error) {
      console.error('Receipt barcode error:', error);
    }
  }, [value, width, height, displayValue]);

  return (
    <div className="flex justify-center overflow-hidden">
      <svg ref={svgRef} className="max-w-full h-auto" />
    </div>
  );
}
FILE

echo
echo "[5/8] Creating QR component..."

cat <<'FILE' > src/components/receipt-security/ReceiptQRCode.tsx
import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface ReceiptQRCodeProps {
  value: string;
  size?: number;
}

export default function ReceiptQRCode({
  value,
  size = 140,
}: ReceiptQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    }).catch((error) => {
      console.error('Receipt QR error:', error);
    });
  }, [value, size]);

  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-2">
      <canvas ref={canvasRef} />
    </div>
  );
}
FILE

echo
echo "[6/8] Creating receipt security types..."

cat <<'FILE' > src/services/receiptSecurity.ts
import { supabase } from '../config/supabase/client';

export interface ReceiptSecurityPayload {
  paymentId: string;
  receiptNumber: string;
  studentId: string;
  amount: number;
  currency?: string;
  transactionReference?: string | null;
}

export interface ReceiptSecurityResult {
  success: boolean;
  receiptNumber?: string;
  verificationUrl?: string;
  barcodePayload?: string;
  qrPayload?: string;
  signature?: string;
  error?: string;
}

export interface ReceiptVerificationResult {
  valid: boolean;
  status:
    | 'AUTHENTIC'
    | 'TAMPERED'
    | 'INVALID_SIGNATURE'
    | 'NOT_FOUND'
    | 'REVOKED'
    | 'ERROR';

  receipt?: {
    receipt_number: string;
    amount: number;
    currency: string;
    student_id: string;
    transaction_reference: string | null;
    payment_id: string;
    issued_at: string;
  };

  message?: string;
}

export async function createReceiptSecurity(
  payload: ReceiptSecurityPayload
): Promise<ReceiptSecurityResult> {
  const { data, error } = await supabase.functions.invoke(
    'create-receipt-signature',
    {
      body: payload,
    }
  );

  if (error) {
    console.error('Receipt signing error:', error);

    return {
      success: false,
      error: error.message || 'Unable to secure receipt',
    };
  }

  return data as ReceiptSecurityResult;
}

export async function verifyReceipt(
  receiptNumber: string,
  signature?: string
): Promise<ReceiptVerificationResult> {
  const { data, error } = await supabase.functions.invoke(
    'verify-receipt',
    {
      body: {
        receiptNumber,
        signature,
      },
    }
  );

  if (error) {
    console.error('Receipt verification error:', error);

    return {
      valid: false,
      status: 'ERROR',
      message: error.message || 'Verification failed',
    };
  }

  return data as ReceiptVerificationResult;
}

export function buildReceiptVerificationUrl(
  receiptNumber: string,
  signature: string
): string {
  const baseUrl = window.location.origin;

  return `${baseUrl}/verify-receipt?receipt=${encodeURIComponent(
    receiptNumber
  )}&signature=${encodeURIComponent(signature)}`;
}

export function buildBarcodePayload(
  receiptNumber: string,
  signature: string
): string {
  return `EIS|${receiptNumber}|${signature}`;
}
FILE

echo
echo "[7/8] Creating Supabase database migration..."

cat <<'FILE' > supabase/migrations/$(date +%Y%m%d%H%M%S)_receipt_security.sql
-- ============================================================
-- RECEIPT AUTHENTICATION / ANTI-FORGERY SYSTEM
-- Ebenezer International School
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS receipt_number text;

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS receipt_signature text;

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS receipt_barcode_payload text;

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS receipt_qr_payload text;

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS receipt_issued_at timestamptz;

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS receipt_revoked_at timestamptz;

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS receipt_security_status text
CHECK (
  receipt_security_status IS NULL
  OR receipt_security_status IN (
    'AUTHENTIC',
    'REVOKED',
    'TAMPERED',
    'INVALID_SIGNATURE'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS payments_receipt_number_unique
ON public.payments(receipt_number)
WHERE receipt_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_receipt_signature_idx
ON public.payments(receipt_signature)
WHERE receipt_signature IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_receipt_number_idx
ON public.payments(receipt_number)
WHERE receipt_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.receipt_verification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  receipt_number text,

  payment_id uuid,

  verification_status text NOT NULL,

  scanned_signature text,

  stored_signature text,

  ip_address text,

  user_agent text,

  verified_at timestamptz NOT NULL DEFAULT now(),

  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS receipt_verification_logs_receipt_idx
ON public.receipt_verification_logs(receipt_number);

CREATE INDEX IF NOT EXISTS receipt_verification_logs_payment_idx
ON public.receipt_verification_logs(payment_id);

CREATE INDEX IF NOT EXISTS receipt_verification_logs_date_idx
ON public.receipt_verification_logs(verified_at DESC);

COMMENT ON TABLE public.receipt_verification_logs IS
'Security audit trail for receipt authentication attempts.';

COMMENT ON COLUMN public.payments.receipt_signature IS
'Server-generated HMAC-SHA256 receipt signature. Never generate this in the browser.';
FILE

echo
echo "[8/8] Creating verification component..."

cat <<'FILE' > src/components/receipt-security/ReceiptVerification.tsx
import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Search, ShieldAlert } from 'lucide-react';
import { verifyReceipt, ReceiptVerificationResult } from '../../services/receiptSecurity';

export default function ReceiptVerification() {
  const [receiptNumber, setReceiptNumber] = useState('');
  const [signature, setSignature] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReceiptVerificationResult | null>(null);

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();

    if (!receiptNumber.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await verifyReceipt(
        receiptNumber.trim(),
        signature.trim() || undefined
      );

      setResult(response);
    } finally {
      setLoading(false);
    }
  }

  const isAuthentic = result?.status === 'AUTHENTIC';

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <ShieldAlert size={30} />
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Verify Payment Receipt
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Confirm whether an Ebenezer International School receipt is genuine.
          </p>
        </div>

        <form
          onSubmit={handleVerify}
          className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
        >
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Receipt Number
          </label>

          <input
            value={receiptNumber}
            onChange={(e) => setReceiptNumber(e.target.value)}
            placeholder="EIS-2028-000001"
            className="mb-5 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
          />

          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Security Signature
          </label>

          <input
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Scan QR/barcode or enter signature"
            className="mb-5 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
          />

          <button
            type="submit"
            disabled={loading || !receiptNumber.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Verifying...
              </>
            ) : (
              <>
                <Search size={18} />
                Verify Receipt
              </>
            )}
          </button>
        </form>

        {result && (
          <div
            className={`mt-6 rounded-2xl border p-6 ${
              isAuthentic
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-red-200 bg-red-50'
            }`}
          >
            <div className="flex items-start gap-4">
              {isAuthentic ? (
                <CheckCircle2 className="mt-1 text-emerald-600" size={32} />
              ) : (
                <AlertTriangle className="mt-1 text-red-600" size={32} />
              )}

              <div>
                <h2
                  className={`text-xl font-bold ${
                    isAuthentic ? 'text-emerald-800' : 'text-red-800'
                  }`}
                >
                  {result.status === 'AUTHENTIC'
                    ? 'AUTHENTIC RECEIPT'
                    : result.status === 'TAMPERED'
                    ? 'TAMPERED RECEIPT'
                    : result.status === 'INVALID_SIGNATURE'
                    ? 'INVALID SIGNATURE'
                    : result.status === 'REVOKED'
                    ? 'REVOKED RECEIPT'
                    : 'RECEIPT NOT FOUND'}
                </h2>

                <p
                  className={`mt-1 text-sm ${
                    isAuthentic ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {result.message ||
                    (isAuthentic
                      ? 'This receipt matches the official school payment record.'
                      : 'This receipt could not be authenticated.')}
                </p>
              </div>
            </div>

            {result.receipt && (
              <div className="mt-5 grid gap-3 border-t border-black/10 pt-5 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Receipt</span>
                  <strong>{result.receipt.receipt_number}</strong>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Amount</span>
                  <strong>
                    {result.receipt.currency}{' '}
                    {Number(result.receipt.amount).toLocaleString()}
                  </strong>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Transaction</span>
                  <strong className="break-all">
                    {result.receipt.transaction_reference || 'N/A'}
                  </strong>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
FILE

echo
echo "=============================================="
echo " BASE RECEIPT SECURITY LAYER CREATED"
echo "=============================================="
echo
echo "Next steps:"
echo
echo "1. Run:"
echo "   npx supabase db push"
echo
echo "2. Then run:"
echo "   npm run build"
echo
echo "IMPORTANT:"
echo "The signing Edge Function must be configured before production use."
echo "The browser must NEVER receive the HMAC secret."
echo

