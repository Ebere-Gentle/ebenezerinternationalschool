import nodemailer from 'npm:nodemailer@6.10.1';

const senderConfig = {
  director: {
    email: 'director@ebenezerinternationalschool.com.ng',
    userSecret: 'SMTP_DIRECTOR_USER',
    passSecret: 'SMTP_DIRECTOR_PASS',
    name: 'Director - Ebenezer International School',
  },
  accounts: {
    email: 'accounts@ebenezerinternationalschool.com.ng',
    userSecret: 'SMTP_ACCOUNTS_USER',
    passSecret: 'SMTP_ACCOUNTS_PASS',
    name: 'Accounts - Ebenezer International School',
  },
  support: {
    email: 'support@ebenezerinternationalschool.com.ng',
    userSecret: 'SMTP_SUPPORT_USER',
    passSecret: 'SMTP_SUPPORT_PASS',
    name: 'Support - Ebenezer International School',
  },
  general: {
    email: 'ebenezer@ebenezerinternationalschool.com.ng',
    userSecret: 'SMTP_GENERAL_USER',
    passSecret: 'SMTP_GENERAL_PASS',
    name: 'Ebenezer International School',
  },
} as const;

type SenderKey = keyof typeof senderConfig;

export type TransactionalEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  sender?: SenderKey;
  replyTo?: string;
};

export async function sendTransactionalEmail(
  options: TransactionalEmailOptions,
) {
  const {
    to,
    subject,
    html,
    text,
    sender = 'general',
    replyTo,
  } = options;

  const config = senderConfig[sender];

  const smtpHost =
    Deno.env.get('SMTP_HOST') ??
    'mail.ebenezerinternationalschool.com.ng';

  const smtpPort = Number(Deno.env.get('SMTP_PORT') ?? '587');

  const smtpUser = Deno.env.get(config.userSecret);
  const smtpPass = Deno.env.get(config.passSecret);

  if (!smtpUser || !smtpPass) {
    throw new Error(`SMTP credentials are not configured for ${sender}`);
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
    from: `${config.name} <${config.email}>`,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject: subject.trim(),
    html,
    text: text ?? undefined,
    replyTo: replyTo ?? config.email,
  });

  return {
    messageId: info.messageId,
    sender: config.email,
  };
}
