import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Każde uruchomienie korzysta z osobnej bazy testowej.
const directory = mkdtempSync(path.join(tmpdir(), 'aurora-security-'));
process.env.DATABASE_PATH = path.join(directory, 'audit.sqlite');
process.env.NODE_ENV = 'test';
process.env.ADMIN_EMAIL = 'audit-admin@example.test';
process.env.ADMIN_PASSWORD = 'Audit-admin-password-2026';
process.env.LOGIN_RATE_LIMIT = '1000';
process.env.PUBLIC_RATE_LIMIT = '10000';
process.env.CONFIG_ENCRYPTION_KEY = 'ac'.repeat(32);
let app: any;
let admin: any;
let database: typeof import('../src/db.js');
const password = 'Audit-customer-password-2026';

async function write(
  agent: any,
  method: 'post' | 'patch',
  endpoint: string,
  body: unknown = {},
  headers: Record<string, string> = {},
) {
  const csrf = await agent.get('/api/v1/auth/csrf');
  let call = agent[method](`/api/v1${endpoint}`).set('X-CSRF-Token', csrf.body.csrfToken);
  for (const [key, value] of Object.entries(headers)) call = call.set(key, value);
  return call.send(body);
}
async function login(email: string, value = password) {
  const agent = request.agent(app);
  const result = await write(agent, 'post', '/auth/login', { email, password: value });
  expect(result.status, JSON.stringify(result.body)).toBe(200);
  return { agent, result };
}
async function customer(email: string) {
  const agent = request.agent(app);
  const result = await write(agent, 'post', '/auth/register', {
    email,
    password,
    name: 'Gość Audytowy',
  });
  expect(result.status, JSON.stringify(result.body)).toBe(201);
  const logged = await login(email);
  return { ...logged, id: result.body.id };
}
function expectNoPrivateData(value: unknown, secrets: string[] = []) {
  const serialized = JSON.stringify(value);
  for (const field of ['passwordHash', 'keyHash', 'csrfSecret', 'sessionSecret', 'encryptionKey'])
    expect(serialized).not.toContain(field);
  for (const secret of secrets) expect(serialized).not.toContain(secret);
}

beforeAll(async () => {
  const { createApp } = await import('../src/app.js');
  database = await import('../src/db.js');
  const { seed } = await import('../src/seed.js');
  await seed();
  app = createApp();
  admin = (await login(process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD)).agent;
});
afterAll(() => {
  database?.db.close();
  rmSync(directory, { recursive: true, force: true });
});

