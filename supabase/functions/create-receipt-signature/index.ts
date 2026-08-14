import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    { name: 'HMAC', hash: 'SHA-256' },
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

function generateVerificationToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = 'EIS-VFY-';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'POST required' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const { paymentId } = body;

    if (!paymentId) {
      return new Response(
        JSON.stringify({ success: false, error: 'paymentId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the payment record
    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .select('id, receipt_number, student_id, amount_paid, transaction_reference, payment_date')
      .eq('id', paymentId)
      .single();

    if (error || !payment) {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const canonical = canonicalPayload(payment);
    const signature = await hmacSha256(RECEIPT_SIGNING_SECRET, canonical);
    const verificationToken = generateVerificationToken();
    
    const barcodePayload = `EIS|${payment.receipt_number}|${signature}`;
    const qrPayload = JSON.stringify({
      v: 2,
      token: verificationToken,
      receipt: payment.receipt_number,
      signature: signature,
    });

    return new Response(
      JSON.stringify({
        success: true,
        signature,
        barcodePayload,
        qrPayload,
        verificationToken,
        receiptNumber: payment.receipt_number,
        verificationUrl: `${SUPABASE_URL}/functions/v1/verify-receipt`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating receipt signature:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});