import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  Check,
  Coffee,
  Search,
  Users,
  Waves,
} from 'lucide-react';
import { api, post, errorMessage, money, today, addDays, nights, listItems } from '../api';
import { useAuth, isStaff } from '../auth';
import {
  Empty,
  Field,
  FormActions,
  Loading,
  Modal,
  Notice,
  Submit,
  useResource,
} from '../components';
import type { Page, Reservation, Room, StayPackage } from '../types';

export default function RoomsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const roomsResource = useResource<Page<Room>>('/rooms?pageSize=100'),
    packagesResource = useResource<Page<StayPackage>>('/packages?pageSize=100');
  const [checkIn, setCheckIn] = useState(addDays(today(), 1)),
    [checkOut, setCheckOut] = useState(addDays(today(), 3)),
    [guests, setGuests] = useState(2),
    [packageId, setPackageId] = useState('');
  const [results, setResults] = useState<Room[] | null>(null),
    [searched, setSearched] = useState(false),
    [searching, setSearching] = useState(false),
    [error, setError] = useState('');
  const [chosen, setChosen] = useState<Room | null>(null),
    [booking, setBooking] = useState(false),
    [bookingError, setBookingError] = useState('');
  const [operation, setOperation] = useState({ key: crypto.randomUUID(), body: '' });
  const [quote, setQuote] = useState({ checkIn: '', checkOut: '', guests: 0, packageId: '' });
  const packages = listItems(packagesResource.data),
    selectedPackage = packages.find((p) => p.id === (chosen ? quote.packageId : packageId));
  const rooms = results ?? listItems(roomsResource.data);
  async function search(event: FormEvent) {
    event.preventDefault();
    setSearching(true);
    setError('');
    setChosen(null);
    try {
      const query = new URLSearchParams({
        checkIn,
        checkOut,
        guests: String(guests),
        ...(packageId ? { packageId } : {}),
      });
      const result = await api<Page<Room>>(`/availability?${query}`);
      setResults(listItems(result));
      setSearched(true);
      setQuote({ checkIn, checkOut, guests, packageId });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSearching(false);
    }
  }
  function price(room: Room) {
    return (
      room.pricing?.totalMinor ??
      nights(quote.checkIn, quote.checkOut) * room.nightlyRateMinor +
        (packages.find((p) => p.id === quote.packageId)?.priceMinor ?? 0)
    );
  }
  async function reserve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chosen) return;
    const form = new FormData(event.currentTarget);
    setBooking(true);
    setBookingError('');
    const payload = {
      roomId: chosen.id,
      checkIn: quote.checkIn,
      checkOut: quote.checkOut,
      guests: quote.guests,
      ...(quote.packageId ? { packageId: quote.packageId } : {}),
      expectedTotalMinor: price(chosen),
      ...(isStaff(user) && form.get('voucherReference')
        ? {
            voucherReference: String(form.get('voucherReference')),
            hotelComponentId: String(form.get('hotelComponentId')),
          }
        : {}),
      guest: {
        name: String(form.get('name')),
        email: String(form.get('email')),
        phone: String(form.get('phone')),
      },
      guestNames: Array.from({ length: quote.guests }, (_, i) => String(form.get(`guest-${i}`))),
    };
    const body = JSON.stringify(payload),
      key = operation.body === body ? operation.key : crypto.randomUUID();
    setOperation({ body, key });
    try {
      const reservation = await post<Reservation>('/reservations', payload, {
        'Idempotency-Key': key,
      });
      navigate(`/reservations/${reservation.id}`);
    } catch (e) {
      setBookingError(errorMessage(e));
    } finally {
      setBooking(false);
    }
  }
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <h1>Rezerwacja pokoju</h1>
          <p>
            Wybierz termin i liczbę gości. Możesz zarezerwować sam nocleg lub dobrać pakiet z
            dodatkowymi usługami.
          </p>
          <div className="hero-details">
            <span>
              <BedDouble size={17} /> Oferta pokoi
            </span>
            <span>
              <Waves size={17} /> Masaże i treningi
            </span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-sun" />
          <div className="art-window">
            <i />
            <i />
            <i />
          </div>
          <div className="art-bed">
            <span />
            <span />
          </div>
        </div>
      </section>
      <section className="search-panel" aria-label="Wyszukaj dostępny pokój">
        <form onSubmit={search} className="search-grid">
          <Field label="Przyjazd">
            <input
              aria-label="Przyjazd"
              type="date"
              min={today()}
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              required
            />
          </Field>
          <Field label="Wyjazd">
            <input
              aria-label="Wyjazd"
              type="date"
              min={addDays(checkIn || today(), 1)}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              required
            />
          </Field>
          <Field label="Liczba gości">
            <input
              type="number"
              min="1"
              max="20"
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              required
            />
          </Field>
          <Field label="Pakiet">
            <select value={packageId} onChange={(e) => setPackageId(e.target.value)}>
              <option value="">Sam nocleg</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (+{money(p.priceMinor)})
                </option>
              ))}
            </select>
          </Field>
          <button className="button primary" disabled={searching}>
            <Search size={18} />
            {searching ? 'Szukamy…' : 'Sprawdź dostępność'}
          </button>
        </form>
        <Notice error={error} />
      </section>
      <div className="section-heading">
        <div>
          <h2>{searched ? 'Dostępne pokoje' : 'Pokoje'}</h2>
        </div>
        <span className="muted small">
          {searched
            ? `${quote.checkIn} do ${quote.checkOut} · ${quote.guests} os.`
            : 'Wybierz daty, aby sprawdzić dostępność'}
        </span>
      </div>
      <Notice error={roomsResource.error || packagesResource.error} />
      {roomsResource.loading ? (
        <Loading />
      ) : rooms.length === 0 ? (
        <Empty title="Brak wolnych pokoi w tym terminie">
          Spróbuj innych dat lub mniejszej liczby gości.
        </Empty>
      ) : (
        <div className="room-grid">
          {rooms.map((room, index) => (
            <article className="room-card" key={room.id}>
              <div className={`room-illustration room-tone-${index % 3}`} aria-hidden="true">
                <div className="room-window" />
                <div className="room-lamp" />
                <div className="room-bed">
                  <i />
                  <i />
                </div>
                <span className="room-number">{room.number}</span>
              </div>
              <div className="room-content">
                <div className="room-heading">
                  <h3>{room.type}</h3>
                  <span className="capacity">
                    <Users size={15} />
                    {room.capacity}
                  </span>
                </div>
                <p className="room-description">
                  {room.description || 'Opis pokoju nie został jeszcze dodany.'}
                </p>
                <div className="amenities">
                  {(room.equipment ?? []).map((amenity) => (
                    <span key={amenity}>
                      <Check size={12} />
                      {amenity}
                    </span>
                  ))}
                </div>
                <div className="room-bottom">
                  <div>
                    <strong>{money(searched ? price(room) : room.nightlyRateMinor)}</strong>
                    <small>
                      {searched
                        ? `za ${nights(quote.checkIn, quote.checkOut)} nocy${quote.packageId ? ' z pakietem' : ''}`
                        : 'za noc'}
                    </small>
                  </div>
                  {searched ? (
                    <button
                      className="button secondary"
                      onClick={() => {
                        setBookingError('');
                        setChosen(room);
                      }}
                    >
                      Wybierz pokój <ArrowRight size={16} />
                    </button>
                  ) : (
                    <span className="muted small">Najpierw wybierz termin</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <section className="info-strip">
        <Coffee size={27} />
        <div>
          <h3>Terminy masaży i treningów</h3>
          <p>
            Po rezerwacji pokoju ustal termin usługi z recepcją. Recepcja sprawdzi dostępność i
            zarezerwuje masaż lub trening u partnera.
          </p>
        </div>
        <CalendarDays size={34} />
      </section>
      {packages.length > 0 && (
        <section className="packages-section">
          <div className="section-heading">
            <div>
              <h2>Pakiety pobytowe</h2>
            </div>
            <span className="muted small">Dopłata raz za cały pobyt</span>
          </div>
          <div className="package-grid">
            {packages.map((p) => (
              <article className="package-card" key={p.id}>
                <Waves />
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <ul>
                  {(p.items ?? []).map((item, i) => (
                    <li key={i}>
                      {item.name} × {item.quantity}
                    </li>
                  ))}
                </ul>
                <strong>{money(p.priceMinor)}</strong>
              </article>
            ))}
          </div>
        </section>
      )}
      {chosen && (
        <Modal
          title={`Rezerwacja pokoju ${chosen.number}`}
          onClose={() => {
            if (!booking) setChosen(null);
          }}
        >
          {!user ? (
            <div className="stack">
              <p>Aby zapisać rezerwację, zaloguj się lub załóż konto.</p>
              <Link to="/login" className="button primary">
                Przejdź do logowania
              </Link>
            </div>
          ) : (
            <form onSubmit={reserve} className="stack">
              <div className="quote-summary">
                <span>
                  {quote.checkIn} → {quote.checkOut}
                  <br />
                  {quote.guests} os. · {selectedPackage?.name ?? 'Sam nocleg'}
                </span>
                <strong>{money(price(chosen))}</strong>
              </div>
              <p className="muted small">
                {isStaff(user)
                  ? 'Rezerwujesz pobyt dla gościa.'
                  : 'Rezerwacja będzie widoczna na Twoim koncie.'}{' '}
                W tej wersji aplikacji nie zapłacisz online.
              </p>
              <Notice error={bookingError} />
              <div className="form-grid">
                <Field label="Osoba kontaktowa">
                  <input
                    name="name"
                    defaultValue={user.name}
                    minLength={2}
                    maxLength={120}
                    required
                  />
                </Field>
                <Field label="E-mail kontaktowy">
                  <input
                    name="email"
                    type="email"
                    defaultValue={user.email}
                    maxLength={254}
                    required
                  />
                </Field>
                <Field label="Telefon">
                  <input name="phone" type="tel" defaultValue={user.phone ?? ''} maxLength={30} />
                </Field>
              </div>
              {isStaff(user) && (
                <details className="voucher-fields">
                  <summary>Powiąż voucher partnera D (opcjonalnie)</summary>
                  <p className="muted small">
                    Podaj numer vouchera i ID części hotelowej. Przed zapisem sprawdzimy je w
                    systemie grupy D.
                  </p>
                  <div className="form-grid">
                    <Field label="Numer vouchera">
                      <input name="voucherReference" maxLength={200} />
                    </Field>
                    <Field label="ID hotelowej części">
                      <input name="hotelComponentId" maxLength={100} />
                    </Field>
                  </div>
                </details>
              )}
              <h3>Goście</h3>
              <div className="form-grid">
                {Array.from({ length: quote.guests }, (_, i) => (
                  <Field label={`Gość ${i + 1}: imię i nazwisko`} key={i}>
                    <input
                      name={`guest-${i}`}
                      defaultValue={i === 0 ? user.name : ''}
                      minLength={2}
                      maxLength={120}
                      required
                    />
                  </Field>
                ))}
              </div>
              <FormActions>
                <button
                  type="button"
                  className="button secondary"
                  disabled={booking}
                  onClick={() => setChosen(null)}
                >
                  Wróć
                </button>
                <Submit busy={booking}>Potwierdź rezerwację</Submit>
              </FormActions>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
