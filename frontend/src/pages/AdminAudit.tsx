import { useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import { dateLabel, listItems } from '../api';
import { Empty, Field, Loading, Notice, PageTitle, Pagination, useResource } from '../components';
import type { AuditEvent, Page } from '../types';
const actionNames: Record<string, string> = {
  'auth.login': 'Logowanie',
  'auth.logout': 'Wylogowanie',
  'user.registered': 'Rejestracja konta',
  'user.created': 'Utworzenie konta',
  'user.updated': 'Zmiana konta',
  'user.password_reset': 'Reset hasła',
  'reservation.created': 'Utworzenie rezerwacji',
  'reservation.updated': 'Zmiana pobytu',
  'reservation.cancelled': 'Anulowanie pobytu',
  'reservation.checked_in': 'Zameldowanie',
  'reservation.checked_out': 'Wymeldowanie',
  'room.created': 'Dodanie pokoju',
  'room.updated': 'Zmiana pokoju',
  'package.created': 'Dodanie pakietu',
  'package.updated': 'Zmiana pakietu',
  'hotel.settings_updated': 'Ustawienia hotelu',
  'integration.configure': 'Ustawienia integracji',
  'integration.test': 'Test integracji',
  'api-key.create': 'Utworzenie klucza API',
  'api-key.update': 'Zmiana klucza API',
  'partner-booking.create': 'Rezerwacja usługi',
  'partner-booking.refresh': 'Odczyt stanu usługi',
  'partner-booking.cancel': 'Anulowanie usługi',
  'voucher.check': 'Weryfikacja vouchera',
  'voucher.completion': 'Potwierdzenie noclegu w D',
};
export default function AdminAuditPage() {
  const [page, setPage] = useState(1),
    [query, setQuery] = useState('');
  const { data, loading, error } = useResource<Page<AuditEvent>>(
    `/admin/audit-events?page=${page}&pageSize=20${query}`,
  );
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget),
      p = new URLSearchParams();
    for (const [k, v] of f) {
      if (!v) continue;
      p.set(
        k,
        k === 'from' || k === 'to'
          ? new Date(String(v) + (k === 'from' ? 'T00:00:00Z' : 'T23:59:59.999Z')).toISOString()
          : String(v),
      );
    }
    setPage(1);
    setQuery('&' + p);
  }
  return (
    <>
      <PageTitle
        title="Historia operacji"
        description="Zmiany rezerwacji, oferty i ustawień wraz z datą i osobą, która je zapisała."
      />
      <section className="panel compact">
        <form className="filter-bar audit-filters" onSubmit={filter}>
          <Field label="Operacja">
            <select name="action">
              <option value="">Wszystkie</option>
              {Object.entries(actionNames).map(([value, name]) => (
                <option key={value} value={value}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ID obiektu">
            <input name="entityId" placeholder="np. ID rezerwacji" maxLength={150} />
          </Field>
          <Field label="ID autora">
            <input name="actorId" maxLength={150} />
          </Field>
          <Field label="Od dnia (UTC)">
            <input type="date" name="from" />
          </Field>
          <Field label="Do dnia (UTC)">
            <input type="date" name="to" />
          </Field>
          <button className="button secondary">
            <Search size={16} />
            Filtruj
          </button>
        </form>
      </section>
      <Notice error={error} />
      {loading ? (
        <Loading />
      ) : !data?.total ? (
        <Empty title="Brak operacji">Spróbuj innych filtrów.</Empty>
      ) : (
        <div className="panel table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Czas</th>
                  <th>Autor</th>
                  <th>Operacja</th>
                  <th>Czego dotyczy zmiana</th>
                </tr>
              </thead>
              <tbody>
                {listItems(data).map((e) => (
                  <tr key={e.id}>
                    <td>{dateLabel(e.createdAt)}</td>
                    <td>
                      <strong>{e.actorName ?? e.actor ?? 'System'}</strong>
                      <small>
                        <code>{e.actorId}</code>
                      </small>
                    </td>
                    <td>
                      {actionNames[e.action] ?? e.action}
                      <small>
                        <code>{e.action}</code>
                      </small>
                    </td>
                    <td>
                      <code className="wrap-code">{e.entityId ?? 'brak'}</code>
                      {e.details != null && Object.keys(e.details as object).length > 0 && (
                        <details>
                          <summary>Szczegóły zmiany</summary>
                          <pre>
                            {typeof e.details === 'string'
                              ? e.details
                              : JSON.stringify(e.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={data.total} pageSize={20} onChange={setPage} />
        </div>
      )}
    </>
  );
}
