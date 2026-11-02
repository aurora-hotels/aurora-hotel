import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const directory = mkdtempSync(path.join(tmpdir(), 'aurora-partners-'));
process.env.DATABASE_PATH = path.join(directory, 'partners.sqlite');
process.env.NODE_ENV = 'test';
process.env.COOKIE_SECURE = 'false';
process.env.CONFIG_ENCRYPTION_KEY = 'c'.repeat(64);
process.env.ALLOWED_PARTNER_HOSTS = 'localhost,127.0.0.1';
process.env.ALLOW_PRIVATE_PARTNER_HOSTS = 'localhost,127.0.0.1';
process.env.ADMIN_EMAIL = 'integration-admin@example.test';
process.env.ADMIN_PASSWORD = 'Test-integration-admin-2026';
process.env.LOGIN_RATE_LIMIT = '1000';
process.env.PUBLIC_RATE_LIMIT = '10000';
let app: any;
let admin: any;
let database: typeof import('../src/db.js');
const day = (offset: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};
async function write(
  method: 'post' | 'patch',
  route: string,
  body: unknown = {},
  headers: Record<string, string> = {},
) {
  const csrf = await admin.get('/api/v1/auth/csrf');
  let call = admin[method](`/api/v1${route}`).set('X-CSRF-Token', csrf.body.csrfToken);
  for (const [name, value] of Object.entries(headers)) call = call.set(name, value);
  return call.send(body);
}
async function scenario(partner: 'A' | 'B' | 'D', demoScenario: string) {
  const result = await write('patch', `/admin/integrations/${partner}`, {
    mode: 'demo',
    enabled: true,
    demoScenario,
  });
  expect(result.status, JSON.stringify(result.body)).toBe(200);
}
async function fixture(voucher = false) {
  const room = await write('post', '/admin/rooms', {
    number: `I-${randomUUID().slice(0, 8)}`,
    type: 'Integracja',
    description: 'Pokój integracyjny',
    capacity: 2,
    nightlyRateMinor: 20000,
    equipment: [],
    active: true,
  });
  expect(room.status, JSON.stringify(room.body)).toBe(201);
  const pack = await write('post', '/admin/packages', {
    name: `Relaks ${randomUUID().slice(0, 8)}`,
    description: 'Masaż i trening',
    priceMinor: 10000,
    active: true,
    items: [
      { name: 'Masaż', partner: 'A', offerId: 'A-MASSAGE', quantity: 1 },
      { name: 'Trening', partner: 'B', offerId: 'B-PERSONAL', quantity: 1 },
    ],
  });
  expect(pack.status, JSON.stringify(pack.body)).toBe(201);
  const reference = `V-${randomUUID()}`;
  const componentId = `C-${randomUUID()}`;
  if (voucher) {
    const result = await write('post', '/admin/demo-vouchers', {
      reference,
      componentId,
      validFrom: day(-1),
      validUntil: day(100),
    });
    expect(result.status, JSON.stringify(result.body)).toBe(201);
  }
  const body = {
    roomId: room.body.id,
    packageId: pack.body.id,
    checkIn: day(20),
    checkOut: day(23),
    guests: 2,
    expectedTotalMinor: 70000,
    guest: { name: 'Jan Integracyjny', email: 'jan@example.test', phone: '+48123456789' },
    guestNames: ['Jan Integracyjny', 'Anna Integracyjna'],
    ...(voucher ? { voucherReference: reference, hotelComponentId: componentId } : {}),
  };
  const result = await write('post', '/reservations', body, { 'Idempotency-Key': randomUUID() });
  expect(result.status, JSON.stringify(result.body)).toBe(201);
  const plan = await admin.get(`/api/v1/reservations/${result.body.id}/plan`);
  expect(plan.status, JSON.stringify(plan.body)).toBe(200);
  return { reservation: result.body, plan: plan.body, reference, componentId, body };
}
const time = (offset: number, hour: number) =>
  `${day(offset)}T${String(hour).padStart(2, '0')}:00:00Z`;
