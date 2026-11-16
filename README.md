# Aurora Hotels

Projekt C z przedmiotu Projekt Zespołowy. Aplikacja do rezerwowania pokoi i obsługi pobytu w hotelu.

Klient wybiera termin, pokój i pakiet. Recepcja obsługuje gości oraz planuje masaże i treningi. Administrator zarządza ofertą, kontami i ustawieniami.

W projekcie są:

- konta klienta, recepcji i administratora;
- dostępność pokoi, wycena, rezerwacje i zmiany pobytu;
- zameldowanie, wymeldowanie i plan usług;
- połączenia z A (masaże), B (fitness) i D (vouchery);
- API hotelu oraz testy serwera i interfejsu.

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
- `npm run backup`: kopia bazy SQLite do katalogu `backups/`.

W Dockerze: po `npm run setup` uruchom `docker compose up --build`. Aplikacja działa wtedy pod http://localhost:3001, a kopię bazy robi `docker compose exec hotel npm run backup`.

Lokalny tryb demo pozwala sprawdzić scenariusz bez pozostałych aplikacji. Wspólna próba z rzeczywistymi A/B/D jest jeszcze do wykonania. Projekt używa danych testowych i nie obsługuje płatności.

[Dokumentacja zespołu](https://zielinskiadis.atlassian.net/wiki/spaces/KAN) · [Jira](https://zielinskiadis.atlassian.net/jira/software/projects/KAN/list) · [OpenAPI](docs/openapi.yaml)
