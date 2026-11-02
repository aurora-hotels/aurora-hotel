import { randomUUID } from 'node:crypto';
import { DateTime } from 'luxon';
import { all, get, run, transaction } from '../db.js';
import { decrypt } from '../security.js';
import * as adapter from './adapters.js';
import { integration } from './store.js';
import {
  IntegrationError,
  type Booking,
  type RemoteBooking,
  type ReservationForIntegration,
  type VoucherResult,
} from './types.js';

interface Item {
  id: string;
  reservationId: string;
  name: string;
  partner: 'A' | 'B' | 'HOTEL';
  offerId: string;
  guestIndex: number;
  status: string;
  note: string;
}
interface VoucherInput {
  checkIn: string;
  checkOut: string;
  voucherReference?: string | null;
  hotelComponentId?: string | null;
}
const activeStates = ['pending', 'confirmed', 'unknown', 'cancel_pending', 'completed'];
const now = () => new Date().toISOString();
function failure(e: unknown) {
  return e instanceof IntegrationError
    ? e
    : new IntegrationError(
        503,
        'PARTNER_UNAVAILABLE',
        'Nie udało się uzyskać potwierdzenia partnera.',
        true,
      );
}
function itemFor(reservationId: string, itemId: string): Item {
  const item = get<Item>(
    'SELECT * FROM reservation_items WHERE id=? AND reservationId=?',
    itemId,
    reservationId,
  );
  if (!item || !['A', 'B'].includes(item.partner))
    throw new IntegrationError(404, 'ITEM_NOT_FOUND', 'Nie znaleziono usługi A/B w tym pakiecie.');
  return item;
}
export function reservationRow(id: string) {
  const row = get<ReservationForIntegration>('SELECT * FROM reservations WHERE id=?', id);
  if (!row) throw new IntegrationError(404, 'RESERVATION_NOT_FOUND', 'Nie znaleziono rezerwacji.');
  return row;
}
export function stayBounds(row: ReservationForIntegration) {
  const settings = get<{ checkInTime: string; checkOutTime: string; timezone: string }>(
    'SELECT * FROM hotel_settings WHERE id=1',
  )!;
  const start = DateTime.fromISO(`${row.checkIn}T${settings.checkInTime}`, {
    zone: settings.timezone,
  });
  const end = DateTime.fromISO(`${row.checkOut}T${settings.checkOutTime}`, {
    zone: settings.timezone,
  });
  if (!start.isValid || !end.isValid)
    throw new IntegrationError(400, 'INVALID_STAY_TIME', 'Nieprawidłowe godziny pobytu.');
  return { start: start.toMillis(), end: end.toMillis() };
}
function validateTime(row: ReservationForIntegration, startsAt: string, endsAt: string) {
  const start = DateTime.fromISO(startsAt, { setZone: true }),
    end = DateTime.fromISO(endsAt, { setZone: true });
  const bounds = stayBounds(row);
  if (
    !start.isValid ||
    !end.isValid ||
    start.toMillis() >= end.toMillis() ||
    start.toMillis() < bounds.start ||
    end.toMillis() > bounds.end
  )
    throw new IntegrationError(
      400,
      'OUTSIDE_STAY',
      'Cała usługa musi mieścić się między zameldowaniem a wymeldowaniem (Europe/Warsaw).',
    );
  return { startsAt: start.toUTC().toISO()!, endsAt: end.toUTC().toISO()! };
}
function validateGuest(row: ReservationForIntegration, item: Item, guestIndex: number) {
  const names: string[] =
    typeof row.guestNames === 'string' ? JSON.parse(row.guestNames) : row.guestNames;
  if (!Number.isInteger(guestIndex) || !names[guestIndex] || guestIndex !== item.guestIndex)
    throw new IntegrationError(
      400,
      'INVALID_GUEST',
      'Wybierz gościa przypisanego do tej pozycji pakietu.',
    );
  return names[guestIndex]!;
}
export function bookingRow(reservationId: string, id: string) {
  const booking = get<Booking>(
    'SELECT * FROM partnerBookings WHERE id=? AND reservationId=?',
    id,
    reservationId,
  );
  if (!booking)
    throw new IntegrationError(404, 'BOOKING_NOT_FOUND', 'Nie znaleziono usługi partnera.');
  return booking;
}
export async function partnerAvailability(
  reservationId: string,
  itemId: string,
  startsAt: string,
  endsAt: string,
) {
  const row = reservationRow(reservationId),
    item = itemFor(reservationId, itemId);
  const times = validateTime(row, startsAt, endsAt);
  const partner = item.partner as 'A' | 'B';
  const result = await adapter.availability(partner, item.offerId, times.startsAt, times.endsAt);
  const valid = result.items.filter(
    (x) =>
      x.offerId === item.offerId &&
      Date.parse(x.startsAt) === Date.parse(times.startsAt) &&
      Date.parse(x.endsAt) === Date.parse(times.endsAt),
  );
  return {
    mode: integration(partner).mode,
    partner,
    items: valid,
    total: valid.length,
    page: 1,
    pageSize: 100,
  };
}
function syncResult(booking: Booking, remote: RemoteBooking, cancel = false) {
  const operationId = cancel ? booking.cancelOperationId : booking.operationId;
  if (
    remote.operationId !== operationId ||
    (booking.externalId && remote.id !== booking.externalId) ||
    Date.parse(remote.startsAt) !== Date.parse(booking.startsAt) ||
    Date.parse(remote.endsAt) !== Date.parse(booking.endsAt)
  )
    throw new IntegrationError(
      503,
      'PARTNER_RESPONSE_MISMATCH',
      'Partner zwrócił wynik innej operacji.',
      true,
    );
  // Odrzucone anulowanie nie oznacza odrzuconej pierwotnej rezerwacji.
  const status = cancel && remote.status !== 'cancelled' ? 'cancel_pending' : remote.status;
  transaction(() => {
    const current = bookingRow(booking.reservationId, booking.id);
    if (
      current.status === 'cancelled' ||
      (current.status === 'completed' && status !== 'completed')
    )
      return;
    run(
      'UPDATE partnerBookings SET externalId=?,status=?,error=?,updatedAt=? WHERE id=?',
      remote.id,
      status,
      status === 'cancel_pending' ? 'Partner nie potwierdził anulowania.' : null,
      now(),
      booking.id,
    );
    run('UPDATE reservation_items SET status=? WHERE id=?', status, booking.itemId);
  });
  return bookingRow(booking.reservationId, booking.id);
}
export async function bookService(
  reservationId: string,
  input: { itemId: string; guestIndex: number; startsAt: string; endsAt: string },
) {
  const row = reservationRow(reservationId),
    item = itemFor(reservationId, input.itemId);
  const guestName = validateGuest(row, item, input.guestIndex);
  const times = validateTime(row, input.startsAt, input.endsAt);
  // Zapis pending i sprawdzenie kolizji tworzą jedną transakcję. Dopiero potem HTTP.
  const booking = transaction(() => {
    const latest = reservationRow(reservationId);
    if (!['confirmed', 'checked_in'].includes(latest.status))
      throw new IntegrationError(
        409,
        'RESERVATION_CLOSED',
        'Można planować usługi tylko dla aktywnego pobytu.',
      );
    validateTime(latest, times.startsAt, times.endsAt);
    const active = all<Booking>(
      'SELECT * FROM partnerBookings WHERE reservationId=?',
      reservationId,
    ).filter((x) => activeStates.includes(x.status));
    if (active.some((x) => x.itemId === item.id))
      throw new IntegrationError(
        409,
        'ITEM_ALREADY_BOOKED',
        'Ta jednostka pakietu ma już aktywną lub niepewną rezerwację.',
      );
    if (
      active.some(
        (x) =>
          x.guestIndex === input.guestIndex &&
          Date.parse(x.startsAt) < Date.parse(times.endsAt) &&
          Date.parse(x.endsAt) > Date.parse(times.startsAt),
      )
    )
      throw new IntegrationError(
        409,
        'GUEST_TIME_CONFLICT',
        'Ten gość ma już inną usługę A/B w wybranym czasie.',
      );
    const id = randomUUID(),
      operationId = randomUUID(),
      createdAt = now();
    run(
      'INSERT INTO partnerBookings(id,reservationId,itemId,partner,guestIndex,offerId,startsAt,endsAt,status,operationId,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
      id,
      reservationId,
      item.id,
      item.partner,
      input.guestIndex,
      item.offerId,
      times.startsAt,
      times.endsAt,
      'pending',
      operationId,
      createdAt,
      createdAt,
    );
    run("UPDATE reservation_items SET status='pending' WHERE id=?", item.id);
    return bookingRow(reservationId, id);
  });
  try {
    const remote = await adapter.createBooking(booking.partner, {
      operationId: booking.operationId,
      reservationId,
      offerId: booking.offerId,
      guestName,
      ...times,
      ...(row.voucherReference ? { voucherReference: decrypt(row.voucherReference) } : {}),
    });
    return syncResult(booking, remote);
  } catch (e) {
    const error = failure(e),
      status = error.uncertain ? 'unknown' : 'rejected';
    transaction(() => {
      run(
        'UPDATE partnerBookings SET status=?,error=?,updatedAt=? WHERE id=?',
        status,
        error.message,
        now(),
        booking.id,
      );
      run('UPDATE reservation_items SET status=? WHERE id=?', status, item.id);
    });
    return bookingRow(reservationId, booking.id);
  }
}
export async function refreshService(reservationId: string, id: string) {
  const booking = bookingRow(reservationId, id);
  if (booking.status === 'cancelled' || booking.status === 'rejected') return booking;
  try {
    if (booking.cancelOperationId && booking.status === 'cancel_pending') {
      // Najpierw pytamy o wynik tego konkretnego anulowania.
      const remote = await adapter.bookingStatus(booking.partner, booking.cancelOperationId);
      return syncResult(booking, remote, true);
    }
    const remote = await adapter.bookingStatus(
      booking.partner,
      booking.operationId,
      booking.externalId,
    );
    return syncResult(booking, remote);
  } catch (e) {
    const error = failure(e);
    const status = booking.status === 'pending' ? 'unknown' : booking.status;
    transaction(() => {
      run(
        'UPDATE partnerBookings SET status=?,error=?,updatedAt=? WHERE id=?',
        status,
        error.message,
        now(),
        id,
      );
      run('UPDATE reservation_items SET status=? WHERE id=?', status, booking.itemId);
    });
    return bookingRow(reservationId, id);
  }
}
export async function cancelService(reservationId: string, id: string) {
  let booking = bookingRow(reservationId, id);
  if (['cancelled', 'rejected'].includes(booking.status)) return booking;
  if (booking.status === 'completed')
    throw new IntegrationError(
      409,
      'SERVICE_COMPLETED',
      'Partner potwierdził już wykonanie usługi.',
    );
  if (!booking.externalId) booking = await refreshService(reservationId, id);
  if (!booking.externalId)
    throw new IntegrationError(
      409,
      'EXTERNAL_CANCELLATION_PENDING',
      'Najpierw trzeba ustalić wynik rezerwacji u partnera.',
    );
  if (booking.status === 'completed')
    throw new IntegrationError(
      409,
      'SERVICE_COMPLETED',
      'Partner potwierdził już wykonanie usługi.',
    );
  if (['cancelled', 'rejected'].includes(booking.status)) return booking;
  const cancelOperationId = booking.cancelOperationId || randomUUID();
  transaction(() => {
    run(
      "UPDATE partnerBookings SET cancelOperationId=?,status='cancel_pending',updatedAt=? WHERE id=?",
      cancelOperationId,
      now(),
      id,
    );
    run("UPDATE reservation_items SET status='cancel_pending' WHERE id=?", booking.itemId);
  });
  booking = bookingRow(reservationId, id);
  try {
    return syncResult(
      booking,
      await adapter.cancelBooking(booking.partner, booking.externalId!, cancelOperationId),
      true,
    );
  } catch (e) {
    run('UPDATE partnerBookings SET error=?,updatedAt=? WHERE id=?', failure(e).message, now(), id);
    return bookingRow(reservationId, id);
  }
}
export async function cancelExternalForReservation(row: ReservationForIntegration): Promise<void> {
  // D może zmienić stan hotelowego składnika poza C. Anulowanie wymaga świeżej weryfikacji.
  if (row.voucherReference) await checkReservationVoucher(row);
  const bookings = all<Booking>(
    'SELECT * FROM partnerBookings WHERE reservationId=?',
    row.id,
  ).filter((x) => activeStates.includes(x.status));
  for (const booking of bookings) {
    try {
      await cancelService(row.id, booking.id);
    } catch {
      /* sprawdzamy ostateczny stan wszystkich usług poniżej */
    }
  }
  const pending = all<Booking>('SELECT * FROM partnerBookings WHERE reservationId=?', row.id).some(
    (x) => activeStates.includes(x.status),
  );
  if (pending)
    throw new IntegrationError(
      409,
      'EXTERNAL_CANCELLATION_PENDING',
      'Hotel pozostaje aktywny: co najmniej jedna usługa A/B nie została anulowana. Odśwież wynik i ponów.',
    );
}
export function assertCanChangeDates(reservationId: string) {
  if (
    all<Booking>('SELECT * FROM partnerBookings WHERE reservationId=?', reservationId).some((x) =>
      activeStates.includes(x.status),
    )
  )
    throw new IntegrationError(
      409,
      'ACTIVE_PARTNER_SERVICES',
      'Przed zmianą terminu trzeba anulować zaplanowane usługi A/B i wyjaśnić niepewne operacje.',
    );
}
export function assertVoucherAvailable(
  input: Pick<VoucherInput, 'voucherReference' | 'hotelComponentId'>,
  reservationId?: string,
) {
  if (!input.voucherReference) return;
  const others = all<ReservationForIntegration>(
    "SELECT * FROM reservations WHERE voucherReference IS NOT NULL AND status!='cancelled'",
  );
  if (
    others.some(
      (x) =>
        x.id !== reservationId &&
        x.hotelComponentId === input.hotelComponentId &&
        decrypt(x.voucherReference!) === input.voucherReference,
    )
  )
    throw new IntegrationError(
      409,
      'VOUCHER_ALREADY_BOUND',
      'Ten składnik vouchera jest już przypisany do innego pobytu.',
    );
}
function validateVoucher(result: VoucherResult, input: VoucherInput, reservationId?: string) {
  if (
    !result.valid ||
    result.provider !== 'C' ||
    result.kind !== 'hotel' ||
    result.componentId !== input.hotelComponentId ||
    result.reference !== input.voucherReference
  )
    throw new IntegrationError(
      409,
      'VOUCHER_INVALID',
      'D nie potwierdził tego składnika hotelowego projektu C.',
    );
  if (result.used || (result.reservationId !== null && result.reservationId !== reservationId))
    throw new IntegrationError(
      409,
      'VOUCHER_USED',
      'Voucher został wykorzystany lub należy do innej rezerwacji.',
    );
  if (input.checkIn < result.validFrom || input.checkOut > result.validUntil)
    throw new IntegrationError(
      409,
      'VOUCHER_OUTSIDE_VALIDITY',
      'Terminy pobytu nie mieszczą się w ważności vouchera.',
    );
}
export async function verifyVoucherBeforeCreate(
  input: VoucherInput,
  reservationId?: string,
): Promise<void> {
  if (!input.voucherReference && !input.hotelComponentId) return;
  if (!input.voucherReference || !input.hotelComponentId)
    throw new IntegrationError(
      400,
      'VOUCHER_FIELDS_REQUIRED',
      'Podaj kod vouchera i identyfikator składnika hotelowego.',
    );
  assertVoucherAvailable(input, reservationId);
  const result = await adapter.checkVoucher({
    reference: input.voucherReference,
    componentId: input.hotelComponentId,
    provider: 'C',
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    ...(reservationId ? { reservationId } : {}),
  });
  validateVoucher(result, input, reservationId);
}
export async function checkReservationVoucher(row: ReservationForIntegration) {
  if (!row.voucherReference || !row.hotelComponentId)
    throw new IntegrationError(400, 'NO_VOUCHER', 'Ta rezerwacja nie ma vouchera.');
  const input = { ...row, voucherReference: decrypt(row.voucherReference) };
  assertVoucherAvailable(input, row.id);
  const result = await adapter.checkVoucher({
    reference: input.voucherReference,
    componentId: row.hotelComponentId,
    provider: 'C',
    reservationId: row.id,
    checkIn: row.checkIn,
    checkOut: row.checkOut,
  });
  validateVoucher(result, input, row.id);
  // Weryfikacja nie konsumuje vouchera i nie ujawnia jego pełnego kodu.
  return { ...result, reference: '••••••••' };
}
export async function beforeCheckIn(row: ReservationForIntegration): Promise<void> {
  if (row.voucherReference) await checkReservationVoucher(row);
}
function validCompletion(
  result: adapter.Completion,
  row: ReservationForIntegration,
  operationId: string,
) {
  if (
    result.operationId !== operationId ||
    result.reservationId !== row.id ||
    result.componentId !== row.hotelComponentId ||
    result.provider !== 'C'
  )
    throw new IntegrationError(
      503,
      'PARTNER_RESPONSE_MISMATCH',
      'D potwierdził inny składnik lub inną operację.',
      true,
    );
}
export async function afterCheckOut(row: ReservationForIntegration) {
  if (!row.voucherReference || !row.hotelComponentId) return null;
  if (row.status !== 'completed')
    throw new IntegrationError(
      409,
      'HOTEL_NOT_COMPLETED',
      'Najpierw trzeba zakończyć pobyt w hotelu.',
    );
  let op = get<{ operationId: string; status: string; error: string | null }>(
    'SELECT * FROM voucherOperations WHERE reservationId=?',
    row.id,
  );
  if (op?.status === 'reported') return op;
  const retry = Boolean(op),
    operationId = op?.operationId || randomUUID();
  run(
    "INSERT OR IGNORE INTO voucherOperations(reservationId,operationId,status,updatedAt) VALUES(?,?,'pending',?)",
    row.id,
    operationId,
    now(),
  );
  try {
    let result: adapter.Completion | undefined;
    if (retry) {
      try {
        result = await adapter.completionStatus(operationId);
      } catch (e) {
        if (!(e instanceof IntegrationError) || e.code !== 'PARTNER_NOT_FOUND') throw e;
      }
    }
    // Także po awarii proces powtarza dokładnie to samo ID. D musi być idempotentne.
    result ??= await adapter.completeVoucher({
      reference: decrypt(row.voucherReference),
      componentId: row.hotelComponentId,
      provider: 'C',
      reservationId: row.id,
      operationId,
    });
    validCompletion(result, row, operationId);
    run(
      "UPDATE voucherOperations SET status='reported',error=NULL,updatedAt=? WHERE reservationId=?",
      now(),
      row.id,
    );
  } catch (e) {
    const error = failure(e);
    run(
      "UPDATE voucherOperations SET status=?,error=?,updatedAt=? WHERE reservationId=? AND status!='reported'",
      error.uncertain || retry ? 'unknown' : 'rejected',
      error.message,
      now(),
      row.id,
    );
  }
  return get<{ operationId: string; status: string; error: string | null }>(
    'SELECT * FROM voucherOperations WHERE reservationId=?',
    row.id,
  )!;
}
export function getPlan(reservationId: string) {
  const items = all<Item>(
    'SELECT * FROM reservation_items WHERE reservationId=? ORDER BY guestIndex,name,id',
    reservationId,
  );
  const bookings = all<Booking>(
    'SELECT * FROM partnerBookings WHERE reservationId=? ORDER BY createdAt',
    reservationId,
  );
  return {
    reservationId,
    items: items.map((item) => ({
      ...item,
      bookings: bookings.filter((x) => x.itemId === item.id),
    })),
    voucher:
      get(
        'SELECT status,operationId,error,updatedAt FROM voucherOperations WHERE reservationId=?',
        reservationId,
      ) || null,
  };
}
