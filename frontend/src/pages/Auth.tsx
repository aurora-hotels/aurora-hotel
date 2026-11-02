import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
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
        <span className="eyebrow light">ZAPLANUJ SWÓJ POBYT</span>
        <h1>
          Chwila spokoju
          <br />
          zaczyna się tutaj.
        </h1>
        <p>
          Wybierz pokój, sprawdź terminy i miej wszystkie informacje o pobycie w jednym miejscu.
        </p>
        <div className="auth-emblem">
          <Sparkles size={52} strokeWidth={1} />
          <span>AURORA</span>
        </div>
        <small>Projekt studencki C · dane demonstracyjne</small>
      </section>
      <section className="auth-form">
        <span className="eyebrow">TWOJE KONTO</span>
        <h2>{register ? 'Miło Cię poznać' : 'Witaj ponownie'}</h2>
        <p className="muted">
          {register
            ? 'Załóż konto, aby zapisać pierwszą rezerwację.'
            : 'Zaloguj się, aby zarządzać swoim pobytem.'}
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
                ? 'Co najmniej 10 znaków. Użyj innego hasła niż do prywatnych kont.'
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
          <Submit busy={busy}>
            {register ? 'Utwórz konto' : 'Zaloguj się'} <ArrowRight size={17} />
          </Submit>
        </form>
        <p className="auth-switch">
          {register ? 'Masz już konto?' : 'Pierwszy raz tutaj?'}{' '}
          <Link to={register ? '/login' : '/register'}>
            {register ? 'Zaloguj się' : 'Utwórz konto'}
          </Link>
        </p>
        <p className="privacy-note">
          <ShieldCheck size={17} /> Używaj danych testowych. To aplikacja przygotowana na zajęcia.
        </p>
      </section>
    </div>
  );
}
