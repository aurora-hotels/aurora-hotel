import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BedDouble } from 'lucide-react';
import { post, errorMessage } from '../api';
import { useAuth } from '../auth';
import { Field, Notice, Submit } from '../components';

export default function AuthPage({ register = false }: { register?: boolean }) {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const payload = {
        email: String(form.get('email')),
        password: String(form.get('password')),
        ...(register ? { name: String(form.get('name')) } : {}),
      };
      await post(`/auth/${register ? 'register' : 'login'}`, payload);
      await refreshUser();
      const next = params.get('next');
      navigate(next?.startsWith('/') && !next.startsWith('//') ? next : '/reservations');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <section className="auth-story">
        <h1>Twoje rezerwacje</h1>
        <p>
          Po zalogowaniu sprawdzisz swoje pobyty, zmienisz termin rezerwacji i zobaczysz usługi
          umówione przez recepcję.
        </p>
        <div className="auth-emblem">
          <BedDouble size={52} strokeWidth={1} />
          <span>AURORA</span>
        </div>
      </section>
      <section className="auth-form">
        <h2>{register ? 'Załóż konto' : 'Logowanie'}</h2>
        <p className="muted">
          {register
            ? 'Załóż konto, aby zapisać pierwszą rezerwację.'
            : 'Podaj e-mail i hasło do swojego konta.'}
        </p>
        <Notice error={error} />
        <form onSubmit={submit} className="stack">
          {register && (
            <Field label="Imię i nazwisko">
              <input name="name" autoComplete="name" minLength={2} maxLength={120} required />
            </Field>
          )}
          <Field label="Adres e-mail">
            <input name="email" type="email" autoComplete="email" maxLength={254} required />
          </Field>
          <Field
            label="Hasło"
            hint={
              register
                ? 'Minimum 10 znaków. Nie używaj hasła ze swojego prywatnego konta.'
                : undefined
            }
          >
            <input
              name="password"
              type="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              minLength={register ? 10 : 1}
              maxLength={128}
              required
            />
          </Field>
          <Submit busy={busy}>{register ? 'Utwórz konto' : 'Zaloguj się'}</Submit>
        </form>
        <p className="auth-switch">
          {register ? 'Masz już konto?' : 'Nie masz konta?'}{' '}
          <Link to={register ? '/login' : '/register'}>
            {register ? 'Zaloguj się' : 'Utwórz konto'}
          </Link>
        </p>
        <p className="privacy-note">To wersja na zajęcia. W formularzu podawaj dane testowe.</p>
      </section>
    </div>
  );
}
