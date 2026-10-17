import pg from 'pg';
import { ENV } from './env.js';

const { Pool } = pg;

const poolConfig: pg.PoolConfig = ENV.DATABASE_URL
  ? {
      connectionString: ENV.DATABASE_URL,
      ssl: ENV.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    }
  : {
      host: ENV.PGHOST,
      port: ENV.PGPORT,
      user: ENV.PGUSER,
      password: ENV.PGPASSWORD,
      database: ENV.PGDATABASE,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    };

poolConfig.max = 20;
poolConfig.idleTimeoutMillis = 30000;
poolConfig.connectionTimeoutMillis = 5000;

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (ENV.NODE_ENV === 'development' && duration > 500) {
      console.warn(`Slow query executed in ${duration}ms:`, { text, rows: res.rowCount });
    }
    return res;
  } catch (err: any) {
    console.error('Database query execution error:', {
      text,
      params,
      message: err.message,
      code: err.code,
      detail: err.detail,
    });
    throw err;
  }
}

export async function getClient() {
  const client = await pool.connect();
  return client;
}

export async function transaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
