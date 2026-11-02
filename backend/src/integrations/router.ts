import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { all, get, run } from '../db.js';
import { audit, requireRole, requireScope } from '../security.js';
import { getReservationForActor } from '../hotel.js';
import { API_SCOPES, integration, integrationList, protect, publicIntegration } from './store.js';
import { IntegrationError, type Integration } from './types.js';
import { validateBaseUrl } from './transport.js';
import { catalog, testConnection } from './adapters.js';
import { withReservationLock } from './locks.js';
import {
  afterCheckOut,
  bookService,
  cancelService,
  checkReservationVoucher,
  getPlan,
  partnerAvailability,
  refreshService,
  reservationRow,
} from './services.js';

export const integrationRouter = Router();
const admin = requireRole('admin'),
  staff = requireRole('admin', 'receptionist');
const partnerSchema = z.enum(['A', 'B', 'D']);
const stamp = z.string().datetime({ offset: true });
const pagination = (query: unknown) =>
  z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
    })
    .parse(query);
function page<T>(items: T[], query: unknown) {
  const { page, pageSize } = pagination(query);
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    total: items.length,
    page,
    pageSize,
  };
}
const id = (value: unknown) => z.string().min(1).max(100).parse(value);

integrationRouter.get('/admin/integrations', admin, (req, res) =>
  res.json(page(integrationList(), req.query)),
);
integrationRouter.get('/admin/integrations/:partner', admin, (req, res) => {
  const partner = partnerSchema.parse(req.params.partner);
  res.json(
    publicIntegration(get<Integration>('SELECT * FROM integrations WHERE partner=?', partner)!),
  );
});
integrationRouter.patch('/admin/integrations/:partner', admin, (req, res) => {
  const partner = partnerSchema.parse(req.params.partner);
  const input = z
    .object({
      mode: z.enum(['demo', 'real']).optional(),
      enabled: z.boolean().optional(),
      baseUrl: z.string().max(1000).optional(),
      secret: z
        .string()
        .max(2000)
        .refine((x) => !/[\r\n]/.test(x), 'Sekret nie może zawierać nowej linii.')
        .optional(),
      timeoutMs: z.number().int().min(1000).max(30000).optional(),
      authHeader: z.enum(['X-API-Key', 'Authorization']).optional(),
      demoScenario: z
        .enum([
          'normal',
          'reject',
          'timeout',
          'timeout_after_success',
          'invalid_json',
          'unavailable',
          'completed',
        ])
        .optional(),
    })
    .strict()
    .parse(req.body);
  const old = get<Integration>('SELECT * FROM integrations WHERE partner=?', partner)!;
  const merged = {
    ...old,
    ...input,
    enabled: input.enabled === undefined ? old.enabled : Number(input.enabled),
    secret: old.secret,
  };
  if (input.secret !== undefined && input.secret !== '••••••••')
    merged.secret = input.secret ? protect(input.secret) : '';
  if (merged.mode === 'real' || merged.baseUrl) validateBaseUrl(merged.baseUrl);
  run(
    'UPDATE integrations SET mode=?,enabled=?,baseUrl=?,secret=?,timeoutMs=?,authHeader=?,demoScenario=? WHERE partner=?',
    merged.mode,
    merged.enabled,
    merged.baseUrl,
    merged.secret,
    merged.timeoutMs,
    merged.authHeader,
    merged.demoScenario,
    partner,
  );
  audit(req.actor!, 'integration.configure', partner, {
    mode: merged.mode,
    enabled: Boolean(merged.enabled),
    changedFields: Object.keys(input),
  });
  res.json(
    publicIntegration(get<Integration>('SELECT * FROM integrations WHERE partner=?', partner)!),
  );
});
integrationRouter.post('/admin/integrations/:partner/test', admin, async (req, res) => {
  const partner = partnerSchema.parse(req.params.partner);
  try {
    const result = await testConnection(partner);
    run(
      'UPDATE integrations SET lastTestAt=?,lastTestResult=? WHERE partner=?',
      new Date().toISOString(),
      result.message,
      partner,
    );
    audit(req.actor!, 'integration.test', partner, { ok: true });
    res.json(result);
  } catch (error) {
    const message =
      error instanceof IntegrationError ? error.message : 'Test połączenia nie powiódł się.';
    run(
      'UPDATE integrations SET lastTestAt=?,lastTestResult=? WHERE partner=?',
      new Date().toISOString(),
      message,
      partner,
    );
    audit(req.actor!, 'integration.test', partner, { ok: false });
    throw error;
  }
});
integrationRouter.get('/admin/integrations/:partner/catalog', admin, async (req, res) => {
  const partner = z.enum(['A', 'B']).parse(req.params.partner);
  res.json({ ...page((await catalog(partner)).items, req.query), mode: integration(partner).mode });
});
function safeKey(row: Record<string, unknown>) {
  const { hash: _hash, ...rest } = row;
  return { ...rest, active: Boolean(row.active), scopes: JSON.parse(row.scopes as string) };
}
const keyName = z.string().trim().min(2).max(100);
const scopes = z
  .array(z.enum(API_SCOPES))
  .max(API_SCOPES.length)
  .refine((items) => new Set(items).size === items.length, 'Uprawnienia nie mogą się powtarzać.');
