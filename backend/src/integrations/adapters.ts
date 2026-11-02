import { z } from 'zod';
import { all, get, run, transaction } from '../db.js';
import { integration } from './store.js';
import { requestJson } from './transport.js';
import { IntegrationError, type Partner, type RemoteBooking, type VoucherResult } from './types.js';

const stamp = z.string().datetime({ offset: true });
const bookingSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['confirmed', 'completed', 'cancelled', 'rejected']),
  startsAt: stamp,
  endsAt: stamp,
  operationId: z.string().min(1),
});
const voucherSchema = z.object({
  valid: z.boolean(),
  provider: z.string(),
  kind: z.string(),
  componentId: z.string(),
  used: z.boolean(),
  reservationId: z.string().nullable(),
  validFrom: z.string().date(),
  validUntil: z.string().date(),
  reference: z.string(),
});
const completionSchema = z.object({
  status: z.literal('reported'),
  operationId: z.string(),
  componentId: z.string(),
  provider: z.literal('C'),
  reservationId: z.string(),
});
const offersSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      durationMinutes: z.number().int().positive(),
    }),
  ),
});
const availabilitySchema = z.object({
  items: z.array(
    z.object({ offerId: z.string(), startsAt: stamp, endsAt: stamp, available: z.boolean() }),
  ),
});
export const DEMO_OFFERS = {
  A: [
    { id: 'A-MASSAGE', name: 'Masaż relaksacyjny', durationMinutes: 60 },
    { id: 'A-SPORT-MASSAGE', name: 'Masaż sportowy', durationMinutes: 60 },
  ],
  B: [
    { id: 'B-PERSONAL', name: 'Trening indywidualny', durationMinutes: 60 },
    { id: 'B-YOGA', name: 'Zajęcia jogi', durationMinutes: 60 },
  ],
};
function fault(scenario: string, mutation: boolean, after = false) {
  if (scenario === 'timeout' || (scenario === 'timeout_after_success' && after))
    throw new IntegrationError(
      503,
      'PARTNER_TIMEOUT',
      'Symulator: przekroczono czas odpowiedzi.',
      mutation,
    );
  if (scenario === 'unavailable')
    throw new IntegrationError(
      503,
      'PARTNER_UNAVAILABLE',
      'Symulator: usługa jest niedostępna.',
      mutation,
    );
  if (scenario === 'invalid_json')
    throw new IntegrationError(
      503,
      'PARTNER_INVALID_RESPONSE',
      'Symulator: niepoprawna odpowiedź.',
      mutation,
    );
}
async function real<T>(
  partner: Partner,
  path: string,
  method: 'GET' | 'POST',
  schema: z.ZodType<T>,
  body?: unknown,
): Promise<T> {
  const connection = integration(partner);
  // Tylko odczyt można automatycznie powtórzyć. Dla zapisu ID operacji zapisuje serwis.
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await requestJson(connection, path, method, body);
      const parsed = schema.safeParse(response);
      if (!parsed.success)
        throw new IntegrationError(
          503,
          'PARTNER_INVALID_RESPONSE',
          'Odpowiedź partnera nie pasuje do umówionego kontraktu.',
          method !== 'GET',
        );
      return parsed.data;
    } catch (e) {
      if (
        method === 'GET' &&
        attempt === 0 &&
        e instanceof IntegrationError &&
        ['PARTNER_TIMEOUT', 'PARTNER_UNAVAILABLE'].includes(e.code)
      )
        continue;
      throw e;
    }
  }
}
function saved<T>(partner: Partner, operationId: string): T | undefined {
  const row = get<{ result: string }>(
    'SELECT result FROM partnerDemoState WHERE partner=? AND operationId=?',
    partner,
    operationId,
  );
  return row ? (JSON.parse(row.result) as T) : undefined;
}
function persist(partner: Partner, operationId: string, result: unknown) {
  run(
    'INSERT INTO partnerDemoState(partner,operationId,result) VALUES(?,?,?) ON CONFLICT(partner,operationId) DO UPDATE SET result=excluded.result',
    partner,
    operationId,
    JSON.stringify(result),
  );
}
export async function testConnection(partner: Partner) {
  const config = integration(partner);
  if (config.mode === 'demo') {
    fault(config.demoScenario, false);
    return { ok: true, mode: 'demo', message: `Symulator ${partner} odpowiada.` };
  }
  await real(partner, '/health', 'GET', z.object({ ok: z.literal(true) }));
  return { ok: true, mode: 'real', message: `Serwer ${partner} odpowiada.` };
}
export async function catalog(partner: 'A' | 'B') {
  const config = integration(partner);
  if (config.mode === 'real') return real(partner, '/offers', 'GET', offersSchema);
  fault(config.demoScenario, false);
  return { items: DEMO_OFFERS[partner] };
}
export async function availability(
  partner: 'A' | 'B',
  offerId: string,
  startsAt: string,
  endsAt: string,
) {
  const config = integration(partner);
  if (config.mode === 'real')
    return real(
      partner,
      `/availability?${new URLSearchParams({ offerId, startsAt, endsAt })}`,
      'GET',
      availabilitySchema,
    );
  fault(config.demoScenario, false);
  return {
    items: [
      {
        offerId,
        startsAt,
        endsAt,
        available:
          config.demoScenario !== 'reject' && DEMO_OFFERS[partner].some((x) => x.id === offerId),
      },
    ],
  };
}
export interface BookingRequest {
  operationId: string;
  reservationId: string;
  offerId: string;
  guestName: string;
  startsAt: string;
  endsAt: string;
  voucherReference?: string;
}
export async function createBooking(
  partner: 'A' | 'B',
  body: BookingRequest,
): Promise<RemoteBooking> {
  const config = integration(partner);
  if (config.mode === 'real') return real(partner, '/bookings', 'POST', bookingSchema, body);
  const existing = saved<RemoteBooking>(partner, body.operationId);
  if (existing) return existing;
  fault(config.demoScenario, true);
  const validOffer = DEMO_OFFERS[partner].some((x) => x.id === body.offerId);
  const result: RemoteBooking = {
    id: `demo-${partner}-${body.operationId}`,
    operationId: body.operationId,
    startsAt: body.startsAt,
    endsAt: body.endsAt,
    status: config.demoScenario === 'reject' || !validOffer ? 'rejected' : 'confirmed',
  };
  persist(partner, body.operationId, result);
  fault(config.demoScenario, true, true);
  return result;
}
export async function bookingStatus(
  partner: 'A' | 'B',
  operationId: string,
  externalId?: string | null,
): Promise<RemoteBooking> {
  const config = integration(partner);
  if (config.mode === 'real')
    return real(
      partner,
      externalId
        ? `/bookings/${encodeURIComponent(externalId)}`
        : `/operations/${encodeURIComponent(operationId)}`,
      'GET',
      bookingSchema,
    );
  fault(config.demoScenario, false);
  let result = saved<RemoteBooking>(partner, operationId);
  if (!result && externalId)
    result = all<{ result: string }>(
      'SELECT result FROM partnerDemoState WHERE partner=? ORDER BY rowid DESC',
      partner,
    )
      .map((x) => JSON.parse(x.result) as RemoteBooking)
      .find((x) => x.id === externalId);
  if (!result)
    throw new IntegrationError(
      404,
      'PARTNER_NOT_FOUND',
      'Partner nie odnalazł operacji. Wynik nadal wymaga wyjaśnienia.',
    );
  if (config.demoScenario === 'completed' && result.status === 'confirmed') {
    result = { ...result, status: 'completed' };
    persist(partner, operationId, result);
  }
  return result;
}
export async function cancelBooking(
  partner: 'A' | 'B',
  externalId: string,
  operationId: string,
): Promise<RemoteBooking> {
  const config = integration(partner);
  if (config.mode === 'real')
    return real(
      partner,
      `/bookings/${encodeURIComponent(externalId)}/cancel`,
      'POST',
      bookingSchema,
      { operationId },
    );
  const existing = saved<RemoteBooking>(partner, operationId);
  if (existing) return existing;
  fault(config.demoScenario, true);
  const row = all<{ operationId: string; result: string }>(
    'SELECT operationId,result FROM partnerDemoState WHERE partner=?',
    partner,
  ).find((x) => (JSON.parse(x.result) as RemoteBooking).id === externalId);
  if (!row)
    throw new IntegrationError(404, 'PARTNER_NOT_FOUND', 'Nie znaleziono usługi u partnera.');
  const old = JSON.parse(row.result) as RemoteBooking;
  const result: RemoteBooking = {
    ...old,
    operationId,
    status:
      config.demoScenario === 'reject' || old.status === 'completed' ? 'rejected' : 'cancelled',
  };
  transaction(() => {
    persist(partner, operationId, result);
    if (result.status === 'cancelled')
      persist(partner, row.operationId, { ...old, status: 'cancelled' });
  });
  fault(config.demoScenario, true, true);
  return result;
}
export interface VoucherRequest {
  reference: string;
  componentId: string;
  provider: 'C';
  reservationId?: string;
  checkIn: string;
  checkOut: string;
}
export async function checkVoucher(body: VoucherRequest): Promise<VoucherResult> {
  const config = integration('D');
  if (config.mode === 'real') return real('D', '/vouchers/check', 'POST', voucherSchema, body);
  fault(config.demoScenario, false);
  const row = get<{
    reference: string;
    componentId: string;
    provider: string;
    kind: string;
    validFrom: string;
    validUntil: string;
    used: number;
    reservationId: string | null;
  }>('SELECT * FROM demoVouchers WHERE reference=?', body.reference);
  if (!row)
    return {
      valid: false,
      provider: 'C',
      kind: 'hotel',
      componentId: body.componentId,
      reference: body.reference,
      validFrom: '2020-01-01',
      validUntil: '2020-01-01',
      used: false,
      reservationId: null,
    };
  return { ...row, used: Boolean(row.used), valid: config.demoScenario !== 'reject' };
}
export type Completion = z.infer<typeof completionSchema>;
export interface CompletionRequest {
  reference: string;
  componentId: string;
  provider: 'C';
  reservationId: string;
  operationId: string;
}
export async function completeVoucher(body: CompletionRequest): Promise<Completion> {
  const config = integration('D');
  if (config.mode === 'real')
    return real('D', '/vouchers/complete', 'POST', completionSchema, body);
  const old = saved<Completion>('D', body.operationId);
  if (old) return old;
  fault(config.demoScenario, true);
  if (config.demoScenario === 'reject')
    throw new IntegrationError(
      409,
      'VOUCHER_REJECTED',
      'Symulator D odrzucił realizację składnika hotelowego.',
    );
  const result: Completion = {
    status: 'reported',
    operationId: body.operationId,
    componentId: body.componentId,
    provider: 'C',
    reservationId: body.reservationId,
  };
  transaction(() => {
    const row = get<{ used: number; componentId: string; provider: string; kind: string }>(
      'SELECT * FROM demoVouchers WHERE reference=?',
      body.reference,
    );
    if (
      !row ||
      row.used ||
      row.componentId !== body.componentId ||
      row.provider !== 'C' ||
      row.kind !== 'hotel'
    )
      throw new IntegrationError(
        409,
        'VOUCHER_REJECTED',
        'Voucher jest wykorzystany lub nie należy do hotelu C.',
      );
    run(
      'UPDATE demoVouchers SET used=1,reservationId=? WHERE reference=?',
      body.reservationId,
      body.reference,
    );
    persist('D', body.operationId, result);
  });
  fault(config.demoScenario, true, true);
  return result;
}
export async function completionStatus(operationId: string): Promise<Completion> {
  const config = integration('D');
  if (config.mode === 'real')
    return real('D', `/operations/${encodeURIComponent(operationId)}`, 'GET', completionSchema);
  fault(config.demoScenario, false);
  const result = saved<Completion>('D', operationId);
  if (!result)
    throw new IntegrationError(404, 'PARTNER_NOT_FOUND', 'D nie potwierdził jeszcze operacji.');
  return result;
}
