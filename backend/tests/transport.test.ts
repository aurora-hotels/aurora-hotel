import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Integration } from '../src/integrations/types.js';

const directory = mkdtempSync(path.join(tmpdir(), 'aurora-http-'));
process.env.DATABASE_PATH = path.join(directory, 'http.sqlite');
process.env.NODE_ENV = 'test';
process.env.COOKIE_SECURE = 'false';
process.env.CONFIG_ENCRYPTION_KEY = 'b'.repeat(64);
process.env.ALLOWED_PARTNER_HOSTS = 'localhost,127.0.0.1';
process.env.ALLOW_PRIVATE_PARTNER_HOSTS = 'localhost,127.0.0.1';
let server: Server;
let port: number;
let transport: typeof import('../src/integrations/transport.js');
let store: typeof import('../src/integrations/store.js');
let db: typeof import('../src/db.js');
let redirectedCalls = 0;
const connection = (host = '127.0.0.1', extra: Partial<Integration> = {}): Integration => ({
  partner: 'A',
  mode: 'real',
  enabled: 1,
  baseUrl: `http://${host}:${port}/api`,
  secret: '',
  timeoutMs: 500,
  authHeader: 'X-API-Key',
  demoScenario: 'normal',
  lastTestAt: null,
  lastTestResult: null,
  ...extra,
});
beforeAll(async () => {
  transport = await import('../src/integrations/transport.js');
  store = await import('../src/integrations/store.js');
  db = await import('../src/db.js');
  server = createServer((req, res) => {
    if (req.url === '/api/redirect') {
      res.writeHead(302, { Location: `http://127.0.0.1:${port}/stolen` });
      res.end();
      return;
    }
    if (req.url === '/stolen') {
      redirectedCalls++;
      res.end('{}');
      return;
    }
    if (req.url === '/api/timeout') return;
    if (req.url === '/api/bad-json') {
      res.end('<html>Przerwa techniczna</html>');
      return;
    }
    if (req.url === '/api/unavailable') {
      res.writeHead(503);
      res.end('{}');
      return;
    }
    const chunks: Buffer[] = [];
    req.on('data', (x) => chunks.push(x));
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          ok: true,
          path: req.url,
          method: req.method,
          key: req.headers['x-api-key'],
          body: chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null,
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '::', resolve));
  port = (server.address() as { port: number }).port;
});
afterAll(async () => {
  server?.closeAllConnections();
  await new Promise<void>((resolve) => server?.close(() => resolve()));
  db?.db.close();
  rmSync(directory, { recursive: true, force: true });
});
describe('Rzeczywisty transport HTTP do lokalnego partnera kontraktowego', () => {
  it.each(['127.0.0.1', 'localhost'])(
    'przesyła JSON i zaszyfrowany klucz przez %s',
    async (host) => {
      const result = await transport.requestJson(
        connection(host, { secret: store.protect('test-partner-secret') }),
        '/echo',
        'POST',
        { operationId: 'test-operation' },
      );
      expect(result).toEqual({
        ok: true,
        path: '/api/echo',
        method: 'POST',
        key: 'test-partner-secret',
        body: { operationId: 'test-operation' },
      });
    },
  );
  it('nie przekazuje sekretu przez przekierowanie', async () => {
    await expect(
      transport.requestJson(
        connection('127.0.0.1', { secret: store.protect('private-token') }),
        '/redirect',
        'GET',
      ),
    ).rejects.toMatchObject({ code: 'PARTNER_RESPONSE_ERROR' });
    expect(redirectedCalls).toBe(0);
  });
  it('błędny JSON po zapisie oznacza nieznany wynik operacji', async () => {
    await expect(
      transport.requestJson(connection(), '/bad-json', 'POST', {}),
    ).rejects.toMatchObject({ code: 'PARTNER_INVALID_RESPONSE', uncertain: true });
  });
  it('timeout zapisu zachowuje informację o niepewnym wyniku', async () => {
    await expect(
      transport.requestJson(connection('127.0.0.1', { timeoutMs: 40 }), '/timeout', 'POST', {}),
    ).rejects.toMatchObject({ code: 'PARTNER_TIMEOUT', uncertain: true });
  });
  it('niedostępność odczytu nie jest niepewnym zapisem', async () => {
    await expect(transport.requestJson(connection(), '/unavailable', 'GET')).rejects.toMatchObject({
      code: 'PARTNER_RESPONSE_ERROR',
      uncertain: false,
    });
  });
  it('odrzuca nieuzgodnione hosty i dane logowania w URL', () => {
    for (const url of [
      'http://169.254.169.254/latest/meta-data',
      'https://example.invalid/api',
      'http://user:pass@localhost/api',
      'file:///etc/passwd',
      'http://localhost/api?token=secret',
    ]) {
      expect(() => transport.validateBaseUrl(url), url).toThrow();
    }
  });
  it('blokuje prywatny adres bez osobnej zgody konfiguracyjnej', async () => {
    process.env.ALLOW_PRIVATE_PARTNER_HOSTS = '';
    try {
      await expect(transport.requestJson(connection(), '/echo', 'GET')).rejects.toMatchObject({
        code: 'PRIVATE_ADDRESS_DENIED',
      });
    } finally {
      process.env.ALLOW_PRIVATE_PARTNER_HOSTS = 'localhost,127.0.0.1';
    }
  });
});
