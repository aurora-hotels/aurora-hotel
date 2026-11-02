import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { all, get, run, transaction } from './db.js';
import { assert } from './errors.js';
import { audit, hashPassword, now, requireRole, safeUser, type UserRow } from './security.js';
import { emailSchema, nameSchema, passwordSchema, phoneSchema } from './auth.js';
import { packageView, roomView, pageQuery, type Room, type Package } from './hotel.js';
export const adminRouter = Router();
adminRouter.use('/admin', requireRole('admin'));
const roomSchema = z
  .object({
    number: z.string().trim().min(1).max(20),
    type: z.string().trim().min(2).max(80),
    description: z.string().trim().max(2000).default(''),
    capacity: z.number().int().min(1).max(30),
    nightlyRateMinor: z.number().int().min(0).max(100000000),
    equipment: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
    active: z.boolean().default(true),
  })
  .strict();
const itemSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    partner: z.enum(['HOTEL', 'A', 'B']),
    offerId: z.string().trim().max(100).default(''),
    quantity: z.number().int().min(1).max(30),
  })
  .strict()
  .refine((x) => x.partner === 'HOTEL' || x.offerId.length > 0, {
    path: ['offerId'],
    message: 'Usługa partnera wymaga identyfikatora oferty.',
  });
const packageSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(2000).default(''),
    priceMinor: z.number().int().min(0).max(100000000),
    active: z.boolean().default(true),
    items: z.array(itemSchema).max(30).default([]),
  })
  .strict()
  .refine((x) => x.items.reduce((sum, item) => sum + item.quantity, 0) <= 100, {
    path: ['items'],
    message: 'Pakiet może zawierać łącznie do 100 usług.',
  });
