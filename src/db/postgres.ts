import { Pool } from 'pg';

const MIGRATIONS = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recovery_tokens (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shops (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shop_drafts (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'incomplete',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shop_history (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  reason TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_draft_index (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  draft_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS submitted_drafts (
  draft_id TEXT PRIMARY KEY REFERENCES shop_drafts(id) ON DELETE CASCADE
);
`;

export function getDatabaseUrl(env: Record<string, any> = {}): string | undefined {
  const fromEnv = env?.HYPERDRIVE?.connectionString || env?.DATABASE_URL || env?.HYPERDRIVE_CONNECTION_STRING;
  return fromEnv || process.env.DATABASE_URL || process.env.HYPERDRIVE_CONNECTION_STRING;
}

export function isDatabaseEnabled(env: Record<string, any> = {}): boolean {
  return Boolean(getDatabaseUrl(env));
}

export async function ensureDatabaseReady(env: Record<string, any> = {}) {
  const connectionString = getDatabaseUrl(env);
  if (!connectionString) {
    return { enabled: false, pool: null as Pool | null };
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    await pool.query('SELECT 1');
    await pool.query(MIGRATIONS);
    return { enabled: true, pool };
  } catch (error) {
    console.warn('[db] PostgreSQL unavailable; using in-memory fallback.', error);
    await pool.end().catch(() => undefined);
    return { enabled: false, pool: null };
  }
}
