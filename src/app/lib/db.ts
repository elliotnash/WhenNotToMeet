import { privateEnv } from '@/env';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { schema } from './schema';

const { Pool } = pg;

export const pool = new Pool({
  database: privateEnv().dbName,
  host: privateEnv().dbHost,
  password: privateEnv().dbPassword,
  port: privateEnv().dbPort,
  user: privateEnv().dbUser,
  ssl: privateEnv().dbSsl,
  max: 10,
});

export const db = drizzle(pool, { schema });
