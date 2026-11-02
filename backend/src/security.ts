import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
  createHash,
  createHmac,
  createCipheriv,
  createDecipheriv,
} from 'node:crypto';
import type { Request, Response, RequestHandler } from 'express';
import { config } from './config.js';
import { get, run } from './db.js';
import { AppError, assert } from './errors.js';

export type Role = 'client' | 'receptionist' | 'admin';
export interface Actor {
  type: 'user' | 'partner';
  id: string;
  name: string;
  role?: Role;
  scopes?: string[];
  keyId?: string;
}
export interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  phone: string;
  role: Role;
  active: number;
  mustChangePassword: number;
  createdAt: string;
}
export interface SessionRow {
  id: string;
  userId: string | null;
  csrfToken: string;
  expiresAt: string;
}
declare global {
  namespace Express {
    interface Request {
      actor?: Actor;
      session?: SessionRow;
      currentUser?: UserRow;
    }
  }
}
export const COOKIE_NAME = 'aurora_session';
export const now = () => new Date().toISOString();
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password: string, hash: string) {
  const [salt, value] = hash.split(':');
  if (!salt || !value) return false;
  const result = scryptSync(password, salt, 64);
  const expected = Buffer.from(value, 'hex');
  return expected.length === result.length && timingSafeEqual(expected, result);
}
export function safeUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    active: !!user.active,
    mustChangePassword: !!user.mustChangePassword,
    createdAt: user.createdAt,
  };
}
const key = createHash('sha256').update(config.encryptionKey).digest();
export function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  return [
    iv.toString('base64url'),
    cipher.update(value, 'utf8').toString('base64url') + cipher.final().toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
  ].join('.');
}
export function decrypt(value: string) {
  const [iv, content, tag] = value.split('.');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(content, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
const sessionHash = (token: string) =>
  createHmac('sha256', config.sessionSecret).update(token).digest('hex');
export function createSession(res: Response, userId: string | null): SessionRow {
  const token = randomBytes(32).toString('base64url');
  const session = {
    id: sessionHash(token),
    userId,
    csrfToken: randomBytes(24).toString('base64url'),
    expiresAt: new Date(Date.now() + config.sessionHours * 3600000).toISOString(),
  };
  run(
    'INSERT INTO sessions(id,userId,csrfToken,expiresAt) VALUES(?,?,?,?)',
    session.id,
    userId,
    session.csrfToken,
    session.expiresAt,
  );
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    path: '/',
    maxAge: config.sessionHours * 3600000,
  });
  return session;
}
export function destroySession(req: Request, res: Response) {
  if (req.session) run('DELETE FROM sessions WHERE id=?', req.session.id);
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    path: '/',
  });
}
export const sessionMiddleware: RequestHandler = (req, _res, next) => {
  const raw = (req.headers.cookie || '')
    .split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
  if (raw && /^[a-zA-Z0-9_-]{43}$/.test(raw)) {
    const session = get<SessionRow>(
      'SELECT * FROM sessions WHERE id=? AND expiresAt>?',
      sessionHash(raw),
      now(),
    );
    if (session) {
      req.session = session;
      if (session.userId) {
        const user = get<UserRow>('SELECT * FROM users WHERE id=? AND active=1', session.userId);
        if (user) {
          req.currentUser = user;
          req.actor = { type: 'user', id: user.id, name: user.name, role: user.role };
        }
      }
    }
  }
  next();
};
export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.actor?.type === 'partner')
    return next();
  const token = req.get('X-CSRF-Token');
  if (!req.session || !token || token !== req.session.csrfToken)
    return next(new AppError(403, 'CSRF_INVALID', 'Odśwież formularz i spróbuj ponownie.'));
  const origin = req.get('Origin');
  if (origin && origin !== config.appOrigin)
    return next(new AppError(403, 'ORIGIN_INVALID', 'Żądanie pochodzi z niedozwolonej strony.'));
  next();
};
export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.actor) return next(new AppError(401, 'AUTH_REQUIRED', 'Zaloguj się, aby kontynuować.'));
  if (
    req.currentUser?.mustChangePassword &&
    !(
      req.path === '/auth/logout' ||
      req.path === '/auth/change-password' ||
      req.path === '/me/change-password' ||
      (req.path === '/me' && req.method === 'GET')
    )
  )
    return next(
      new AppError(403, 'PASSWORD_CHANGE_REQUIRED', 'Ustaw własne hasło przed kontynuowaniem.'),
    );
  next();
};
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, res, next) =>
    requireAuth(req, res, (error) => {
      if (error) return next(error);
      if (req.actor?.type !== 'user' || !req.actor.role || !roles.includes(req.actor.role))
        return next(new AppError(403, 'FORBIDDEN', 'Brak uprawnień do tej operacji.'));
      next();
    });
}
export function requireScope(scope: string): RequestHandler {
  return (req, res, next) =>
    requireAuth(req, res, (error) => {
      if (error) return next(error);
      if (req.actor?.type === 'partner' && !req.actor.scopes?.includes(scope))
        return next(new AppError(403, 'SCOPE_REQUIRED', 'Klucz nie ma wymaganego uprawnienia.'));
      next();
    });
}
export const isStaff = (actor: Actor) =>
  actor.type === 'user' && ['receptionist', 'admin'].includes(actor.role || '');
export function audit(
  actor: Actor,
  action: string,
  entityId: string,
  details: Record<string, unknown> = {},
) {
  run(
    'INSERT INTO audit_events(id,actorType,actorId,actorName,action,entityId,details,createdAt) VALUES(?,?,?,?,?,?,?,?)',
    randomUUID(),
    actor.type,
    actor.id,
    actor.name,
    action,
    entityId,
    JSON.stringify(details),
    now(),
  );
}
export function rateLimit(limit: number, windowMs = 60000): RequestHandler {
  const windows = new Map<string, { count: number; reset: number }>();
  return (req, res, next) => {
    const current = Date.now();
    const ip = req.ip || 'unknown';
    if (windows.size > 10000)
      for (const [key, entry] of windows) if (entry.reset <= current) windows.delete(key);
    let entry = windows.get(ip);
    if (!entry || entry.reset <= current) {
      entry = { count: 0, reset: current + windowMs };
      windows.set(ip, entry);
    }
    if (++entry.count > limit) {
      res.set('Retry-After', String(Math.ceil((entry.reset - current) / 1000)));
      return next(new AppError(429, 'RATE_LIMITED', 'Za dużo prób. Spróbuj ponownie za chwilę.'));
    }
    next();
  };
}