integrationRouter.get('/admin/api-keys', admin, (req, res) =>
  res.json(page(all('SELECT * FROM partnerKeys ORDER BY createdAt DESC').map(safeKey), req.query)),
);
integrationRouter.post('/admin/api-keys', admin, (req, res) => {
  const input = z
    .object({
      name: keyName,
      partner: z
        .string()
        .trim()
        .regex(/^[A-Z][A-Z0-9_-]{0,31}$/),
      scopes,
    })
    .strict()
    .parse(req.body);
  const key = `aurora_${randomBytes(32).toString('base64url')}`,
    keyId = randomUUID();
  run(
    'INSERT INTO partnerKeys(id,partner,name,hash,scopes,createdAt) VALUES(?,?,?,?,?,?)',
    keyId,
    input.partner,
    input.name,
    createHash('sha256').update(key).digest('hex'),
    JSON.stringify(input.scopes),
    new Date().toISOString(),
  );
  audit(req.actor!, 'api-key.create', keyId, { partner: input.partner, scopes: input.scopes });
  res.status(201).json({ ...safeKey(get('SELECT * FROM partnerKeys WHERE id=?', keyId)!), key });
});
integrationRouter.patch('/admin/api-keys/:id', admin, (req, res) => {
  const keyId = id(req.params.id);
  const input = z
    .object({ name: keyName.optional(), active: z.boolean().optional(), scopes: scopes.optional() })
    .strict()
    .parse(req.body);
  const old = get<{ name: string; active: number; scopes: string }>(
    'SELECT * FROM partnerKeys WHERE id=?',
    keyId,
  );
  if (!old) throw new IntegrationError(404, 'KEY_NOT_FOUND', 'Nie znaleziono klucza API.');
  run(
    'UPDATE partnerKeys SET name=?,active=?,scopes=? WHERE id=?',
    input.name ?? old.name,
    input.active === undefined ? old.active : Number(input.active),
    input.scopes ? JSON.stringify(input.scopes) : old.scopes,
    keyId,
  );
  audit(req.actor!, 'api-key.update', keyId, { changedFields: Object.keys(input) });
  res.json(safeKey(get('SELECT * FROM partnerKeys WHERE id=?', keyId)!));
});
integrationRouter.post('/admin/demo-vouchers', admin, (req, res) => {
  if (integration('D').mode !== 'demo')
    throw new IntegrationError(
      409,
      'DEMO_ONLY',
      'Vouchery testowe można dodawać wyłącznie w trybie demo D.',
    );
  const input = z
    .object({
      reference: z.string().trim().min(3).max(100),
      componentId: z.string().trim().min(3).max(100),
      validFrom: z.string().date(),
      validUntil: z.string().date(),
    })
    .strict()
    .refine((x) => x.validFrom < x.validUntil, { message: 'Data końcowa musi być późniejsza.' })
    .parse(req.body);
  run(
    'INSERT INTO demoVouchers(reference,componentId,validFrom,validUntil) VALUES(?,?,?,?)',
    input.reference,
    input.componentId,
    input.validFrom,
    input.validUntil,
  );
  audit(req.actor!, 'demo-voucher.create', input.componentId);
  res.status(201).json({ ...input, mode: 'demo', provider: 'C', kind: 'hotel', used: false });
});

