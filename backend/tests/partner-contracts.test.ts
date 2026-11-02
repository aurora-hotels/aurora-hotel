import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const directory = mkdtempSync(path.join(tmpdir(), 'aurora-contracts-'));
process.env.DATABASE_PATH = path.join(directory, 'contracts.sqlite');
process.env.NODE_ENV = 'test';
process.env.CONFIG_ENCRYPTION_KEY = 'd'.repeat(64);
process.env.ALLOWED_PARTNER_HOSTS = '127.0.0.1';
process.env.ALLOW_PRIVATE_PARTNER_HOSTS = '127.0.0.1';
let adapter: typeof import('../src/integrations/adapters.js');
let services: typeof import('../src/integrations/services.js');
let store: typeof import('../src/integrations/store.js');
let database: typeof import('../src/db.js');
let server: Server;
const received: {
  method: string;
  url: string;
  body: Record<string, unknown> | null;
  authorization: string | undefined;
}[] = [];
let handler: (request: (typeof received)[number]) => unknown;
beforeAll(async () => {
  adapter = await import('../src/integrations/adapters.js');
  services = await import('../src/integrations/services.js');
  store = await import('../src/integrations/store.js');
  database = await import('../src/db.js');
  store.initIntegrations();
  server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const request = {
      method: req.method!,
      url: req.url!,
      body: chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null,
      authorization: req.headers.authorization,
    };
    received.push(request);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(handler(request)));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  database.run(
    "UPDATE integrations SET mode='real',baseUrl=?,secret=?,authHeader='Authorization' WHERE partner IN ('B','D')",
    `http://127.0.0.1:${port}/api/v1`,
    store.protect('contract-token'),
  );
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  database.db.close();
  rmSync(directory, { recursive: true, force: true });
});
const startsAt = '2031-06-15T15:00:00+02:00',
  endsAt = '2031-06-15T16:00:00+02:00';
const voucher = {
  reference: 'contract-voucher',
  componentId: 'hotel-contract',
  provider: 'C' as const,
  reservationId: 'stay-contract',
  checkIn: '2031-06-15',
  checkOut: '2031-06-17',
};
const checked = {
  valid: true,
  provider: 'C',
  kind: 'hotel',
  componentId: voucher.componentId,
  used: false,
  reservationId: null,
  validFrom: '2031-01-01',
  validUntil: '2031-12-31',
  reference: voucher.reference,
};

describe('Proponowany kontrakt B/D przez prawdziwe HTTP do serwera testowego', () => {
  it('B pobiera katalog i dostępność spod prefiksu API', async () => {
    handler = (request) =>
      request.url.includes('/offers')
        ? { items: [{ id: 'B-PERSONAL', name: 'Trening indywidualny', durationMinutes: 60 }] }
        : { items: [{ offerId: 'B-PERSONAL', startsAt, endsAt, available: true }] };
    expect((await adapter.catalog('B')).items[0].id).toBe('B-PERSONAL');
    expect(
      (await adapter.availability('B', 'B-PERSONAL', startsAt, endsAt)).items[0].available,
    ).toBe(true);
    const request = received.at(-1)!;
    const url = new URL(request.url, 'http://example.test');
    expect(url.pathname).toBe('/api/v1/availability');
    expect(url.searchParams.get('startsAt')).toBe(startsAt);
    expect(url.searchParams.get('endsAt')).toBe(endsAt);
    expect(url.searchParams.get('offerId')).toBe('B-PERSONAL');
    expect(request.authorization).toBe('Bearer contract-token');
  });
  it('B przyjmuje referencję vouchera i osobny identyfikator anulowania', async () => {
    const body = {
      operationId: 'book-contract',
      reservationId: 'stay-contract',
      offerId: 'B-PERSONAL',
      guestName: 'Jan Testowy',
      startsAt,
      endsAt,
      voucherReference: voucher.reference,
    };
    handler = (request) => ({
      id: 'fitness-contract',
      operationId: request.body!.operationId,
      status: request.url.endsWith('/cancel') ? 'cancelled' : 'confirmed',
      startsAt,
      endsAt,
    });
    const created = await adapter.createBooking('B', body);
    expect(created.status).toBe('confirmed');
    expect(received.at(-1)).toMatchObject({ method: 'POST', url: '/api/v1/bookings', body });
    expect((await adapter.cancelBooking('B', created.id, 'cancel-contract')).status).toBe(
      'cancelled',
    );
    expect(received.at(-1)).toMatchObject({
      method: 'POST',
      url: '/api/v1/bookings/fitness-contract/cancel',
      body: { operationId: 'cancel-contract' },
    });
  });
  it('D weryfikuje hotelową część i daty, bez żądania jej wykonania', async () => {
    handler = () => checked;
    expect(await adapter.checkVoucher(voucher)).toEqual(checked);
    expect(received.at(-1)).toMatchObject({
      method: 'POST',
      url: '/api/v1/vouchers/check',
      body: voucher,
    });
  });
  it('D valid=true nie omija kontroli usługodawcy i rodzaju części', async () => {
    for (const changed of [{ provider: 'A' }, { kind: 'massage' }]) {
      handler = () => ({ ...checked, ...changed });
      await expect(
        services.verifyVoucherBeforeCreate(
          {
            voucherReference: voucher.reference,
            hotelComponentId: voucher.componentId,
            checkIn: voucher.checkIn,
            checkOut: voucher.checkOut,
          },
          voucher.reservationId,
        ),
      ).rejects.toMatchObject({ code: 'VOUCHER_INVALID' });
    }
  });
  it('D wykonanie oraz odczyt operacji używają tylko części hotelu C', async () => {
    const body = {
      reference: voucher.reference,
      componentId: voucher.componentId,
      provider: 'C' as const,
      reservationId: voucher.reservationId,
      operationId: 'completion-contract',
    };
    const completed = {
      status: 'reported',
      operationId: body.operationId,
      componentId: body.componentId,
      provider: 'C',
      reservationId: body.reservationId,
    };
    handler = () => completed;
    expect(await adapter.completeVoucher(body)).toEqual(completed);
    expect(received.at(-1)).toMatchObject({
      method: 'POST',
      url: '/api/v1/vouchers/complete',
      body,
    });
    expect(await adapter.completionStatus(body.operationId)).toEqual(completed);
    expect(received.at(-1)).toMatchObject({
      method: 'GET',
      url: '/api/v1/operations/completion-contract',
      body: null,
    });
  });
});
