import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api, errorMessage } from './api';

export function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-title">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {children}
    </header>
  );
}
export function Notice({ error, success }: { error?: string | null; success?: string | null }) {
  if (!error && !success) return null;
  return (
    <div className={`notice ${error ? 'error' : 'success'}`} role={error ? 'alert' : 'status'}>
      {error ? <AlertCircle size={19} /> : <CheckCircle2 size={19} />}
      <span>{error || success}</span>
    </div>
  );
}
export function Empty({
  title = 'Nie ma jeszcze wpisów',
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-symbol">—</div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={22} /> Wczytywanie…
    </div>
  );
}
export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="modal"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Zamknij okno">
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Submit({
  busy,
  children,
  ...props
}: {
  busy: boolean;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button type="submit" className="button primary" {...props} disabled={busy || props.disabled}>
      {busy ? (
        <>
          <LoaderCircle size={17} className="spin" /> Zapisywanie…
        </>
      ) : (
        children
      )}
    </button>
  );
}
const labels: Record<string, string> = {
  confirmed: 'Potwierdzona',
  checked_in: 'W trakcie pobytu',
  completed: 'Zakończona',
  cancelled: 'Anulowana',
  unplanned: 'Do zaplanowania',
  pending: 'Oczekuje',
  unknown: 'Do wyjaśnienia',
  rejected: 'Odrzucona',
  cancel_pending: 'Anulowanie w toku',
  not_reported: 'Do potwierdzenia w D',
  reported: 'Potwierdzono w D',
  client: 'Klient',
  receptionist: 'Recepcja',
  admin: 'Administrator',
};
export function Badge({ value }: { value: string }) {
  return <span className={`badge badge-${value}`}>{labels[value] ?? value}</span>;
}
export function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  if (total <= pageSize) return null;
  return (
    <div className="pagination">
      <span>
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} z {total}
      </span>
      <button
        className="button secondary"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="Poprzednia strona"
      >
        <ChevronLeft size={16} />
      </button>
      <button
        className="button secondary"
        onClick={() => onChange(page + 1)}
        disabled={page * pageSize >= total}
        aria-label="Następna strona"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
export function useResource<T>(path: string, revision = 0) {
  const [data, setData] = useState<T | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError('');
    api<T>(path)
      .then((value) => {
        if (current) setData(value);
      })
      .catch((e) => {
        if (current) setError(errorMessage(e));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [path, revision]);
  return { data, loading, error, setData };
}
export function FormActions({ children }: { children: ReactNode }) {
  return <div className="form-actions">{children}</div>;
}
export type FormSubmit = (event: FormEvent<HTMLFormElement>) => void;
