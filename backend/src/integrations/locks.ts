import { IntegrationError } from './types.js';
// Blokada działa w jednym procesie Node i obejmuje oczekiwanie na partnera.
// Zapis do bazy dodatkowo chroni transakcja SQLite.
const busyReservations = new Set<string>();
export async function withReservationLock<T>(id: string, action: () => Promise<T>): Promise<T> {
  if (busyReservations.has(id))
    throw new IntegrationError(
      409,
      'RESERVATION_BUSY',
      'Trwa inna operacja tej rezerwacji. Spróbuj ponownie za chwilę.',
    );
  busyReservations.add(id);
  try {
    return await action();
  } finally {
    busyReservations.delete(id);
  }
}
