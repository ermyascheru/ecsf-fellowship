import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  PGHOST: process.env.PGHOST || 'localhost',
  PGPORT: parseInt(process.env.PGPORT || '5432', 10),
  PGUSER: process.env.PGUSER || 'postgres',
  PGPASSWORD: process.env.PGPASSWORD || 'postgres',
  PGDATABASE: process.env.PGDATABASE || 'ftvti_ecsf_fellowship',
  JWT_SECRET: process.env.JWT_SECRET || 'ftvti_ecsf_super_secret_jwt_key_2026_dev',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://ecsf-fellowship.com,https://www.ecsf-fellowship.com',
};
