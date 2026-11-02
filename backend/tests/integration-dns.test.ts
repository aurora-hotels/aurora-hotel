import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Integration } from '../src/integrations/types.js';

const lookupMock = vi.hoisted(() => vi.fn());
vi.mock('node:dns/promises', () => ({ lookup: lookupMock }));
const directory = mkdtempSync(path.join(tmpdir(), 'aurora-dns-'));
process.env.DATABASE_PATH = path.join(directory, 'dns.sqlite');
process.env.NODE_ENV = 'test';
process.env.CONFIG_ENCRYPTION_KEY = 'c'.repeat(64);
process.env.ALLOWED_PARTNER_HOSTS = 'localhost';
process.env.ALLOW_PRIVATE_PARTNER_HOSTS = 'localhost';
let server: Server;
let transport: typeof import('../src/integrations/transport.js');
let store: typeof import('../src/integrations/store.js');
let database: typeof import('../src/db.js');
let calls = 0;
let port: number;
const connection = (timeoutMs = 100): Integration => ({
  partner: 'A',
  mode: 'real',
  enabled: 1,
  baseUrl: `http://localhost:${port}`,
  secret: '',
  timeoutMs,
  authHeader: 'X-API-Key',
  demoScenario: 'normal',
  lastTestAt: null,
  lastTestResult: null,
});
beforeAll(async () => {
  transport = await import('../src/integrations/transport.js');
  store = await import('../src/integrations/store.js');
  database = await import('../src/db.js');
  server = createServer((req, res) => {
    calls++;
    if (req.url === '/wait') return;
    if (req.url === '/redirect') {
      res.writeHead(303, { Location: '/result' });
      res.end();
      return;
    }
    res.end(JSON.stringify({ authorization: req.headers.authorization }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = (server.address() as { port: number }).port;
});
afterEach(() => {
  vi.useRealTimers();
  lookupMock.mockReset();
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  database.db.close();
  rmSync(directory, { recursive: true, force: true });
});
describe('Wspólny budżet DNS i HTTP', () => {
  it('przerywa wiszący DNS bez wysyłania żądania i bez niepewnej mutacji', async () => {
    vi.useFakeTimers();
    lookupMock.mockImplementation(() => new Promise(() => {}));
    const before = calls;
    const pending = transport.requestJson(connection(100), '/bookings', 'POST', {});
    const assertion = expect(pending).rejects.toMatchObject({
      code: 'PARTNER_TIMEOUT',
      uncertain: false,
    });
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
    expect(calls).toBe(before);
  });
  it('DNS zużywa część wspólnego limitu zamiast otrzymywać dodatkowy czas', async () => {
    vi.useFakeTimers();
    lookupMock.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve([{ address: '127.0.0.1', family: 4 }]), 80),
        ),
    );
    const pending = transport.requestJson(connection(100), '/wait', 'POST', {});
    const assertion = expect(pending).rejects.toMatchObject({
      code: 'PARTNER_TIMEOUT',
      uncertain: true,
    });
    await vi.advanceTimersByTimeAsync(80);
    await vi.advanceTimersByTimeAsync(20);
    await assertion;
  });
  it('przekierowanie po zapisie pozostaje niepewne zamiast otwierać drogę do duplikatu', async () => {
    lookupMock.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
    const before = calls;
    await expect(
      transport.requestJson(connection(1000), '/redirect', 'POST', {
        operationId: 'redirect-operation',
      }),
    ).rejects.toMatchObject({ code: 'PARTNER_RESPONSE_ERROR', uncertain: true });
    expect(calls).toBe(before + 1);
  });
  it.each(['test-token', 'Bearer test-token'])(
    'wysyła pojedynczy prefix Bearer dla %s',
    async (secret) => {
      lookupMock.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);
      const result = await transport.requestJson(
        { ...connection(1000), authHeader: 'Authorization', secret: store.protect(secret) },
        '/headers',
        'GET',
      );
      expect(result).toEqual({ authorization: 'Bearer test-token' });
    },
  );
});