adminRouter.get('/admin/rooms', (req, res) => {
  const { page, pageSize, offset } = pageQuery(req.query);
  res.json({
    items: all<Room>('SELECT * FROM rooms ORDER BY number LIMIT ? OFFSET ?', pageSize, offset).map(
      roomView,
    ),
    total: get<{ n: number }>('SELECT COUNT(*) n FROM rooms')!.n,
    page,
    pageSize,
  });
});
adminRouter.post('/admin/rooms', (req, res) => {
  const body = roomSchema.parse(req.body);
  const id = randomUUID();
  transaction(() => {
    run(
      'INSERT INTO rooms(id,number,type,description,capacity,nightlyRateMinor,equipment,active) VALUES(?,?,?,?,?,?,?,?)',
      id,
      body.number,
      body.type,
      body.description,
      body.capacity,
      body.nightlyRateMinor,
      JSON.stringify(body.equipment),
      Number(body.active),
    );
    audit(req.actor!, 'room.created', id);
  });
  res.status(201).json(roomView(get<Room>('SELECT * FROM rooms WHERE id=?', id)!));
});
adminRouter.patch('/admin/rooms/:id', (req, res) => {
  const row = get<Room>('SELECT * FROM rooms WHERE id=?', String(req.params.id));
  assert(row, 404, 'ROOM_NOT_FOUND', 'Nie znaleziono pokoju.');
  const parsed = roomSchema.partial().parse(req.body);
  const patch = Object.fromEntries(
    Object.entries(parsed).filter(([key]) => Object.hasOwn(req.body, key)),
  );
  const { id: _id, ...existing } = roomView(row);
  const body = roomSchema.parse({ ...existing, ...patch });
  // Zmiana pojemności nie może unieważnić już potwierdzonych pobytów.
  transaction(() => {
    assert(
      !get(
        "SELECT id FROM reservations WHERE roomId=? AND status IN ('confirmed','checked_in') AND guests>?",
        row.id,
        body.capacity,
      ),
      409,
      'CAPACITY_IN_USE',
      'Ten pokój ma już rezerwację dla większej liczby gości.',
    );
    run(
      'UPDATE rooms SET number=?,type=?,description=?,capacity=?,nightlyRateMinor=?,equipment=?,active=? WHERE id=?',
      body.number,
      body.type,
      body.description,
      body.capacity,
      body.nightlyRateMinor,
      JSON.stringify(body.equipment),
      Number(body.active),
      row.id,
    );
    audit(req.actor!, 'room.updated', row.id);
  });
  res.json(roomView(get<Room>('SELECT * FROM rooms WHERE id=?', row.id)!));
});
adminRouter.get('/admin/packages', (req, res) => {
  const { page, pageSize, offset } = pageQuery(req.query);
  res.json({
    items: all<Package>(
      'SELECT * FROM packages ORDER BY name LIMIT ? OFFSET ?',
      pageSize,
      offset,
    ).map(packageView),
    total: get<{ n: number }>('SELECT COUNT(*) n FROM packages')!.n,
    page,
    pageSize,
  });
});
function saveItems(id: string, items: z.infer<typeof itemSchema>[]) {
  run('DELETE FROM package_items WHERE packageId=?', id);
  for (const item of items)
    run(
      'INSERT INTO package_items(id,packageId,name,partner,offerId,quantity) VALUES(?,?,?,?,?,?)',
      randomUUID(),
      id,
      item.name,
      item.partner,
      item.offerId,
      item.quantity,
    );
}
adminRouter.post('/admin/packages', (req, res) => {
  const body = packageSchema.parse(req.body);
  const id = randomUUID();
  transaction(() => {
    run(
      'INSERT INTO packages(id,name,description,priceMinor,active) VALUES(?,?,?,?,?)',
      id,
      body.name,
      body.description,
      body.priceMinor,
      Number(body.active),
    );
    saveItems(id, body.items);
    audit(req.actor!, 'package.created', id);
  });
  res.status(201).json(packageView(get<Package>('SELECT * FROM packages WHERE id=?', id)!));
});
adminRouter.patch('/admin/packages/:id', (req, res) => {
  const row = get<Package>('SELECT * FROM packages WHERE id=?', String(req.params.id));
  assert(row, 404, 'PACKAGE_NOT_FOUND', 'Nie znaleziono pakietu.');
  const existing = packageView(row);
  const input = {
    name: existing.name,
    description: existing.description,
    priceMinor: existing.priceMinor,
    active: existing.active,
    items: existing.items.map(({ id: _, ...item }) => item),
    ...req.body,
  };
  const body = packageSchema.parse(input);
  transaction(() => {
    run(
      'UPDATE packages SET name=?,description=?,priceMinor=?,active=? WHERE id=?',
      body.name,
      body.description,
      body.priceMinor,
      Number(body.active),
      row.id,
    );
    saveItems(row.id, body.items);
    audit(req.actor!, 'package.updated', row.id);
  });
  res.json(packageView(get<Package>('SELECT * FROM packages WHERE id=?', row.id)!));
});
adminRouter.get('/admin/users', (req, res) => {
  const { page, pageSize, offset } = pageQuery(req.query);
  res.json({
    items: all<UserRow>(
      'SELECT * FROM users ORDER BY createdAt DESC LIMIT ? OFFSET ?',
      pageSize,
      offset,
    ).map(safeUser),
    total: get<{ n: number }>('SELECT COUNT(*) n FROM users')!.n,
    page,
    pageSize,
  });
});
adminRouter.post('/admin/users', (req, res) => {
  const body = z
    .object({
      name: nameSchema,
      email: emailSchema,
      phone: phoneSchema.default(''),
      password: passwordSchema,
      role: z.enum(['client', 'receptionist', 'admin']),
    })
    .strict()
    .parse(req.body);
  const id = randomUUID();
  transaction(() => {
    run(
      'INSERT INTO users(id,email,passwordHash,name,phone,role,mustChangePassword,createdAt) VALUES(?,?,?,?,?,?,?,?)',
      id,
      body.email,
      hashPassword(body.password),
      body.name,
      body.phone,
      body.role,
      1,
      now(),
    );
    audit(req.actor!, 'user.created', id, { role: body.role });
  });
  res.status(201).json(safeUser(get<UserRow>('SELECT * FROM users WHERE id=?', id)!));
});
adminRouter.patch('/admin/users/:id', (req, res) => {
  const patch = z
    .object({
      name: nameSchema.optional(),
      phone: phoneSchema.optional(),
      role: z.enum(['client', 'receptionist', 'admin']).optional(),
      active: z.boolean().optional(),
    })
    .strict()
    .refine((x) => Object.keys(x).length > 0)
    .parse(req.body);
  const value = transaction(() => {
    const row = get<UserRow>('SELECT * FROM users WHERE id=?', String(req.params.id));
    assert(row, 404, 'USER_NOT_FOUND', 'Nie znaleziono użytkownika.');
    const role = patch.role ?? row.role;
    const active = patch.active ?? !!row.active;
    if (row.role === 'admin' && row.active && (role !== 'admin' || !active))
      assert(
        get<{ n: number }>("SELECT COUNT(*) n FROM users WHERE role='admin' AND active=1")!.n > 1,
        409,
        'LAST_ADMIN',
        'Musi pozostać co najmniej jeden aktywny administrator.',
      );
    run(
      'UPDATE users SET name=?,phone=?,role=?,active=? WHERE id=?',
      patch.name ?? row.name,
      patch.phone ?? row.phone,
      role,
      Number(active),
      row.id,
    );
    if (!active || role !== row.role) run('DELETE FROM sessions WHERE userId=?', row.id);
    audit(req.actor!, 'user.updated', row.id, { role, active });
    return safeUser(get<UserRow>('SELECT * FROM users WHERE id=?', row.id)!);
  });
  res.json(value);
});
adminRouter.post('/admin/users/:id/reset-password', (req, res) => {
  const body = z.object({ temporaryPassword: passwordSchema }).strict().parse(req.body);
  const id = String(req.params.id);
  assert(
    get('SELECT id FROM users WHERE id=?', id),
    404,
    'USER_NOT_FOUND',
    'Nie znaleziono użytkownika.',
  );
  transaction(() => {
    run(
      'UPDATE users SET passwordHash=?,mustChangePassword=1 WHERE id=?',
      hashPassword(body.temporaryPassword),
      id,
    );
    run('DELETE FROM sessions WHERE userId=?', id);
    audit(req.actor!, 'user.password_reset', id);
  });
  res.json(safeUser(get<UserRow>('SELECT * FROM users WHERE id=?', id)!));
});
adminRouter.get('/admin/hotel-settings', (_req, res) =>
  res.json(get('SELECT * FROM hotel_settings WHERE id=1')),
);
adminRouter.patch('/admin/hotel-settings', (req, res) => {
  const body = z
    .object({
      hotelName: z.string().trim().min(2).max(120).optional(),
      checkInTime: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .optional(),
      checkOutTime: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .optional(),
    })
    .strict()
    .refine((x) => Object.keys(x).length > 0)
    .parse(req.body);
  const row = get('SELECT * FROM hotel_settings WHERE id=1')!;
  transaction(() => {
    run(
      'UPDATE hotel_settings SET hotelName=?,checkInTime=?,checkOutTime=? WHERE id=1',
      body.hotelName ?? row.hotelName,
      body.checkInTime ?? row.checkInTime,
      body.checkOutTime ?? row.checkOutTime,
    );
    audit(req.actor!, 'hotel.settings_updated', '1');
  });
  res.json(get('SELECT * FROM hotel_settings WHERE id=1'));
});
adminRouter.get(['/admin/audit-events', '/admin/audit'], (req, res) => {
  const { page, pageSize, offset } = pageQuery(req.query);
  const where: string[] = [];
  const params: string[] = [];
  for (const name of ['action', 'entityId', 'actorId'] as const)
    if (req.query[name]) {
      where.push(`${name}=?`);
      params.push(z.string().max(150).parse(req.query[name]));
    }
  if (req.query.from) {
    where.push('createdAt>=?');
    params.push(z.iso.datetime().parse(req.query.from));
  }
  if (req.query.to) {
    where.push('createdAt<=?');
    params.push(z.iso.datetime().parse(req.query.to));
  }
  const clause = where.length ? ' WHERE ' + where.join(' AND ') : '';
  res.json({
    items: all(
      `SELECT * FROM audit_events${clause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
      ...params,
      pageSize,
      offset,
    ).map((row) => ({ ...row, details: JSON.parse(row.details) })),
    total: get<{ n: number }>(`SELECT COUNT(*) n FROM audit_events${clause}`, ...params)!.n,
    page,
    pageSize,
  });
});
