import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { db, get, all, run } from '../db.js';
import type { Integration, Partner } from './types.js';
import { IntegrationError } from './types.js';

export const API_SCOPES = [
  'catalog:read',
  'reservations:create',
  'reservations:read',
  'reservations:update',
  'reservations:cancel',
] as const;
function encryptionKey() {
  const value = process.env.CONFIG_ENCRYPTION_KEY;
  if (!value || !/^[a-f0-9]{64}$/i.test(value))
    throw new IntegrationError(
      503,
      'CONFIG_KEY_MISSING',
      'Ustaw CONFIG_ENCRYPTION_KEY jako 64 znaki szesnastkowe.',
    );
  return Buffer.from(value, 'hex');
}
export function protect(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const body = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `enc1:${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${body.toString('hex')}`;
}
export function reveal(value: string): string {
  if (!value.startsWith('enc1:')) return value;
  const [, iv, tag, body] = value.split(':');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv!, 'hex'));
  decipher.setAuthTag(Buffer.from(tag!, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(body!, 'hex')), decipher.final()]).toString(
    'utf8',
  );
}
export function initIntegrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS integrations (partner TEXT PRIMARY KEY, mode TEXT NOT NULL DEFAULT 'demo', enabled INTEGER NOT NULL DEFAULT 1, baseUrl TEXT NOT NULL DEFAULT '', secret TEXT NOT NULL DEFAULT '', timeoutMs INTEGER NOT NULL DEFAULT 5000, authHeader TEXT NOT NULL DEFAULT 'X-API-Key', demoScenario TEXT NOT NULL DEFAULT 'normal', lastTestAt TEXT, lastTestResult TEXT);
    CREATE TABLE IF NOT EXISTS partnerKeys (id TEXT PRIMARY KEY, partner TEXT NOT NULL, name TEXT NOT NULL, hash TEXT NOT NULL UNIQUE, scopes TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, createdAt TEXT NOT NULL, lastUsedAt TEXT);
    CREATE TABLE IF NOT EXISTS partnerBookings (id TEXT PRIMARY KEY, reservationId TEXT NOT NULL REFERENCES reservations(id), itemId TEXT NOT NULL, partner TEXT NOT NULL, guestIndex INTEGER NOT NULL, offerId TEXT NOT NULL, startsAt TEXT NOT NULL, endsAt TEXT NOT NULL, status TEXT NOT NULL, operationId TEXT NOT NULL UNIQUE, cancelOperationId TEXT, externalId TEXT, error TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS partnerBookings_reservation ON partnerBookings(reservationId);
    CREATE TABLE IF NOT EXISTS integrationOperationTargets (operationId TEXT PRIMARY KEY, partner TEXT NOT NULL, mode TEXT NOT NULL, baseUrl TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS partnerOperationRequests (operationId TEXT PRIMARY KEY REFERENCES partnerBookings(operationId), payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS voucherOperations (reservationId TEXT PRIMARY KEY REFERENCES reservations(id), operationId TEXT NOT NULL UNIQUE, status TEXT NOT NULL, error TEXT, updatedAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS partnerDemoState (partner TEXT NOT NULL, operationId TEXT NOT NULL, result TEXT NOT NULL, PRIMARY KEY(partner, operationId));
    CREATE TABLE IF NOT EXISTS demoVouchers (reference TEXT PRIMARY KEY, componentId TEXT NOT NULL, provider TEXT NOT NULL DEFAULT 'C', kind TEXT NOT NULL DEFAULT 'hotel', validFrom TEXT NOT NULL, validUntil TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0, reservationId TEXT);
  `);
  for (const partner of ['A', 'B', 'D'])
    run('INSERT OR IGNORE INTO integrations(partner) VALUES (?)', partner);
  run(
    "INSERT OR IGNORE INTO demoVouchers(reference,componentId,validFrom,validUntil) VALUES ('DEMO-HOTEL-001','hotel-demo-001','2020-01-01','2099-12-31')",
  );
}
export function integration(partner: Partner): Integration {
  const result = get<Integration>('SELECT * FROM integrations WHERE partner=?', partner);
  if (!result || !result.enabled)
    throw new IntegrationError(
      503,
      'PARTNER_DISABLED',
      `Połączenie z projektem ${partner} jest wyłączone.`,
    );
  return result;
}
export function publicIntegration(row: Integration) {
  const { secret, ...rest } = row;
  return {
    ...rest,
    enabled: Boolean(row.enabled),
    hasSecret: Boolean(secret),
    secret: secret ? '••••••••' : '',
  };
}
export function authenticateApiKey(raw: string) {
  const hash = createHash('sha256').update(raw).digest('hex');
  const key = get<{ id: string; partner: string; scopes: string; active: number }>(
    'SELECT * FROM partnerKeys WHERE hash=?',
    hash,
  );
  if (!key?.active)
    throw new IntegrationError(401, 'INVALID_API_KEY', 'Niepoprawny lub wyłączony klucz API.');
  run('UPDATE partnerKeys SET lastUsedAt=? WHERE id=?', new Date().toISOString(), key.id);
  return {
    kind: 'partner' as const,
    type: 'partner' as const,
    id: key.partner,
    name: key.partner,
    partnerId: key.partner,
    keyId: key.id,
    scopes: JSON.parse(key.scopes) as string[],
  };
}
export function integrationList() {
  return all<Integration>('SELECT * FROM integrations ORDER BY partner').map(publicIntegration);
}
