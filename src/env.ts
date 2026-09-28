import type { CamelKeys, ReplaceKeys } from 'string-ts';
import { camelKeys, replaceKeys } from 'string-ts';
import { z } from 'zod';

/**
 * Creates a typed environment function.
 *
 * @template T - The type of the environment variables.
 * @param schema - A function that defines the schema for parsing the environment variables.
 * @returns - A function that parses and transforms the environment variables based on the provided schema.
 */
function makeTypedEnvironment<T>(schema: (v: unknown) => T) {
  // Instantiate a cache to store parsed environment variables.
  let cache: CamelKeys<ReplaceKeys<T, 'VITE_', ''>>;

  return (args: Record<string, unknown>) => {
    // If the environment variables are already cached, return the cached value.
    if (cache) return cache;

    // Otherwise, parse the environment variables and transform the keys
    const withoutPrefix = replaceKeys(schema({ ...args }), 'VITE_', '');
    const camelCased = camelKeys(withoutPrefix);
    cache = camelCased;
    return cache;
  };
}

export const PublicEnvSchema = z.object({
  MODE: z.enum(['development', 'production']).optional(),
});

export const PrivateEnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string(),
  BETTER_AUTH_URL: z.string().url(),
  // Database
  DB_NAME: z.string(),
  DB_HOST: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_PORT: z.coerce.number().default(5432),
  DB_SSL: z.preprocess((val) => {
    if (typeof val === 'string') {
      if (['1', 'true'].includes(val.toLowerCase())) return true;
      if (['0', 'false'].includes(val.toLowerCase())) return false;
    }
    return val;
  }, z.coerce.boolean().default(false)),
  // GitHub OAuth (callback: {BETTER_AUTH_URL}/api/auth/callback/github)
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  // SMTP (Mailpit in dev — no auth, so user/pass are optional)
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SENDER: z.string(),
  SMTP_SENDER_NAME: z.string().default('WhenNotToMeet'),
});

function mergedEnv() {
  return { ...process.env, ...(import.meta ? import.meta.env : {}) };
}

const publicTypedEnv = makeTypedEnvironment(PublicEnvSchema.parse);

/**
 * Parses and validates the public (client-safe) environment variables. Keys are
 * stripped of any `VITE_` prefix and converted to camelCase, then cached.
 *
 * @example
 * publicEnv().mode; // 'development' | 'production' | undefined
 */
export function publicEnv() {
  return publicTypedEnv(mergedEnv());
}

const privateTypedEnv = makeTypedEnvironment(PrivateEnvSchema.parse);

/**
 * Parses and validates the private (server-only) environment variables. Keys are
 * converted to camelCase, then cached.
 *
 * @example
 * privateEnv().dbName;
 * privateEnv().betterAuthSecret;
 */
export function privateEnv() {
  return privateTypedEnv(mergedEnv());
}