describe('Hasła i sesje', () => {
  it('przechowuje skrót hasła, a publiczne odpowiedzi go nie ujawniają', async () => {
    const user = await customer('hash-audit@example.test');
    const stored = database.get<any>('SELECT * FROM users WHERE id=?', user.id);
    expect(stored.passwordHash).not.toBe(password);
    expect(stored.passwordHash).not.toContain(password);
    const profile = await user.agent.get('/api/v1/me');
    const listing = await admin.get('/api/v1/admin/users');
    expectNoPrivateData(profile.body, [password, stored.passwordHash]);
    expectNoPrivateData(listing.body, [password, stored.passwordHash]);
    expectNoPrivateData(user.result.body, [password, stored.passwordHash]);
  });

  it('chroni cookie przed JavaScriptem i wymienia sesję przy logowaniu', async () => {
    const email = 'rotation-audit@example.test';
    await customer(email);
    const agent = request.agent(app);
    const anonymous = await agent.get('/api/v1/auth/csrf');
    const anonymousCookies = anonymous.headers['set-cookie'] as unknown as string[];
    const anonymousCookie = anonymousCookies
      .find((value) => value.startsWith('aurora_session='))!
      .split(';')[0];
    const logged = await agent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', anonymous.body.csrfToken)
      .send({ email, password });
    expect(logged.status).toBe(200);
    const authenticatedCookies = logged.headers['set-cookie'] as unknown as string[];
    const authenticatedCookie = authenticatedCookies.find((value) =>
      value.startsWith('aurora_session='),
    )!;
    expect(authenticatedCookie).toMatch(/HttpOnly/i);
    expect(authenticatedCookie).toMatch(/SameSite=Lax/i);
    expect(authenticatedCookie.split(';')[0]).not.toBe(anonymousCookie);
    expect(logged.body.csrfToken).not.toBe(anonymous.body.csrfToken);
    expect((await request(app).get('/api/v1/me').set('Cookie', anonymousCookie)).status).toBe(401);
    const rawToken = authenticatedCookie.split(';')[0].slice('aurora_session='.length);
    expect(database.get('SELECT id FROM sessions WHERE id=?', rawToken)).toBeUndefined();
  });

  it('odrzuca token CSRF innej sesji i obce Origin także przy poprawnym tokenie', async () => {
    const first = await customer('csrf-one@example.test');
    const second = await customer('csrf-two@example.test');
    const foreign = await second.agent.get('/api/v1/auth/csrf');
    const wrongSession = await first.agent
      .patch('/api/v1/me')
      .set('X-CSRF-Token', foreign.body.csrfToken)
      .send({ name: 'Zmienione dane' });
    expect(wrongSession.status).toBe(403);
    const wrongOrigin = await write(
      first.agent,
      'patch',
      '/me',
      { name: 'Zmienione dane' },
      { Origin: 'https://untrusted.example.test' },
    );
    expect(wrongOrigin.status).toBe(403);
    expect((await first.agent.get('/api/v1/me')).body.name).toBe('Gość Audytowy');
    expect((await first.agent.post('/api/v1/auth/logout').send({})).status).toBe(403);
    expect((await first.agent.get('/api/v1/me')).status).toBe(200);
  });

  it('nie przyjmuje roli ani blokady konta przy edycji własnego profilu', async () => {
    const user = await customer('profile-audit@example.test');
    expect((await write(user.agent, 'patch', '/me', { role: 'admin', active: true })).status).toBe(
      400,
    );
    expect((await user.agent.get('/api/v1/me')).body.role).toBe('client');
  });

  it('reset hasła kończy stare sesje i wymusza zmianę przed innymi operacjami', async () => {
    const email = 'reset-audit@example.test';
    const user = await customer(email);
    const second = await login(email);
    const temporaryPassword = 'Temporary-audit-password-2026';
    const reset = await write(admin, 'post', `/admin/users/${user.id}/reset-password`, {
      temporaryPassword,
    });
    expect(reset.status, JSON.stringify(reset.body)).toBe(200);
    expectNoPrivateData(reset.body, [temporaryPassword]);
    expect((await user.agent.get('/api/v1/me')).status).toBe(401);
    expect((await second.agent.get('/api/v1/me')).status).toBe(401);
    const temporary = await login(email, temporaryPassword);
    expect(temporary.result.body.mustChangePassword).toBe(true);
    expect((await temporary.agent.get('/api/v1/me')).status).toBe(200);
    expect((await temporary.agent.get('/api/v1/reservations')).status).toBe(403);
    expect(
      (await write(temporary.agent, 'patch', '/me', { name: 'Omijanie zmiany hasła' })).status,
    ).toBe(403);
    const replacement = 'New-final-audit-password-2026';
    const changed = await write(temporary.agent, 'post', '/me/change-password', {
      currentPassword: temporaryPassword,
      newPassword: replacement,
    });
    expect(changed.status, JSON.stringify(changed.body)).toBe(200);
    expect((await temporary.agent.get('/api/v1/me')).body.mustChangePassword).toBe(false);
    expect((await temporary.agent.get('/api/v1/reservations')).status).toBe(200);
    const oldPassword = await write(request.agent(app), 'post', '/auth/login', {
      email,
      password: temporaryPassword,
    });
    expect(oldPassword.status).toBe(401);
    await login(email, replacement);
  });

  it('wygasła sesja przestaje dawać dostęp bez restartu aplikacji', async () => {
    const user = await customer('expired-audit@example.test');
    database.run(
      "UPDATE sessions SET expiresAt='2000-01-01T00:00:00.000Z' WHERE userId=?",
      user.id,
    );
    expect((await user.agent.get('/api/v1/me')).status).toBe(401);
  });
});

