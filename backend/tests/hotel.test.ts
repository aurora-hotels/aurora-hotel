import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

// Każde uruchomienie ma osobną bazę. Testy nigdy nie dotykają danych demonstracji.
const directory = mkdtempSync(path.join(tmpdir(), 'aurora-api-'));
process.env.DATABASE_PATH = path.join(directory, 'test.sqlite');
process.env.NODE_ENV = 'test';
process.env.COOKIE_SECURE = 'false';
process.env.CONFIG_ENCRYPTION_KEY = 'a'.repeat(64);
process.env.ADMIN_EMAIL = 'admin@test.local';
process.env.ADMIN_PASSWORD = 'Test-admin-password-2026';
process.env.LOGIN_RATE_LIMIT = '1000';
process.env.PUBLIC_RATE_LIMIT = '10000';
let app: any;
let admin: any;
let customer: any;
let stranger: any;
let database: typeof import('../src/db.js');
let customerId: string;
const password = 'Student-test-password-2026';
const day = (offset: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

async function write(
  agent: any,
  method: 'post' | 'patch',
  url: string,
  data: unknown = {},
  headers: Record<string, string> = {},
) {
  const csrf = await agent.get('/api/v1/auth/csrf');
  let call = agent[method](`/api/v1${url}`).set('X-CSRF-Token', csrf.body.csrfToken);
  for (const [key, value] of Object.entries(headers)) call = call.set(key, value);
  return call.send(data);
}
async function login(email: string, pass = password) {
  const agent = request.agent(app);
  const result = await write(agent, 'post', '/auth/login', { email, password: pass });
  expect(result.status, JSON.stringify(result.body)).toBe(200);
  return agent;
}
async function register(email: string) {
  const agent = request.agent(app);
  const result = await write(agent, 'post', '/auth/register', {
    email,
    password,
    name: 'Jan Testowy',
  });
  expect(result.status, JSON.stringify(result.body)).toBe(201);
  return login(email);
}
async function room(capacity = 3, nightlyRateMinor = 25000) {
  const result = await write(admin, 'post', '/admin/rooms', {
    number: `T-${randomUUID().slice(0, 8)}`,
    type: 'Pokój testowy',
    description: 'Dane tylko do testów',
    capacity,
    nightlyRateMinor,
    equipment: ['Wi-Fi'],
    active: true,
  });
  expect(result.status, JSON.stringify(result.body)).toBe(201);
  return result.body;
}
function booking(roomId: string, extra: Record<string, unknown> = {}) {
  return {
    roomId,
    checkIn: day(20),
    checkOut: day(23),
    guests: 2,
    expectedTotalMinor: 75000,
    guest: { name: 'Jan Testowy', email: 'jan@example.test', phone: '+48123456789' },
    guestNames: ['Jan Testowy', 'Anna Testowa'],
    ...extra,
  };
}
async function create(agent: any, body: any, key = randomUUID()) {
  return write(agent, 'post', '/reservations', body, { 'Idempotency-Key': key });
}
async function key(
  partner: string,
  scopes = [
    'catalog:read',
    'reservations:create',
    'reservations:read',
    'reservations:update',
    'reservations:cancel',
  ],
) {
  const result = await write(admin, 'post', '/admin/api-keys', {
    name: `Test ${partner}`,
    partner,
    scopes,
  });
  expect(result.status, JSON.stringify(result.body)).toBe(201);
  return result.body;
}

async function independentApi() {
  const script = `import { createApp } from './backend/src/app.ts'; import { db } from './backend/src/db.ts';
const server=createApp().listen(0,'127.0.0.1',()=>console.log(server.address().port));
process.on('SIGTERM',()=>server.close(()=>{db.close();process.exit(0)}));`;
  const child = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const origin = await new Promise<string>((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    child.stderr.on('data', (value) => {
      stderr += value.toString();
    });
    child.stdout.on('data', (value) => {
      stdout += value.toString();
      if (/^\d+\s*$/.test(stdout)) resolve(`http://127.0.0.1:${stdout.trim()}`);
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code) reject(new Error(`Proces testowy zakończył się ${code}: ${stderr}`));
    });
  });
  return {
    origin,
    close: () =>
      new Promise<void>((resolve) => {
        child.once('exit', () => resolve());
        child.kill('SIGTERM');
      }),
  };
}
const token = (result: any) => result.key ?? result.apiKey;
const partnerPost = (secret: string, body: any, idempotency = randomUUID()) =>
  request(app)
    .post('/api/v1/reservations')
    .set('X-API-Key', secret)
    .set('Idempotency-Key', idempotency)
    .send(body);

