import { useState, type FormEvent } from 'react';
import { BedDouble, Edit3, Plus, Trash2, Waves } from 'lucide-react';
import { errorMessage, listItems, money, patch, post } from '../api';
import {
  Empty,
  Field,
  FormActions,
  Loading,
  Modal,
  Notice,
  PageTitle,
  Pagination,
  Submit,
  useResource,
} from '../components';
import type { PackageItem, Page, Room, StayPackage } from '../types';

export default function AdminOfferPage() {
  const [tab, setTab] = useState<'rooms' | 'packages'>('rooms'),
    [revision, setRevision] = useState(0),
    [page, setPage] = useState(1),
    [room, setRoom] = useState<Room | 'new' | null>(null),
    [pkg, setPkg] = useState<StayPackage | 'new' | null>(null),
    [success, setSuccess] = useState('');
  const rooms = useResource<Page<Room>>(`/admin/rooms?page=${page}&pageSize=20`, revision),
    packages = useResource<Page<StayPackage>>(`/admin/packages?page=${page}&pageSize=20`, revision);
  function saved() {
    setRoom(null);
    setPkg(null);
    setRevision((v) => v + 1);
    setSuccess('Zapisano ofertę. Istniejące rezerwacje zachowują swoje ceny.');
  }
  return (
    <>
      <PageTitle
        title="Pokoje i pakiety"
        description="Dodaj pokoje i pakiety lub zmień ich ceny. Wyłączona oferta pozostanie widoczna w starszych rezerwacjach."
      >
        <button
          className="button primary"
          onClick={() => (tab === 'rooms' ? setRoom('new') : setPkg('new'))}
        >
          <Plus size={17} />
          {tab === 'rooms' ? 'Dodaj pokój' : 'Dodaj pakiet'}
        </button>
      </PageTitle>
      <div className="tabs" role="tablist" aria-label="Oferta">
        <button
          role="tab"
          aria-selected={tab === 'rooms'}
          onClick={() => {
            setTab('rooms');
            setPage(1);
          }}
        >
          <BedDouble size={18} />
          Pokoje
        </button>
        <button
          role="tab"
          aria-selected={tab === 'packages'}
          onClick={() => {
            setTab('packages');
            setPage(1);
          }}
        >
          <Waves size={18} />
          Pakiety
        </button>
      </div>
      <Notice success={success} />
      <Notice error={tab === 'rooms' ? rooms.error : packages.error} />
      {(tab === 'rooms' ? rooms.loading : packages.loading) ? (
        <Loading />
      ) : (
        <div className="panel table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{tab === 'rooms' ? 'Pokój' : 'Pakiet'}</th>
                  <th>{tab === 'rooms' ? 'Miejsca' : 'Usługi'}</th>
                  <th>Cena</th>
                  <th>Widoczność</th>
                  <th>
                    <span className="sr-only">Edycja</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tab === 'rooms'
                  ? listItems(rooms.data).map((r) => (
                      <tr key={r.id}>
                        <td>
                          <strong>
                            {r.number} · {r.type}
                          </strong>
                          <small>{r.description}</small>
                        </td>
                        <td>{r.capacity} os.</td>
                        <td>
                          {money(r.nightlyRateMinor)}
                          <small>za noc</small>
                        </td>
                        <td>
                          <span
                            className={`badge ${r.active ? 'badge-confirmed' : 'badge-cancelled'}`}
                          >
                            {r.active ? 'Aktywny' : 'Nieaktywny'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="button secondary small-button"
                            onClick={() => setRoom(r)}
                            aria-label={`Edytuj pokój ${r.number}`}
                          >
                            <Edit3 size={15} />
                            Edytuj
                          </button>
                        </td>
                      </tr>
                    ))
                  : listItems(packages.data).map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.name}</strong>
                          <small>{p.description}</small>
                        </td>
                        <td>
                          {p.items.map((i) => `${i.name} × ${i.quantity}`).join(', ') ||
                            'Brak dodatków'}
                        </td>
                        <td>
                          {money(p.priceMinor)}
                          <small>za cały pobyt</small>
                        </td>
                        <td>
                          <span
                            className={`badge ${p.active ? 'badge-confirmed' : 'badge-cancelled'}`}
                          >
                            {p.active ? 'Aktywny' : 'Nieaktywny'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="button secondary small-button"
                            onClick={() => setPkg(p)}
                            aria-label={`Edytuj pakiet ${p.name}`}
                          >
                            <Edit3 size={15} />
                            Edytuj
                          </button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          {!(tab === 'rooms' ? rooms.data?.total : packages.data?.total) && (
            <Empty title="Brak pozycji w ofercie">Dodaj pierwszy pokój lub pakiet.</Empty>
          )}
          <Pagination
            page={page}
            total={(tab === 'rooms' ? rooms.data?.total : packages.data?.total) ?? 0}
            pageSize={20}
            onChange={setPage}
          />
        </div>
      )}
      {room && (
        <RoomEditor
          room={room === 'new' ? null : room}
          onClose={() => setRoom(null)}
          onSaved={saved}
        />
      )}{' '}
      {pkg && (
        <PackageEditor
          pkg={pkg === 'new' ? null : pkg}
          onClose={() => setPkg(null)}
          onSaved={saved}
        />
      )}
    </>
  );
}
function RoomEditor({
  room,
  onClose,
  onSaved,
}: {
  room: Room | null;
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
    const body = {
      number: String(f.get('number')),
      type: String(f.get('type')),
      description: String(f.get('description')),
      capacity: Number(f.get('capacity')),
      nightlyRateMinor: Math.round(Number(f.get('price')) * 100),
      equipment: String(f.get('equipment'))
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
      active: f.get('active') === 'on',
    };
    try {
      room ? await patch(`/admin/rooms/${room.id}`, body) : await post('/admin/rooms', body);
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={room ? `Pokój ${room.number}` : 'Nowy pokój'}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="stack" onSubmit={save}>
        <Notice error={error} />
        <div className="form-grid">
          <Field label="Numer pokoju">
            <input name="number" defaultValue={room?.number} maxLength={20} required />
          </Field>
          <Field label="Nazwa typu pokoju">
            <input name="type" defaultValue={room?.type} minLength={2} maxLength={80} required />
          </Field>
          <Field label="Liczba miejsc">
            <input
              name="capacity"
              type="number"
              min="1"
              max="30"
              defaultValue={room?.capacity ?? 2}
              required
            />
          </Field>
          <Field label="Cena za noc (PLN)">
            <input
              name="price"
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              defaultValue={(room?.nightlyRateMinor ?? 25000) / 100}
              required
            />
          </Field>
        </div>
        <Field label="Opis pokoju">
          <textarea name="description" rows={3} defaultValue={room?.description} maxLength={2000} />
        </Field>
        <Field label="Wyposażenie" hint="Oddziel elementy przecinkami, np. Wi-Fi, biurko, balkon.">
          <input name="equipment" defaultValue={room?.equipment.join(', ')} />
        </Field>
        <label className="check-field">
          <input name="active" type="checkbox" defaultChecked={room?.active ?? true} />
          Pokój aktywny w ofercie
        </label>
        <FormActions>
          <button type="button" className="button secondary" disabled={busy} onClick={onClose}>
            Wróć
          </button>
          <Submit busy={busy}>Zapisz pokój</Submit>
        </FormActions>
      </form>
    </Modal>
  );
}
function PackageEditor({
  pkg,
  onClose,
  onSaved,
}: {
  pkg: StayPackage | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [items, setItems] = useState<PackageItem[]>(pkg?.items.map(({ id, ...i }) => i) ?? []),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  function change(index: number, patch: Partial<PackageItem>) {
    setItems((old) => old.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(event.currentTarget);
    const body = {
      name: String(f.get('name')),
      description: String(f.get('description')),
      priceMinor: Math.round(Number(f.get('price')) * 100),
      active: f.get('active') === 'on',
      items,
    };
    try {
      pkg ? await patch(`/admin/packages/${pkg.id}`, body) : await post('/admin/packages', body);
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={pkg ? 'Edytuj pakiet' : 'Nowy pakiet'}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="stack" onSubmit={save}>
        <Notice error={error} />
        <div className="form-grid">
          <Field label="Nazwa pakietu">
            <input name="name" defaultValue={pkg?.name} minLength={2} maxLength={120} required />
          </Field>
          <Field label="Dopłata za pobyt (PLN)">
            <input
              name="price"
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              defaultValue={(pkg?.priceMinor ?? 0) / 100}
              required
            />
          </Field>
        </div>
        <Field label="Opis pakietu">
          <textarea name="description" defaultValue={pkg?.description} maxLength={2000} rows={3} />
        </Field>
        <label className="check-field">
          <input name="active" type="checkbox" defaultChecked={pkg?.active ?? true} />
          Pakiet aktywny w ofercie
        </label>
        <div className="section-heading">
          <h3>Usługi w pakiecie</h3>
          <button
            className="text-button"
            type="button"
            onClick={() =>
              setItems([...items, { name: '', partner: 'HOTEL', offerId: '', quantity: 1 }])
            }
          >
            <Plus size={15} />
            Dodaj usługę
          </button>
        </div>
        <p className="muted small">
          Wpisz liczbę usług dla całego pakietu. ID masażu lub treningu znajdziesz w katalogu
          partnera na stronie Integracje i API.
        </p>
        {items.map((item, i) => (
          <div className="nested-card" key={i}>
            <div className="form-grid">
              <Field label={`Usługa ${i + 1}: nazwa`}>
                <input
                  value={item.name}
                  minLength={2}
                  maxLength={120}
                  required
                  onChange={(e) => change(i, { name: e.target.value })}
                />
              </Field>
              <Field label="Realizator">
                <select
                  value={item.partner}
                  onChange={(e) => change(i, { partner: e.target.value as PackageItem['partner'] })}
                >
                  <option value="HOTEL">Hotel</option>
                  <option value="A">A: masaże</option>
                  <option value="B">B: treningi</option>
                </select>
              </Field>
              <Field label="ID oferty u partnera">
                <input
                  value={item.offerId}
                  required={item.partner !== 'HOTEL'}
                  maxLength={100}
                  onChange={(e) => change(i, { offerId: e.target.value })}
                />
              </Field>
              <Field label="Liczba usług">
                <input
                  type="number"
                  min="1"
                  max="30"
                  required
                  value={item.quantity}
                  onChange={(e) => change(i, { quantity: Number(e.target.value) })}
                />
              </Field>
            </div>
            <button
              type="button"
              className="text-button danger-text"
              onClick={() => setItems(items.filter((_, j) => j !== i))}
            >
              <Trash2 size={15} />
              Usuń z pakietu
            </button>
          </div>
        ))}
        <FormActions>
          <button type="button" className="button secondary" disabled={busy} onClick={onClose}>
            Wróć
          </button>
          <Submit busy={busy}>Zapisz pakiet</Submit>
        </FormActions>
      </form>
    </Modal>
  );
}