describe('Dostęp do API i ochrona kluczy', () => {
  it('nie miesza uprawnień cookie administratora z kluczem partnera', async () => {
    const created = await write(admin, 'post', '/admin/api-keys', {
      name: 'Audyt ograniczonego klucza',
      partner: 'AUDIT',
      scopes: ['catalog:read'],
    });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    const secret = created.body.key ?? created.body.apiKey;
    expect(typeof secret).toBe('string');
    const mixed = await admin
      .patch('/api/v1/me')
      .set('X-API-Key', secret)
      .send({ name: 'CSRF bypass' });
    expect([401, 403], JSON.stringify(mixed.body)).toContain(mixed.status);
    const invalid = await admin
      .get('/api/v1/admin/users')
      .set('X-API-Key', 'invalid-key-must-not-fall-back');
    expect([401, 403]).toContain(invalid.status);
    expect((await request(app).get('/api/v1/admin/users').set('X-API-Key', secret)).status).toBe(
      403,
    );
    expect((await request(app).get('/api/v1/me').set('X-API-Key', secret)).status).toBe(403);
    const keys = await admin.get('/api/v1/admin/api-keys');
    expect(keys.status).toBe(200);
    expectNoPrivateData(keys.body, [secret]);
    const audit = await admin.get('/api/v1/admin/audit-events');
    expect(audit.status).toBe(200);
    expectNoPrivateData(audit.body, [secret, password, 'Temporary-audit-password-2026']);
  });

  it('błędny JSON daje stały komunikat bez stosu, sekretu i tekstu żądania', async () => {
    const agent = request.agent(app);
    const csrf = await agent.get('/api/v1/auth/csrf');
    const sentSecret = 'Do-not-echo-JSON-secret-2026';
    const result = await agent
      .post('/api/v1/auth/login')
      .set('X-CSRF-Token', csrf.body.csrfToken)
      .set('Content-Type', 'application/json')
      .send(`{"password":"${sentSecret}",`);
    expect(result.status).toBe(400);
    expect(result.body.error.code).toBe('INVALID_JSON');
    expect(JSON.stringify(result.body)).not.toContain(sentSecret);
    expect(JSON.stringify(result.body)).not.toMatch(/SyntaxError|node_modules|at JSON.parse/);
  });
});

describe('Zakończony pobyt i zapisane składniki pakietu', () => {
  it('zakończony pobyt nadal blokuje swój przedział, a zmiana pakietu nie zmienia kupionych dodatków', async () => {
    const { randomUUID } = await import('node:crypto');
    const user = await customer('snapshot-audit@example.test');
    const room = await write(admin, 'post', '/admin/rooms', {
      number: 'AUDIT-101',
      type: 'Pokój audytowy',
      capacity: 2,
      nightlyRateMinor: 10000,
      equipment: [],
      active: true,
    });
    expect(room.status).toBe(201);
    const pack = await write(admin, 'post', '/admin/packages', {
      name: 'Pakiet pierwotny',
      description: '',
      priceMinor: 5000,
      active: true,
      items: [{ name: 'Masaż pierwotny', partner: 'A', offerId: 'A-MASSAGE', quantity: 2 }],
    });
    expect(pack.status).toBe(201);
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + 100);
    const checkIn = date.toISOString().slice(0, 10);
    date.setUTCDate(date.getUTCDate() + 2);
    const checkOut = date.toISOString().slice(0, 10);
    const body = {
      roomId: room.body.id,
      packageId: pack.body.id,
      checkIn,
      checkOut,
      guests: 2,
      expectedTotalMinor: 25000,
      guest: { name: 'Gość Audytowy', email: 'snapshot-audit@example.test', phone: '' },
      guestNames: ['Gość Audytowy', 'Drugi Gość'],
    };
    const created = await write(user.agent, 'post', '/reservations', body, {
      'Idempotency-Key': randomUUID(),
    });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    const originalItems = created.body.items;
    expect(originalItems).toHaveLength(2);
    const changed = await write(admin, 'patch', `/admin/packages/${pack.body.id}`, {
      name: 'Nowy pakiet',
      priceMinor: 7000,
      items: [{ name: 'Nowa joga', partner: 'B', offerId: 'B-YOGA', quantity: 1 }],
    });
    expect(changed.status, JSON.stringify(changed.body)).toBe(200);
    const details = await user.agent.get(`/api/v1/reservations/${created.body.id}`);
    expect(details.body.items).toEqual(originalItems);
    expect(details.body.pricing.totalMinor).toBe(25000);
    const endpoint = `/reservations/${created.body.id}`;
    expect((await write(admin, 'post', `${endpoint}/check-in`)).status).toBe(200);
    expect((await write(admin, 'post', `${endpoint}/check-out`)).status).toBe(200);
    const retry = await write(
      user.agent,
      'post',
      '/reservations',
      { ...body, expectedTotalMinor: 27000 },
      { 'Idempotency-Key': randomUUID() },
    );
    expect(retry.status, JSON.stringify(retry.body)).toBe(409);
    expect(retry.body.error.code).toBe('ROOM_UNAVAILABLE');
  });
});

