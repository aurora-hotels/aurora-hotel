import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  DoorOpen,
  Edit3,
  RefreshCw,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { api, dateLabel, errorMessage, listItems, money, nights, patch, post, today } from '../api';
import { isStaff, useAuth } from '../auth';
import {
  Badge,
  Empty,
  Field,
  FormActions,
  Loading,
  Modal,
  Notice,
  PageTitle,
  Submit,
  useResource,
} from '../components';
import type { Page, PlanItem, Reservation, Room, StayPackage, StayPlan } from '../types';

// Formularz podaje czas warszawski, niezależnie od strefy ustawionej w przeglądarce.
function warsawInstant(local: string): string {
  const target = Date.parse(local + ':00Z');
  if (!Number.isFinite(target)) throw new Error('Podaj poprawny termin usługi.');
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

export default function ReservationDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const staff = isStaff(user);
  const [revision, setRevision] = useState(0),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(false),
    [cancel, setCancel] = useState(false),
    [service, setService] = useState<PlanItem | null>(null),
    [noteItem, setNoteItem] = useState<PlanItem | null>(null),
    [editGuests, setEditGuests] = useState(false);
  const resource = useResource<Reservation>(`/reservations/${id}`, revision);
  const planResource = useResource<StayPlan>(`/reservations/${id}/plan`, revision);
  const reservation = resource.data;
  async function action(path: string, message: string) {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await post(`/reservations/${id}${path}`);
      setSuccess(message);
      setCancel(false);
      setRevision((v) => v + 1);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (resource.loading && !reservation) return <Loading />;
  if (!reservation)
    return (
      <>
        <Notice error={resource.error} />
        <Link to="/reservations">Wróć do rezerwacji</Link>
      </>
    );
  const canEdit = reservation.status === 'confirmed' && (staff || reservation.checkIn > today());
  const plan = planResource.data;
  return (
    <>
      <Link className="back-link" to="/reservations">
        <ArrowLeft size={16} /> Wszystkie rezerwacje
      </Link>
      <PageTitle
        eyebrow="SZCZEGÓŁY POBYTU"
        title={reservation.number}
        description={`Pokój ${reservation.room?.number ?? reservation.roomNumber ?? ''} · ${reservation.room?.type ?? 'Aurora Hotels'}`}
      >
        <Badge value={reservation.status} />
      </PageTitle>
      <Notice error={error || resource.error} />
      <Notice success={success} />
      <div className="detail-grid">
        <section className="panel">
          <div className="section-heading">
            <h2>Twój pobyt</h2>
            <CalendarDays className="muted" />
          </div>
          <div className="stay-dates">
            <div>
              <small>Przyjazd</small>
              <strong>{dateLabel(reservation.checkIn)}</strong>
            </div>
            <ChevronRight size={23} />
            <div>
              <small>Wyjazd</small>
              <strong>{dateLabel(reservation.checkOut)}</strong>
            </div>
          </div>
          <div className="detail-facts">
            <div>
              <span>Liczba nocy</span>
              <b>{reservation.pricing.nights}</b>
            </div>
            <div>
              <span>Liczba gości</span>
              <b>{reservation.guests}</b>
            </div>
            <div>
              <span>Nocleg</span>
              <b>{money(reservation.pricing.nightlyRateMinor)} / noc</b>
            </div>
            <div>
              <span>Pakiet</span>
              <b>{money(reservation.pricing.packagePriceMinor)}</b>
            </div>
            <div className="total">
              <span>Łączna cena</span>
              <b>{money(reservation.pricing.totalMinor)}</b>
            </div>
          </div>
          <p className="muted small">
            {reservation.fundingSource === 'voucher'
              ? 'Pobyt powiązany z voucherem partnera D.'
              : 'Rezerwacja bez vouchera. Płatności są poza zakresem aplikacji.'}
          </p>
          {canEdit && (
            <div className="form-actions">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  setError('');
                  setEdit(true);
                }}
              >
                <Edit3 size={16} /> Zmień termin lub gości
              </button>
              <button
                className="button danger-quiet"
                disabled={busy}
                onClick={() => setCancel(true)}
              >
                Anuluj rezerwację
              </button>
            </div>
          )}
          {staff && (
            <div className="staff-actions">
              {reservation.status === 'confirmed' && (
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => action('/check-in', 'Goście zostali zameldowani.')}
                >
                  <Check size={17} /> Zameldowanie
                </button>
              )}
              {reservation.status === 'checked_in' && (
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() =>
                    action(
                      '/check-out',
                      'Pobyt został zakończony. Stan potwierdzenia w D jest widoczny poniżej.',
                    )
                  }
                >
                  <DoorOpen size={17} /> Wymeldowanie
                </button>
              )}
            </div>
          )}
        </section>
        <section className="panel">
          <div className="section-heading">
            <h2>Goście i kontakt</h2>
            <UserRound className="muted" />
          </div>
          <div className="contact-card">
            <strong>{reservation.guest.name}</strong>
            <a href={`mailto:${reservation.guest.email}`}>{reservation.guest.email}</a>
            {reservation.guest.phone && (
              <a href={`tel:${reservation.guest.phone}`}>{reservation.guest.phone}</a>
            )}
          </div>
          <ol className="guest-list">
            {reservation.guestNames.map((name, i) => (
              <li key={i}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                {name}
              </li>
            ))}
          </ol>
          <small className="muted">Dane służą do obsługi tego pobytu.</small>
          {staff && !['completed', 'cancelled'].includes(reservation.status) && (
            <div className="form-actions">
              <button className="button secondary" onClick={() => setEditGuests(true)}>
                Edytuj dane gości
              </button>
            </div>
          )}
        </section>
      </div>
      {reservation.fundingSource === 'voucher' && (
        <section className="panel voucher-panel">
          <ShieldCheck size={30} />
          <div>
            <h2>Hotelowa część vouchera</h2>
            <p>
              Identyfikator części: <code>{reservation.hotelComponentId}</code>
            </p>
            <p>
              Potwierdzenie wykonania: <Badge value={plan?.voucher?.status ?? 'not_reported'} />
            </p>
            {plan?.voucher?.error && <Notice error={plan.voucher.error} />}
          </div>
          {staff && (
            <div className="stack">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  action('/voucher/check', 'Voucher został zweryfikowany u partnera D.')
                }
              >
                Sprawdź voucher
              </button>
              {reservation.status === 'completed' && (
                <button
                  className="button primary"
                  disabled={busy || plan?.voucher?.status === 'reported'}
                  onClick={() =>
                    action(
                      '/voucher/confirm-completion',
                      'Odczytano wynik potwierdzenia wykonania noclegu. Sprawdź status vouchera.',
                    )
                  }
                >
                  Potwierdź wykonanie w D
                </button>
              )}
            </div>
          )}
        </section>
      )}
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">USŁUGI W PAKIECIE</p>
            <h2>Plan pobytu</h2>
          </div>
          <button
            className="button secondary"
            onClick={() => setRevision((v) => v + 1)}
            disabled={busy || planResource.loading}
          >
            <RefreshCw size={16} /> Odśwież widok
          </button>
        </div>
        <p className="muted">
          {staff
            ? 'Uzgodnij terminy z gościem. Każda usługa ma osobne potwierdzenie partnera.'
            : 'Terminy masaży i treningów ustala recepcja. Tutaj zobaczysz ich aktualne potwierdzenia.'}
        </p>
        <Notice error={planResource.error} />
        {planResource.loading && !plan ? (
          <Loading />
        ) : !plan?.items?.length ? (
          <Empty title="Sam nocleg">Do tej rezerwacji nie dodano usług pakietu.</Empty>
        ) : (
          <div className="plan-list">
            {plan.items.map((item) => (
              <article className="plan-item" key={item.id}>
                <div className="plan-item-heading">
                  <div>
                    <span className="eyebrow">
                      {item.partner === 'HOTEL' ? 'AURORA HOTELS' : `PARTNER ${item.partner}`} ·{' '}
                      {reservation.guestNames[item.guestIndex ?? 0]}
                    </span>
                    <h3>{item.name}</h3>
                  </div>
                  <Badge value={item.status} />
                </div>
                {item.note && <p className="muted">{item.note}</p>}
                {(item.bookings ?? []).map((booking) => (
                  <div className="booking-row" key={booking.id}>
                    <div>
                      <strong>{dateLabel(booking.startsAt)}</strong>
                      <small>do {dateLabel(booking.endsAt)}</small>
                      {booking.externalId && (
                        <small>
                          ID u partnera: <code>{booking.externalId}</code>
                        </small>
                      )}
                      {booking.error && <p className="inline-error">{booking.error}</p>}
                    </div>
                    <Badge value={booking.status} />
                    {staff && (
                      <div className="row-actions">
                        <button
                          className="button secondary small-button"
                          disabled={busy}
                          onClick={() =>
                            action(
                              `/partner-bookings/${booking.id}/refresh`,
                              'Odczytano aktualny stan usługi.',
                            )
                          }
                        >
                          Sprawdź u partnera
                        </button>
                        {!['cancelled', 'completed', 'rejected'].includes(booking.status) && (
                          <button
                            className="button danger-quiet small-button"
                            disabled={busy}
                            onClick={() =>
                              action(
                                `/partner-bookings/${booking.id}/cancel`,
                                'Odczytano wynik anulowania usługi. Sprawdź jej status.',
                              )
                            }
                          >
                            Anuluj usługę
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {staff && !['completed', 'cancelled'].includes(reservation.status) && (
                  <div className="form-actions">
                    {item.partner !== 'HOTEL' &&
                      !(item.bookings ?? []).some(
                        (b) => !['cancelled', 'rejected'].includes(b.status),
                      ) && (
                        <button
                          className="button secondary"
                          disabled={busy}
                          onClick={() => setService(item)}
                        >
                          Zaplanuj termin
                        </button>
                      )}
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => setNoteItem(item)}
                    >
                      {item.partner === 'HOTEL' ? 'Zmień realizację i notatkę' : 'Edytuj notatkę'}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      {editGuests && (
        <GuestEditor
          reservation={reservation}
          onClose={() => setEditGuests(false)}
          onSaved={() => {
            setEditGuests(false);
            setRevision((v) => v + 1);
            setSuccess('Dane gości zostały zapisane.');
          }}
        />
      )}
      {edit && (
        <EditStay
          reservation={reservation}
          onClose={() => setEdit(false)}
          onSaved={() => {
            setEdit(false);
            setRevision((v) => v + 1);
            setSuccess('Zmiany pobytu zostały zapisane.');
          }}
        />
      )}
      {service && (
        <ServiceBooking
          reservation={reservation}
          item={service}
          onClose={() => setService(null)}
          onSaved={() => {
            setService(null);
            setRevision((v) => v + 1);
            setSuccess('Zlecenie zostało wysłane. Sprawdź status usługi w planie pobytu.');
          }}
        />
      )}
      {noteItem && (
        <ItemNote
          reservation={reservation}
          item={noteItem}
          onClose={() => setNoteItem(null)}
          onSaved={() => {
            setNoteItem(null);
            setRevision((v) => v + 1);
            setSuccess('Zapisano dane usługi.');
          }}
        />
      )}
      {cancel && (
        <Modal
          title="Anulować rezerwację?"
          onClose={() => {
            if (!busy) setCancel(false);
          }}
        >
          <p>
            Pokój zostanie zwolniony. Jeśli pobyt zawiera usługi partnerów, najpierw sprawdzimy
            wynik ich anulowania.
          </p>
          <Notice error={error} />
          <FormActions>
            <button className="button secondary" disabled={busy} onClick={() => setCancel(false)}>
              Zachowaj rezerwację
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={() => action('/cancel', 'Rezerwacja została anulowana.')}
            >
              {busy ? 'Anulowanie…' : 'Tak, anuluj rezerwację'}
            </button>
          </FormActions>
        </Modal>
      )}
    </>
  );
}

function EditStay({
  reservation: r,
  onClose,
  onSaved,
}: {
  reservation: Reservation;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [checkIn, setCheckIn] = useState(r.checkIn),
    [checkOut, setCheckOut] = useState(r.checkOut),
    [guests, setGuests] = useState(r.guests),
    [names, setNames] = useState(r.guestNames),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const rooms = useResource<Page<Room>>('/rooms?pageSize=100'),
    packages = useResource<Page<StayPackage>>('/packages?pageSize=100');
  const room = listItems(rooms.data).find((x) => x.id === r.roomId),
    pkg = listItems(packages.data).find((x) => x.id === r.packageId);
  const total =
    nights(checkIn, checkOut) * (room?.nightlyRateMinor ?? r.pricing.nightlyRateMinor) +
    (pkg?.priceMinor ?? r.pricing.packagePriceMinor);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await patch(`/reservations/${r.id}`, {
        checkIn,
        checkOut,
        guests,
        guestNames: names.slice(0, guests),
        expectedVersion: r.version,
        expectedTotalMinor: total,
      });
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Zmień dane pobytu"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="stack" onSubmit={save}>
        <Notice error={error || rooms.error || packages.error} />
        <p className="muted">
          Cena będzie przeliczona według aktualnej oferty. Aktywne rezerwacje usług partnerów trzeba
          wcześniej anulować.
        </p>
        <div className="form-grid">
          <Field label="Nowy przyjazd">
            <input
              type="date"
              value={checkIn}
              min={today()}
              required
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </Field>
          <Field label="Nowy wyjazd">
            <input
              type="date"
              value={checkOut}
              min={checkIn}
              required
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </Field>
          <Field label="Liczba gości">
            <input
              type="number"
              min="1"
              max={r.room?.capacity ?? 30}
              required
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
            />
          </Field>
        </div>
        {Array.from({ length: Math.min(Math.max(guests, 0), 30) }, (_, i) => (
          <Field key={i} label={`Gość ${i + 1} — imię i nazwisko`}>
            <input
              value={names[i] ?? ''}
              minLength={2}
              maxLength={120}
              required
              onChange={(e) =>
                setNames((old) => {
                  const next = [...old];
                  next[i] = e.target.value;
                  return next;
                })
              }
            />
          </Field>
        ))}
        <div className="quote-summary">
          <span>Nowa cena pobytu</span>
          <strong>
            {Number.isFinite(total) && total >= 0 ? money(total) : 'Wybierz poprawne daty'}
          </strong>
        </div>
        <FormActions>
          <button className="button secondary" type="button" onClick={onClose} disabled={busy}>
            Wróć
          </button>
          <Submit
            busy={busy}
            disabled={rooms.loading || packages.loading || !room || checkIn >= checkOut}
          >
            Potwierdź zmianę i cenę
          </Submit>
        </FormActions>
      </form>
    </Modal>
  );
}

function ServiceBooking({
  reservation: r,
  item,
  onClose,
  onSaved,
}: {
  reservation: Reservation;
  item: PlanItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [start, setStart] = useState(`${r.checkIn}T16:00`),
    [end, setEnd] = useState(`${r.checkIn}T17:00`),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [available, setAvailable] = useState<boolean | null>(null),
    [checked, setChecked] = useState('');
  async function check(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setAvailable(null);
    try {
      const startsAt = warsawInstant(start),
        endsAt = warsawInstant(end);
      const query = new URLSearchParams({ itemId: item.id, startsAt, endsAt });
      const result = await api<{ items: { available: boolean }[] }>(
        `/reservations/${r.id}/partner-availability?${query}`,
      );
      setAvailable(result.items.some((x) => x.available));
      setChecked(start + '|' + end);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function book() {
    setBusy(true);
    setError('');
    try {
      await post(`/reservations/${r.id}/partner-bookings`, {
        itemId: item.id,
        guestIndex: item.guestIndex ?? 0,
        startsAt: warsawInstant(start),
        endsAt: warsawInstant(end),
      });
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`Termin: ${item.name}`}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={check} className="stack">
        <p>
          Dla: <strong>{r.guestNames[item.guestIndex ?? 0]}</strong>. Wszystkie godziny w strefie
          Europe/Warsaw.
        </p>
        <Notice error={error} />
        <Field label="Początek usługi">
          <input
            type="datetime-local"
            required
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              setAvailable(null);
            }}
          />
        </Field>
        <Field label="Koniec usługi">
          <input
            type="datetime-local"
            required
            value={end}
            min={start}
            onChange={(e) => {
              setEnd(e.target.value);
              setAvailable(null);
            }}
          />
        </Field>
        {available !== null && (
          <Notice
            {...(available
              ? { success: 'Termin jest dostępny. Możesz wysłać rezerwację.' }
              : { error: 'Ten termin nie jest dostępny. Wybierz inny.' })}
          />
        )}
        <FormActions>
          <button className="button secondary" disabled={busy}>
            {busy ? 'Sprawdzanie…' : 'Sprawdź dostępność usługi'}
          </button>
          <button
            type="button"
            className="button primary"
            disabled={busy || !available || checked !== start + '|' + end}
            onClick={book}
          >
            Zarezerwuj usługę
          </button>
        </FormActions>
      </form>
    </Modal>
  );
}

function ItemNote({
  reservation: r,
  item,
  onClose,
  onSaved,
}: {
  reservation: Reservation;
  item: PlanItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [note, setNote] = useState(item.note ?? ''),
    [status, setStatus] = useState(item.status),
    [guestIndex, setGuestIndex] = useState(item.guestIndex ?? 0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await patch(`/reservations/${r.id}/items/${item.id}`, {
        note,
        ...(guestIndex !== (item.guestIndex ?? 0) ? { guestIndex } : {}),
        ...(item.partner === 'HOTEL' ? { status } : {}),
      });
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={item.name}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="stack" onSubmit={save}>
        <Notice error={error} />
        {item.partner === 'HOTEL' && (
          <Field label="Stan realizacji">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="unplanned">Do realizacji</option>
              <option value="completed">Wykonano</option>
              <option value="cancelled">Anulowano</option>
            </select>
          </Field>
        )}
        <Field
          label="Przypisany gość"
          hint="Zmiana przypisania jest możliwa przed potwierdzeniem usługi u partnera."
        >
          <select value={guestIndex} onChange={(e) => setGuestIndex(Number(e.target.value))}>
            {r.guestNames.map((name, i) => (
              <option key={i} value={i}>
                {name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notatka">
          <textarea
            rows={4}
            value={note}
            maxLength={2000}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <FormActions>
          <Submit busy={busy}>Zapisz notatkę</Submit>
        </FormActions>
      </form>
    </Modal>
  );
}

function GuestEditor({
  reservation: r,
  onClose,
  onSaved,
}: {
  reservation: Reservation;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(event.currentTarget);
    try {
      await patch(`/reservations/${r.id}/guests`, {
        expectedVersion: r.version,
        guestNames: r.guestNames.map((_, i) => String(f.get(`guest-${i}`))),
        guest: {
          name: String(f.get('name')),
          email: String(f.get('email')),
          phone: String(f.get('phone')),
        },
      });
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Dane gości i kontakt"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={save} className="stack">
        <Notice error={error} />
        <p className="muted small">
          Przed zmianą danych osoby przypisanej do aktywnej usługi trzeba uzgodnić jej anulowanie u
          partnera.
        </p>
        <Field label="Osoba kontaktowa">
          <input name="name" defaultValue={r.guest.name} minLength={2} maxLength={120} required />
        </Field>
        <div className="form-grid">
          <Field label="E-mail kontaktowy">
            <input
              name="email"
              type="email"
              defaultValue={r.guest.email}
              maxLength={254}
              required
            />
          </Field>
          <Field label="Telefon">
            <input name="phone" type="tel" defaultValue={r.guest.phone} maxLength={30} />
          </Field>
        </div>
        {r.guestNames.map((name, i) => (
          <Field key={i} label={`Gość ${i + 1} — imię i nazwisko`}>
            <input name={`guest-${i}`} defaultValue={name} minLength={2} maxLength={120} required />
          </Field>
        ))}
        <FormActions>
          <Submit busy={busy}>Zapisz dane gości</Submit>
        </FormActions>
      </form>
    </Modal>
  );
}
