import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import http from 'node:http';
import https from 'node:https';
import { config } from '../config.js';
import { reveal } from './store.js';
import { IntegrationError, type Integration } from './types.js';

// Dozwolony host sprawdzamy ponownie przed każdym połączeniem. Wynik DNS jest
// przypięty do requestu, dzięki czemu druga odpowiedź DNS nie zmieni celu.
export function validateBaseUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new IntegrationError(400, 'INVALID_PARTNER_URL', 'Podaj pełny adres HTTP lub HTTPS.');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new IntegrationError(
      400,
      'INVALID_PARTNER_URL',
      'Adres integracji nie może zawierać loginu, hasła, query ani fragmentu.',
    );
  if (!config.allowedPartnerHosts.map((x) => x.toLowerCase()).includes(host))
    throw new IntegrationError(
      400,
      'PARTNER_HOST_DENIED',
      'Host nie jest wpisany do ALLOWED_PARTNER_HOSTS.',
    );
  return url;
}
function isPrivate(address: string): boolean {
  if (isIP(address) === 6) {
    const a = address.toLowerCase();
    if (a.startsWith('::ffff:')) return true;
    return a === '::' || a === '::1' || /^(fc|fd|fe[89ab]|ff)/.test(a) || a.startsWith('2001:db8:');
  }
  const [a = 0, b = 0] = address.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19))
  );
}
export async function requestJson(
  connection: Integration,
  path: string,
  method: 'GET' | 'POST',
  body?: unknown,
): Promise<unknown> {
  const base = validateBaseUrl(connection.baseUrl);
  const url = new URL(`${base.pathname.replace(/\/$/, '')}${path}`, base.origin);
  const host = base.hostname.replace(/^\[|\]$/g, '');
  const localAllowed = (process.env.ALLOW_PRIVATE_PARTNER_HOSTS || '')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .includes(host.toLowerCase());
  const addresses = isIP(host)
    ? [{ address: host, family: isIP(host) }]
    : await lookup(host, { all: true }).catch(() => {
        throw new IntegrationError(
          503,
          'PARTNER_UNAVAILABLE',
          'Nie udało się odnaleźć serwera partnera.',
        );
      });
  if (!addresses.length || addresses.some((x) => isPrivate(x.address) && !localAllowed))
    throw new IntegrationError(
      400,
      'PRIVATE_ADDRESS_DENIED',
      'Adres prywatny wymaga jawnego wpisu w ALLOW_PRIVATE_PARTNER_HOSTS.',
    );
  if (base.protocol !== 'https:' && !localAllowed)
    throw new IntegrationError(
      400,
      'HTTPS_REQUIRED',
      'Poza lokalnym symulatorem wymagane jest HTTPS.',
    );
  const pinned = addresses[0]!;
  const payload = body === undefined ? undefined : JSON.stringify(body);
  return new Promise((resolve, reject) => {
    let done = false;
    let timer: ReturnType<typeof setTimeout>;
    const finish = (error?: Error, value?: unknown) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(value);
    };
    const headers: Record<string, string | number> = { Accept: 'application/json' };
    if (connection.secret) headers[connection.authHeader] = reveal(connection.secret);
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = (url.protocol === 'https:' ? https : http).request(
      url,
      {
        method,
        headers,
        lookup: (_host, options, callback) =>
          options.all ? callback(null, [pinned]) : callback(null, pinned.address, pinned.family),
      },
      (res) => {
        const status = res.statusCode || 503;
        // Nie podążamy za przekierowaniem: mogłoby przekazać sekret innemu hostowi.
        if (status < 200 || status >= 300) {
          res.resume();
          const uncertain = method !== 'GET' && status >= 500;
          finish(
            new IntegrationError(
              status === 404 ? 404 : 503,
              status === 404 ? 'PARTNER_NOT_FOUND' : 'PARTNER_RESPONSE_ERROR',
              'Partner nie potwierdził operacji.',
              uncertain,
            ),
          );
          return;
        }
        const chunks: Buffer[] = [];
        let bytes = 0;
        res.on('data', (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > 1_000_000) {
            finish(
              new IntegrationError(
                503,
                'PARTNER_INVALID_RESPONSE',
                'Odpowiedź partnera jest za duża.',
                method !== 'GET',
              ),
            );
            req.destroy();
          } else chunks.push(chunk);
        });
        res.on('end', () => {
          try {
            finish(undefined, JSON.parse(Buffer.concat(chunks).toString('utf8')));
          } catch {
            finish(
              new IntegrationError(
                503,
                'PARTNER_INVALID_RESPONSE',
                'Partner zwrócił niepoprawny JSON.',
                method !== 'GET',
              ),
            );
          }
        });
        res.on('error', () =>
          finish(
            new IntegrationError(
              503,
              'PARTNER_UNAVAILABLE',
              'Połączenie z partnerem zostało przerwane.',
              method !== 'GET',
            ),
          ),
        );
      },
    );
    timer = setTimeout(() => {
      finish(
        new IntegrationError(
          503,
          'PARTNER_TIMEOUT',
          'Partner nie odpowiedział w wyznaczonym czasie.',
          method !== 'GET',
        ),
      );
      req.destroy();
    }, connection.timeoutMs);
    req.on('error', () =>
      finish(
        new IntegrationError(
          503,
          'PARTNER_UNAVAILABLE',
          'Nie udało się połączyć z partnerem.',
          method !== 'GET',
        ),
      ),
    );
    if (payload) req.write(payload);
    req.end();
  });
}
