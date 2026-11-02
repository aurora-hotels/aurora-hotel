import { Router, type RequestHandler } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { all, get, run, transaction } from './db.js';
import { config } from './config.js';
import { AppError, assert } from './errors.js';
import { emailSchema, nameSchema, phoneSchema } from './auth.js';
import {
  audit,
  encrypt,
  decrypt,
  isStaff,
  now,
  requireRole,
  requireScope,
  type Actor,
} from './security.js';
import {
  verifyVoucherBeforeCreate,
  beforeCheckIn,
  afterCheckOut,
  cancelExternalForReservation,
  assertCanChangeDates,
  assertVoucherAvailable,
  withReservationLock,
} from './integrations/index.js';

export const hotelRouter = Router();
function lockReservation(handler: RequestHandler): RequestHandler {
  return (req, res, next) =>
    withReservationLock(String(req.params.id), async () => {
      await handler(req, res, next);
    });
}
export interface Room {
  id: string;
  number: string;
  type: string;
  description: string;
  capacity: number;
  nightlyRateMinor: number;
  equipment: string;
  active: number;
}
export interface Package {
  id: string;
  name: string;
  description: string;
  priceMinor: number;
  active: number;
}
export interface Reservation {
  id: string;
  number: string;
  userId: string | null;
  partnerId: string | null;
  roomId: string;
  packageId: string | null;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestNames: string;
  status: 'confirmed' | 'checked_in' | 'completed' | 'cancelled';
  nightlyRateMinor: number;
  packagePriceMinor: number;
  totalMinor: number;
  version: number;
  fundingSource: string;
  voucherReference: string | null;
  hotelComponentId: string | null;
  createdAt: string;
  updatedAt: string;
}
export function pageQuery(query: Record<string, unknown>) {
  const page = z.coerce.number().int().min(1).max(100000).default(1).parse(query.page);
  const pageSize = z.coerce.number().int().min(1).max(100).default(20).parse(query.pageSize);
  return { page, pageSize, offset: (page - 1) * pageSize };
}
export const roomView = (room: Room) => ({
  ...room,
  active: !!room.active,
  equipment: JSON.parse(room.equipment) as string[],
});
export const packageView = (item: Package) => ({
  ...item,
  active: !!item.active,
  items: all(
    'SELECT id,name,partner,offerId,quantity FROM package_items WHERE packageId=? ORDER BY rowid',
    item.id,
  ),
});
export function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Podaj poprawną datę kalendarzową.');
export const staySchema = z.object({
  checkIn: dateSchema,
  checkOut: dateSchema,
  guests: z.number().int().min(1).max(30),
});
export function validateStay(checkIn: string, checkOut: string, allowPast = false) {
  const nights = Math.round(
    (Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86400000,
  );
  assert(
    checkIn < checkOut && nights <= config.maxStayNights,
    400,
    'DATES_INVALID',
    `Pobyt musi trwać od 1 do ${config.maxStayNights} nocy.`,
  );
  assert(
    allowPast || checkIn >= today(),
    400,
    'DATE_IN_PAST',
    'Data przyjazdu nie może być w przeszłości.',
  );
  return nights;
}
export function pricing(
  room: Room,
  packageItem: Package | undefined,
  checkIn: string,
  checkOut: string,
  allowPast = false,
) {
  const nights = validateStay(checkIn, checkOut, allowPast);
  return {
    nights,
    nightlyRateMinor: room.nightlyRateMinor,
    packagePriceMinor: packageItem?.priceMinor || 0,
    totalMinor: nights * room.nightlyRateMinor + (packageItem?.priceMinor || 0),
    currency: 'PLN',
  };
}
export function getReservationForActor(id: string, actor: Actor): Reservation {
  const row = get<Reservation>('SELECT * FROM reservations WHERE id=?', id);
  assert(
    row &&
      (isStaff(actor) ||
        (actor.type === 'user' ? row.userId === actor.id : row.partnerId === actor.id)),
    404,
    'RESERVATION_NOT_FOUND',
    'Nie znaleziono rezerwacji.',
  );
  return row;
}
export function reservationView(row: Reservation) {
  const room = get<Room>('SELECT * FROM rooms WHERE id=?', row.roomId)!;
  const packageItem = row.packageId
    ? get<Package>('SELECT * FROM packages WHERE id=?', row.packageId)
    : null;
  const nights = Math.round((Date.parse(row.checkOut) - Date.parse(row.checkIn)) / 86400000);
  return {
    id: row.id,
    number: row.number,
    userId: row.userId,
    partnerId: row.partnerId,
    roomId: row.roomId,
    packageId: row.packageId,
    room: roomView(room),
    package: packageItem ? { id: packageItem.id, name: packageItem.name } : null,
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    guests: row.guests,
    guest: { name: row.guestName, email: row.guestEmail, phone: row.guestPhone },
    guestNames: JSON.parse(row.guestNames),
    status: row.status,
    version: row.version,
    pricing: {
      nights,
      nightlyRateMinor: row.nightlyRateMinor,
      packagePriceMinor: row.packagePriceMinor,
      totalMinor: row.totalMinor,
      currency: 'PLN',
    },
    nightlyRateMinor: row.nightlyRateMinor,
    packagePriceMinor: row.packagePriceMinor,
    totalMinor: row.totalMinor,
    fundingSource: row.fundingSource,
    hasVoucher: !!row.voucherReference,
    hotelComponentId: row.hotelComponentId,
    items: all('SELECT * FROM reservation_items WHERE reservationId=? ORDER BY rowid', row.id),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
function isRoomAvailable(roomId: string, checkIn: string, checkOut: string, excludeId = '') {
  return !get(
    'SELECT id FROM reservations WHERE roomId=? AND status<>? AND checkIn<? AND checkOut>? AND id<>? LIMIT 1',
    roomId,
    'cancelled',
    checkOut,
    checkIn,
    excludeId,
  );
}
function loadOffer(roomId: string, packageId?: string | null) {
  const room = get<Room>('SELECT * FROM rooms WHERE id=? AND active=1', roomId);
  assert(room, 404, 'ROOM_NOT_FOUND', 'Nie znaleziono aktywnego pokoju.');
  const packageItem = packageId
    ? get<Package>('SELECT * FROM packages WHERE id=? AND active=1', packageId)
    : undefined;
  assert(!packageId || packageItem, 404, 'PACKAGE_NOT_FOUND', 'Nie znaleziono aktywnego pakietu.');
  return { room, packageItem };
}
function checkPrice(expected: number, actual: number) {
  assert(
    expected === actual,
    409,
    'PRICE_CHANGED',
    'Cena się zmieniła. Sprawdź nową wycenę przed zapisem.',
    { expectedTotalMinor: expected, currentTotalMinor: actual },
  );
}
function editable(row: Reservation, actor: Actor) {
  assert(
    row.status === 'confirmed',
    409,
    'INVALID_STATUS',
    'Można zmieniać tylko potwierdzony pobyt.',
  );
  assert(
    isStaff(actor) || row.checkIn > today(),
    409,
    'ARRIVAL_STARTED',
    'W dniu przyjazdu zmianę pobytu obsługuje recepcja.',
  );
}
function catalogScope(req: { actor?: Actor }) {
  assert(
    req.actor?.type !== 'partner' || req.actor.scopes?.includes('catalog:read'),
    403,
    'SCOPE_REQUIRED',
    'Klucz nie ma uprawnienia catalog:read.',
  );
}
hotelRouter.get('/rooms', (req, res) => {
  catalogScope(req);
  const page = pageQuery(req.query);
  const items = all<Room>(
    'SELECT * FROM rooms WHERE active=1 ORDER BY number LIMIT ? OFFSET ?',
    page.pageSize,
    page.offset,
  );
  res.json({
    items: items.map(roomView),
    total: get<{ n: number }>('SELECT COUNT(*) n FROM rooms WHERE active=1')!.n,
    page: page.page,
    pageSize: page.pageSize,
  });
});
hotelRouter.get('/packages', (req, res) => {
  catalogScope(req);
  const page = pageQuery(req.query);
  res.json({
    items: all<Package>(
      'SELECT * FROM packages WHERE active=1 ORDER BY name LIMIT ? OFFSET ?',
      page.pageSize,
      page.offset,
    ).map(packageView),
    total: get<{ n: number }>('SELECT COUNT(*) n FROM packages WHERE active=1')!.n,
    page: page.page,
    pageSize: page.pageSize,
  });
});
hotelRouter.get('/availability', (req, res) => {
  catalogScope(req);
  const query = z
    .object({
      checkIn: dateSchema,
      checkOut: dateSchema,
      guests: z.coerce.number().int().min(1).max(30),
      packageId: z.string().max(100).optional(),
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(1).max(100).optional(),
    })
    .strict()
    .parse(req.query);
  validateStay(query.checkIn, query.checkOut);
  const page = pageQuery(query);
  const packageItem = query.packageId
    ? get<Package>('SELECT * FROM packages WHERE id=? AND active=1', query.packageId)
    : undefined;
  assert(
    !query.packageId || packageItem,
    404,
    'PACKAGE_NOT_FOUND',
    'Nie znaleziono aktywnego pakietu.',
  );
  const rooms = all<Room>(
    'SELECT * FROM rooms r WHERE active=1 AND capacity>=? AND NOT EXISTS(SELECT 1 FROM reservations b WHERE b.roomId=r.id AND b.status<>? AND b.checkIn<? AND b.checkOut>?) ORDER BY nightlyRateMinor,number',
    query.guests,
    'cancelled',
    query.checkOut,
    query.checkIn,
  );
  res.json({
    items: rooms.slice(page.offset, page.offset + page.pageSize).map((room) => ({
      ...roomView(room),
      pricing: pricing(room, packageItem, query.checkIn, query.checkOut),
    })),
    total: rooms.length,
    page: page.page,
    pageSize: page.pageSize,
  });
});
const createSchema = staySchema
  .extend({
    roomId: z.string().min(1).max(100),
    packageId: z.string().min(1).max(100).nullable().optional(),
    expectedTotalMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    guest: z
      .object({ name: nameSchema, email: emailSchema, phone: phoneSchema.default('') })
      .strict(),
    guestNames: z.array(nameSchema).min(1).max(30),
    voucherReference: z.string().trim().min(1).max(200).optional(),
    hotelComponentId: z.string().trim().min(1).max(100).optional(),
  })
  .strict()
  .refine((x) => x.guestNames.length === x.guests, {
    path: ['guestNames'],
    message: 'Podaj imię i nazwisko każdej osoby.',
  })
  .refine((x) => !!x.voucherReference === !!x.hotelComponentId, {
    path: ['voucherReference'],
    message: 'Podaj numer vouchera i identyfikator części hotelowej.',
  });
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ':' + canonical(v))
        .join(',') +
      '}'
    );
  return JSON.stringify(value);
}
hotelRouter.post('/reservations', requireScope('reservations:create'), async (req, res) => {
  const body = createSchema.parse(req.body);
  const actor = req.actor!;
  const requestKey = z
    .string()
    .min(8)
    .max(128)
    .regex(/^[A-Za-z0-9._:-]+$/)
    .parse(req.get('Idempotency-Key'));
  const actorKey = `${actor.type}:${actor.id}`;
  const requestHash = createHash('sha256').update(canonical(body)).digest('hex');
  const replay = () => {
    const old = get<{ requestHash: string; response: string }>(
      'SELECT requestHash,response FROM idempotency_records WHERE actorKey=? AND requestKey=?',
      actorKey,
      requestKey,
    );
    if (!old) return undefined;
    assert(
      old.requestHash === requestHash,
      409,
      'IDEMPOTENCY_CONFLICT',
      'Ten klucz został już użyty z innymi danymi.',
    );
    return JSON.parse(old.response);
  };
  const prior = replay();
  if (prior) {
    res.set('Idempotency-Replayed', 'true').status(200).json(prior);
    return;
  }
  if (body.voucherReference)
    assert(
      isStaff(actor) || (actor.type === 'partner' && actor.id === 'D'),
      403,
      'VOUCHER_FORBIDDEN',
      'Voucher może powiązać recepcja lub partner D.',
    );
  validateStay(body.checkIn, body.checkOut);
  const id = randomUUID();
  await verifyVoucherBeforeCreate(body, id);
  const output = transaction(() => {
    const replayed = replay();
    if (replayed) return { value: replayed, replayed: true };
    const { room, packageItem } = loadOffer(body.roomId, body.packageId);
    assert(
      body.guests <= room.capacity,
      400,
      'CAPACITY_EXCEEDED',
      'W pokoju nie ma miejsca dla tylu osób.',
    );
    const price = pricing(room, packageItem, body.checkIn, body.checkOut);
    checkPrice(body.expectedTotalMinor, price.totalMinor);
    assert(
      isRoomAvailable(room.id, body.checkIn, body.checkOut),
      409,
      'ROOM_UNAVAILABLE',
      'Pokój jest już zajęty w wybranym terminie.',
    );
    // Dwa równoległe żądania nie mogą wykorzystać tej samej części vouchera.
    assertVoucherAvailable(body, id);
    const timestamp = now();
    run(
      'INSERT INTO reservations(id,number,userId,partnerId,roomId,packageId,checkIn,checkOut,guests,guestName,guestEmail,guestPhone,guestNames,status,nightlyRateMinor,packagePriceMinor,totalMinor,version,fundingSource,voucherReference,hotelComponentId,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      id,
      `AH-${new Date().getUTCFullYear()}-${id.slice(0, 8).toUpperCase()}`,
      actor.type === 'user' ? actor.id : null,
      actor.type === 'partner' ? actor.id : null,
      room.id,
      packageItem?.id || null,
      body.checkIn,
      body.checkOut,
      body.guests,
      body.guest.name,
      body.guest.email,
      body.guest.phone,
      JSON.stringify(body.guestNames),
      'confirmed',
      price.nightlyRateMinor,
      price.packagePriceMinor,
      price.totalMinor,
      1,
      body.voucherReference ? 'voucher' : 'direct',
      body.voucherReference ? encrypt(body.voucherReference) : null,
      body.hotelComponentId || null,
      timestamp,
      timestamp,
    );
    if (packageItem)
      for (const item of all<{ name: string; partner: string; offerId: string; quantity: number }>(
        'SELECT * FROM package_items WHERE packageId=? ORDER BY rowid',
        packageItem.id,
      ))
        for (let i = 0; i < item.quantity; i++)
          run(
            'INSERT INTO reservation_items(id,reservationId,name,partner,offerId,guestIndex,status,note) VALUES(?,?,?,?,?,?,?,?)',
            randomUUID(),
            id,
            item.name,
            item.partner,
            item.offerId,
            i % body.guests,
            'unplanned',
            '',
          );
    const value = reservationView(get<Reservation>('SELECT * FROM reservations WHERE id=?', id)!);
    run(
      'INSERT INTO idempotency_records(actorKey,requestKey,requestHash,response,createdAt) VALUES(?,?,?,?,?)',
      actorKey,
      requestKey,
      requestHash,
      JSON.stringify(value),
      timestamp,
    );
    audit(actor, 'reservation.created', id, { number: value.number, totalMinor: price.totalMinor });
    return { value, replayed: false };
  });
  if (output.replayed) res.set('Idempotency-Replayed', 'true');
  res.status(output.replayed ? 200 : 201).json(output.value);
});
hotelRouter.get('/reservations', requireScope('reservations:read'), (req, res) => {
  const actor = req.actor!;
  const page = pageQuery(req.query);
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  if (!isStaff(actor)) {
    conditions.push(actor.type === 'user' ? 'userId=?' : 'partnerId=?');
    params.push(actor.id);
  }
  if (req.query.status) {
    conditions.push('status=?');
    params.push(
      z.enum(['confirmed', 'checked_in', 'completed', 'cancelled']).parse(req.query.status),
    );
  }
  if (req.query.date) {
    const date = dateSchema.parse(req.query.date);
    conditions.push('checkIn<=? AND checkOut>=?');
    params.push(date, date);
  }
  if (req.query.search) {
    const search = z.string().max(100).parse(req.query.search);
    conditions.push('(number LIKE ? OR guestName LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
  const total = get<{ n: number }>(`SELECT COUNT(*) n FROM reservations${where}`, ...params)!.n;
  const items = all<Reservation>(
    `SELECT * FROM reservations${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
    ...params,
    page.pageSize,
    page.offset,
  ).map(reservationView);
  res.json({ items, total, page: page.page, pageSize: page.pageSize });
});
hotelRouter.get('/reservations/:id', requireScope('reservations:read'), (req, res) =>
  res.json(reservationView(getReservationForActor(String(req.params.id), req.actor!))),
);
hotelRouter.patch(
  '/reservations/:id',
  requireScope('reservations:update'),
  lockReservation(async (req, res) => {
    const body = staySchema
      .extend({
        expectedVersion: z.number().int().positive(),
        expectedTotalMinor: z.number().int().nonnegative(),
        guestNames: z.array(nameSchema).min(1).max(30).optional(),
      })
      .strict()
      .parse(req.body);
    const initial = getReservationForActor(String(req.params.id), req.actor!);
    editable(initial, req.actor!);
    assert(
      initial.version === body.expectedVersion,
      409,
      'VERSION_CONFLICT',
      'Pobyt został zmieniony. Odśwież dane.',
    );
    validateStay(body.checkIn, body.checkOut);
    assertCanChangeDates(initial.id);
    // Czekamy na zgodę D pod blokadą rezerwacji, ale poza transakcją SQLite.
    // Błąd D pozostawi stare daty pobytu.
    const voucherInput = initial.voucherReference
      ? {
          checkIn: body.checkIn,
          checkOut: body.checkOut,
          voucherReference: decrypt(initial.voucherReference),
          hotelComponentId: initial.hotelComponentId,
        }
      : undefined;
    if (voucherInput) await verifyVoucherBeforeCreate(voucherInput, initial.id);
    const output = transaction(() => {
      const row = getReservationForActor(String(req.params.id), req.actor!);
      editable(row, req.actor!);
      assert(
        row.version === body.expectedVersion,
        409,
        'VERSION_CONFLICT',
        'Pobyt został zmieniony. Odśwież dane.',
      );
      assert(
        row.voucherReference === initial.voucherReference &&
          row.hotelComponentId === initial.hotelComponentId,
        409,
        'VERSION_CONFLICT',
        'Powiązanie vouchera zostało zmienione. Odśwież dane.',
      );
      if (voucherInput) assertVoucherAvailable(voucherInput, row.id);
      assertCanChangeDates(row.id);
      const { room, packageItem } = loadOffer(row.roomId, row.packageId);
      assert(
        body.guests <= room.capacity,
        400,
        'CAPACITY_EXCEEDED',
        'W pokoju nie ma miejsca dla tylu osób.',
      );
      const names = body.guestNames || JSON.parse(row.guestNames);
      assert(
        names.length === body.guests,
        400,
        'GUEST_NAMES_INVALID',
        'Podaj imię i nazwisko każdej osoby.',
      );
      const price = pricing(room, packageItem, body.checkIn, body.checkOut);
      checkPrice(body.expectedTotalMinor, price.totalMinor);
      assert(
        isRoomAvailable(room.id, body.checkIn, body.checkOut, row.id),
        409,
        'ROOM_UNAVAILABLE',
        'Pokój jest zajęty w tym terminie.',
      );
      assert(
        !get(
          'SELECT id FROM reservation_items WHERE reservationId=? AND guestIndex>=?',
          row.id,
          body.guests,
        ),
        409,
        'GUEST_ASSIGNED_TO_SERVICE',
        'Najpierw zmień przypisanie osoby do usług pakietu.',
      );
      run(
        'UPDATE reservations SET checkIn=?,checkOut=?,guests=?,guestNames=?,nightlyRateMinor=?,packagePriceMinor=?,totalMinor=?,version=version+1,updatedAt=? WHERE id=?',
        body.checkIn,
        body.checkOut,
        body.guests,
        JSON.stringify(names),
        price.nightlyRateMinor,
        price.packagePriceMinor,
        price.totalMinor,
        now(),
        row.id,
      );
      audit(req.actor!, 'reservation.updated', row.id);
      return reservationView(get<Reservation>('SELECT * FROM reservations WHERE id=?', row.id)!);
    });
    res.json(output);
  }),
);
hotelRouter.post(
  '/reservations/:id/cancel',
  requireScope('reservations:cancel'),
  lockReservation(async (req, res) => {
    z.object({})
      .strict()
      .parse(req.body || {});
    const row = getReservationForActor(String(req.params.id), req.actor!);
    if (row.status === 'cancelled') {
      res.json(reservationView(row));
      return;
    }
    editable(row, req.actor!);
    await cancelExternalForReservation(row);
    const result = transaction(() => {
      const current = getReservationForActor(row.id, req.actor!);
      assert(
        current.version === row.version && current.status === 'confirmed',
        409,
        'VERSION_CONFLICT',
        'Pobyt zmienił się podczas anulowania. Odśwież dane.',
      );
      run(
        'UPDATE reservations SET status=?,version=version+1,updatedAt=? WHERE id=?',
        'cancelled',
        now(),
        row.id,
      );
      audit(req.actor!, 'reservation.cancelled', row.id);
      return reservationView(get<Reservation>('SELECT * FROM reservations WHERE id=?', row.id)!);
    });
    res.json(result);
  }),
);
hotelRouter.post(
  '/reservations/:id/check-in',
  requireRole('receptionist', 'admin'),
  lockReservation(async (req, res) => {
    z.object({})
      .strict()
      .parse(req.body || {});
    const row = getReservationForActor(String(req.params.id), req.actor!);
    assert(
      row.status === 'confirmed',
      409,
      'INVALID_STATUS',
      'Gości można zameldować tylko przy potwierdzonej rezerwacji.',
    );
    await beforeCheckIn(row);
    const result = transaction(() => {
      const current = getReservationForActor(row.id, req.actor!);
      assert(
        current.version === row.version && current.status === 'confirmed',
        409,
        'VERSION_CONFLICT',
        'Pobyt został zmieniony. Odśwież dane.',
      );
      run(
        'UPDATE reservations SET status=?,version=version+1,updatedAt=? WHERE id=?',
        'checked_in',
        now(),
        row.id,
      );
      audit(req.actor!, 'reservation.checked_in', row.id);
      return reservationView(get<Reservation>('SELECT * FROM reservations WHERE id=?', row.id)!);
    });
    res.json(result);
  }),
);
hotelRouter.post(
  '/reservations/:id/check-out',
  requireRole('receptionist', 'admin'),
  lockReservation(async (req, res) => {
    z.object({})
      .strict()
      .parse(req.body || {});
    let row = getReservationForActor(String(req.params.id), req.actor!);
    assert(
      ['checked_in', 'completed'].includes(row.status),
      409,
      'INVALID_STATUS',
      'Najpierw zamelduj gości, żeby zakończyć pobyt.',
    );
    if (row.status === 'checked_in')
      transaction(() => {
        run(
          'UPDATE reservations SET status=?,version=version+1,updatedAt=? WHERE id=?',
          'completed',
          now(),
          row.id,
        );
        audit(req.actor!, 'reservation.checked_out', row.id);
      });
    row = get<Reservation>('SELECT * FROM reservations WHERE id=?', row.id)!;
    const voucherOperation = await afterCheckOut(row);
    res.json({ ...reservationView(row), voucherOperation });
  }),
);
hotelRouter.patch(
  '/reservations/:id/guests',
  requireRole('receptionist', 'admin'),
  lockReservation((req, res) => {
    const body = z
      .object({
        expectedVersion: z.number().int().positive(),
        guestNames: z.array(nameSchema).min(1).max(30),
        guest: z
          .object({ name: nameSchema, email: emailSchema, phone: phoneSchema.default('') })
          .strict()
          .optional(),
      })
      .strict()
      .parse(req.body);
    const value = transaction(() => {
      const row = getReservationForActor(String(req.params.id), req.actor!);
      assert(
        ['confirmed', 'checked_in'].includes(row.status),
        409,
        'INVALID_STATUS',
        'Listę gości można zmieniać przed zakończeniem pobytu.',
      );
      assert(
        row.version === body.expectedVersion,
        409,
        'VERSION_CONFLICT',
        'Pobyt został zmieniony. Odśwież dane.',
      );
      assert(
        body.guestNames.length === row.guests,
        400,
        'GUEST_NAMES_INVALID',
        'Liczba nazwisk musi odpowiadać liczbie gości.',
      );
      assertCanChangeDates(row.id);
      run(
        'UPDATE reservations SET guestNames=?,guestName=?,guestEmail=?,guestPhone=?,version=version+1,updatedAt=? WHERE id=?',
        JSON.stringify(body.guestNames),
        body.guest?.name ?? row.guestName,
        body.guest?.email ?? row.guestEmail,
        body.guest?.phone ?? row.guestPhone,
        now(),
        row.id,
      );
      audit(req.actor!, 'reservation.guests_updated', row.id);
      return reservationView(get<Reservation>('SELECT * FROM reservations WHERE id=?', row.id)!);
    });
    res.json(value);
  }),
);
