#!/usr/bin/env bash
set -e

echo "=============================================="
echo " EIS RECEIPT SECURITY EDGE FUNCTIONS"
echo "=============================================="

mkdir -p supabase/functions/create-receipt-signature
mkdir -p supabase/functions/verify-receipt

echo
echo "[1/4] Creating cryptographic signing function..."

cat <<'FILE' > supabase/functions/create-receipt-signature/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RECEIPT_SIGNING_SECRET = Deno.env.get('RECEIPT_SIGNING_SECRET');

if (!RECEIPT_SIGNING_SECRET) {
  throw new Error('RECEIPT_SIGNING_SECRET is not configured');
}

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
);

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(
  secret: string,
  message: string,
): Promise<string> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(message),
  );

  return hex(signature);
}

function canonicalPayload(payment: {
  id: string;
  receipt_number: string;
  student_id: string;
  amount_paid: number;
  transaction_reference?: string | null;
  payment_date?: string | null;
}): string {
  return [
    'EIS-RECEIPT-V1',
    payment.id,
    payment.receipt_number,
    payment.student_id,
    Number(payment.amount_paid || 0).toFixed(2),
    payment.transaction_reference || '',
    payment.payment_date || '',
  ].join('|');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'POST required',
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  try {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication required',
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const {
      data: {
        user,
      },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid authentication token',
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const body = await req.json();

    const paymentId = String(body.paymentId || '').trim();

    if (!paymentId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'paymentId is required',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const { data: payment, error: paymentError } =
      await supabaseAdmin
        .from('payments')
        .select(
          'id, receipt_number, student_id, amount_paid, transaction_reference, payment_date, status',
        )
        .eq('id', paymentId)
        .maybeSingle();

    if (paymentError) {
      console.error(paymentError);

      return new Response(
        JSON.stringify({
          success: false,
          error: paymentError.message,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    if (!payment) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payment not found',
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    if (!payment.receipt_number) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Payment does not have a receipt number',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const payload = canonicalPayload(payment);

    const signature = await hmacSha256(
      RECEIPT_SIGNING_SECRET,
      payload,
    );

    const barcodePayload =
      `EIS|${payment.receipt_number}|${signature}`;

    const verificationUrl =
      `${SUPABASE_URL.replace(/\/$/, '')}` +
      `/functions/v1/verify-receipt`;

    const qrPayload = JSON.stringify({
      v: 1,
      receipt: payment.receipt_number,
      signature,
      verify: verificationUrl,
    });

    const { error: updateError } =
      await supabaseAdmin
        .from('payments')
        .update({
          receipt_signature: signature,
          receipt_barcode_payload: barcodePayload,
          receipt_qr_payload: qrPayload,
          receipt_issued_at:
            payment.receipt_number &&
            payment.receipt_number.length > 0
              ? new Date().toISOString()
              : null,
          receipt_security_status: 'AUTHENTIC',
          receipt_security_version: 1,
        })
        .eq('id', payment.id);

    if (updateError) {
      console.error(updateError);

      return new Response(
        JSON.stringify({
          success: false,
          error: updateError.message,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        receiptNumber: payment.receipt_number,
        signature,
        barcodePayload,
        qrPayload,
        verificationUrl,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unexpected server error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});
FILE

echo
echo "[2/4] Creating verification function..."

cat <<'FILE' > supabase/functions/verify-receipt/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RECEIPT_SIGNING_SECRET = Deno.env.get('RECEIPT_SIGNING_SECRET');

if (!RECEIPT_SIGNING_SECRET) {
  throw new Error('RECEIPT_SIGNING_SECRET is not configured');
}

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
);

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(
  secret: string,
  message: string,
): Promise<string> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(message),
  );

  return hex(signature);
}

function constantTimeEqual(
  a: string,
  b: string,
): boolean {
  if (a.length !== b.length) return false;

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

function canonicalPayload(payment: {
  id: string;
  receipt_number: string;
  student_id: string;
  amount_paid: number;
  transaction_reference?: string | null;
  payment_date?: string | null;
}): string {
  return [
    'EIS-RECEIPT-V1',
    payment.id,
    payment.receipt_number,
    payment.student_id,
    Number(payment.amount_paid || 0).toFixed(2),
    payment.transaction_reference || '',
    payment.payment_date || '',
  ].join('|');
}

async function logVerification(input: {
  receiptNumber: string;
  paymentId?: string | null;
  status: string;
  scannedSignature?: string | null;
  storedSignature?: string | null;
  request: Request;
}) {
  const forwardedFor =
    input.request.headers.get('x-forwarded-for');

  const realIp =
    input.request.headers.get('x-real-ip');

  const ipAddress =
    forwardedFor?.split(',')[0]?.trim() ||
    realIp ||
    null;

  await supabaseAdmin
    .from('receipt_verification_logs')
    .insert({
      receipt_number: input.receiptNumber,
      payment_id: input.paymentId || null,
      verification_status: input.status,
      scanned_signature:
        input.scannedSignature || null,
      stored_signature:
        input.storedSignature || null,
      verification_method:
        input.scannedSignature
          ? 'qr_or_barcode'
          : 'receipt_number',
      ip_address: ipAddress,
      user_agent:
        input.request.headers.get('user-agent'),
      metadata: {},
    });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        valid: false,
        status: 'ERROR',
        message: 'POST required',
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  try {
    const body = await req.json();

    let receiptNumber =
      String(body.receiptNumber || '').trim();

    let scannedSignature =
      String(body.signature || '').trim();

    /*
     * Allow QR payloads to be sent directly.
     */
    if (body.qrPayload) {
      try {
        const parsed =
          typeof body.qrPayload === 'string'
            ? JSON.parse(body.qrPayload)
            : body.qrPayload;

        receiptNumber =
          String(parsed.receipt || '').trim();

        scannedSignature =
          String(parsed.signature || '').trim();
      } catch {
        // Continue with normal receipt/signature fields.
      }
    }

    /*
     * Allow CODE128 payload:
     *
     * EIS|RECEIPT|SIGNATURE
     */
    if (
      body.barcodePayload &&
      !receiptNumber
    ) {
      const parts =
        String(body.barcodePayload).split('|');

      if (
        parts.length >= 3 &&
        parts[0] === 'EIS'
      ) {
        receiptNumber = parts[1].trim();
        scannedSignature = parts[2].trim();
      }
    }

    if (!receiptNumber) {
      return new Response(
        JSON.stringify({
          valid: false,
          status: 'NOT_FOUND',
          message: 'Receipt number is required.',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const { data: payment, error } =
      await supabaseAdmin
        .from('payments')
        .select(
          'id, receipt_number, student_id, amount_paid, transaction_reference, payment_date, receipt_signature, receipt_security_status, receipt_revoked_at, status',
        )
        .eq('receipt_number', receiptNumber)
        .maybeSingle();

    if (error) {
      console.error(error);

      return new Response(
        JSON.stringify({
          valid: false,
          status: 'ERROR',
          message: error.message,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    if (!payment) {
      await logVerification({
        receiptNumber,
        status: 'NOT_FOUND',
        scannedSignature,
        request: req,
      });

      return new Response(
        JSON.stringify({
          valid: false,
          status: 'NOT_FOUND',
          message:
            'This receipt number does not exist in the official school payment records.',
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    if (
      payment.receipt_revoked_at ||
      payment.receipt_security_status === 'REVOKED'
    ) {
      await logVerification({
        receiptNumber,
        paymentId: payment.id,
        status: 'REVOKED',
        scannedSignature,
        storedSignature:
          payment.receipt_signature,
        request: req,
      });

      return new Response(
        JSON.stringify({
          valid: false,
          status: 'REVOKED',
          message:
            'This receipt has been revoked by the school.',
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const canonical =
      canonicalPayload(payment);

    const expectedSignature =
      await hmacSha256(
        RECEIPT_SIGNING_SECRET,
        canonical,
      );

    /*
     * First verify the stored receipt itself.
     */
    const storedSignature =
      payment.receipt_signature || '';

    if (
      !storedSignature ||
      !constantTimeEqual(
        expectedSignature,
        storedSignature,
      )
    ) {
      await logVerification({
        receiptNumber,
        paymentId: payment.id,
        status: 'TAMPERED',
        scannedSignature,
        storedSignature,
        request: req,
      });

      return new Response(
        JSON.stringify({
          valid: false,
          status: 'TAMPERED',
          message:
            'The official payment record no longer matches its cryptographic receipt signature.',
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    /*
     * If a signature was scanned, compare it.
     */
    if (
      scannedSignature &&
      !constantTimeEqual(
        expectedSignature,
        scannedSignature,
      )
    ) {
      await logVerification({
        receiptNumber,
        paymentId: payment.id,
        status: 'INVALID_SIGNATURE',
        scannedSignature,
        storedSignature,
        request: req,
      });

      return new Response(
        JSON.stringify({
          valid: false,
          status: 'INVALID_SIGNATURE',
          message:
            'The barcode or QR signature does not match the official receipt.',
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    await supabaseAdmin
      .from('payments')
      .update({
        receipt_security_status: 'AUTHENTIC',
      })
      .eq('id', payment.id);

    await logVerification({
      receiptNumber,
      paymentId: payment.id,
      status: 'AUTHENTIC',
      scannedSignature,
      storedSignature,
      request: req,
    });

    return new Response(
      JSON.stringify({
        valid: true,
        status: 'AUTHENTIC',
        message:
          'This receipt is authentic and matches the official school payment record.',
        receipt: {
          receipt_number:
            payment.receipt_number,
          amount:
            Number(payment.amount_paid || 0),
          currency: 'NGN',
          student_id:
            payment.student_id,
          transaction_reference:
            payment.transaction_reference,
          payment_id:
            payment.id,
          issued_at:
            payment.payment_date,
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({
        valid: false,
        status: 'ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Unexpected server error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});
FILE

echo
echo "[3/4] Creating Edge Function configuration..."

cat <<'FILE' > supabase/functions/create-receipt-signature/deno.json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2"
  }
}
FILE

cat <<'FILE' > supabase/functions/verify-receipt/deno.json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2"
  }
}
FILE

echo
echo "[4/4] Edge Function files created."

echo
echo "=============================================="
echo " FUNCTIONS CREATED SUCCESSFULLY"
echo "=============================================="
echo
echo "Next we need to create the server-side secret."
echo
echo "IMPORTANT:"
echo "Do NOT put the receipt secret in .env, React code,"
echo "GitHub, or any browser-accessible configuration."
echo
