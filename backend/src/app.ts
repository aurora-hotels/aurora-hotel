import express, { type Request, type Response, type NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { errorHandler, AppError } from './errors.js';
import { sessionMiddleware, csrfProtection, rateLimit } from './security.js';
import { authRouter } from './auth.js';
import { hotelRouter } from './hotel.js';
import { adminRouter } from './admin.js';
import { initIntegrations, integrationRouter, authenticateApiKey } from './integrations/index.js';
import { initServiceTokens, internalRouter } from './internal.js';

export function createApp() {
  initIntegrations();
  initServiceTokens();
  const app = express();
  app.disable('x-powered-by');
  // Bez tego za reverse proxy wszyscy użytkownicy mieliby jeden adres IP i wspólny limit żądań.
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'same-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
    });
    if (config.cookieSecure)
      res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use(
    '/api/v1',
    express.json({ limit: '64kb' }),
    rateLimit(config.publicLimit),
    sessionMiddleware,
    (req, _res, next) => {
      const authorization = req.get('Authorization');
      const apiKey = req.get('X-API-Key');
      if (authorization && !authorization.startsWith('Bearer '))
        return next(
          new AppError(401, 'INVALID_AUTHORIZATION', 'Użyj nagłówka Authorization: Bearer.'),
        );
      if (apiKey && authorization)
        return next(new AppError(400, 'AMBIGUOUS_AUTH', 'Podaj jeden klucz API.'));
      const raw = apiKey || authorization?.slice(7);
      if ((apiKey !== undefined || authorization !== undefined) && !raw)
        return next(new AppError(401, 'INVALID_API_KEY', 'Niepoprawny lub wyłączony klucz API.'));
      if (raw) {
        if (req.actor)
          return next(
            new AppError(403, 'AMBIGUOUS_AUTH', 'Użyj sesji użytkownika albo klucza API.'),
          );
        try {
          const actor = authenticateApiKey(raw);
          req.actor = {
            type: 'partner',
            id: actor.id,
            name: actor.name,
            scopes: actor.scopes,
            keyId: actor.keyId,
          };
        } catch (error) {
          return next(error);
        }
      }
      next();
    },
    csrfProtection,
    (req, res, next) => {
      res.set('Cache-Control', 'no-store');
      next();
    },
    authRouter,
    hotelRouter,
    adminRouter,
    integrationRouter,
  );
  // API usług technicznych hotelu (W-01–W-05). Nie korzysta z sesji ani z CSRF.
  app.use('/internal/v1', internalRouter);
  app.use('/internal', (_req, _res, next) =>
    next(new AppError(404, 'NOT_FOUND', 'Nie znaleziono takiej operacji wewnętrznej.')),
  );
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const openapi = path.join(root, 'docs/openapi.yaml');
  app.get('/api/openapi.yaml', (_req, res, next) =>
    existsSync(openapi) ? res.type('application/yaml').sendFile(openapi) : next(),
  );
  app.use(
    '/api/docs',
    (_req: Request, res: Response, next: NextFunction) => {
      res.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
      );
      next();
    },
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      swaggerOptions: { url: '/api/openapi.yaml', persistAuthorization: false },
      customSiteTitle: 'API Aurora Hotels',
    }),
  );
  app.use('/api', (_req, _res, next) =>
    next(new AppError(404, 'NOT_FOUND', 'Nie znaleziono takiej operacji API.')),
  );
  const frontend = path.join(root, 'frontend/dist');
  if (existsSync(path.join(frontend, 'index.html'))) {
    app.use(express.static(frontend));
    app.get('/{*splat}', (_req, res) => res.sendFile(path.join(frontend, 'index.html')));
  }
  app.use((_req, _res, next) => next(new AppError(404, 'NOT_FOUND', 'Nie znaleziono strony.')));
  app.use(errorHandler);
  return app;
}
