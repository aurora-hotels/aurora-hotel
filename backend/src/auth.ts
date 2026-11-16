import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { config } from './config.js';
import { get, run, transaction } from './db.js';
import { assert } from './errors.js';
import {
  audit,
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
  verifyDummyPassword,
  safeUser,
  requireAuth,
  rateLimit,
  now,
  type UserRow,
} from './security.js';
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const nameSchema = z.string().trim().min(2).max(120);
export const phoneSchema = z
  .string()
  .trim()
  .max(30)
  .regex(/^[+\d\s()-]*$/);
export const passwordSchema = z.string().min(config.passwordMinLength).max(128);
export const authRouter = Router();
authRouter.get('/auth/csrf', (req, res) => {
  const session = req.session || createSession(res, null);
  res.set('Cache-Control', 'no-store').json({ csrfToken: session.csrfToken });
});
authRouter.post('/auth/register', rateLimit(config.loginLimit), (req, res) => {
  const body = z
    .object({
      email: emailSchema,
      password: passwordSchema,
      name: nameSchema,
      phone: phoneSchema.default(''),
    })
    .strict()
    .parse(req.body);
  const id = randomUUID();
  transaction(() => {
    assert(
      !get('SELECT id FROM users WHERE email=?', body.email),
      409,
      'EMAIL_TAKEN',
      'Ten adres e-mail jest już zarejestrowany.',
    );
    run(
      'INSERT INTO users(id,email,passwordHash,name,phone,role,createdAt) VALUES(?,?,?,?,?,?,?)',
      id,
      body.email,
      hashPassword(body.password),
      body.name,
      body.phone,
      'client',
      now(),
    );
    if (req.session) run('DELETE FROM sessions WHERE id=?', req.session.id);
  });
  const session = createSession(res, id);
  const user = get<UserRow>('SELECT * FROM users WHERE id=?', id)!;
  audit({ type: 'user', id, name: user.name, role: user.role }, 'user.registered', id);
  res.status(201).json({ ...safeUser(user), csrfToken: session.csrfToken });
});
authRouter.post('/auth/login', rateLimit(config.loginLimit), (req, res) => {
  const body = z
    .object({ email: emailSchema, password: z.string().min(1).max(128) })
    .strict()
    .parse(req.body);
  const user = get<UserRow>('SELECT * FROM users WHERE email=?', body.email);
  if (!user) verifyDummyPassword(body.password);
  // Ta sama odpowiedź dla złego hasła i zablokowanego konta.
  assert(
    user && verifyPassword(body.password, user.passwordHash) && user.active,
    401,
    'INVALID_CREDENTIALS',
    'Niepoprawny e-mail lub hasło, albo konto jest nieaktywne.',
  );
  if (req.session) run('DELETE FROM sessions WHERE id=?', req.session.id);
  const session = createSession(res, user.id);
  audit({ type: 'user', id: user.id, name: user.name, role: user.role }, 'user.logged_in', user.id);
  res.json({ ...safeUser(user), csrfToken: session.csrfToken });
});
authRouter.post('/auth/logout', (req, res) => {
  destroySession(req, res);
  res.status(204).end();
});
authRouter.get('/me', requireAuth, (req, res) => {
  assert(req.currentUser, 403, 'USER_REQUIRED', 'Ta operacja wymaga konta użytkownika.');
  res.json(safeUser(req.currentUser));
});
authRouter.patch('/me', requireAuth, (req, res) => {
  assert(req.currentUser, 403, 'USER_REQUIRED', 'Ta operacja wymaga konta użytkownika.');
  const body = z
    .object({
      name: nameSchema.optional(),
      phone: phoneSchema.optional(),
      email: emailSchema.optional(),
      currentPassword: z.string().min(1).max(128).optional(),
    })
    .strict()
    .refine((x) => x.name !== undefined || x.phone !== undefined || x.email !== undefined)
    .parse(req.body);
  const user = req.currentUser;
  const emailChanged = body.email !== undefined && body.email !== user.email;
  // E-mail jest loginem, więc jego zmianę potwierdzamy hasłem jak zmianę hasła.
  if (emailChanged) {
    assert(
      body.currentPassword,
      400,
      'PASSWORD_REQUIRED',
      'Podaj obecne hasło, żeby zmienić adres e-mail.',
      { currentPassword: 'Wymagane przy zmianie adresu e-mail.' },
    );
    assert(
      verifyPassword(body.currentPassword, user.passwordHash),
      400,
      'PASSWORD_INVALID',
      'Obecne hasło jest niepoprawne.',
    );
  }
  transaction(() => {
    assert(
      !emailChanged || !get('SELECT id FROM users WHERE email=? AND id<>?', body.email!, user.id),
      409,
      'EMAIL_TAKEN',
      'Ten adres e-mail jest już zarejestrowany.',
    );
    run(
      'UPDATE users SET name=?,phone=?,email=? WHERE id=?',
      body.name ?? user.name,
      body.phone ?? user.phone,
      body.email ?? user.email,
      user.id,
    );
    audit(req.actor!, 'user.profile_updated', user.id, { emailChanged });
  });
  res.json(safeUser(get<UserRow>('SELECT * FROM users WHERE id=?', user.id)!));
});
authRouter.post(['/me/change-password', '/auth/change-password'], requireAuth, (req, res) => {
  assert(req.currentUser, 403, 'USER_REQUIRED', 'Ta operacja wymaga konta użytkownika.');
  const body = z
    .object({ currentPassword: z.string().min(1).max(128), newPassword: passwordSchema })
    .strict()
    .parse(req.body);
  assert(
    verifyPassword(body.currentPassword, req.currentUser.passwordHash),
    400,
    'PASSWORD_INVALID',
    'Obecne hasło jest niepoprawne.',
  );
  assert(
    body.currentPassword !== body.newPassword,
    400,
    'PASSWORD_UNCHANGED',
    'Nowe hasło musi być inne niż dotychczasowe.',
  );
  transaction(() => {
    run(
      'UPDATE users SET passwordHash=?,mustChangePassword=0 WHERE id=?',
      hashPassword(body.newPassword),
      req.actor!.id,
    );
    run('DELETE FROM sessions WHERE userId=?', req.actor!.id);
    audit(req.actor!, 'user.password_changed', req.actor!.id);
  });
  const session = createSession(res, req.actor!.id);
  res.json({ csrfToken: session.csrfToken });
});
