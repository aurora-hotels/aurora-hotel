import { useState, type FormEvent } from 'react';
import { KeyRound, UserRound } from 'lucide-react';
import { useAuth } from '../auth';
import { patch, post, errorMessage } from '../api';
import { Badge, Field, FormActions, Notice, PageTitle, Submit } from '../components';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [success, setSuccess] = useState('');
  async function save(event: FormEvent<HTMLFormElement>, password = false) {
    event.preventDefault();
    const element = event.currentTarget,
      form = new FormData(element);
    setBusy(password ? 'password' : 'profile');
    setError('');
    setSuccess('');
    try {
      if (password) {
        if (form.get('newPassword') !== form.get('repeatPassword'))
          throw new Error('Nowe hasła muszą być takie same.');
        await post('/me/change-password', {
          currentPassword: String(form.get('currentPassword')),
          newPassword: String(form.get('newPassword')),
        });
        element.reset();
      } else
        await patch('/me', {
          name: String(form.get('name')),
          phone: String(form.get('phone')),
          email: String(form.get('email')),
        });
      await refreshUser();
      setSuccess(
        password
          ? 'Hasło zmienione. Na pozostałych urządzeniach trzeba zalogować się ponownie.'
          : 'Zapisano dane konta.',
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy('');
    }
  }
  return (
    <>
      <PageTitle title="Profil" description="Zmień dane kontaktowe lub hasło." />
      <Notice error={error} success={success} />
      {user?.mustChangePassword && (
        <Notice error="Masz hasło tymczasowe. Ustaw nowe hasło, żeby korzystać z konta." />
      )}
      <div className="two-columns">
        <section className="panel">
          <div className="panel-heading">
            <UserRound />
            <h2>Dane kontaktowe</h2>
            <Badge value={user?.role ?? 'client'} />
          </div>
          <form onSubmit={(e) => save(e)} className="stack">
            <Field label="Imię i nazwisko">
              <input name="name" defaultValue={user?.name} required minLength={2} maxLength={120} />
            </Field>
            <Field label="E-mail">
              <input
                name="email"
                type="email"
                defaultValue={user?.email}
                required
                maxLength={254}
              />
            </Field>
            <Field label="Telefon">
              <input name="phone" type="tel" defaultValue={user?.phone ?? ''} maxLength={30} />
            </Field>
            <FormActions>
              <Submit busy={busy === 'profile'} disabled={!!busy}>
                Zapisz dane
              </Submit>
            </FormActions>
          </form>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <KeyRound />
            <h2>Zmiana hasła</h2>
          </div>
          <form onSubmit={(e) => save(e, true)} className="stack">
            <Field label="Obecne hasło">
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
              />
            </Field>
            <Field label="Nowe hasło" hint="Co najmniej 10 znaków.">
              <input
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={10}
                maxLength={128}
              />
            </Field>
            <Field label="Powtórz nowe hasło">
              <input
                name="repeatPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={10}
                maxLength={128}
              />
            </Field>
            <FormActions>
              <Submit busy={busy === 'password'} disabled={!!busy}>
                Zmień hasło
              </Submit>
            </FormActions>
          </form>
        </section>
      </div>
    </>
  );
}
