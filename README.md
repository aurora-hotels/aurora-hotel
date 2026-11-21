# Aurora Hotels

Projekt C z przedmiotu Projekt Zespołowy. Aplikacja do rezerwowania pokoi i obsługi pobytu w hotelu.

Klient wybiera termin, pokój i pakiet. Recepcja obsługuje gości oraz planuje masaże i treningi. Administrator zarządza ofertą, kontami i ustawieniami.

W projekcie są:

- konta klienta, recepcji i administratora;
- dostępność pokoi, wycena, rezerwacje i zmiany pobytu;
- zameldowanie, wymeldowanie i plan usług;
- połączenia z A (masaże), B (fitness) i D (vouchery; w naszej grupie nie ma projektu D, więc działa tryb demo, który można wyłączyć);
- API hotelu dla innych grup, API usług wewnętrznych (monitoring, harmonogram, kopie) oraz testy serwera i interfejsu.

Interfejs korzysta z Reacta, serwer z Express, a dane są w SQLite. Obie części są napisane w TypeScript.

## Uruchomienie

Potrzebny jest Node.js 24.

```bash
npm run setup   # tworzy .env z sekretami i hasłem administratora, instaluje zależności, zasila bazę
npm run dev     # API na http://127.0.0.1:3001, interfejs na http://localhost:5173
```

Dane logowania administratora są w `.env` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`). Dokumentacja API działa pod `/api/docs`.

Pozostałe polecenia:

- `npm run check`: formatowanie, testy serwera i build;
- `npm run test:e2e`: testy w przeglądarce (wcześniej `npx playwright install chromium`);
- `npm run backup`: kopia bazy SQLite do katalogu `backups/`;
- `npm run service-token -- create <monitoring|scheduler|backup>`: token usługi wewnętrznej;
- `npm run jobs -- <ready|reconcile|cleanup|backup>`: zadania usług wewnętrznych, np. z crona.

W Dockerze: po `npm run setup` uruchom `docker compose up --build`. Aplikacja działa wtedy pod http://localhost:3001, a kopię bazy robi `docker compose exec hotel npm run backup`. Wdrożenie na serwer z HTTPS opisuje [Wdrożenie na VPS](docs/wdrozenie-vps.md).

Lokalny tryb demo pozwala sprawdzić scenariusz bez pozostałych aplikacji. Wspólna próba z rzeczywistymi aplikacjami A i B wymaga ich adresów i kluczy. Projekt używa danych testowych i nie obsługuje płatności.

## Dokumentacja

Cała dokumentacja zespołu jest w katalogu [`docs/`](docs/README.md):

- [cel i zakres](docs/cel-i-zakres.md), [wymagania](docs/wymagania.md), [plan prac](docs/plan-prac.md);
- [zespół i zasady współpracy](docs/zespol.md), [spotkania i decyzje](docs/spotkania/README.md);
- [budowa aplikacji](docs/budowa-aplikacji.md), [konfiguracja i uruchomienie](docs/konfiguracja.md), [wdrożenie na VPS](docs/wdrozenie-vps.md);
- [API hotelu dla innych grup](docs/api/README.md), [projekt endpointów i uprawnień](docs/api/projekt-endpointow.md), [kontrakty A/B/D](docs/api/integracje.md), [OpenAPI](docs/openapi.yaml), [OpenAPI usług wewnętrznych](docs/openapi-internal.yaml);
- [testy i odbiór](docs/testy-i-odbior.md), [scenariusz pokazu](docs/demo.md), [materiały](docs/materialy/README.md).

Zadania prowadzimy w [Jirze](https://zielinskiadis.atlassian.net/jira/software/projects/KAN/list).
