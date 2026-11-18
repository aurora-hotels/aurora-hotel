import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { chmodSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { backup } from 'node:sqlite';
import express, { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { config } from './config.js';
import { all, db, get, run } from './db.js';
import { AppError } from './errors.js';
import { audit, purgeExpired, rateLimit, type Actor } from './security.js';
import { afterCheckOut, refreshService, reservationRow } from './integrations/services.js';
import { withReservationLock } from './integrations/locks.js';
import type { Booking } from './integrations/types.js';

// Usługi techniczne hotelu i ich stałe zakresy. Token usługi działa tylko pod /internal/v1,
// a sesja użytkownika i klucz partnera nie są tam przyjmowane.
export const SERVICES = {
  monitoring: ['health:read', 'operations:read'],
  scheduler: ['operations:read', 'operations:reconcile', 'maintenance:run'],
  backup: ['backups:create'],
} as const;
export type Service = keyof typeof SERVICES;
export const TOKEN_PREFIX = 'aurora_svc_';
interface TokenRow {
  id: string;
  service: Service;
  name: string;
  hash: string;
  scopes: string;
  active: number;
  createdAt: string;
  lastUsedAt: string | null;
}
interface ServiceActor extends Actor {
  type: 'service';
  scopes: string[];
}
declare global {
  namespace Express {
    interface Request {
      service?: ServiceActor;
    }
  }
}
const now = () => new Date().toISOString();
const hash = (raw: string) => createHash('sha256').update(raw).digest('hex');

export function initServiceTokens() {
  db.exec(`CREATE TABLE IF NOT EXISTS serviceTokens (
    id TEXT PRIMARY KEY, service TEXT NOT NULL CHECK(service IN ('monitoring','scheduler','backup')),
    name TEXT NOT NULL, hash TEXT NOT NULL UNIQUE, scopes TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL, lastUsedAt TEXT
  )`);
}
export function createServiceToken(service: Service, name: string) {
  initServiceTokens();
  const raw = TOKEN_PREFIX + randomBytes(32).toString('base64url');
  const row = {
    id: randomUUID(),
    service,
    name,
    scopes: [...SERVICES[service]],
    active: true,
    createdAt: now(),
  };
  run(
    'INSERT INTO serviceTokens(id,service,name,hash,scopes,active,createdAt) VALUES(?,?,?,?,?,1,?)',
    row.id,
    service,
    name,
    hash(raw),
    JSON.stringify(row.scopes),
    row.createdAt,
  );
  return { ...row, token: raw };
}
export function listServiceTokens() {
  initServiceTokens();
  return all<TokenRow>('SELECT * FROM serviceTokens ORDER BY createdAt').map(
    ({ hash: _hash, ...row }) => ({
      ...row,
      scopes: JSON.parse(row.scopes) as string[],
      active: Boolean(row.active),
    }),
  );
}
export function revokeServiceToken(id: string) {
  initServiceTokens();
  return run('UPDATE serviceTokens SET active=0 WHERE id=? AND active=1', id).changes > 0;
}

// Te same reguły nagłówków co dla klucza partnera, żeby usługi korzystały z jednego wzorca.
const authenticate: RequestHandler = (req, _res, next) => {
  const authorization = req.get('Authorization');
  const apiKey = req.get('X-API-Key');
  if (authorization && !authorization.startsWith('Bearer '))
    return next(new AppError(401, 'INVALID_AUTHORIZATION', 'Użyj nagłówka Authorization: Bearer.'));
  if (apiKey && authorization)
    return next(new AppError(400, 'AMBIGUOUS_AUTH', 'Podaj jeden token usługi.'));
  if (apiKey === undefined && authorization === undefined)
    return next(new AppError(401, 'AUTH_REQUIRED', 'Podaj token usługi wewnętrznej.'));
  const raw = apiKey || authorization?.slice(7);
  if (!raw)
    return next(
      new AppError(401, 'INVALID_API_KEY', 'Niepoprawny lub wyłączony token usługi wewnętrznej.'),
    );
  const token = get<TokenRow>('SELECT * FROM serviceTokens WHERE hash=?', hash(raw));
  if (!token?.active)
    return next(
      new AppError(401, 'INVALID_API_KEY', 'Niepoprawny lub wyłączony token usługi wewnętrznej.'),
    );
  run('UPDATE serviceTokens SET lastUsedAt=? WHERE id=?', now(), token.id);
  req.service = {
    type: 'service',
    id: token.service,
    name: token.name,
    keyId: token.id,
    scopes: JSON.parse(token.scopes) as string[],
  };
  next();
};
const requireServiceScope =
  (scope: string): RequestHandler =>
  (req, _res, next) =>
    req.service?.scopes.includes(scope)
      ? next()
      : next(new AppError(403, 'SCOPE_REQUIRED', 'Token usługi nie ma wymaganego uprawnienia.'));

const OPEN_BOOKING = ['pending', 'unknown', 'cancel_pending'];
const OPEN_VOUCHER = ['pending', 'unknown'];
interface PendingOperation {
  operationId: string;
  partner: 'A' | 'B' | 'D';
  kind: 'booking' | 'cancellation' | 'voucher_completion';
  status: string;
  reservationId: string;
  updatedAt: string;
}
function pendingOperations(): PendingOperation[] {
  const bookings = all<Booking>(
    `SELECT * FROM partnerBookings WHERE status IN (${OPEN_BOOKING.map(() => '?').join(',')})`,
    ...OPEN_BOOKING,
  ).map((b): PendingOperation => ({
    operationId: b.status === 'cancel_pending' ? b.cancelOperationId! : b.operationId,
    partner: b.partner,
    kind: b.status === 'cancel_pending' ? 'cancellation' : 'booking',
    status: b.status,
    reservationId: b.reservationId,
    updatedAt: b.updatedAt,
  }));
  const vouchers = all<{
    reservationId: string;
    operationId: string;
    status: string;
    updatedAt: string;
  }>(
    `SELECT * FROM voucherOperations WHERE status IN (${OPEN_VOUCHER.map(() => '?').join(',')})`,
    ...OPEN_VOUCHER,
  ).map((v): PendingOperation => ({
    operationId: v.operationId,
    partner: 'D',
    kind: 'voucher_completion',
    status: v.status,
    reservationId: v.reservationId,
    updatedAt: v.updatedAt,
  }));
  return [...bookings, ...vouchers].sort(
    (a, b) => a.updatedAt.localeCompare(b.updatedAt) || a.operationId.localeCompare(b.operationId),
  );
}

let backupRunning = false;
export const internalRouter = Router();
internalRouter.use(
  express.json({ limit: '16kb' }),
  rateLimit(config.publicLimit),
  (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  },
  authenticate,
);

internalRouter.get('/health/ready', requireServiceScope('health:read'), (_req, res) => {
  try {
    get('SELECT 1 AS ok');
  } catch {
    throw new AppError(503, 'DATABASE_UNAVAILABLE', 'Baza danych nie odpowiada.');
  }
  const rows = all<{
    partner: 'A' | 'B' | 'D';
    enabled: number;
    mode: string;
    lastTestOk: number | null;
    lastTestAt: string | null;
  }>('SELECT partner,enabled,mode,lastTestOk,lastTestAt FROM integrations ORDER BY partner');
  const integrations = Object.fromEntries(
    rows.map((x) => [
      x.partner,
      {
        enabled: Boolean(x.enabled),
        mode: x.mode,
        lastTestOk: x.lastTestOk === null ? null : Boolean(x.lastTestOk),
        lastTestAt: x.lastTestAt,
      },
    ]),
  );
  // Wyłączone połączenie nie obniża stanu: hotel działa bez niego.
  const degraded = rows.some((x) => x.enabled && x.lastTestOk === 0);
  res.json({ status: degraded ? 'degraded' : 'ok', database: 'ok', integrations });
});

internalRouter.get('/operations/pending', requireServiceScope('operations:read'), (req, res) => {
  const query = z
    .object({
      partner: z.enum(['A', 'B', 'D']).optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
    })
    .parse(req.query);
  const items = pendingOperations().filter((x) => !query.partner || x.partner === query.partner);
  res.json({
    items: items.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
    total: items.length,
    page: query.page,
    pageSize: query.pageSize,
  });
});

internalRouter.post(
  '/operations/:operationId/reconcile',
  requireServiceScope('operations:reconcile'),
  async (req, res) => {
    const operationId = z.string().min(1).max(100).parse(req.params.operationId);
    const booking = get<Booking>(
      'SELECT * FROM partnerBookings WHERE operationId=? OR cancelOperationId=?',
      operationId,
      operationId,
    );
    let result: { operationId: string; partner: string; status: string; error: string | null };
    let before: string;
    if (booking) {
      before = booking.status;
      if (!OPEN_BOOKING.includes(booking.status))
        throw new AppError(409, 'OPERATION_SETTLED', 'Operacja ma już ostateczny wynik.');
      const after = await withReservationLock(booking.reservationId, () =>
        refreshService(booking.reservationId, booking.id),
      );
      result = { operationId, partner: after.partner, status: after.status, error: after.error };
    } else {
      const voucher = get<{ reservationId: string; status: string }>(
        'SELECT reservationId,status FROM voucherOperations WHERE operationId=?',
        operationId,
      );
      if (!voucher) throw new AppError(404, 'OPERATION_NOT_FOUND', 'Operacja nie istnieje.');
      before = voucher.status;
      if (!OPEN_VOUCHER.includes(voucher.status))
        throw new AppError(409, 'OPERATION_SETTLED', 'Operacja ma już ostateczny wynik.');
      const after = await withReservationLock(voucher.reservationId, () =>
        afterCheckOut(reservationRow(voucher.reservationId)),
      );
      result = {
        operationId,
        partner: 'D',
        status: after?.status ?? voucher.status,
        error: after?.error ?? null,
      };
    }
    audit(req.service!, 'operation.reconcile', operationId, {
      partner: result.partner,
      status: result.status,
    });
    res.json({ ...result, changed: result.status !== before });
  },
);

internalRouter.post('/maintenance/cleanup', requireServiceScope('maintenance:run'), (req, res) => {
  const result = purgeExpired();
  audit(req.service!, 'maintenance.cleanup', 'database', result);
  res.json(result);
});

internalRouter.post('/backups', requireServiceScope('backups:create'), async (req, res) => {
  if (config.databasePath === ':memory:')
    throw new AppError(503, 'BACKUP_FAILED', 'Baza w pamięci nie ma kopii zapasowej.');
  if (backupRunning)
    throw new AppError(409, 'BACKUP_IN_PROGRESS', 'Trwa już tworzenie kopii. Spróbuj później.');
  backupRunning = true;
  try {
    const createdAt = now();
    const file = `aurora-${createdAt.replace(/[:.]/g, '-')}.sqlite`;
    const target = path.join(config.backupDir, file);
    try {
      mkdirSync(config.backupDir, { recursive: true, mode: 0o700 });
      await backup(db, target);
      // Kopia zawiera wszystkie dane gości, więc czyta ją tylko właściciel procesu.
      chmodSync(target, 0o600);
    } catch {
      throw new AppError(503, 'BACKUP_FAILED', 'Nie udało się zapisać kopii bazy.');
    }
    audit(req.service!, 'backup.create', file, {});
    res.status(201).json({ file, sizeBytes: statSync(target).size, createdAt });
  } finally {
    backupRunning = false;
  }
});

internalRouter.use((_req, _res, next) =>
  next(new AppError(404, 'NOT_FOUND', 'Nie znaleziono takiej operacji wewnętrznej.')),
);