beforeAll(async () => {
  const { createApp } = await import('../src/app.js');
  database = await import('../src/db.js');
  const seed = await import('../src/seed.js');
  await seed.seed();
  app = createApp();
  admin = await login(process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD);
  customer = await register('client@example.test');
  stranger = await register('other@example.test');
  customerId = (await customer.get('/api/v1/me')).body.id;
});
afterAll(() => {
  database?.db.close();
  rmSync(directory, { recursive: true, force: true });
});

describe('Konta i ochrona dostępu', () => {
  it('T-01: odrzuca powtórzony e-mail niezależnie od wielkości liter', async () => {
    const response = await write(request.agent(app), 'post', '/auth/register', {
      email: 'CLIENT@example.test',
      name: 'Inny',
      password,
    });
    expect(response.status).toBe(409);
  });
  it('T-02: rejestracja nie pozwala wybrać roli', async () => {
    const response = await write(request.agent(app), 'post', '/auth/register', {
      email: 'role@example.test',
      name: 'Próba',
      password,
      role: 'admin',
    });
    expect(response.status).toBe(400);
    expect((await customer.get('/api/v1/admin/users')).status).toBe(403);
  });
  it('T-16: zmiana bez tokena CSRF jest odrzucana', async () => {
    expect(
      (await customer.patch('/api/v1/me').send({ name: 'Nieautoryzowana zmiana' })).status,
    ).toBe(403);
  });
  it('T-16: nie można zablokować ani zdegradować ostatniego administratora', async () => {
    const id = (await admin.get('/api/v1/me')).body.id;
    expect((await write(admin, 'patch', `/admin/users/${id}`, { active: false })).status).toBe(409);
    expect((await write(admin, 'patch', `/admin/users/${id}`, { role: 'client' })).status).toBe(
      409,
    );
  });
  it('T-01: blokada konta unieważnia już otwartą sesję', async () => {
    const blocked = await register('blocked@example.test');
    const id = (await blocked.get('/api/v1/me')).body.id;
    expect((await write(admin, 'patch', `/admin/users/${id}`, { active: false })).status).toBe(200);
    expect((await blocked.get('/api/v1/me')).status).toBe(401);
    expect(
      (
        await write(request.agent(app), 'post', '/auth/login', {
          email: 'blocked@example.test',
          password,
        })
      ).status,
    ).toBe(401);
  });
  it('Zmiana hasła unieważnia pozostałe sesje', async () => {
    const first = await register('password@example.test');
    const second = await login('password@example.test');
    const result = await write(first, 'post', '/me/change-password', {
      currentPassword: password,
      newPassword: 'Different-password-2026',
    });
    expect(result.status, JSON.stringify(result.body)).toBe(200);
    expect((await second.get('/api/v1/me')).status).toBe(401);
    await login('password@example.test', 'Different-password-2026');
  });
});

