const API_PREFIX = '/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Logowanie zmienia sesję, więc przed zapisem pobieramy aktualny token CSRF.
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set('Content-Type', 'application/json');
  const method = options.method ?? 'GET';
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const tokenResponse = await fetch(`${API_PREFIX}/auth/csrf`, { credentials: 'include' });
    if (!tokenResponse.ok)
      throw new ApiError(
        tokenResponse.status,
        'CSRF_UNAVAILABLE',
        'Nie można potwierdzić sesji. Odśwież stronę i spróbuj ponownie.',
      );
    const { csrfToken } = await tokenResponse.json();
    headers.set('X-CSRF-Token', csrfToken);
  }
  let response: Response;
  try {
    response = await fetch(`${API_PREFIX}${path}`, { ...options, headers, credentials: 'include' });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Brak połączenia z serwerem. Sprawdź połączenie i spróbuj ponownie.',
    );
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error?.code ?? 'REQUEST_FAILED',
      body?.error?.message ?? `Nie udało się wykonać operacji (${response.status}).`,
      body?.error?.fields ?? {},
    );
  }
  return body as T;
}

export const post = <T>(path: string, data: unknown = {}, headers?: HeadersInit) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(data), headers });
export const patch = <T>(path: string, data: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(data) });
export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Nie udało się wykonać operacji.';
export const money = (minor: number | undefined) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format((minor ?? 0) / 100);
export const dateLabel = (date?: string) =>
  date
    ? new Intl.DateTimeFormat('pl-PL', {
        dateStyle: 'medium',
        ...(date.includes('T')
          ? { timeStyle: 'short' as const, timeZone: 'Europe/Warsaw' }
          : { timeZone: 'UTC' }),
      }).format(new Date(date))
    : 'brak';
export function today() {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  return ['year', 'month', 'day']
    .map((type) => parts.find((p) => p.type === type)?.value)
    .join('-');
}
export function addDays(date: string, days: number) {
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}
export const nights = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
// crypto.randomUUID działa tylko przez HTTPS i na localhost. Pod adresem IP w sieci lokalnej
// składamy identyfikator z getRandomValues, które jest dostępne zawsze.
export function uuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function listItems<T>(value: { items: T[] } | T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : (value?.items ?? []);
}
// Formularz podaje czas warszawski, niezależnie od strefy ustawionej w przeglądarce.
export function warsawInstant(local: string): string {
  const target = Date.parse(local + ':00Z');
  if (!Number.isFinite(target)) throw new Error('Podaj poprawną datę i godzinę.');
  let instant = target;
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Warsaw',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .format(new Date(instant))
      .replace(' ', 'T');
    const adjustment = target - Date.parse(parts + ':00Z');
    if (adjustment === 0) return new Date(instant).toISOString();
    instant += adjustment;
  }
  throw new Error('Ta godzina nie występuje w Warszawie przy zmianie czasu. Wybierz inną.');
}