async function service(f: any, partner: 'A' | 'B', changes: Record<string, unknown> = {}) {
  const item = f.plan.items.find((x: any) => x.partner === partner);
  expect(item, `Brak dodatku ${partner}`).toBeTruthy();
  return write('post', `/reservations/${f.reservation.id}/partner-bookings`, {
    itemId: item.id,
    guestIndex: 0,
    startsAt: time(21, partner === 'A' ? 10 : 13),
    endsAt: time(21, partner === 'A' ? 11 : 14),
    ...changes,
  });
}
// Nowy proces nie dziedziczy pamięci serwera. Odtwarza operację wyłącznie z SQLite.
async function recoverInFreshProcess(
  kind: 'service' | 'voucher',
  reservationId: string,
  bookingId = '',
) {
  const script = `import { refreshService, afterCheckOut, reservationRow } from './backend/src/integrations/services.ts';
import { db } from './backend/src/db.ts';
const result = process.argv[1] === 'service' ? await refreshService(process.argv[2], process.argv[3]) : await afterCheckOut(reservationRow(process.argv[2]));
console.log(JSON.stringify(result)); db.close();`;
  const result = await promisify(execFile)(
    process.execPath,
    ['--import', 'tsx', '--input-type=module', '-e', script, kind, reservationId, bookingId],
    { cwd: process.cwd(), env: process.env },
  );
  return JSON.parse(result.stdout.trim());
}
async function bookings(id: string) {
  const plan = await admin.get(`/api/v1/reservations/${id}/plan`);
  expect(plan.status, JSON.stringify(plan.body)).toBe(200);
  return { plan: plan.body, all: plan.body.items.flatMap((x: any) => x.bookings) as any[] };
}
beforeAll(async () => {
  const { createApp } = await import('../src/app.js');
  database = await import('../src/db.js');
  const { seed } = await import('../src/seed.js');
  await seed();
  app = createApp();
  admin = request.agent(app);
  const login = await write('post', '/auth/login', {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
  expect(login.status, JSON.stringify(login.body)).toBe(200);
});
beforeEach(async () => {
  for (const partner of ['A', 'B', 'D'] as const) await scenario(partner, 'normal');
});
afterAll(() => {
  database?.db.close();
  rmSync(directory, { recursive: true, force: true });
});

describe('Plan pobytu i usługi projektów A/B', () => {
  it('T-20: odrzuca termin poza pobytem i usługi nakładające się dla gościa', async () => {
    const f = await fixture();
    const outside = await service(f, 'A', { startsAt: time(19, 10), endsAt: time(19, 11) });
    expect([400, 409]).toContain(outside.status);
    expect((await service(f, 'A')).status).toBe(201);
    const overlap = await service(f, 'B', { startsAt: time(21, 10), endsAt: time(21, 11) });
    expect(overlap.status, JSON.stringify(overlap.body)).toBe(409);
    expect(
      database.get<any>(
        'SELECT COUNT(*) AS count FROM partnerBookings WHERE reservationId=?',
        f.reservation.id,
      )?.count,
    ).toBe(1);
  });
  it('T-21: odmowa B nie usuwa udanego masażu ani pobytu', async () => {
    const f = await fixture();
    await service(f, 'A');
    await scenario('B', 'reject');
    await service(f, 'B');
    const current = await bookings(f.reservation.id);
    expect(current.all.find((x) => x.partner === 'A').status).toBe('confirmed');
    expect(current.all.find((x) => x.partner === 'B').status).toBe('rejected');
    expect((await admin.get(`/api/v1/reservations/${f.reservation.id}`)).body.status).toBe(
      'confirmed',
    );
  });
  it('T-22: timeout po sukcesie utrwala ID i odświeżenie odnajduje tę samą usługę', async () => {
    const f = await fixture();
    await scenario('A', 'timeout_after_success');
    await service(f, 'A');
    const first = (await bookings(f.reservation.id)).all[0];
    expect(first.status).toBe('unknown');
    expect(first.operationId).toBeTruthy();
    expect((await service(f, 'A')).status).toBe(409);
    await scenario('A', 'normal');
    const refreshed = await recoverInFreshProcess('service', f.reservation.id, first.id);
    expect(refreshed.status).toBe('confirmed');
    const after = (await bookings(f.reservation.id)).all[0];
    expect(after.status).toBe('confirmed');
    expect(after.operationId).toBe(first.operationId);
    expect(
      database.get<any>(
        'SELECT COUNT(*) AS count FROM partnerDemoState WHERE partner=? AND operationId=?',
        'A',
        first.operationId,
      )?.count,
    ).toBe(1);
  });
  it('T-22: po timeout przed zapisem partnera odzyskiwanie ponawia to samo ID operacji', async () => {
    const f = await fixture();
    await scenario('A', 'timeout');
    await service(f, 'A');
    const original = (await bookings(f.reservation.id)).all[0];
    expect(original.status).toBe('unknown');
    await scenario('A', 'normal');
    const result = await write(
      'post',
      `/reservations/${f.reservation.id}/partner-bookings/${original.id}/refresh`,
    );
    expect(result.status).toBe(200);
    expect(result.body.status).toBe('confirmed');
    expect(result.body.operationId).toBe(original.operationId);
    expect(
      database.get<any>(
        'SELECT COUNT(*) AS count FROM partnerDemoState WHERE partner=? AND operationId=?',
        'A',
        original.operationId,
      )?.count,
    ).toBe(1);
  });
  it('T-23: aktywny lub nieznany termin A blokuje zmianę dat hotelu', async () => {
    const f = await fixture();
    await scenario('A', 'timeout_after_success');
    await service(f, 'A');
    const response = await write('patch', `/reservations/${f.reservation.id}`, {
      checkIn: day(30),
      checkOut: day(33),
      guests: 2,
      expectedVersion: 1,
      expectedTotalMinor: 70000,
    });
    expect(response.status).toBe(409);
    expect((await admin.get(`/api/v1/reservations/${f.reservation.id}`)).body.checkIn).toBe(
      day(20),
    );
  });
  it('T-23: częściowe anulowanie zachowuje hotel, dopóki drugi partner nie potwierdzi', async () => {
    const f = await fixture();
    await service(f, 'A');
    await service(f, 'B');
    await scenario('B', 'unavailable');
    const failed = await write('post', `/reservations/${f.reservation.id}/cancel`);
    expect([409, 503], JSON.stringify(failed.body)).toContain(failed.status);
    expect((await admin.get(`/api/v1/reservations/${f.reservation.id}`)).body.status).toBe(
      'confirmed',
    );
    const current = await bookings(f.reservation.id);
    expect(current.all.find((x) => x.partner === 'A').status).toBe('cancelled');
    expect(['unknown', 'cancel_pending']).toContain(
      current.all.find((x) => x.partner === 'B').status,
    );
    await scenario('B', 'normal');
    const cancelled = await write('post', `/reservations/${f.reservation.id}/cancel`);
    expect(cancelled.status, JSON.stringify(cancelled.body)).toBe(200);
    expect((await admin.get(`/api/v1/reservations/${f.reservation.id}`)).body.status).toBe(
      'cancelled',
    );
  });
  it('T-26: odświeżenie wykonanej usługi zmienia plan, nie zużywa vouchera D', async () => {
    const f = await fixture(true);
    await service(f, 'A');
    const massage = (await bookings(f.reservation.id)).all[0];
    await scenario('A', 'completed');
    expect(
      (
        await write(
          'post',
          `/reservations/${f.reservation.id}/partner-bookings/${massage.id}/refresh`,
        )
      ).status,
    ).toBe(200);
    expect((await bookings(f.reservation.id)).all[0].status).toBe('completed');
    expect(
      database.get<any>('SELECT used FROM demoVouchers WHERE reference=?', f.reference)?.used,
    ).toBe(0);
    expect(
      database.get<any>("SELECT COUNT(*) AS count FROM partnerDemoState WHERE partner='D'")?.count,
    ).toBe(0);
  });
});

describe('Voucher usługowy D i wykonanie części hotelowej', () => {
  it('Zmiana dat z voucherem ponownie sprawdza D, cenę, wersję i dostępność bez częściowych zapisów', async () => {
    const f = await fixture(true);
    const patch = {
      checkIn: day(30),
      checkOut: day(33),
      guests: 2,
      expectedVersion: 1,
      expectedTotalMinor: 70000,
    };
    const unchanged = async () => {
      const current = (await admin.get(`/api/v1/reservations/${f.reservation.id}`)).body;
      expect(current.checkIn).toBe(day(20));
      expect(current.checkOut).toBe(day(23));
      expect(current.version).toBe(1);
      expect(current.pricing.totalMinor).toBe(70000);
    };
    for (const invalid of [
      { expectedVersion: 99 },
      { expectedTotalMinor: 1 },
      { checkIn: day(101), checkOut: day(104) },
    ]) {
      expect(
        (await write('patch', `/reservations/${f.reservation.id}`, { ...patch, ...invalid }))
          .status,
      ).toBe(409);
      await unchanged();
    }
    database.run('UPDATE demoVouchers SET used=1 WHERE reference=?', f.reference);
    expect((await write('patch', `/reservations/${f.reservation.id}`, patch)).status).toBe(409);
    await unchanged();
    database.run('UPDATE demoVouchers SET used=0 WHERE reference=?', f.reference);
    await scenario('D', 'unavailable');
    expect((await write('patch', `/reservations/${f.reservation.id}`, patch)).status).toBe(503);
    await unchanged();
    await scenario('D', 'normal');
    const occupied = await write(
      'post',
      '/reservations',
      {
        ...f.body,
        ...patch,
        expectedVersion: undefined,
        voucherReference: undefined,
        hotelComponentId: undefined,
      },
      { 'Idempotency-Key': randomUUID() },
    );
    expect(occupied.status, JSON.stringify(occupied.body)).toBe(201);
    expect((await write('patch', `/reservations/${f.reservation.id}`, patch)).status).toBe(409);
    await unchanged();
    const valid = await write('patch', `/reservations/${f.reservation.id}`, {
      ...patch,
      checkIn: day(40),
      checkOut: day(43),
    });
    expect(valid.status, JSON.stringify(valid.body)).toBe(200);
    expect(valid.body.version).toBe(2);
    expect(valid.body.checkIn).toBe(day(40));
    expect(valid.body.hasVoucher).toBe(true);
  });

  it('T-24: obcy dostawca, zła część, zużycie i ważność nie pozwalają na zameldowanie', async () => {
    const modifications = [
      { provider: 'A' },
      { componentId: 'other-component' },
      { used: 1 },
      { validUntil: day(-1) },
      { kind: 'massage' },
      { reservationId: 'another-reservation' },
    ];
    for (const modification of modifications) {
      const f = await fixture(true);
      for (const [field, value] of Object.entries(modification))
        database.run(`UPDATE demoVouchers SET ${field}=? WHERE reference=?`, value, f.reference);
      const result = await write('post', `/reservations/${f.reservation.id}/check-in`);
      expect([400, 409, 503], JSON.stringify(result.body)).toContain(result.status);
      expect((await admin.get(`/api/v1/reservations/${f.reservation.id}`)).body.status).toBe(
        'confirmed',
      );
    }
  });
  it('T-13: awaria D blokuje voucher, lecz zwykły pobyt nadal działa', async () => {
    const voucher = await fixture(true);
    const direct = await fixture();
    await scenario('D', 'unavailable');
    expect((await write('post', `/reservations/${voucher.reservation.id}/check-in`)).status).toBe(
      503,
    );
    expect((await write('post', `/reservations/${direct.reservation.id}/check-in`)).status).toBe(
      200,
    );
    expect((await write('post', `/reservations/${direct.reservation.id}/check-out`)).status).toBe(
      200,
    );
  });
  it('T-25: zakończenie lokalne pozostaje po awarii D, ponowienie potwierdza hotel raz', async () => {
    const f = await fixture(true);
    expect((await write('post', `/reservations/${f.reservation.id}/check-in`)).status).toBe(200);
    await scenario('D', 'timeout_after_success');
    const checkout = await write('post', `/reservations/${f.reservation.id}/check-out`);
    expect(checkout.status, JSON.stringify(checkout.body)).toBe(200);
    expect((await admin.get(`/api/v1/reservations/${f.reservation.id}`)).body.status).toBe(
      'completed',
    );
    const pending = (await bookings(f.reservation.id)).plan.voucher;
    expect(pending.status).toBe('unknown');
    expect(pending.operationId).toBeTruthy();
    await scenario('D', 'normal');
    expect((await recoverInFreshProcess('voucher', f.reservation.id)).status).toBe('reported');
    for (let attempt = 0; attempt < 2; attempt++)
      expect(
        (await write('post', `/reservations/${f.reservation.id}/voucher/confirm-completion`))
          .status,
      ).toBe(200);
    const confirmed = (await bookings(f.reservation.id)).plan.voucher;
    expect(confirmed.status).toBe('reported');
    expect(confirmed.operationId).toBe(pending.operationId);
    expect(
      database.get<any>(
        'SELECT used,reservationId FROM demoVouchers WHERE reference=?',
        f.reference,
      ),
    ).toMatchObject({ used: 1, reservationId: f.reservation.id });
    const remote = database.all<any>(
      'SELECT result FROM partnerDemoState WHERE partner=? AND operationId=?',
      'D',
      pending.operationId,
    );
    expect(remote).toHaveLength(1);
    expect(JSON.parse(remote[0].result)).toMatchObject({
      provider: 'C',
      componentId: f.componentId,
      reservationId: f.reservation.id,
    });
  });
  it('T-24: wykorzystany voucher lub niedostępność D blokują anulowanie przed zmianą usług A/B', async () => {
    const f = await fixture(true);
    await service(f, 'A');
    database.run('UPDATE demoVouchers SET used=1 WHERE reference=?', f.reference);
    let cancelled = await write('post', `/reservations/${f.reservation.id}/cancel`);
    expect(cancelled.status, JSON.stringify(cancelled.body)).toBe(409);
    expect((await bookings(f.reservation.id)).all[0].status).toBe('confirmed');
    database.run('UPDATE demoVouchers SET used=0 WHERE reference=?', f.reference);
    await scenario('D', 'unavailable');
    cancelled = await write('post', `/reservations/${f.reservation.id}/cancel`);
    expect(cancelled.status).toBe(503);
    expect((await admin.get(`/api/v1/reservations/${f.reservation.id}`)).body.status).toBe(
      'confirmed',
    );
    expect((await bookings(f.reservation.id)).all[0].status).toBe('confirmed');
  });
  it('T-19: D powtarza stworzenie pobytu z voucherem bez duplikatu', async () => {
    const f = await fixture();
    expect(
      (
        await write('post', '/admin/demo-vouchers', {
          reference: f.reference,
          componentId: f.componentId,
          validFrom: day(-1),
          validUntil: day(100),
        })
      ).status,
    ).toBe(201);
    const key = await write('post', '/admin/api-keys', {
      name: 'Projekt D test',
      partner: 'D',
      scopes: ['reservations:create', 'reservations:read'],
    });
    expect(key.status).toBe(201);
    const secret = key.body.key ?? key.body.apiKey;
    // Partner kupuje inny termin i przypina nowy, nieużywany voucher.
    const body = {
      ...f.body,
      checkIn: day(30),
      checkOut: day(33),
      voucherReference: f.reference,
      hotelComponentId: f.componentId,
    };
    const idempotency = randomUUID();
    const send = () =>
      request(app)
        .post('/api/v1/reservations')
        .set('X-API-Key', secret)
        .set('Idempotency-Key', idempotency)
        .send(body);
    const first = await send();
    const repeated = await send();
    expect(first.status, JSON.stringify(first.body)).toBe(201);
    expect([200, 201]).toContain(repeated.status);
    expect(repeated.body.id).toBe(first.body.id);
    expect(first.body.hasVoucher).toBe(true);
    expect(first.body.voucherReference).toBeUndefined();
    expect(first.body.fundingSource).toBe('voucher');
    expect(
      database.get<any>(
        'SELECT COUNT(*) AS count FROM reservations WHERE partnerId=? AND id=?',
        'D',
        first.body.id,
      )?.count,
    ).toBe(1);
  });
});

// Ten serwer realizuje uzgodniony kontrakt po prawdziwym HTTP. Nie zastępuje odbioru z grupą A.
async function withHttpPartner(
  handler: (body: any, method: string, url: string) => Promise<any> | any,
  task: () => Promise<void>,
  secret = 'contract-test-secret',
) {
  const { createServer } = await import('node:http');
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null;
    if (req.headers['x-api-key'] !== 'contract-test-secret') {
      res.writeHead(401);
      res.end('{}');
      return;
    }
    try {
      const answer = await handler(body, req.method!, req.url!);
      if (answer?.httpStatus) {
        res.writeHead(answer.httpStatus);
        res.end(JSON.stringify(answer.body ?? {}));
        return;
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(typeof answer === 'string' ? answer : JSON.stringify(answer));
    } catch {
      res.writeHead(500);
      res.end('{}');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  try {
    const configured = await write('patch', '/admin/integrations/A', {
      mode: 'real',
      enabled: true,
      baseUrl: `http://127.0.0.1:${port}`,
      timeoutMs: 1000,
      secret,
    });
    expect(configured.status, JSON.stringify(configured.body)).toBe(200);
    expect(JSON.stringify(configured.body)).not.toContain(secret);
    await task();
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe('Kontrakt A przez prawdziwe HTTP i trwające operacje', () => {
  it('T-13/T-22: błędny JSON po zapisie odzyskuje jedną usługę po ID', async () => {
    const f = await fixture();
    let remote: any;
    let creates = 0;
    await withHttpPartner(
      (body, method) => {
        if (method === 'POST') {
          creates++;
          // Trwały pending istnieje zanim partner otrzyma żądanie.
          expect(
            database.get<any>(
              'SELECT status FROM partnerBookings WHERE operationId=?',
              body.operationId,
            )?.status,
          ).toBe('pending');
          remote = {
            id: `remote-${body.operationId}`,
            operationId: body.operationId,
            status: 'confirmed',
            startsAt: body.startsAt,
            endsAt: body.endsAt,
          };
          return '<html>Usługa utworzona, błędna odpowiedź proxy</html>';
        }
        return remote;
      },
      async () => {
        await service(f, 'A');
        const unknown = (await bookings(f.reservation.id)).all[0];
        expect(unknown.status).toBe('unknown');
        expect(unknown.error).toContain('JSON');
        expect((await service(f, 'A')).status).toBe(409);
        const response = await write(
          'post',
          `/reservations/${f.reservation.id}/partner-bookings/${unknown.id}/refresh`,
        );
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('confirmed');
        expect(response.body.operationId).toBe(unknown.operationId);
        expect(creates).toBe(1);
      },
    );
  });
  it('T-22: po 503 i braku operacji w partnerze ponawia dokładnie ten sam zapis HTTP', async () => {
    const f = await fixture();
    const sent: any[] = [];
    await withHttpPartner(
      (body, method) => {
        if (method === 'GET') return { httpStatus: 404 };
        sent.push(body);
        if (sent.length === 1) return { httpStatus: 503 };
        return {
          id: 'recovered-booking',
          operationId: body.operationId,
          status: 'confirmed',
          startsAt: body.startsAt,
          endsAt: body.endsAt,
        };
      },
      async () => {
        await service(f, 'A');
        const unknown = (await bookings(f.reservation.id)).all[0];
        expect(unknown.status).toBe('unknown');
        const refreshed = await write(
          'post',
          `/reservations/${f.reservation.id}/partner-bookings/${unknown.id}/refresh`,
        );
        expect(refreshed.body.status).toBe('confirmed');
        expect(sent).toHaveLength(2);
        expect(sent[1]).toEqual(sent[0]);
        expect(refreshed.body.operationId).toBe(unknown.operationId);
      },
    );
  });
  it('Zmiana demo na inny serwer nie wysyła odzyskiwanej operacji do obcego środowiska', async () => {
    const f = await fixture();
    await scenario('A', 'timeout_after_success');
    await service(f, 'A');
    const pending = (await bookings(f.reservation.id)).all[0];
    let requests = 0;
    await withHttpPartner(
      () => {
        requests++;
        return {};
      },
      async () => {
        const refreshed = await write(
          'post',
          `/reservations/${f.reservation.id}/partner-bookings/${pending.id}/refresh`,
        );
        expect(refreshed.status).toBe(200);
        expect(refreshed.body.status).toBe('unknown');
        expect(refreshed.body.error).toContain('Przywróć środowisko');
        expect(requests).toBe(0);
      },
    );
  });
  it('T-13: poprawny JSON z obcym ID operacji nie jest potwierdzeniem', async () => {
    const f = await fixture();
    await withHttpPartner(
      (body) => ({
        id: 'foreign-booking',
        operationId: 'foreign-operation',
        status: 'confirmed',
        startsAt: body.startsAt,
        endsAt: body.endsAt,
      }),
      async () => {
        await service(f, 'A');
        const result = (await bookings(f.reservation.id)).all[0];
        expect(result.status).toBe('unknown');
        expect(result.externalId).toBeNull();
        expect(result.error).toContain('innej operacji');
      },
    );
  });
  it('T-13: błędny klucz partnera daje czytelny błąd bez ujawnienia sekretu', async () => {
    const f = await fixture();
    const secret = 'incorrect-partner-secret';
    await withHttpPartner(
      () => ({}),
      async () => {
        const created = await service(f, 'A');
        expect(created.status).toBe(201);
        expect(created.body.status).toBe('rejected');
        expect(created.body.error).toBeTruthy();
        expect(JSON.stringify(created.body)).not.toContain(secret);
        expect((await admin.get(`/api/v1/reservations/${f.reservation.id}`)).body.status).toBe(
          'confirmed',
        );
      },
      secret,
    );
  });
  it('Trwające odświeżenie blokuje anulowanie i chroni wynik wykonanej usługi', async () => {
    const f = await fixture();
    let remote: any;
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await withHttpPartner(
      async (body, method) => {
        if (method === 'POST') {
          remote = {
            id: 'slow-booking',
            operationId: body.operationId,
            status: 'confirmed',
            startsAt: body.startsAt,
            endsAt: body.endsAt,
          };
          return remote;
        }
        markStarted();
        await gate;
        return { ...remote, status: 'completed' };
      },
      async () => {
        await service(f, 'A');
        const booking = (await bookings(f.reservation.id)).all[0];
        const refreshing = write(
          'post',
          `/reservations/${f.reservation.id}/partner-bookings/${booking.id}/refresh`,
        );
        await started;
        try {
          const cancelled = await write(
            'post',
            `/reservations/${f.reservation.id}/partner-bookings/${booking.id}/cancel`,
          );
          expect(cancelled.status).toBe(409);
          expect(cancelled.body.error.code).toBe('RESERVATION_BUSY');
        } finally {
          release();
        }
        expect((await refreshing).body.status).toBe('completed');
        const after = await write(
          'post',
          `/reservations/${f.reservation.id}/partner-bookings/${booking.id}/cancel`,
        );
        expect(after.status).toBe(409);
        expect(after.body.error.code).toBe('SERVICE_COMPLETED');
        expect((await bookings(f.reservation.id)).all[0].status).toBe('completed');
      },
    );
  });
});