describe('Rezerwacja i wycena', () => {
  it('T-03: odrzuca nieistniejącą datę, przeszłość, złą kolejność i zbyt wiele osób', async () => {
    const r = await room(2);
    for (const change of [
      { checkIn: '2027-02-30', checkOut: '2027-03-03' },
      { checkIn: day(-2), checkOut: day(1) },
      { checkIn: day(23), checkOut: day(20) },
      { guests: 3, guestNames: ['A', 'B', 'C'] },
      { guests: 2, guestNames: ['Jan'] },
    ]) {
      const result = await create(customer, booking(r.id, change));
      expect([400, 409], JSON.stringify(result.body)).toContain(result.status);
    }
  });
  it('T-04: równoczesne próby nie rezerwują tego samego pokoju dwa razy', async () => {
    const r = await room();
    const csrf = (await customer.get('/api/v1/auth/csrf')).body.csrfToken;
    const calls = Array.from({ length: 8 }, () =>
      customer
        .post('/api/v1/reservations')
        .set('X-CSRF-Token', csrf)
        .set('Idempotency-Key', randomUUID())
        .send(booking(r.id)),
    );
    const results = await Promise.all(calls);
    expect(results.filter((x) => x.status === 201)).toHaveLength(1);
    expect(results.filter((x) => x.status === 409)).toHaveLength(7);
    expect(
      database.get<any>('SELECT COUNT(*) AS count FROM reservations WHERE roomId = ?', r.id)?.count,
    ).toBe(1);
  });
  it('T-04: dwa niezależne procesy API nie zapisują podwójnego pobytu w SQLite', async () => {
    const r = await room();
    const k = await key('PROCESS_RACE');
    const one = await independentApi();
    const two = await independentApi();
    try {
      const responses = await Promise.all(
        [one, two].map((server) =>
          fetch(`${server.origin}/api/v1/reservations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': token(k),
              'Idempotency-Key': randomUUID(),
            },
            body: JSON.stringify(booking(r.id)),
          }),
        ),
      );
      expect(responses.map((x) => x.status).sort()).toEqual([201, 409]);
      expect(
        database.get<any>('SELECT COUNT(*) AS count FROM reservations WHERE roomId=?', r.id)?.count,
      ).toBe(1);
    } finally {
      await Promise.all([one.close(), two.close()]);
    }
  });
  it('T-05: wyjazd i przyjazd kolejnego gościa w tym samym dniu są dozwolone', async () => {
    const r = await room();
    expect((await create(customer, booking(r.id))).status).toBe(201);
    expect(
      (await create(customer, booking(r.id, { checkIn: day(23), checkOut: day(26) }))).status,
    ).toBe(201);
    const unavailable = await customer
      .get('/api/v1/availability')
      .query({ checkIn: day(21), checkOut: day(22), guests: 2 });
    expect(unavailable.status).toBe(200);
    expect(unavailable.body.items.some((x: any) => x.id === r.id)).toBe(false);
  });
  it('T-06/T-12: zachowuje cenę i dodatki z chwili rezerwacji', async () => {
    const r = await room();
    const p = await write(admin, 'post', '/admin/packages', {
      name: 'Pakiet testowy',
      description: 'Nocleg i relaks',
      priceMinor: 15000,
      active: true,
      items: [{ name: 'Masaż', partner: 'A', offerId: 'massage-relax', quantity: 1 }],
    });
    expect(p.status, JSON.stringify(p.body)).toBe(201);
    const created = await create(
      customer,
      booking(r.id, { packageId: p.body.id, expectedTotalMinor: 90000 }),
    );
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    expect(created.body.pricing.totalMinor).toBe(90000);
    await write(admin, 'patch', `/admin/rooms/${r.id}`, { nightlyRateMinor: 40000 });
    await write(admin, 'patch', `/admin/packages/${p.body.id}`, {
      priceMinor: 50000,
      active: false,
    });
    const old = await customer.get(`/api/v1/reservations/${created.body.id}`);
    expect(old.body.pricing.totalMinor).toBe(90000);
    expect(old.body.items).toHaveLength(1);
    const later = await create(
      customer,
      booking(r.id, {
        checkIn: day(30),
        checkOut: day(33),
        packageId: p.body.id,
        expectedTotalMinor: 170000,
      }),
    );
    expect([400, 404, 409]).toContain(later.status);
  });
  it('T-07: odrzuca zmianę na zajęty termin, starą wersję i niezaakceptowaną cenę', async () => {
    const r = await room();
    const current = await create(customer, booking(r.id));
    await create(customer, booking(r.id, { checkIn: day(30), checkOut: day(33) }));
    const patch = {
      checkIn: day(25),
      checkOut: day(28),
      guests: 2,
      expectedTotalMinor: 75000,
      expectedVersion: 1,
    };
    for (const changes of [
      { expectedVersion: 99 },
      { expectedTotalMinor: 1 },
      { checkIn: day(30), checkOut: day(33) },
    ]) {
      const result = await write(customer, 'patch', `/reservations/${current.body.id}`, {
        ...patch,
        ...changes,
      });
      expect(result.status, JSON.stringify(result.body)).toBe(409);
    }
    const unchanged = await customer.get(`/api/v1/reservations/${current.body.id}`);
    expect(unchanged.body.checkIn).toBe(day(20));
    expect(unchanged.body.version).toBe(1);
    const result = await write(customer, 'patch', `/reservations/${current.body.id}`, patch);
    expect(result.status, JSON.stringify(result.body)).toBe(200);
    expect(result.body.version).toBe(2);
    const forbidden = await write(customer, 'patch', `/reservations/${current.body.id}`, {
      ...patch,
      expectedVersion: 2,
      status: 'completed',
    });
    expect(forbidden.status).toBe(400);
  });
  it('T-08: inny klient nie może odczytać, zmienić ani anulować rezerwacji', async () => {
    const r = await room();
    const created = await create(customer, booking(r.id));
    const url = `/reservations/${created.body.id}`;
    expect((await stranger.get(`/api/v1${url}`)).status).toBe(404);
    expect((await write(stranger, 'post', `${url}/cancel`)).status).toBe(404);
    expect(
      (
        await write(stranger, 'patch', url, {
          checkIn: day(25),
          checkOut: day(28),
          guests: 2,
          expectedVersion: 1,
          expectedTotalMinor: 75000,
        })
      ).status,
    ).toBe(404);
    const listing = await stranger.get('/api/v1/reservations');
    expect(listing.body.items.some((x: any) => x.id === created.body.id)).toBe(false);
  });
  it('T-09: powtórzenie POST ma jeden skutek i wymaga identycznej treści', async () => {
    const r = await room();
    const body = booking(r.id);
    const idempotency = randomUUID();
    const first = await create(customer, body, idempotency);
    const repeated = await create(customer, body, idempotency);
    expect(first.status).toBe(201);
    expect([200, 201]).toContain(repeated.status);
    expect(repeated.body.id).toBe(first.body.id);
    expect((await create(customer, { ...body, checkOut: day(24) }, idempotency)).status).toBe(409);
    expect(
      database.get<any>('SELECT COUNT(*) AS count FROM reservations WHERE roomId = ?', r.id)?.count,
    ).toBe(1);
  });
  it('Anulowanie jest idempotentne i zwalnia pokój', async () => {
    const r = await room();
    const created = await create(customer, booking(r.id));
    for (let i = 0; i < 2; i++)
      expect(
        (await write(customer, 'post', `/reservations/${created.body.id}/cancel`)).status,
      ).toBe(200);
    expect((await create(stranger, booking(r.id))).status).toBe(201);
  });
  it('T-11: obsługa pobytu wymaga personelu i właściwej kolejności statusów', async () => {
    const r = await room();
    const created = await create(customer, booking(r.id));
    const url = `/reservations/${created.body.id}`;
    expect((await write(customer, 'post', `${url}/check-in`)).status).toBe(403);
    expect((await write(admin, 'post', `${url}/check-out`)).status).toBe(409);
    expect((await write(admin, 'post', `${url}/check-in`)).status).toBe(200);
    expect((await write(admin, 'post', `${url}/check-in`)).status).toBe(409);
    expect((await write(admin, 'post', `${url}/check-out`)).status).toBe(200);
    expect((await write(admin, 'post', `${url}/cancel`)).status).toBe(409);
  });
});

describe('API innych grup', () => {
  it('T-08/T-10: zakresy, właściciel i wyłączenie klucza są sprawdzane przy każdym żądaniu', async () => {
    const first = await key('D');
    const second = await key('OTHER');
    const r = await room();
    const created = await partnerPost(token(first), booking(r.id));
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    expect(
      (
        await request(app)
          .get(`/api/v1/reservations/${created.body.id}`)
          .set('X-API-Key', token(second))
      ).status,
    ).toBe(404);
    const noScope = await key('LIMITED', []);
    expect((await request(app).get('/api/v1/rooms').set('X-API-Key', token(noScope))).status).toBe(
      403,
    );
    expect(
      (await request(app).get('/api/v1/rooms').set('X-API-Key', 'unknown-secret')).status,
    ).toBe(401);
    await write(admin, 'patch', `/admin/api-keys/${first.id}`, { scopes: ['catalog:read'] });
    expect(
      (
        await request(app)
          .get(`/api/v1/reservations/${created.body.id}`)
          .set('X-API-Key', token(first))
      ).status,
    ).toBe(403);
    await write(admin, 'patch', `/admin/api-keys/${first.id}`, { active: false });
    expect((await request(app).get('/api/v1/rooms').set('X-API-Key', token(first))).status).toBe(
      401,
    );
  });
  it('Rotacja klucza tego samego partnera zachowuje dostęp do jego rezerwacji', async () => {
    const first = await key('ROTATION');
    const r = await room();
    const created = await partnerPost(token(first), booking(r.id));
    const rotated = await key('ROTATION');
    expect(
      (
        await request(app)
          .get(`/api/v1/reservations/${created.body.id}`)
          .set('X-API-Key', token(rotated))
      ).status,
    ).toBe(200);
  });
  it('Partner nie może nadawać właściciela ani statusu rezerwacji', async () => {
    const k = await key('STRICT');
    const r = await room();
    expect(
      (await partnerPost(token(k), booking(r.id, { userId: customerId, status: 'completed' })))
        .status,
    ).toBe(400);
    const missingKey = await request(app)
      .post('/api/v1/reservations')
      .set('X-API-Key', token(k))
      .send(booking(r.id));
    expect(missingKey.status).toBe(400);
  });
  it('T-18: ponowienie zasilenia bazy nie usuwa rezerwacji', async () => {
    const count = database.get<any>('SELECT COUNT(*) AS count FROM reservations')!.count;
    const { seed } = await import('../src/seed.js');
    await seed();
    expect(database.get<any>('SELECT COUNT(*) AS count FROM reservations')!.count).toBe(count);
  });
});
