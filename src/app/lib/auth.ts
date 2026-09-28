import { privateEnv } from '@/env';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { resetPasswordTemplate } from '~/emails/reset-password';
import { verifyEmailTemplate } from '~/emails/verify-email';
import { db } from './db';
import { sendMail } from './mailer';
import { schema } from './schema';

const env = privateEnv();

const githubProvider =
  env.githubClientId && env.githubClientSecret
    ? {
        github: {
          clientId: env.githubClientId,
          clientSecret: env.githubClientSecret,
        },
      }
    : undefined;

export const auth = betterAuth({
  appName: 'WhenNotToMeet',
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: 'Verify your email',
        body: verifyEmailTemplate({ name: user.name, url }),
      });
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: 'Reset your password',
        body: resetPasswordTemplate({ name: user.name, url }),
      });
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  ...(githubProvider ? { socialProviders: githubProvider } : {}),
  account: {
    accountLinking: {
      // GitHub sign-in with a matching (locally verified) email auto-links.
      trustedProviders: ['github'],
    },
  },
  user: {
    deleteUser: {
      enabled: true,
    },
  },
});
