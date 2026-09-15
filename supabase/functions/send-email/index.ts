import nodemailer from 'npm:nodemailer@6.10.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_RECIPIENTS = 25;
const MAX_SUBJECT_LENGTH = 200;
const MAX_BODY_LENGTH = 1_000_000;

const senderConfig = {
  director: {
    email: 'director@ebenezerinternationalschool.com.ng',
    userSecret: 'SMTP_DIRECTOR_USER',
    passSecret: 'SMTP_DIRECTOR_PASS',
  },
  accounts: {
    email: 'accounts@ebenezerinternationalschool.com.ng',
    userSecret: 'SMTP_ACCOUNTS_USER',
    passSecret: 'SMTP_ACCOUNTS_PASS',
  },
  support: {
    email: 'support@ebenezerinternationalschool.com.ng',
    userSecret: 'SMTP_SUPPORT_USER',
    passSecret: 'SMTP_SUPPORT_PASS',
  },
  general: {
    email: 'ebenezer@ebenezerinternationalschool.com.ng',
    userSecret: 'SMTP_GENERAL_USER',
    passSecret: 'SMTP_GENERAL_PASS',
  },
} as const;

type SenderKey = keyof typeof senderConfig;

type EmailRequest = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  sender?: SenderKey;
  replyTo?: string;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normaliseRecipients(value: string | string[]): string[] {
  const recipients = Array.isArray(value) ? value : [value];
  return [...new Set(recipients.map((email) => email.trim()).filter(Boolean))];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = (await req.json()) as EmailRequest;
    const {
      to,
      subject,
      html,
      text,
      sender = 'general',
      replyTo,
    } = body;

    if (!to || !subject || (!html && !text)) {
      return jsonResponse({
        error: 'Required fields: to, subject, and html or text',
      }, 400);
    }

    if (!(sender in senderConfig)) {
      return jsonResponse({ error: 'Invalid sender' }, 400);
    }

    if (subject.length > MAX_SUBJECT_LENGTH) {
      return jsonResponse({ error: 'Subject is too long' }, 400);
    }

    if ((html?.length ?? 0) > MAX_BODY_LENGTH || (text?.length ?? 0) > MAX_BODY_LENGTH) {
      return jsonResponse({ error: 'Email body is too large' }, 400);
    }

    const recipients = normaliseRecipients(to);
    if (recipients.length === 0 || recipients.length > MAX_RECIPIENTS) {
      return jsonResponse({ error: `Recipients must contain between 1 and ${MAX_RECIPIENTS} addresses` }, 400);
    }

    if (recipients.some((email) => !isValidEmail(email))) {
      return jsonResponse({ error: 'One or more recipient email addresses are invalid' }, 400);
    }

    if (replyTo && !isValidEmail(replyTo)) {
      return jsonResponse({ error: 'Invalid replyTo email address' }, 400);
    }

    const config = senderConfig[sender];
    const smtpHost = Deno.env.get('SMTP_HOST') ?? 'mail.ebenezerinternationalschool.com.ng';
    const smtpPort = Number(Deno.env.get('SMTP_PORT') ?? '587');
    const smtpUser = Deno.env.get(config.userSecret);
    const smtpPass = Deno.env.get(config.passSecret);

    if (!smtpUser || !smtpPass) {
      console.error(`Missing SMTP credentials for sender: ${sender}`);
      return jsonResponse({ error: 'Email service is not configured for this sender' }, 503);
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false,
      requireTLS: true,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        minVersion: 'TLSv1.2',
      },
    });

    const info = await transporter.sendMail({
      from: `${sender === 'general' ? 'Ebenezer International School' : sender === 'director' ? 'Director - Ebenezer International School' : sender === 'accounts' ? 'Accounts - Ebenezer International School' : 'Support - Ebenezer International School'} <${config.email}>`,
      to: recipients.join(', '),
      subject: subject.trim(),
      html,
      text: text ?? undefined,
      replyTo: replyTo ?? config.email,
    });

    console.log('Email sent successfully', {
      sender,
      recipients: recipients.length,
      messageId: info.messageId,
    });

    return jsonResponse({
      success: true,
      sender: config.email,
      messageId: info.messageId,
    });
  } catch (error) {
    console.error('Email delivery failed:', error);
    return jsonResponse({
      error: 'Failed to send email',
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});
