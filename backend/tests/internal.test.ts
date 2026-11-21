import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { DatabaseSync } from 'node:sqlite';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

// API usług wewnętrznych (W-01–W-05), wydawanie tokenów i wyłączanie połączeń z A/B/D.
const directory = mkdtempSync(path.join(tmpdir(), 'aurora-internal-'));
process.env.DATABASE_PATH = path.join(directory, 'internal.sqlite');
process.env.BACKUP_DIR = path.join(directory, 'backups');
process.env.NODE_ENV = 'test';
process.env.COOKIE_SECURE = 'false';
process.env.CONFIG_ENCRYPTION_KEY = 'd'.repeat(64);
process.env.ADMIN_EMAIL = 'internal-admin@example.test';
process.env.ADMIN_PASSWORD = 'Test-internal-admin-2026';
process.env.LOGIN_RATE_LIMIT = '1000';
process.env.PUBLIC_RATE_LIMIT = '10000';
const run = promisify(execFile);
let app: any;
let admin: any;
let database: typeof import('../src/db.js');
let internal: typeof import('../src/internal.js');
const tokens: Record<string, string> = {};
const warsawToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' }).format(new Date());
const day = (offset: number) => {
  const d = new Date(`${warsawToday()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};
async function write(method: 'post' | 'patch', route: string, body: unknown = {}, headers = {}) {
  const csrf = await admin.get('/api/v1/auth/csrf');
  let call = admin[method](`/api/v1${route}`).set('X-CSRF-Token', csrf.body.csrfToken);
  for (const [name, value] of Object.entries(headers)) call = call.set(name, value as string);
  return call.send(body);
}
const as = (service: string) => ({ Authorization: `Bearer ${tokens[service]}` });
async function scenario(partner: 'A' | 'B' | 'D', demoScenario: string, enabled = true) {
  const result = await write('patch', `/admin/integrations/${partner}`, {
    mode: 'demo',
    enabled,
    demoScenario,
  });
  expect(result.status, JSON.stringify(result.body)).toBe(200);
}
async function fixture(voucher = false) {
  const room = await write('post', '/admin/rooms', {
    number: `W-${randomUUID().slice(0, 8)}`,
    type: 'Test',
    description: 'Pokój testowy',
    capacity: 2,
    nightlyRateMinor: 20000,
    equipment: [],
    active: true,
  });
  expect(room.status, JSON.stringify(room.body)).toBe(201);
  const pack = await write('post', '/admin/packages', {
    name: `Masaż ${randomUUID().slice(0, 8)}`,
    description: 'Masaż',
    priceMinor: 10000,
    active: true,
    items: [{ name: 'Masaż', partner: 'A', offerId: 'A-MASSAGE', quantity: 1 }],
  });
  expect(pack.status, JSON.stringify(pack.body)).toBe(201);
  const reference = `V-${randomUUID()}`,
    componentId = `C-${randomUUID()}`;
  if (voucher)
    expect(
      (
        await write('post', '/admin/demo-vouchers', {
          reference,
          componentId,
          validFrom: day(-1),
          validUntil: day(100),
        })
      ).status,
    ).toBe(201);
  const result = await write(
    'post',
    '/reservations',
    {
      roomId: room.body.id,
      packageId: pack.body.id,
      checkIn: day(0),
      checkOut: day(2),
      guests: 1,
      expectedTotalMinor: 50000,
      guest: { name: 'Ewa Wewnętrzna', email: 'ewa@example.test', phone: '' },
      guestNames: ['Ewa Wewnętrzna'],
      ...(voucher ? { voucherReference: reference, hotelComponentId: componentId } : {}),
    },
    { 'Idempotency-Key': randomUUID() },
  );
  expect(result.status, JSON.stringify(result.body)).toBe(201);
  const plan = await admin.get(`/api/v1/reservations/${result.body.id}/plan`);
  return { reservation: result.body, item: plan.body.items[0] };
}
async function bookMassage(f: Awaited<ReturnType<typeof fixture>>) {
  const result = await write('post', `/reservations/${f.reservation.id}/partner-bookings`, {
    itemId: f.item.id,
    guestIndex: 0,
    startsAt: `${day(1)}T09:00:00Z`,
    endsAt: `${day(1)}T10:00:00Z`,
  });
  expect(result.status, JSON.stringify(result.body)).toBe(201);
  return result.body;
}

beforeAll(async () => {
  const { createApp } = await import('../src/app.js');
  database = await import('../src/db.js');
  internal = await import('../src/internal.js');
  const { seed } = await import('../src/seed.js');
  await seed();
  app = createApp();
  admin = request.agent(app);
  const login = await write('post', '/auth/login', {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
  expect(login.status, JSON.stringify(login.body)).toBe(200);
  for (const service of ['monitoring', 'scheduler', 'backup'] as const)
    tokens[service] = internal.createServiceToken(service, `Test ${service}`).token;
});
beforeEach(async () => {
  for (const partner of ['A', 'B', 'D'] as const) await scenario(partner, 'normal');
});
afterAll(() => {
  database?.db.close();
  rmSync(directory, { recursive: true, force: true });
});

describe('Dostęp do API wewnętrznego', () => {
  it('przyjmuje wyłącznie token usługi z odpowiednim zakresem', async () => {
    const ready = '/internal/v1/health/ready';
    const missing = await request(app).get(ready);
    expect([missing.status, missing.body.error.code]).toEqual([401, 'AUTH_REQUIRED']);
    // Sesja administratora nie daje dostępu do operacji wewnętrznych.
    const session = await admin.get(ready);
    expect([session.status, session.body.error.code]).toEqual([401, 'AUTH_REQUIRED']);
    const key = await write('post', '/admin/api-keys', {
      name: 'Partner testowy',
      partner: 'A',
      scopes: ['catalog:read'],
    });
    const partner = await request(app).get(ready).set('Authorization', `Bearer ${key.body.key}`);
    expect([partner.status, partner.body.error.code]).toEqual([401, 'INVALID_API_KEY']);
    const scope = await request(app).get(ready).set(as('backup'));
    expect([scope.status, scope.body.error.code]).toEqual([403, 'SCOPE_REQUIRED']);
    const basic = await request(app).get(ready).set('Authorization', 'Basic abc');
    expect([basic.status, basic.body.error.code]).toEqual([401, 'INVALID_AUTHORIZATION']);
    const both = await request(app)
      .get(ready)
      .set(as('monitoring'))
      .set('X-API-Key', tokens.monitoring!);
    expect([both.status, both.body.error.code]).toEqual([400, 'AMBIGUOUS_AUTH']);
    const header = await request(app).get(ready).set('X-API-Key', tokens.monitoring!);
    expect(header.status).toBe(200);
    expect(header.headers['cache-control']).toBe('no-store');
    // Token usługi nie działa w API dla użytkowników i partnerów.
    const outside = await request(app).get('/api/v1/reservations').set(as('scheduler'));
    expect([outside.status, outside.body.error.code]).toEqual([401, 'INVALID_API_KEY']);
    const unknown = await request(app).get('/internal/v1/nie-ma').set(as('monitoring'));
    expect([unknown.status, unknown.body.error.code]).toEqual([404, 'NOT_FOUND']);
    expect((await request(app).get('/internal/v2/health/ready')).status).toBe(404);
  });
  it('wyłączony token przestaje działać, a lista nie pokazuje wartości tokenu', async () => {
    const extra = internal.createServiceToken('monitoring', 'Do wyłączenia');
    expect(
      (await request(app).get('/internal/v1/health/ready').set('X-API-Key', extra.token)).status,
    ).toBe(200);
    expect(internal.revokeServiceToken(extra.id)).toBe(true);
    expect(internal.revokeServiceToken(extra.id)).toBe(false);
    const after = await request(app).get('/internal/v1/health/ready').set('X-API-Key', extra.token);
    expect([after.status, after.body.error.code]).toEqual([401, 'INVALID_API_KEY']);
    const listed = internal.listServiceTokens();
    expect(listed.find((x) => x.id === extra.id)).toMatchObject({ active: false });
    expect(JSON.stringify(listed)).not.toContain(extra.token);
    expect(JSON.stringify(listed)).not.toContain('hash');
  });
});

describe('Operacje wewnętrzne', () => {
  it('W-01 pokazuje stan bazy i połączeń; nieudany test włączonego partnera obniża stan', async () => {
    const ok = await request(app).get('/internal/v1/health/ready').set(as('monitoring'));
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ status: 'ok', database: 'ok' });
    expect(Object.keys(ok.body.integrations)).toEqual(['A', 'B', 'D']);
    await scenario('B', 'unavailable');
    expect((await write('post', '/admin/integrations/B/test')).status).toBe(503);
    const degraded = await request(app).get('/internal/v1/health/ready').set(as('monitoring'));
    expect(degraded.body.status).toBe('degraded');
    expect(degraded.body.integrations.B).toMatchObject({ enabled: true, lastTestOk: false });
    await scenario('B', 'normal');
    expect((await write('post', '/admin/integrations/B/test')).status).toBe(200);
    const again = await request(app).get('/internal/v1/health/ready').set(as('monitoring'));
    expect(again.body.status).toBe('ok');
    expect(again.body.integrations.B.lastTestOk).toBe(true);
    // Administrator nadal widzi te same pola co wcześniej, bez nowego pola technicznego.
    expect((await admin.get('/api/v1/admin/integrations/B')).body).not.toHaveProperty('lastTestOk');
  });
  it('W-02 i W-03 wyjaśniają niepewną usługę A tym samym identyfikatorem operacji', async () => {
    const f = await fixture();
    await scenario('A', 'timeout');
    const booking = await bookMassage(f);
    expect(booking.status).toBe('unknown');
    const pending = await request(app)
      .get('/internal/v1/operations/pending?partner=A')
      .set(as('monitoring'));
    expect(pending.status).toBe(200);
    const listed = pending.body.items.find((x: any) => x.operationId === booking.operationId);
    expect(listed).toEqual({
      operationId: booking.operationId,
      partner: 'A',
      kind: 'booking',
      status: 'unknown',
      reservationId: f.reservation.id,
      updatedAt: expect.any(String),
    });
    // Monitoring dostaje tylko stan techniczny, bez danych gościa.
    expect(JSON.stringify(pending.body)).not.toContain('Ewa');
    const monitoringReconcile = await request(app)
      .post(`/internal/v1/operations/${booking.operationId}/reconcile`)
      .set(as('monitoring'));
    expect(monitoringReconcile.status).toBe(403);
    await scenario('A', 'normal');
    const reconciled = await request(app)
      .post(`/internal/v1/operations/${booking.operationId}/reconcile`)
      .set(as('scheduler'));
    expect(reconciled.status, JSON.stringify(reconciled.body)).toBe(200);
    expect(reconciled.body).toEqual({
      operationId: booking.operationId,
      partner: 'A',
      status: 'confirmed',
      changed: true,
      error: null,
    });
    expect(
      database.get<any>(
        'SELECT COUNT(*) AS count FROM partnerDemoState WHERE partner=? AND operationId=?',
        'A',
        booking.operationId,
      )?.count,
    ).toBe(1);
    const settled = await request(app)
      .post(`/internal/v1/operations/${booking.operationId}/reconcile`)
      .set(as('scheduler'));
    expect([settled.status, settled.body.error.code]).toEqual([409, 'OPERATION_SETTLED']);
    const missing = await request(app)
      .post('/internal/v1/operations/nie-istnieje/reconcile')
      .set(as('scheduler'));
    expect([missing.status, missing.body.error.code]).toEqual([404, 'OPERATION_NOT_FOUND']);
    const audit = await admin.get('/api/v1/admin/audit-events?action=operation.reconcile');
    expect(JSON.stringify(audit.body)).toContain('Test scheduler');
  });
  it('W-03 przy dalszej awarii partnera zostawia stan i zwraca opis błędu', async () => {
    const f = await fixture();
    await scenario('A', 'timeout');
    const booking = await bookMassage(f);
    const result = await request(app)
      .post(`/internal/v1/operations/${booking.operationId}/reconcile`)
      .set(as('scheduler'));
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ status: 'unknown', changed: false });
    expect(result.body.error).toEqual(expect.any(String));
    const bad = await request(app)
      .get('/internal/v1/operations/pending?partner=X')
      .set(as('monitoring'));
    expect([bad.status, bad.body.error.code]).toEqual([400, 'VALIDATION_ERROR']);
  });
  it('W-03 kończy niepotwierdzone rozliczenie vouchera w D', async () => {
    const f = await fixture(true);
    expect((await write('post', `/reservations/${f.reservation.id}/check-in`)).status).toBe(200);
    await scenario('D', 'timeout_after_success');
    expect((await write('post', `/reservations/${f.reservation.id}/check-out`)).status).toBe(200);
    const pending = await request(app)
      .get('/internal/v1/operations/pending?partner=D')
      .set(as('scheduler'));
    const operation = pending.body.items.find((x: any) => x.reservationId === f.reservation.id);
    expect(operation).toMatchObject({ kind: 'voucher_completion', status: 'unknown' });
    await scenario('D', 'normal');
    const result = await request(app)
      .post(`/internal/v1/operations/${operation.operationId}/reconcile`)
      .set(as('scheduler'));
    expect(result.body).toMatchObject({ partner: 'D', status: 'reported', changed: true });
    expect(
      database.get<any>(
        "SELECT COUNT(*) AS count FROM partnerDemoState WHERE partner='D' AND operationId=?",
        operation.operationId,
      )?.count,
    ).toBe(1);
  });
  it('W-04 usuwa tylko wygasłe sesje i stare klucze ponowienia', async () => {
    const old = new Date(Date.now() - 8 * 86400000).toISOString();
    database.run(
      'INSERT INTO sessions(id,userId,csrfToken,expiresAt) VALUES(?,?,?,?)',
      'expired-session',
      null,
      'x',
      old,
    );
    database.run(
      'INSERT INTO idempotency_records(actorKey,requestKey,requestHash,response,createdAt) VALUES(?,?,?,?,?)',
      'test',
      'old',
      'x',
      '{}',
      old,
    );
    const reservations = database.get<any>('SELECT COUNT(*) AS n FROM reservations')!.n;
    const result = await request(app).post('/internal/v1/maintenance/cleanup').set(as('scheduler'));
    expect(result.status).toBe(200);
    expect(result.body.sessionsRemoved).toBeGreaterThanOrEqual(1);
    expect(result.body.idempotencyRecordsRemoved).toBeGreaterThanOrEqual(1);
    expect(database.get('SELECT 1 FROM sessions WHERE id=?', 'expired-session')).toBeUndefined();
    expect(database.get<any>('SELECT COUNT(*) AS n FROM reservations')!.n).toBe(reservations);
    // Sesja administratora jest ważna, więc nadal działa.
    expect((await admin.get('/api/v1/me')).status).toBe(200);
  });
  it('W-05 zapisuje spójną kopię bazy i zwraca tylko nazwę pliku', async () => {
    const result = await request(app).post('/internal/v1/backups').set(as('backup'));
    expect(result.status, JSON.stringify(result.body)).toBe(201);
    expect(result.body.file).toMatch(/^aurora-.*\.sqlite$/);
    expect(result.body.sizeBytes).toBeGreaterThan(0);
    const file = path.join(process.env.BACKUP_DIR!, result.body.file);
    expect(existsSync(file)).toBe(true);
    expect(statSync(file).mode & 0o777).toBe(0o600);
    const copy = new DatabaseSync(file, { readOnly: true });
    try {
      expect((copy.prepare('SELECT COUNT(*) AS n FROM reservations').get() as any).n).toBe(
        database.get<any>('SELECT COUNT(*) AS n FROM reservations')!.n,
      );
    } finally {
      copy.close();
    }
    expect((await request(app).post('/internal/v1/backups').set(as('scheduler'))).status).toBe(403);
  });
});

describe('Wyłączanie połączeń z innymi projektami', () => {
  it('bez projektu D aplikacja działa, a voucher jest niedostępny', async () => {
    expect((await request(app).get('/api/v1/features')).body).toEqual({
      massages: true,
      trainings: true,
      vouchers: true,
    });
    await scenario('D', 'normal', false);
    expect((await request(app).get('/api/v1/features')).body.vouchers).toBe(false);
    const direct = await fixture();
    expect((await write('post', `/reservations/${direct.reservation.id}/check-in`)).status).toBe(
      200,
    );
    expect((await write('post', `/reservations/${direct.reservation.id}/check-out`)).status).toBe(
      200,
    );
    await scenario('D', 'normal', true);
  });
  it('nie pozwala wyłączyć partnera, który ma aktywne lub niewyjaśnione operacje', async () => {
    const f = await fixture(true);
    const blockedD = await write('patch', '/admin/integrations/D', { enabled: false });
    expect([blockedD.status, blockedD.body.error.code]).toEqual([409, 'PARTNER_IN_USE']);
    await bookMassage(f);
    const blockedA = await write('patch', '/admin/integrations/A', { enabled: false });
    expect([blockedA.status, blockedA.body.error.code]).toEqual([409, 'PARTNER_IN_USE']);
    const key = await write('post', '/admin/api-keys', {
      name: 'Katalog',
      partner: 'X',
      scopes: ['reservations:read'],
    });
    const scope = await request(app).get('/api/v1/features').set('X-API-Key', key.body.key);
    expect([scope.status, scope.body.error.code]).toEqual([403, 'SCOPE_REQUIRED']);
  });
});

describe('Odpowiedzi API przy braku uwierzytelnienia', () => {
  it('zapis bez sesji i bez klucza to 401, a błędy formularza nadal 403', async () => {
    const anonymous = await request(app).post('/api/v1/reservations').send({});
    expect([anonymous.status, anonymous.body.error.code]).toEqual([401, 'AUTH_REQUIRED']);
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'x@example.test', password: 'cokolwiek-123' });
    expect([login.status, login.body.error.code]).toEqual([403, 'CSRF_INVALID']);
    const noToken = await admin.post('/api/v1/admin/rooms').send({});
    expect([noToken.status, noToken.body.error.code]).toEqual([403, 'CSRF_INVALID']);
    const empty = await request(app).get('/api/v1/reservations').set('X-API-Key', '');
    expect([empty.status, empty.body.error.code]).toEqual([401, 'INVALID_API_KEY']);
    const emptyInternal = await request(app).get('/internal/v1/health/ready').set('X-API-Key', '');
    expect([emptyInternal.status, emptyInternal.body.error.code]).toEqual([401, 'INVALID_API_KEY']);
  });
});

describe('Polecenia na serwerze', () => {
  let server: Server;
  let url: string;
  beforeAll(async () => {
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise((resolve) => server.close(resolve)));
  it('npm run service-token tworzy, wypisuje i wyłącza token', async () => {
    const cli = (...args: string[]) =>
      run(process.execPath, ['--import', 'tsx', 'backend/src/service-tokens.ts', ...args], {
        env: process.env,
      });
    const created = await cli('create', 'monitoring', 'Monitoring CLI');
    const token = created.stdout.trim().split('\n').at(-1)!;
    expect(token).toMatch(/^aurora_svc_[A-Za-z0-9_-]{43}$/);
    const ready = await request(app).get('/internal/v1/health/ready').set('X-API-Key', token);
    expect(ready.status).toBe(200);
    const list = await cli('list');
    expect(list.stdout).toContain('Monitoring CLI');
    expect(list.stdout).not.toContain(token);
    const id = created.stdout.match(/\(([0-9a-f-]{36})\)/)![1]!;
    expect((await cli('revoke', id)).stdout).toContain('wyłączony');
    await expect(cli('create', 'admin')).rejects.toMatchObject({ code: 2 });
  });
  it('scripts/internal-jobs.mjs wykonuje zadania monitoringu, harmonogramu i kopii', async () => {
    const job = (name: string, env: Record<string, string>) =>
      run(process.execPath, ['scripts/internal-jobs.mjs', name], {
        env: { ...process.env, INTERNAL_URL: url, ...env },
      });
    const f = await fixture();
    await scenario('A', 'timeout');
    const booking = await bookMassage(f);
    await scenario('A', 'normal');
    const reconcile = await job('reconcile', { SCHEDULER_TOKEN: tokens.scheduler! });
    expect(reconcile.stdout).toMatch(/zmienione: [1-9]/);
    expect(
      database.get<any>('SELECT status FROM partnerBookings WHERE id=?', booking.id)!.status,
    ).toBe('confirmed');
    expect((await job('ready', { MONITORING_TOKEN: tokens.monitoring! })).stdout).toContain(
      '"status":"ok"',
    );
    expect((await job('cleanup', { SCHEDULER_TOKEN: tokens.scheduler! })).stdout).toContain(
      'sessionsRemoved',
    );
    const before = readdirSync(process.env.BACKUP_DIR!).length;
    expect((await job('backup', { BACKUP_TOKEN: tokens.backup! })).stdout).toContain('Kopia:');
    expect(readdirSync(process.env.BACKUP_DIR!).length).toBe(before + 1);
    await expect(job('backup', { BACKUP_TOKEN: tokens.monitoring! })).rejects.toMatchObject({
      code: 1,
    });
    await expect(job('ready', { MONITORING_TOKEN: '' })).rejects.toMatchObject({ code: 2 });
  });
});
