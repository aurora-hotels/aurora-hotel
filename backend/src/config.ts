import 'dotenv/config';
import path from 'node:path';

const number = (name: string, fallback: number, min: number, max: number) => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`Nieprawidłowe ustawienie ${name}`);
  return value;
};
const production = process.env.NODE_ENV === 'production';
const secret = (name: string, fallback: string) => {
  const value = process.env[name] || fallback;
  if (production && (!process.env[name] || value.length < 32))
    throw new Error(`${name} musi zawierać co najmniej 32 znaki.`);
  return value;
};
export const config = {
  production,
  cookieSecure:
    process.env.COOKIE_SECURE === undefined ? production : process.env.COOKIE_SECURE === 'true',
  databasePath: process.env.DATABASE_PATH || path.resolve('data/aurora.sqlite'),
  port: number('PORT', 3001, 1, 65535),
  host: process.env.HOST || '127.0.0.1',
  appOrigin: process.env.APP_ORIGIN || 'http://localhost:5173',
  sessionSecret: secret('SESSION_SECRET', 'development-only-change-this-session-secret'),
  encryptionKey: secret('CONFIG_ENCRYPTION_KEY', 'development-only-change-this-encryption-key'),
  sessionHours: number('SESSION_HOURS', 12, 1, 168),
  passwordMinLength: number('PASSWORD_MIN_LENGTH', 10, 8, 64),
  maxStayNights: number('MAX_STAY_NIGHTS', 90, 1, 365),
  loginLimit: number('LOGIN_RATE_LIMIT', 15, 1, 1000),
  publicLimit: number('PUBLIC_RATE_LIMIT', 300, 1, 10000),
  allowedPartnerHosts: (process.env.ALLOWED_PARTNER_HOSTS || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean),
  adminEmail: (process.env.ADMIN_EMAIL || 'admin@aurora.local').trim().toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD,
};