integrationRouter.get('/reservations/:id/plan', requireScope('reservations:read'), (req, res) => {
  const reservationId = id(req.params.id);
  getReservationForActor(reservationId, req.actor!);
  res.json(getPlan(reservationId));
});
integrationRouter.get('/reservations/:id/partner-availability', staff, async (req, res) => {
  const query = z
    .object({ itemId: z.string().min(1), startsAt: stamp, endsAt: stamp })
    .parse(req.query);
  res.json(
    await partnerAvailability(id(req.params.id), query.itemId, query.startsAt, query.endsAt),
  );
});
integrationRouter.post('/reservations/:id/partner-bookings', staff, async (req, res) => {
  const input = z
    .object({
      itemId: z.string().min(1),
      guestIndex: z.number().int().min(0),
      startsAt: stamp,
      endsAt: stamp,
    })
    .strict()
    .parse(req.body);
  const reservationId = id(req.params.id);
  const result = await withReservationLock(reservationId, () => bookService(reservationId, input));
  audit(req.actor!, 'partner-booking.create', result.id, {
    reservationId,
    partner: result.partner,
    status: result.status,
  });
  res.status(201).json(result);
});
integrationRouter.post(
  '/reservations/:id/partner-bookings/:bookingId/refresh',
  staff,
  async (req, res) => {
    const reservationId = id(req.params.id);
    const result = await withReservationLock(reservationId, () =>
      refreshService(reservationId, id(req.params.bookingId)),
    );
    audit(req.actor!, 'partner-booking.refresh', result.id, { status: result.status });
    res.json(result);
  },
);
integrationRouter.post(
  '/reservations/:id/partner-bookings/:bookingId/cancel',
  staff,
  async (req, res) => {
    const reservationId = id(req.params.id);
    const result = await withReservationLock(reservationId, () =>
      cancelService(reservationId, id(req.params.bookingId)),
    );
    audit(req.actor!, 'partner-booking.cancel', result.id, { status: result.status });
    res.json(result);
  },
);
integrationRouter.post('/reservations/:id/voucher/check', staff, async (req, res) => {
  const reservationId = id(req.params.id);
  const result = await withReservationLock(reservationId, () =>
    checkReservationVoucher(reservationRow(reservationId)),
  );
  audit(req.actor!, 'voucher.check', reservationId, { valid: result.valid });
  res.json(result);
});
integrationRouter.post('/reservations/:id/voucher/confirm-completion', staff, async (req, res) => {
  const reservationId = id(req.params.id),
    row = reservationRow(reservationId);
  if (!row.voucherReference)
    throw new IntegrationError(400, 'NO_VOUCHER', 'Ta rezerwacja nie ma vouchera.');
  const result = await withReservationLock(reservationId, () => afterCheckOut(row));
  audit(req.actor!, 'voucher.completion', reservationId, { status: result?.status });
  res.json(result);
});

integrationRouter.patch('/reservations/:id/items/:itemId', staff, async (req, res) => {
  const input = z
    .object({
      guestIndex: z.number().int().min(0).optional(),
      note: z.string().trim().max(2000).optional(),
      status: z.enum(['unplanned', 'completed', 'cancelled']).optional(),
    })
    .strict()
    .refine((x) => Object.keys(x).length > 0, 'Podaj zmianę pozycji.')
    .parse(req.body);
  const reservationId = id(req.params.id),
    itemId = id(req.params.itemId);
  const result = await withReservationLock(reservationId, async () => {
    const row = reservationRow(reservationId);
    const item = get<{
      id: string;
      guestIndex: number;
      partner: string;
      status: string;
      note: string;
    }>('SELECT * FROM reservation_items WHERE reservationId=? AND id=?', reservationId, itemId);
    if (!item) throw new IntegrationError(404, 'ITEM_NOT_FOUND', 'Nie znaleziono pozycji pakietu.');
    if (input.status !== undefined && item.partner !== 'HOTEL')
      throw new IntegrationError(
        409,
        'PARTNER_STATUS_READ_ONLY',
        'Status usługi A/B można zmienić wyłącznie przez potwierdzenie od partnera.',
      );
    if (input.guestIndex !== undefined) {
      const names: string[] =
        typeof row.guestNames === 'string' ? JSON.parse(row.guestNames) : row.guestNames;
      if (!names[input.guestIndex])
        throw new IntegrationError(
          400,
          'INVALID_GUEST',
          'Nie znaleziono tego gościa w rezerwacji.',
        );
      const active = get(
        "SELECT id FROM partnerBookings WHERE itemId=? AND status IN ('pending','unknown','confirmed','cancel_pending','completed')",
        itemId,
      );
      if (active && input.guestIndex !== item.guestIndex)
        throw new IntegrationError(
          409,
          'ITEM_ALREADY_BOOKED',
          'Najpierw anuluj lub wyjaśnij usługę tego gościa.',
        );
    }
    if (
      row.status === 'cancelled' &&
      (input.status !== undefined || input.guestIndex !== undefined)
    )
      throw new IntegrationError(
        409,
        'RESERVATION_CLOSED',
        'W anulowanej rezerwacji można dopisać tylko notatkę.',
      );
    run(
      'UPDATE reservation_items SET guestIndex=?,status=?,note=? WHERE id=?',
      input.guestIndex ?? item.guestIndex,
      input.status ?? item.status,
      input.note ?? item.note,
      itemId,
    );
    audit(req.actor!, 'reservation-item.update', itemId, {
      reservationId,
      changedFields: Object.keys(input),
    });
    return get('SELECT * FROM reservation_items WHERE id=?', itemId)!;
  });
  res.json(result);
});
