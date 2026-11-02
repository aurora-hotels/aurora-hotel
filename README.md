# Aurora Hotels — projekt C

Aplikacja do obsługi jednego hotelu, przygotowana na przedmiot Projekt Zespołowy. Klient wybiera pokój i rezerwuje pobyt. Recepcja obsługuje gości oraz terminy masaży i treningów. Administrator zmienia ofertę, konta i ustawienia połączeń z innymi projektami.

Projekt korzysta z fikcyjnych danych. Nie obsługuje prawdziwych płatności, faktur ani sprzedaży voucherów. Sprzedaż i rozliczenie voucherów należą do projektu D.

## Uruchomienie

Potrzebny jest **Node.js 24 LTS** z npm oraz Git. Wszystkie komendy wykonuj w głównym katalogu repozytorium.

```bash
git clone https://github.com/aurora-hotels/aurora-hotel.git
cd aurora-hotel
npm run setup
npm run dev
```

Otwórz **http://localhost:5173**. Backend działa pod **http://localhost:3001**. Skrypt `setup` instaluje zależności z pliku blokady, tworzy lokalną konfigurację i przygotowuje bazę demonstracyjną. Login i losowo wygenerowane hasło administratora znajdziesz w polach `ADMIN_EMAIL` i `ADMIN_PASSWORD` pliku `.env`. Nie wysyłaj tego pliku do GitHuba ani do innych grup.

Zwykły klient zakłada własne konto przez formularz. Konta recepcji tworzy administrator. Powtórne zasilenie bazy nie powinno usuwać zapisanych pobytów; do tego służy `npm run seed`.

## Zbudowana aplikacja pod jednym adresem

Przed uruchomieniem ustaw w `.env` wartość `APP_ORIGIN=http://localhost:3001`. Przy powrocie do Vite przywróć `http://localhost:5173`.

```bash
npm run build
npm start
```

W tym trybie otwórz **http://localhost:3001**. Dla uruchomienia pod innym adresem zmień konfigurację zgodnie z [instrukcją konfiguracji](docs/konfiguracja.md). Publiczne wdrożenie wymaga HTTPS, trwałego katalogu bazy oraz własnych sekretów.

Można też uruchomić wydanie przez Docker: po przygotowaniu `.env` wykonaj `docker compose up --build -d`. Szczegóły i zatrzymanie opisano w [konfiguracji](docs/konfiguracja.md).

## Sprawdzenie zmian

```bash
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Testy automatyczne sprawdzają zachowanie naszego kodu i adapterów. Współpraca z rzeczywistymi A/B/D wymaga dodatkowo wspólnej próby, ponieważ adresy, klucze i ostateczne kontrakty należą do pozostałych grup. Lista prób ręcznych jest w [testach manualnych](docs/testy-manualne.md).

## Gdzie czego szukać

| Potrzebuję…                                        | Dokument                                                                                 |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Uruchomić aplikację, zmienić port lub konfigurację | [Konfiguracja i uruchomienie](docs/konfiguracja.md)                                      |
| Wywoływać API hotelu z projektu D                  | [API C — krótka instrukcja](docs/api.md)                                                 |
| Uzgodnić połączenia z A/B/D                        | [Kontrakty partnerów](docs/integracje.md)                                                |
| Dokładnie sprawdzić pola endpointów                | [OpenAPI](docs/openapi.yaml), lokalnie `http://localhost:3001/api/docs`                  |
| Zrozumieć kod i model danych                       | [Architektura](docs/architektura.md)                                                     |
| Przeczytać opis wykonanej wersji                   | [Sprawozdanie](docs/sprawozdanie.md)                                                     |
| Sprawdzić testy i zgodność z wymaganiami           | [Pokrycie testów](docs/test-coverage.md), [przegląd wymagań](docs/requirements-audit.md) |
| Przygotować pokaz                                  | [Scenariusz demonstracji](docs/demo.md)                                                  |
| Sprawdzić zakres i kolejność prac                  | [Plan i wymagania](docs/plan.md)                                                         |
| Zapisać własny wkład i odbiór                      | [Zespół](docs/zespol.md), [wsparcie narzędzi](docs/wsparcie-ai.md)                       |

## Organizacja kodu

- `frontend/` — interfejs React i formularze;
- `backend/src/` — API, uprawnienia, reguły hotelu i baza;
- `backend/src/integrations/` — adaptery A/B/D oraz jawny tryb demonstracyjny;
- `backend/tests/`, `frontend/e2e/` — testy serwera i przeglądarki;
- `docs/` — instrukcje i kontrakt API;
- `scripts/` — przygotowanie środowiska i kopia bazy.

Używamy TypeScript, Express, React, Vite i SQLite. Zamiast proponowanego w pierwszym planie Prisma zapis do SQLite jest bezpośredni, przez moduł `node:sqlite`. Dzięki temu początek transakcji rezerwacji (`BEGIN IMMEDIATE`) i moment sprawdzenia konfliktów są widoczne w kodzie. Nie jest potrzebny osobny serwer bazy.

Zadania są w [Jirze](https://zielinskiadis.atlassian.net/jira/software/projects/KAN/list), a materiały organizacyjne w [Confluence](https://zielinskiadis.atlassian.net/wiki/spaces/KAN).
