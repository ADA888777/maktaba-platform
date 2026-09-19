import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { migrate } from './schema.js';

let pool: Pool | null = null;

function needsSsl(connectionString: string): boolean {
  return !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1');
}

/** يهيئ مجمّع الاتصالات مرة واحدة. سلسلة الاتصال تأتي من DATABASE_URL في متغيرات البيئة فقط. */
export function initPool(connectionString: string): Pool {
  if (pool) return pool;
  pool = new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX ?? 5),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: needsSsl(connectionString) ? { rejectUnauthorized: process.env.PG_SSL_STRICT === 'true' } : undefined,
  });
  return pool;
}

export function getPool(): Pool {
  if (!pool) throw new Error('قاعدة البيانات غير مهيأة');
  return pool;
}

/** يهيئ الاتصال ويطبّق الترحيلات */
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

/** تنفيذ مجموعة عمليات كوحدة واحدة داخل معاملة */
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