describe('Blokada SQLite z drugiego połączenia', () => {
  it('zwraca 503 bez częściowego zapisu i pozwala bezpiecznie ponowić żądanie', async () => {
    const { DatabaseSync } = await import('node:sqlite');
    const { randomUUID } = await import('node:crypto');
    const user = await customer('locked-db@example.test');
    const room = await write(admin, 'post', '/admin/rooms', {
      number: 'LOCK-101',
      type: 'Pokój blokady',
      capacity: 1,
      nightlyRateMinor: 10000,
    });
    expect(room.status).toBe(201);
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + 120);
    const checkIn = date.toISOString().slice(0, 10);
    date.setUTCDate(date.getUTCDate() + 1);
    const checkOut = date.toISOString().slice(0, 10);
    const body = {
      roomId: room.body.id,
      checkIn,
      checkOut,
      guests: 1,
      expectedTotalMinor: 10000,
      guest: { name: 'Gość Audytowy', email: 'locked-db@example.test', phone: '' },
      guestNames: ['Gość Audytowy'],
    };
    const requestKey = randomUUID();
    const csrf = (await user.agent.get('/api/v1/auth/csrf')).body.csrfToken;
    const competingConnection = new DatabaseSync(process.env.DATABASE_PATH!);
    competingConnection.exec('BEGIN IMMEDIATE');
    try {
      const blocked = await user.agent
        .post('/api/v1/reservations')
        .set('X-CSRF-Token', csrf)
        .set('Idempotency-Key', requestKey)
        .send(body);
      expect(blocked.status, JSON.stringify(blocked.body)).toBe(503);
      expect(blocked.body.error.code).toBe('DATABASE_BUSY');
      expect(
        database.get<any>('SELECT COUNT(*) count FROM reservations WHERE roomId=?', room.body.id)
          ?.count,
      ).toBe(0);
      expect(
        database.get<any>(
          'SELECT COUNT(*) count FROM idempotency_records WHERE requestKey=?',
          requestKey,
        )?.count,
      ).toBe(0);
    } finally {
      competingConnection.exec('ROLLBACK');
      competingConnection.close();
    }
    const repeated = await write(user.agent, 'post', '/reservations', body, {
      'Idempotency-Key': requestKey,
    });
    expect(repeated.status, JSON.stringify(repeated.body)).toBe(201);
    expect(
      database.get<any>('SELECT COUNT(*) count FROM reservations WHERE roomId=?', room.body.id)
        ?.count,
    ).toBe(1);
  });
});

describe('Klucze partnerów', () => {
  it('szyfruje klucz partnera i nie zwraca go z konfiguracji ani historii', async () => {
    const secret = 'Outbound-partner-secret-only-for-audit';
    const saved = await write(admin, 'patch', '/admin/integrations/A', { secret });
    expect(saved.status, JSON.stringify(saved.body)).toBe(200);
    expect(saved.body.hasSecret).toBe(true);
    expectNoPrivateData(saved.body, [secret]);
    const stored = database.get<any>(
      'SELECT secret FROM integrations WHERE partner=?',
      'A',
    )!.secret;
    expect(stored).not.toContain(secret);
    expect(stored).toMatch(/^enc1:/);
    const listed = await admin.get('/api/v1/admin/integrations');
    expectNoPrivateData(listed.body, [secret, stored]);
    const masked = await write(admin, 'patch', '/admin/integrations/A', {
      secret: '••••••••',
      timeoutMs: 4000,
    });
    expect(masked.status).toBe(200);
    expect(database.get<any>('SELECT secret FROM integrations WHERE partner=?', 'A')!.secret).toBe(
      stored,
    );
    const invalid = await write(admin, 'patch', '/admin/integrations/A', {
      secret: `${secret}\r\nX-Injected: yes`,
    });
    expect(invalid.status).toBe(400);
    expectNoPrivateData(invalid.body, [secret]);
    expectNoPrivateData((await admin.get('/api/v1/admin/audit-events')).body, [secret, stored]);
    expect(
      (await write(admin, 'patch', '/admin/integrations/A', { secret: '' })).body.hasSecret,
    ).toBe(false);
  });
});

describe('Błędne żądania HTTP', () => {
  it('pusty klucz nie powoduje powrotu do konta administratora ani oferty publicznej', async () => {
    expect((await request(app).get('/api/v1/rooms').set('X-API-Key', '')).status).toBe(401);
    expect((await admin.get('/api/v1/admin/users').set('X-API-Key', '')).status).toBe(401);
    expect((await request(app).get('/api/v1/rooms').set('Authorization', 'Bearer ')).status).toBe(
      401,
    );
  });

  it('zwraca 413 dla zbyt dużego JSON-a, bez jego treści w odpowiedzi', async () => {
    const marker = 'Oversize-private-payload';
    const result = await request(app)
      .post('/api/v1/auth/login')
      .send({ password: marker + 'x'.repeat(70_000) });
    expect(result.status).toBe(413);
    expect(result.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(JSON.stringify(result.body)).not.toContain(marker);
    expect(JSON.stringify(result.body)).not.toContain('PayloadTooLargeError');
  });
});
