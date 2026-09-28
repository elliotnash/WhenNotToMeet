import { privateEnv } from '@/env';
import { render } from '@react-email/components';
import { type Transporter, createTransport } from 'nodemailer';
import type { ReactElement } from 'react';

let transport: Transporter | undefined;

function getTransport() {
  if (!transport) {
    const env = privateEnv();
    transport = createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
    });
  }
  return transport;
}

export async function sendMail({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: ReactElement;
}) {
  const env = privateEnv();
  const [html, text] = await Promise.all([render(body), render(body, { plainText: true })]);
  await getTransport().sendMail({
    from: `"${env.smtpSenderName}" <${env.smtpSender}>`,
    to,
    subject,
    html,
    text,
  });
}
