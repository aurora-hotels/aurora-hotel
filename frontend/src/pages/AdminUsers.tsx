import { useState, type FormEvent } from 'react';
import { Edit3, KeyRound, Plus } from 'lucide-react';
import { errorMessage, listItems, patch, post } from '../api';
import { useAuth } from '../auth';
import {
  Badge,
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
import type { Page, User } from '../types';
export default function AdminUsersPage() {
  const [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [editor, setEditor] = useState<User | 'new' | null>(null),
    [reset, setReset] = useState<User | null>(null),
    [success, setSuccess] = useState('');
  const { data, loading, error } = useResource<Page<User>>(
    `/admin/users?page=${page}&pageSize=20`,
    revision,
  );
  const { user, refreshUser } = useAuth();
  async function saved() {
    setEditor(null);
    setReset(null);
    setRevision((v) => v + 1);
    setSuccess(
      'Zapisano konto. Zmiana roli lub blokada wylogowuje użytkownika ze wszystkich urządzeń.',
    );
    await refreshUser();
  }
  return (
    <>
      <PageTitle
        title="Konta i uprawnienia"
        description="Dodaj konto, zmień rolę lub zablokuj dostęp. Pracownik ustawi własne hasło przy pierwszym logowaniu."
      >
        <button className="button primary" onClick={() => setEditor('new')}>
          <Plus size={17} />
          Dodaj konto
        </button>
      </PageTitle>
      <Notice success={success} />
      <Notice error={error} />
      {loading ? (
        <Loading />
      ) : (
        <div className="panel table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Użytkownik</th>
                  <th>Rola</th>
                  <th>Dostęp</th>
                  <th>Działania</th>
                </tr>
              </thead>
              <tbody>
                {listItems(data).map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>
                        {u.name}
                        {u.id === user?.id ? ' (Ty)' : ''}
                      </strong>
                      <small>{u.email}</small>
                      {u.mustChangePassword && <small>Wymagana zmiana hasła</small>}
                    </td>
                    <td>
                      <Badge value={u.role} />
                    </td>
                    <td>
                      <span className={`badge ${u.active ? 'badge-confirmed' : 'badge-cancelled'}`}>
                        {u.active ? 'Aktywne' : 'Zablokowane'}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="button secondary small-button"
                          aria-label={`Edytuj konto ${u.email}`}
                          onClick={() => setEditor(u)}
                        >
                          <Edit3 size={15} />
                          Edytuj
                        </button>
                        <button
                          className="button secondary small-button"
                          aria-label={`Resetuj hasło ${u.email}`}
                          onClick={() => setReset(u)}
                        >
                          <KeyRound size={15} />
                          Hasło
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={data?.total ?? 0} pageSize={20} onChange={setPage} />
        </div>
      )}
      {editor && (
        <UserEditor
          account={editor === 'new' ? null : editor}
          onClose={() => setEditor(null)}
          onSaved={saved}
        />
      )}{' '}
      {reset && <ResetPassword account={reset} onClose={() => setReset(null)} onSaved={saved} />}
    </>
  );
}
function UserEditor({
  account,
  onClose,
  onSaved,
}: {
  account: User | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(event.currentTarget),
      common = {
        name: String(f.get('name')),
        phone: String(f.get('phone')),
        role: String(f.get('role')),
      };
    try {
      account
        ? await patch(`/admin/users/${account.id}`, { ...common, active: f.get('active') === 'on' })
        : await post('/admin/users', {
            ...common,
            email: String(f.get('email')),
            password: String(f.get('password')),
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
      title={account ? 'Edytuj konto' : 'Nowe konto'}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="stack" onSubmit={save}>
        <Notice error={error} />
        <Field label="Imię i nazwisko">
          <input name="name" defaultValue={account?.name} minLength={2} maxLength={120} required />
        </Field>
        {!account && (
          <Field label="Adres e-mail">
            <input name="email" type="email" required maxLength={254} />
          </Field>
        )}
        <Field label="Telefon">
          <input name="phone" type="tel" defaultValue={account?.phone} maxLength={30} />
        </Field>
        <Field label="Rola użytkownika">
          <select name="role" defaultValue={account?.role ?? 'receptionist'}>
            <option value="client">Klient</option>
            <option value="receptionist">Recepcja</option>
            <option value="admin">Administrator</option>
          </select>
        </Field>
        {account ? (
          <label className="check-field">
            <input type="checkbox" name="active" defaultChecked={account.active} />
            Konto aktywne
          </label>
        ) : (
          <Field
            label="Hasło tymczasowe"
            hint="Minimum 10 znaków. Przekaż hasło bezpośrednio właścicielowi konta."
          >
            <input
              name="password"
              type="password"
              minLength={10}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          </Field>
        )}
        <FormActions>
          <button className="button secondary" type="button" onClick={onClose} disabled={busy}>
            Wróć
          </button>
          <Submit busy={busy}>Zapisz konto</Submit>
        </FormActions>
      </form>
    </Modal>
  );
}
function ResetPassword({
  account,
  onClose,
  onSaved,
}: {
  account: User;
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
      await post(`/admin/users/${account.id}/reset-password`, {
        temporaryPassword: String(f.get('password')),
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
      title="Ustaw hasło tymczasowe"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="stack" onSubmit={save}>
        <p>
          Konto: <strong>{account.email}</strong>. Dotychczasowe sesje zostaną zakończone.
          Użytkownik zmieni hasło po zalogowaniu.
        </p>
        <Notice error={error} />
        <Field label="Nowe hasło tymczasowe">
          <input
            type="password"
            name="password"
            minLength={10}
            maxLength={128}
            required
            autoComplete="new-password"
          />
        </Field>
        <FormActions>
          <Submit busy={busy}>Zresetuj hasło</Submit>
        </FormActions>
      </form>
    </Modal>
  );
}
