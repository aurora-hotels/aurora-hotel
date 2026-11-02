import { useState, type FormEvent } from 'react';
import { Clock3, Globe2 } from 'lucide-react';
import { errorMessage, patch } from '../api';
import { Field, FormActions, Loading, Notice, PageTitle, Submit, useResource } from '../components';
interface Settings {
  hotelName: string;
  checkInTime: string;
  checkOutTime: string;
  timeZone?: string;
  currency?: string;
}
export default function AdminSettingsPage() {
  const { data, loading, error } = useResource<Settings>('/admin/hotel-settings');
  const [busy, setBusy] = useState(false),
    [saveError, setSaveError] = useState(''),
    [success, setSuccess] = useState('');
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setSaveError('');
    setSuccess('');
    const f = new FormData(event.currentTarget);
    try {
      await patch('/admin/hotel-settings', Object.fromEntries(f.entries()));
      setSuccess('Ustawienia hotelu zostały zapisane.');
    } catch (e) {
      setSaveError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="ADMINISTRACJA"
        title="Ustawienia hotelu"
        description="Godziny doby hotelowej wyznaczają przedział, w którym można planować usługi."
      />
      <Notice error={error || saveError} success={success} />
      {loading ? (
        <Loading />
      ) : (
        data && (
          <div className="detail-grid">
            <section className="panel">
              <div className="section-heading">
                <h2>Doba hotelowa</h2>
                <Clock3 className="muted" />
              </div>
              <form className="stack" onSubmit={save}>
                <Field label="Nazwa hotelu">
                  <input
                    name="hotelName"
                    defaultValue={data.hotelName}
                    minLength={2}
                    maxLength={120}
                    required
                  />
                </Field>
                <div className="form-grid">
                  <Field label="Zameldowanie od">
                    <input
                      name="checkInTime"
                      type="time"
                      defaultValue={data.checkInTime}
                      required
                    />
                  </Field>
                  <Field label="Wymeldowanie do">
                    <input
                      name="checkOutTime"
                      type="time"
                      defaultValue={data.checkOutTime}
                      required
                    />
                  </Field>
                </div>
                <FormActions>
                  <Submit busy={busy}>Zapisz ustawienia</Submit>
                </FormActions>
              </form>
            </section>
            <section className="panel">
              <Globe2 className="panel-icon" />
              <h2>Wspólne zasady</h2>
              <dl className="detail-facts">
                <div>
                  <dt>Strefa hotelu</dt>
                  <dd>Europe/Warsaw</dd>
                </div>
                <div>
                  <dt>Waluta wyceny</dt>
                  <dd>PLN</dd>
                </div>
                <div>
                  <dt>Naliczanie pakietu</dt>
                  <dd>Raz za cały pobyt</dd>
                </div>
              </dl>
              <p className="muted">
                Daty przyjazdu i wyjazdu opisują noclegi. Terminy usług A/B mają dokładną godzinę.
                Cena jest zapisywana przy potwierdzeniu rezerwacji.
              </p>
            </section>
          </div>
        )
      )}
    </>
  );
}
