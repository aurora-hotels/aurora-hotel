import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const day = (offset: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};
async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Adres e-mail').fill(email);
  await page.getByLabel('Hasło', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Zaloguj się' }).click();
  await expect(page).toHaveURL(/\/reservations$/);
}
async function post(
  page: Page,
  route: string,
  data: unknown,
  headers: Record<string, string> = {},
) {
  const csrf = await (await page.request.get('/api/v1/auth/csrf')).json();
  return page.request.post(`/api/v1${route}`, {
    data,
    headers: { 'X-CSRF-Token': csrf.csrfToken, ...headers },
  });
}

test('Klient zakłada konto, rezerwuje pokój, zmienia termin i anuluje pobyt', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/register');
  await page.getByLabel('Imię i nazwisko').fill('Student Testowy');
  await page.getByLabel('Adres e-mail').fill(`student-${randomUUID()}@e2e.test`);
  await page.getByLabel('Hasło').fill('Student-password-2026');
  await page.getByRole('button', { name: 'Utwórz konto' }).click();
  await expect(page.getByRole('heading', { name: 'Moje rezerwacje' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Brak rezerwacji' })).toBeVisible();
  await page.goto('/rooms');
  await page.getByLabel('Przyjazd', { exact: true }).fill(day(60));
  await page.getByLabel('Wyjazd', { exact: true }).fill(day(63));
  await page.getByLabel('Liczba gości', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Sprawdź dostępność', exact: true }).click();
  await page.getByRole('button', { name: 'Wybierz pokój' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Wybierz pokój' }).first().click();
  await page.getByLabel('Gość 2: imię i nazwisko').fill('Anna Testowa');
  await page.getByLabel('Telefon', { exact: true }).fill('+48123456789');
  await page.getByRole('button', { name: 'Potwierdź rezerwację' }).click();
  await expect(page).toHaveURL(/\/reservations\/[^/]+$/);
  await expect(page.getByText('Potwierdzona', { exact: true })).toBeVisible();
  const id = page.url().split('/').at(-1)!;
  await page.getByRole('button', { name: 'Zmień termin lub gości' }).click();
  await page.getByLabel('Nowy przyjazd').fill(day(64));
  await page.getByLabel('Nowy wyjazd').fill(day(67));
  await page.getByRole('button', { name: 'Potwierdź zmianę i cenę' }).click();
  await expect(page.getByText('Zapisano zmiany pobytu.')).toBeVisible();
  expect((await (await page.request.get(`/api/v1/reservations/${id}`)).json()).checkIn).toBe(
    day(64),
  );
  await page.getByRole('button', { name: 'Anuluj rezerwację', exact: true }).click();
  await page.getByRole('button', { name: 'Tak, anuluj rezerwację' }).click();
  await expect(page.getByText('Anulowana', { exact: true })).toBeVisible();
  expect((await (await page.request.get(`/api/v1/reservations/${id}`)).json()).status).toBe(
    'cancelled',
  );
  expect(errors).toEqual([]);
});

test('Recepcja planuje masaż, melduje i wymeldowuje gościa', async ({ page }) => {
  await login(page, 'reception@e2e.test', 'E2e-reception-password-2026');
  const created = await post(
    page,
    '/reservations',
    {
      roomId: 'room-202',
      packageId: 'package-active',
      checkIn: day(80),
      checkOut: day(83),
      guests: 1,
      expectedTotalMinor: 122000,
      guest: { name: 'Gość Recepcji', email: 'guest@e2e.test', phone: '' },
      guestNames: ['Gość Recepcji'],
    },
    { 'Idempotency-Key': randomUUID() },
  );
  expect(created.status()).toBe(201);
  const reservation = await created.json();
  await page.goto(`/reservations/${reservation.id}`);
  const massage = page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'Masaż relaksacyjny', exact: true }) });
  await massage.getByRole('button', { name: 'Zaplanuj termin' }).click();
  await page.getByLabel('Początek usługi').fill(`${day(81)}T10:00`);
  await page.getByLabel('Koniec usługi').fill(`${day(81)}T11:00`);
  await page.getByRole('button', { name: 'Sprawdź dostępność usługi' }).click();
  await expect(page.getByText('Termin jest wolny. Możesz zarezerwować usługę.')).toBeVisible();
  await page.getByRole('button', { name: 'Zarezerwuj usługę' }).click();
  await expect(massage.getByText('ID u partnera:')).toBeVisible();
  await page.getByRole('button', { name: 'Zameldowanie', exact: true }).click();
  await expect(
    page.locator('.page-title').getByText('W trakcie pobytu', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Wymeldowanie', exact: true }).click();
  await expect(page.locator('.page-title').getByText('Zakończona', { exact: true })).toBeVisible();
  expect(
    (await (await page.request.get(`/api/v1/reservations/${reservation.id}`)).json()).status,
  ).toBe('completed');
  await expect(page.getByRole('button', { name: 'Zameldowanie', exact: true })).not.toBeVisible();
});

test('Telefon: formularz logowania działa z klawiatury, a oferta mieści się na ekranie', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByLabel('Adres e-mail').focus();
  await page.keyboard.type('reception@e2e.test');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Hasło', { exact: true })).toBeFocused();
  await page.keyboard.type('E2e-reception-password-2026');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Pulpit rezerwacji' })).toBeVisible();
  await page.goto('/rooms');
  await expect(page.getByRole('button', { name: 'Sprawdź dostępność', exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
});

test('Administrator dodaje pokój, zmienia cenę i wycofuje go z oferty', async ({ page }) => {
  await login(page, 'admin@e2e.test', 'E2e-admin-password-2026');
  await page.goto('/admin/offer');
  const number = `E2E-${randomUUID().slice(0, 6)}`;
  await page.getByRole('button', { name: 'Dodaj pokój' }).click();
  await page.getByLabel('Numer pokoju').fill(number);
  await page.getByLabel('Nazwa typu pokoju').fill('Pokój demonstracyjny');
  await page.getByLabel('Liczba miejsc').fill('3');
  await page.getByLabel('Cena za noc (PLN)').fill('345.67');
  await page.getByLabel('Opis pokoju').fill('Pokój używany tylko w automatycznej próbie.');
  await page.getByRole('button', { name: 'Zapisz pokój' }).click();
  const edit = page.getByRole('button', { name: `Edytuj pokój ${number}`, exact: true });
  await expect(edit).toBeVisible();
  let catalog = await (await page.request.get('/api/v1/rooms?pageSize=100')).json();
  expect(catalog.items.find((x: any) => x.number === number)?.nightlyRateMinor).toBe(34567);
  await edit.click();
  await page.getByLabel('Cena za noc (PLN)').fill('400');
  await page.getByLabel('Pokój aktywny w ofercie').uncheck();
  await page.getByRole('button', { name: 'Zapisz pokój' }).click();
  await expect(
    page.getByRole('row').filter({ has: edit }).getByText('Nieaktywny', { exact: true }),
  ).toBeVisible();
  catalog = await (await page.request.get('/api/v1/rooms?pageSize=100')).json();
  expect(catalog.items.some((x: any) => x.number === number)).toBe(false);
});

test('Administrator zmienia scenariusz integracji i odbiera dostęp kluczowi partnera', async ({
  page,
  playwright,
}) => {
  await login(page, 'admin@e2e.test', 'E2e-admin-password-2026');
  await page.goto('/admin/integrations');
  const massage = page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'Masaże', exact: true }) });
  await massage.getByRole('button', { name: 'Ustawienia' }).click();
  await page.getByLabel('Scenariusz demo').selectOption('unavailable');
  await page.getByRole('button', { name: 'Zapisz integrację' }).click();
  await massage.getByRole('button', { name: 'Testuj', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('niedostępna');
  await massage.getByRole('button', { name: 'Ustawienia' }).click();
  await page.getByLabel('Scenariusz demo').selectOption('normal');
  await page.getByRole('button', { name: 'Zapisz integrację' }).click();
  const name = `Partner E2E ${randomUUID().slice(0, 5)}`;
  await page.getByRole('button', { name: 'Utwórz klucz', exact: true }).click();
  await page.getByLabel('Nazwa klucza').fill(name);
  await page.getByLabel('Identyfikator partnera').fill('D');
  await page.getByLabel('Odczyt oferty').check();
  await page.getByRole('dialog').getByRole('button', { name: 'Utwórz klucz', exact: true }).click();
  const secret = await page
    .getByRole('textbox', { name: 'Nowy klucz API', exact: true })
    .inputValue();
  expect(secret).toMatch(/^aurora_/);
  await page.getByRole('button', { name: 'Zapisane, zamknij' }).click();
  const partner = await playwright.request.newContext({
    baseURL: 'http://127.0.0.1:5174',
    extraHTTPHeaders: { 'X-API-Key': secret },
  });
  try {
    expect((await partner.get('/api/v1/rooms')).status()).toBe(200);
    await page
      .getByRole('row')
      .filter({ hasText: name })
      .getByRole('button', { name: 'Edytuj', exact: true })
      .click();
    await page.getByLabel('Klucz aktywny').uncheck();
    await page.getByRole('button', { name: 'Zapisz uprawnienia' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    expect((await partner.get('/api/v1/rooms')).status()).toBe(401);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Integracje i API' })).toBeVisible();
    await expect(
      page.getByRole('textbox', { name: 'Nowy klucz API', exact: true }),
    ).not.toBeVisible();
    expect(await page.locator('body').textContent()).not.toContain(secret);
  } finally {
    await partner.dispose();
  }
});

test('Voucher demo przechodzi przez formularze do potwierdzenia hotelu w D', async ({ page }) => {
  await login(page, 'admin@e2e.test', 'E2e-admin-password-2026');
  await page.goto('/admin/integrations');
  const reference = `E2E-V-${randomUUID()}`;
  const component = `hotel-${randomUUID()}`;
  await page.getByRole('button', { name: 'Dodaj voucher demonstracyjny' }).click();
  await page.getByLabel('Numer vouchera').fill(reference);
  await page.getByLabel('ID hotelowej części').fill(component);
  await page.getByRole('button', { name: 'Dodaj voucher demo', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.goto('/rooms');
  await page.getByLabel('Przyjazd', { exact: true }).fill(day(90));
  await page.getByLabel('Wyjazd', { exact: true }).fill(day(93));
  await page.getByLabel('Liczba gości', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Sprawdź dostępność', exact: true }).click();
  await page.getByRole('button', { name: 'Wybierz pokój' }).first().click();
  await page.getByText('Powiąż voucher partnera D (opcjonalnie)', { exact: true }).click();
  await page.getByLabel('Numer vouchera').fill(reference);
  await page.getByLabel('ID hotelowej części').fill(component);
  await page.getByRole('button', { name: 'Potwierdź rezerwację' }).click();
  await expect(page.getByRole('heading', { name: 'Hotelowa część vouchera' })).toBeVisible();
  await page.getByRole('button', { name: 'Zameldowanie', exact: true }).click();
  await expect(
    page.locator('.page-title').getByText('W trakcie pobytu', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Wymeldowanie', exact: true }).click();
  await expect(page.getByText('Potwierdzono w D', { exact: true })).toBeVisible();
  await expect(page.locator('.page-title').getByText('Zakończona', { exact: true })).toBeVisible();
  expect(await page.locator('body').textContent()).not.toContain(reference);
});
