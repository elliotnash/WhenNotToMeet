import { defineConfig } from 'drizzle-kit';
import { privateEnv } from './src/env';

// drizzle-kit runs outside Vite, so load `.env` before reading it.
try {
  process.loadEnvFile();
} catch {
  // No .env file — rely on the ambient environment.
}

const env = privateEnv();

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/app/lib/schema.ts',
  out: './drizzle',
  dbCredentials: {
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPassword,
    database: env.dbName,
    ssl: env.dbSsl,
  },
});
