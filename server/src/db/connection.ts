import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { migrate } from './schema.js';

let pool: Pool | null = null;

function needsSsl(connectionString: string): boolean {
  return !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1');
}

/** Initialises the connection pool once. The connection string comes from DATABASE_URL only. */
export function initPool(connectionString: string): Pool {
  if (pool) return pool;
  pool = new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX ?? 5),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    ssl: needsSsl(connectionString) ? { rejectUnauthorized: process.env.PG_SSL_STRICT === 'true' } : undefined,
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
