import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { migrate } from './schema.js';

let pool: Pool | null = null;

function needsSsl(connectionString: string): boolean {
  return !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1');
}

/**
 * يضبط رابط الاتصال قبل استخدامه:
 * 1) إن وُجد SUPABASE_DB_PASSWORD يُستخدم ككلمة مرور (يُرمّز تلقائيًا فلا حاجة لـ percent-encoding).
 * 2) رابط Supabase المباشر db.PROJECT.supabase.co يُحوّل إلى Session Pooler؛
 *    لأن الاتصال المباشر متاح على IPv6 فقط ومنصات مثل Render لا تدعمه (ENETUNREACH).
 */
export function normalizeSupabaseUrl(connectionString: string): string {
  const prefixMatch = /^postgres(?:ql)?:\/\//i.exec(connectionString);
  if (!prefixMatch) return connectionString;
  const prefix = prefixMatch[0];
  try {
    const url = new URL('http://' + connectionString.slice(prefix.length));
    const passwordOverride = (process.env.SUPABASE_DB_PASSWORD ?? '').trim();
    if (passwordOverride) {
      url.password = passwordOverride;
      console.log('[db] تم استخدام SUPABASE_DB_PASSWORD ككلمة مرور لقاعدة البيانات.');
    }
    const hostMatch = /^db\.([a-z0-9]+)\.supabase\.co$/i.exec(url.hostname);
    if (hostMatch) {
      const projectRef = hostMatch[1];
      const region = (process.env.SUPABASE_REGION ?? 'ap-northeast-2').trim();
      url.hostname = 'aws-0-' + region + '.pooler.supabase.com';
      url.port = '5432';
      if (!url.username.includes('.')) url.username = 'postgres.' + projectRef;
      console.log('[db] تم تحويل الاتصال المباشر إلى Session Pooler:', url.hostname);
    }
    return prefix + url.toString().slice('http://'.length);
  } catch {
    return connectionString;
  }
}

/** Initialises the connection pool once. The connection string comes from DATABASE_URL only. */
export function initPool(connectionString: string): Pool {
  if (pool) return pool;
  const target = normalizeSupabaseUrl(connectionString.trim());
  pool = new Pool({
    connectionString: target,
    max: Number(process.env.PG_POOL_MAX ?? 5),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    ssl: needsSsl(target) ? { rejectUnauthorized: process.env.PG_SSL_STRICT === 'true' } : undefined,
  });
  pool.on('error', (err) => console.error('[db] pool error:', err.message));
  return pool;
}

export function getPool(): Pool {
  if (!pool) throw new Error('database is not initialised');
  return pool;
}

/** Initialises the pool and applies migrations. */
export async function initDatabase(connectionString: string): Promise<Pool> {
  const p = initPool(connectionString);
  await migrate(p);
  return p;
}

export async function query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await getPool().query<T>(sql, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** Runs a write statement and returns the number of affected rows. */
export async function execute(sql: string, params: unknown[] = []): Promise<number> {
  const result = await getPool().query(sql, params);
  return result.rowCount ?? 0;
}

/** Runs a set of statements as a single unit of work. */
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function closeDatabase(): Promise<void> {
  if (!pool) return;
  await pool.end();
  pool = null;
}
