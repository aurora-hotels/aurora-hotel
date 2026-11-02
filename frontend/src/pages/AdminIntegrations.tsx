import { useState, type FormEvent } from 'react';
import { BookOpen, Cable, Copy, Edit3, KeyRound, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { api, dateLabel, errorMessage, listItems, patch, post, today, addDays } from '../api';
import {
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
import type { ApiKey, Integration, Page, Partner } from '../types';
const scopeOptions = [
  ['catalog:read', 'Odczyt oferty'],
  ['reservations:create', 'Tworzenie rezerwacji'],
  ['reservations:read', 'Odczyt własnych rezerwacji'],
  ['reservations:update', 'Zmiana własnych rezerwacji'],
  ['reservations:cancel', 'Anulowanie własnych rezerwacji'],
];
const partnerNames = { A: 'Masaże', B: 'Treningi', D: 'Vouchery' };

export default function AdminIntegrationsPage() {
  const [revision, setRevision] = useState(0),
    [keyPage, setKeyPage] = useState(1),
    [editor, setEditor] = useState<Integration | null>(null),
    [keyEditor, setKeyEditor] = useState<ApiKey | 'new' | null>(null),
    [reveal, setReveal] = useState(''),
    [copied, setCopied] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [busy, setBusy] = useState(''),
    [catalog, setCatalog] = useState<{
      partner: Partner;
      items: { id: string; name: string; durationMinutes: number }[];
    } | null>(null),
    [voucher, setVoucher] = useState(false);
  const integrations = useResource<Page<Integration>>('/admin/integrations', revision),
    keys = useResource<Page<ApiKey>>(`/admin/api-keys?page=${keyPage}&pageSize=20`, revision);
  async function test(partner: Partner) {
    setBusy(partner);
    setError('');
    setSuccess('');
    try {
      const r = await post<{ ok: boolean; message: string }>(`/admin/integrations/${partner}/test`);
      r.ok ? setSuccess(r.message) : setError(r.message);
      setRevision((v) => v + 1);
    } catch (e) {
      setError(errorMessage(e));
      setRevision((v) => v + 1);
    } finally {
      setBusy('');
    }
  }
  async function showCatalog(partner: Partner) {
    setBusy(partner);
    setError('');
    try {
      const r = await api<Page<{ id: string; name: string; durationMinutes: number }>>(
        `/admin/integrations/${partner}/catalog?pageSize=100`,
      );
      setCatalog({ partner, items: r.items });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy('');
    }
  }
  function saved() {
    setEditor(null);
    setKeyEditor(null);
    setVoucher(false);
    setRevision((v) => v + 1);
    setSuccess('Zapisano ustawienia.');
  }
  return (
    <>
      <PageTitle
        title="Integracje i API"
        description="Ustaw połączenia z grupami A, B i D. Do prób bez ich serwerów wybierz tryb demo."
      />
      <Notice error={error || integrations.error || keys.error} />
      <Notice success={success} />
      {integrations.loading && !integrations.data ? (
        <Loading />
      ) : (
        <div className="integration-grid">
          {listItems(integrations.data).map((i) => (
            <article className="panel integration-card" key={i.partner}>
              <div className="integration-header">
                <span className="partner-mark">{i.partner}</span>
                <span className={`badge ${i.enabled ? 'badge-confirmed' : 'badge-cancelled'}`}>
                  {i.enabled ? 'Włączona' : 'Wyłączona'}
                </span>
              </div>
              <h2>{partnerNames[i.partner]}</h2>
              <p className="muted">
                {i.mode === 'demo'
                  ? 'Demo: odpowiedzi z lokalnego symulatora'
                  : 'Połączenie z serwerem partnera'}
              </p>
              <div className="integration-meta">
                <span>Adres</span>
                <code>{i.baseUrl || 'Nie jest potrzebny w demo'}</code>
                <span>Klucz partnera</span>
                <b>{i.hasSecret ? 'Zapisany · ••••••••' : 'Nie zapisano'}</b>
                <span>Limit czasu</span>
                <b>{i.timeoutMs / 1000} s</b>
              </div>
              {i.lastTestAt && (
                <p className="small muted">
                  Ostatni test: {dateLabel(i.lastTestAt)}
                  <br />
                  {i.lastTestResult}
                </p>
              )}
              <div className="row-actions">
                <button className="button secondary" onClick={() => setEditor(i)}>
                  <Edit3 size={15} />
                  Ustawienia
                </button>
                <button
                  className="button secondary"
                  disabled={!!busy}
                  onClick={() => test(i.partner)}
                >
                  <RefreshCw size={15} />
                  {busy === i.partner ? 'Trwa…' : 'Testuj'}
                </button>
              </div>
              {i.partner !== 'D' ? (
                <button
                  className="text-button"
                  disabled={!!busy}
                  onClick={() => showCatalog(i.partner)}
                >
                  <BookOpen size={15} />
                  Katalog usług
                </button>
              ) : (
                i.mode === 'demo' && (
                  <button className="text-button" onClick={() => setVoucher(true)}>
                    Dodaj voucher demonstracyjny
                  </button>
                )
              )}
            </article>
          ))}
        </div>
      )}
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Klucze API partnerów</h2>
          </div>
          <button className="button primary" onClick={() => setKeyEditor('new')}>
            <Plus size={16} />
            Utwórz klucz
          </button>
        </div>
        <p className="muted">
          Utwórz klucz dla grupy i zaznacz jej uprawnienia. Grupa zobaczy tylko swoje rezerwacje.
          Skopiuj klucz po utworzeniu, bo później nie będzie można go odczytać.
        </p>
        {keys.loading && !keys.data ? (
          <Loading />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Klucz</th>
                  <th>Uprawnienia</th>
                  <th>Stan</th>
                  <th>Ostatnie użycie</th>
                  <th>
                    <span className="sr-only">Edycja</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {listItems(keys.data).map((k) => (
                  <tr key={k.id}>
                    <td>
                      <strong>{k.name}</strong>
                      <small>Partner {k.partner}</small>
                    </td>
                    <td>
                      {k.scopes.map((s) => (
                        <code className="scope-chip" key={s}>
                          {s}
                        </code>
                      ))}
                      {!k.scopes.length && <small>Brak uprawnień</small>}
                    </td>
                    <td>
                      <span className={`badge ${k.active ? 'badge-confirmed' : 'badge-cancelled'}`}>
                        {k.active ? 'Aktywny' : 'Wyłączony'}
                      </span>
                    </td>
                    <td>{dateLabel(k.lastUsedAt)}</td>
                    <td>
                      <button
                        className="button secondary small-button"
                        onClick={() => setKeyEditor(k)}
                      >
                        Edytuj
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!keys.data?.total && <p className="empty">Nie utworzono jeszcze kluczy.</p>}
          </div>
        )}
        <Pagination
          page={keyPage}
          total={keys.data?.total ?? 0}
          pageSize={20}
          onChange={setKeyPage}
        />
      </section>
      <section className="info-strip">
        <Cable size={28} />
        <div>
          <h3>Dokumentacja API</h3>
          <p>
            Nasze endpointy zaczynają się od <code>/api/v1</code>. Partner przekazuje swój klucz w
            nagłówku <code>X-API-Key</code>. Przykłady żądań i formaty odpowiedzi znajdziesz w
            dokumentacji API.
          </p>
          <a className="text-button" href="/api/docs" target="_blank" rel="noreferrer">
            Otwórz dokumentację API
          </a>
        </div>
      </section>
      {editor && (
        <IntegrationEditor value={editor} onClose={() => setEditor(null)} onSaved={saved} />
      )}{' '}
      {keyEditor && (
        <KeyEditor
          value={keyEditor === 'new' ? null : keyEditor}
          onClose={() => setKeyEditor(null)}
          onSaved={(key) => {
            saved();
            if (key) {
              setReveal(key);
              setCopied(false);
            }
          }}
        />
      )}{' '}
      {reveal && (
        <Modal title="Zapisz nowy klucz API" onClose={() => setReveal('')}>
          <div className="stack">
            <Notice success="Klucz jest gotowy. Skopiuj go przed zamknięciem okna." />
            <Field label="Nowy klucz API">
              <textarea readOnly rows={3} value={reveal} onFocus={(e) => e.target.select()} />
            </Field>
            <p className="muted small">
              Przekaż klucz osobie, z którą łączysz systemy. Nie zapisuj go w repozytorium. Jeśli
              klucz zginie, wyłącz go i utwórz nowy.
            </p>
            <Notice error={error} />
            <FormActions>
              <button
                className="button secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(reveal);
                    setCopied(true);
                  } catch {
                    setError('Nie udało się skopiować. Zaznacz klucz i skopiuj go ręcznie.');
                  }
                }}
              >
                <Copy size={16} />
                {copied ? 'Skopiowano' : 'Kopiuj klucz'}
              </button>
              <button className="button primary" onClick={() => setReveal('')}>
                Zapisane, zamknij
              </button>
            </FormActions>
          </div>
        </Modal>
      )}{' '}
      {catalog && (
        <Modal title={`Katalog partnera ${catalog.partner}`} onClose={() => setCatalog(null)}>
          <p className="muted">
            Przepisz ID wybranej usługi do pakietu. W trybie rzeczywistym katalog pochodzi z API
            partnera.
          </p>
          <table>
            <thead>
              <tr>
                <th>Usługa</th>
                <th>ID</th>
                <th>Czas</th>
              </tr>
            </thead>
            <tbody>
              {catalog.items.map((i) => (
                <tr key={i.id}>
                  <td>{i.name}</td>
                  <td>
                    <code>{i.id}</code>
                  </td>
                  <td>{i.durationMinutes} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Modal>
      )}{' '}
      {voucher && <DemoVoucher onClose={() => setVoucher(false)} onSaved={saved} />}
    </>
  );
}
function IntegrationEditor({
  value,
  onClose,
  onSaved,
}: {
  value: Integration;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState(value.mode),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [removeSecret, setRemoveSecret] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(event.currentTarget),
      secret = String(f.get('secret'));
    const body = {
      mode,
      enabled: f.get('enabled') === 'on',
      baseUrl: String(f.get('baseUrl')),
      timeoutMs: Number(f.get('timeoutMs')),
      authHeader: String(f.get('authHeader')),
      demoScenario: String(f.get('demoScenario')),
      ...(removeSecret ? { secret: '' } : secret ? { secret } : {}),
    };
    try {
      await patch(`/admin/integrations/${value.partner}`, body);
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`Integracja ${value.partner}: ${partnerNames[value.partner]}`}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="stack" onSubmit={save}>
        <Notice error={error} />
        <label className="check-field">
          <input name="enabled" type="checkbox" defaultChecked={value.enabled} />
          Integracja włączona
        </label>
        <Field label="Tryb integracji">
          <select value={mode} onChange={(e) => setMode(e.target.value as Integration['mode'])}>
            <option value="demo">Demo (lokalny symulator)</option>
            <option value="real">API partnera</option>
          </select>
        </Field>
        <Field
          label="Adres bazowy API partnera"
          hint="Wpisz adres uzgodniony z drugą grupą. Host musi być dopuszczony w konfiguracji serwera."
        >
          <input
            name="baseUrl"
            type="url"
            defaultValue={value.baseUrl}
            required={mode === 'real'}
            maxLength={1000}
            placeholder="https://api.partner.example"
          />
        </Field>
        <div className="form-grid">
          <Field label="Limit odpowiedzi (ms)">
            <input
              name="timeoutMs"
              type="number"
              min="1000"
              max="30000"
              step="100"
              defaultValue={value.timeoutMs}
              required
            />
          </Field>
          <Field label="Nagłówek autoryzacji">
            <select name="authHeader" defaultValue={value.authHeader ?? 'X-API-Key'}>
              <option>X-API-Key</option>
              <option>Authorization</option>
            </select>
          </Field>
        </div>
        <Field
          label="Nowy klucz partnera"
          hint={
            value.hasSecret
              ? 'Klucz jest zapisany. Zostaw puste pole, jeśli go nie zmieniasz.'
              : 'Wpisz klucz od drugiej grupy. Dla nagłówka Authorization prefiks Bearer dodamy automatycznie.'
          }
        >
          <input
            name="secret"
            type="password"
            maxLength={2000}
            autoComplete="new-password"
            disabled={removeSecret}
          />
        </Field>
        {value.hasSecret && (
          <label className="check-field">
            <input
              type="checkbox"
              checked={removeSecret}
              onChange={(e) => setRemoveSecret(e.target.checked)}
            />
            Usuń zapisany klucz
          </label>
        )}
        <Field
          label="Scenariusz demo"
          hint="Wybierz odpowiedź symulatora, żeby sprawdzić poprawny przebieg albo awarię."
        >
          <select name="demoScenario" defaultValue={value.demoScenario ?? 'normal'}>
            <option value="normal">Poprawna odpowiedź</option>
            <option value="reject">Odrzucenie rezerwacji</option>
            <option value="timeout">Przekroczony czas odpowiedzi</option>
            <option value="timeout_after_success">Sukces u partnera, utracona odpowiedź</option>
            <option value="invalid_json">Niepoprawny JSON</option>
            <option value="unavailable">Serwer niedostępny</option>
            <option value="completed">Usługa wykonana</option>
          </select>
        </Field>
        <FormActions>
          <Submit busy={busy}>Zapisz integrację</Submit>
        </FormActions>
      </form>
    </Modal>
  );
}
function KeyEditor({
  value,
  onClose,
  onSaved,
}: {
  value: ApiKey | null;
  onClose: () => void;
  onSaved: (key?: string) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(event.currentTarget),
      common = { name: String(f.get('name')), scopes: f.getAll('scopes').map(String) };
    try {
      const result = value
        ? await patch<ApiKey>(`/admin/api-keys/${value.id}`, {
            ...common,
            active: f.get('active') === 'on',
          })
        : await post<ApiKey & { key: string }>('/admin/api-keys', {
            ...common,
            partner: String(f.get('partner')),
          });
      onSaved('key' in result ? String(result.key) : undefined);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={value ? 'Uprawnienia klucza' : 'Nowy klucz API'}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="stack" onSubmit={save}>
        <Notice error={error} />
        <Field label="Nazwa klucza">
          <input name="name" minLength={2} maxLength={100} defaultValue={value?.name} required />
        </Field>
        {!value && (
          <Field
            label="Identyfikator partnera"
            hint="Np. A, B lub D. Klucze tej samej grupy mają wspólny dostęp do jej rezerwacji."
          >
            <input
              name="partner"
              pattern="[A-Z][A-Z0-9_-]{0,31}"
              maxLength={32}
              required
              defaultValue="D"
            />
          </Field>
        )}
        <fieldset>
          <legend>Dozwolone operacje</legend>
          {scopeOptions.map(([scope, label]) => (
            <label className="check-field" key={scope}>
              <input
                name="scopes"
                value={scope}
                type="checkbox"
                defaultChecked={value?.scopes.includes(scope) ?? false}
              />
              <span>
                {label}
                <small>
                  <code>{scope}</code>
                </small>
              </span>
            </label>
          ))}
        </fieldset>
        {value && (
          <label className="check-field">
            <input name="active" type="checkbox" defaultChecked={value.active} />
            Klucz aktywny
          </label>
        )}
        <FormActions>
          <Submit busy={busy}>{value ? 'Zapisz uprawnienia' : 'Utwórz klucz'}</Submit>
        </FormActions>
      </form>
    </Modal>
  );
}
function DemoVoucher({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(event.currentTarget);
    try {
      await post('/admin/demo-vouchers', Object.fromEntries(f.entries()));
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Voucher do demonstracji"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="stack" onSubmit={save}>
        <Notice error={error} />
        <p className="muted">Te same dane wpisz potem przy rezerwacji pokoju w recepcji.</p>
        <Field label="Numer vouchera">
          <input name="reference" minLength={3} maxLength={100} required />
        </Field>
        <Field label="ID hotelowej części">
          <input name="componentId" minLength={3} maxLength={100} required />
        </Field>
        <div className="form-grid">
          <Field label="Ważny od">
            <input type="date" name="validFrom" defaultValue={today()} required />
          </Field>
          <Field label="Ważny do">
            <input type="date" name="validUntil" defaultValue={addDays(today(), 365)} required />
          </Field>
        </div>
        <FormActions>
          <Submit busy={busy}>Dodaj voucher demo</Submit>
        </FormActions>
      </form>
    </Modal>
  );
}
