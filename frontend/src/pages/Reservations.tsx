import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck2, DoorOpen, Search, Plus, CalendarDays } from 'lucide-react';
import { isStaff, useAuth } from '../auth';
import { money, dateLabel, listItems, today } from '../api';
import {
  Badge,
  Empty,
  Field,
  Loading,
  Notice,
  PageTitle,
  Pagination,
  useResource,
} from '../components';
import type { Page, Reservation } from '../types';

export default function ReservationsPage() {
  const { user } = useAuth();
  const staff = isStaff(user);
  const [page, setPage] = useState(1),
    [filter, setFilter] = useState({ status: '', search: '', date: '' }),
    [query, setQuery] = useState('');
  const { data, loading, error } = useResource<Page<Reservation>>(
    `/reservations?page=${page}&pageSize=20${query}`,
  );
  const rows = listItems(data);
  function apply(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setQuery(
      '&' +
        new URLSearchParams(
          Object.fromEntries(Object.entries(filter).filter(([, v]) => v)),
        ).toString(),
    );
  }
  const arrivals = rows.filter((r) => r.checkIn === today() && r.status === 'confirmed').length,
    departures = rows.filter((r) => r.checkOut === today() && r.status === 'checked_in').length;
  return (
    <>
      <PageTitle
        eyebrow={staff ? 'RECEPCJA' : 'TWÓJ POBYT'}
        title={staff ? 'Pulpit rezerwacji' : 'Moje rezerwacje'}
        description={
          staff
            ? 'Przyjazdy, wyjazdy i plan pobytu gości.'
            : 'Sprawdź szczegóły pobytu, zmień termin lub zobacz plan usług.'
        }
      >
        <Link className="button primary" to="/">
          <Plus size={17} /> Nowa rezerwacja
        </Link>
      </PageTitle>
      {staff && (
        <div className="stats-grid">
          <div className="stat-card">
            <CalendarCheck2 />
            <span>
              Przyjazdy dzisiaj<small>w widocznych wynikach</small>
            </span>
            <strong>{arrivals}</strong>
          </div>
          <div className="stat-card">
            <DoorOpen />
            <span>
              Wyjazdy dzisiaj<small>w widocznych wynikach</small>
            </span>
            <strong>{departures}</strong>
          </div>
          <div className="stat-card">
            <CalendarDays />
            <span>
              Wszystkie wyniki<small>według wybranych filtrów</small>
            </span>
            <strong>{data?.total ?? 0}</strong>
          </div>
        </div>
      )}
      <section className="panel compact">
        <form className="filter-bar" onSubmit={apply}>
          <Field label="Numer lub nazwisko">
            <input
              type="search"
              placeholder="Szukaj rezerwacji…"
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            />
          </Field>
          <Field label="Status">
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            >
              <option value="">Wszystkie</option>
              <option value="confirmed">Potwierdzone</option>
              <option value="checked_in">W trakcie pobytu</option>
              <option value="completed">Zakończone</option>
              <option value="cancelled">Anulowane</option>
            </select>
          </Field>
          {staff && (
            <Field label="Dzień pobytu">
              <input
                type="date"
                value={filter.date}
                onChange={(e) => setFilter({ ...filter, date: e.target.value })}
              />
            </Field>
          )}
          <button className="button secondary">
            <Search size={16} /> Filtruj
          </button>
        </form>
      </section>
      <Notice error={error} />
      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty title="Brak rezerwacji">
          Zmień filtry lub wybierz pokój i utwórz pierwszy pobyt.
        </Empty>
      ) : (
        <div className="panel table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Rezerwacja</th>
                  <th>Termin</th>
                  <th>Goście</th>
                  <th>Kwota</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Szczegóły</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link className="table-title" to={`/reservations/${r.id}`}>
                        {r.number}
                      </Link>
                      <small>
                        {r.guest?.name ??
                          r.guestName ??
                          `Pokój ${r.room?.number ?? r.roomNumber ?? r.roomId}`}
                      </small>
                    </td>
                    <td>
                      {dateLabel(r.checkIn)}
                      <small>do {dateLabel(r.checkOut)}</small>
                    </td>
                    <td>{r.guests} os.</td>
                    <td>
                      {money(r.pricing?.totalMinor)}
                      {r.fundingSource === 'voucher' && <small>Voucher D</small>}
                    </td>
                    <td>
                      <Badge value={r.status} />
                    </td>
                    <td>
                      <Link
                        className="icon-button"
                        aria-label={`Szczegóły rezerwacji ${r.number}`}
                        to={`/reservations/${r.id}`}
                      >
                        <ArrowRight size={18} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            total={data?.total ?? rows.length}
            pageSize={20}
            onChange={setPage}
          />
        </div>
      )}
    </>
  );
}
