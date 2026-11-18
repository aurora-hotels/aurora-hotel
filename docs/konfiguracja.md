# Konfiguracja i uruchomienie

Przeznaczenie: pierwszy start, zmienne środowiska, polecenia, Docker, kopie bazy i typowe problemy. Opiekun: Adrian Zieliński.

## Pierwszy start

1. Zainstaluj Node.js 24 z npm oraz Git.
2. W katalogu repozytorium uruchom `npm run setup`. Skrypt instaluje zależności, tworzy plik `.env` z losowymi sekretami i hasłem administratora oraz zasila bazę danymi startowymi.
3. Otwórz `.env` i odczytaj dane pierwszego administratora (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).
4. Uruchom `npm run dev` i wejdź na `http://localhost:5173`. API działa pod `http://127.0.0.1:3001`.
5. Jako administrator utwórz konto recepcji. Konto klienta załóż przez rejestrację.

`setup` zachowuje istniejący `.env`. Po pobraniu nowej wersji projektu wykonaj `npm ci` i `npm run seed`, a potem uruchom testy. Nie usuwaj bazy tylko po to, żeby dodać nową ofertę: `seed` dopisuje brakujące dane i nie rusza rezerwacji. Pliku `.env` nie wysyłamy do GitHuba ani do innych grup.

Dane startowe: pokoje 101 i 102 (240 zł za noc), 201 (380 zł), 202 (320 zł), 301 (520 zł) oraz pakiety „Spokojny odpoczynek” (180 zł) i „Aktywny pobyt” (260 zł).

## Zmienne środowiska

| Zmienna                       | Znaczenie                                                                  | Ustawienie lokalne                                       |
| ----------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- |
| `NODE_ENV`                    | Tryb działania serwera                                                     | `development`                                            |
| `PORT`                        | Port serwera (1–65535)                                                     | `3001`                                                   |
| `HOST`                        | Adres nasłuchiwania                                                        | `127.0.0.1`; w kontenerze `0.0.0.0`                      |
| `APP_ORIGIN`                  | Dozwolony adres interfejsu; kontrola pochodzenia żądań                     | `http://localhost:5173` dla Vite                         |
| `DATABASE_PATH`               | Plik bazy SQLite                                                           | `./data/aurora.sqlite`                                   |
| `SESSION_SECRET`              | Sekret do skrótów identyfikatorów sesji                                    | Losowany przez `setup`; w produkcji co najmniej 32 znaki |
| `CONFIG_ENCRYPTION_KEY`       | Klucz szyfrowania sekretów partnerów i numerów voucherów                   | Losowany przez `setup`; w produkcji co najmniej 32 znaki |
| `ADMIN_EMAIL`                 | E-mail pierwszego administratora                                           | `admin@aurora.local`                                     |
| `ADMIN_PASSWORD`              | Hasło pierwszego administratora, używane tylko przy pierwszym zasileniu    | Losowane przez `setup`                                   |
| `COOKIE_SECURE`               | Cookie sesji wysyłane tylko przez HTTPS                                    | `false`; w produkcji domyślnie `true`                    |
| `SESSION_HOURS`               | Czas ważności sesji (1–168 godzin)                                         | `12`                                                     |
| `PASSWORD_MIN_LENGTH`         | Minimalna długość nowego hasła (8–64)                                      | `10`                                                     |
| `MAX_STAY_NIGHTS`             | Maksymalna długość pobytu (1–365 nocy)                                     | `90`                                                     |
| `LOGIN_RATE_LIMIT`            | Limit logowań i rejestracji na minutę z jednego adresu IP (1–1000)         | `15`                                                     |
| `PUBLIC_RATE_LIMIT`           | Limit wszystkich żądań API na minutę z jednego adresu IP (1–10000)         | `300`                                                    |
| `TRUST_PROXY`                 | Liczba serwerów proxy przed aplikacją (0–10)                               | `0`; za jednym proxy, np. nginx, ustaw `1`               |
| `ALLOWED_PARTNER_HOSTS`       | Dozwolone nazwy hostów rzeczywistych API partnerów, oddzielone przecinkami | Puste, dopóki nie uzgodnimy adresów                      |
| `ALLOW_PRIVATE_PARTNER_HOSTS` | Hosty w sieci lokalnej dopuszczone jawnie; muszą być też w liście powyżej  | Puste                                                    |
| `DOCKER_APP_ORIGIN`           | Adres interfejsu w Docker Compose                                          | `http://localhost:3001`                                  |
| `BACKUP_DIR`                  | Katalog kopii bazy (polecenie `backup` i operacja W-05)                    | `backups`; w obrazie Dockera `/app/backups`              |

Błędna wartość liczbowa albo sekret krótszy niż 32 znaki w trybie produkcyjnym zatrzymują start serwera z czytelnym komunikatem.

`CONFIG_ENCRYPTION_KEY` wygenerowany przez `setup` ma 64 znaki szesnastkowe i jest używany wprost. Każda inna wartość jest skracana funkcją SHA-256 do klucza o właściwej długości. Zmiana tego klucza przy istniejącej bazie uniemożliwi odszyfrowanie zapisanych sekretów, dlatego przechowuj go razem z kopią bazy.

`TRUST_PROXY` ma znaczenie dla limitu żądań. Bez niego za serwerem proxy wszyscy użytkownicy mieliby jeden adres IP i wspólny limit.

### Hosty partnerów

Przykładowe nazwy hostów to `api-grupa-a.example,api-grupa-b.example,api-grupa-d.example`. Wpisujemy same hosty; właściwy adres z portem i prefiksem ustawia się w panelu integracji. Dopuszczenie hosta jest decyzją operatora: nie dodajemy adresów otrzymanych od użytkowników aplikacji.

Do uzgodnionych testów między lokalnymi serwerami można wpisać np. `localhost,127.0.0.1` w obu listach: `ALLOWED_PARTNER_HOSTS` i `ALLOW_PRIVATE_PARTNER_HOSTS`. Główna lista sama nie dopuszcza adresów prywatnych. Poza lokalnym symulatorem wymagane jest HTTPS.

## Ustawienia w panelu administratora

Administrator zmienia w działającej aplikacji, bez przebudowy:

- pokoje i pakiety (zmiana wpływa na nowe wyceny; istniejąca rezerwacja zachowuje cenę i usługi z chwili zapisu);
- konta, role, blokady i hasła tymczasowe;
- nazwę hotelu oraz godziny przyjazdu i wyjazdu;
- połączenia z A, B i D: włączenie, tryb `demo` lub `real`, adres API, limit czasu, nagłówek i sekret;
- klucze dostępu do API hotelu i ich zakresy.

Sekrety pozostają po stronie serwera. Klucz dostępu do API hotelu jest wyświetlany w całości tylko przy utworzeniu. Szczegóły ustawień połączeń opisują [kontrakty A/B/D](api/integracje.md#ustawienia-po-naszej-stronie).

Tryb i adres API są zapamiętywane przy każdej operacji A/B oraz przy zgłoszeniu do D. Przed przełączeniem na inne środowisko wyjaśnij operacje oczekujące. Jeśli ustawienia już zmieniono, przywróć wcześniejsze `mode` i `baseUrl`, żeby odczytać lub ponowić ich wynik.

## Polecenia

| Polecenie                                  | Kiedy użyć                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| `npm run setup`                            | Pierwsze przygotowanie projektu                                          |
| `npm run dev`                              | Praca nad kodem; Vite i serwer z automatycznym restartem                 |
| `npm run seed`                             | Uzupełnienie danych startowych bez kasowania rezerwacji                  |
| `npm run format` / `npm run format:check`  | Ujednolicenie formatowania / sprawdzenie formatowania                    |
| `npm run typecheck`                        | Sprawdzenie typów TypeScript                                             |
| `npm test`                                 | Automatyczne testy reguł i API                                           |
| `npm run test:e2e`                         | Scenariusze w przeglądarce (wcześniej `npx playwright install chromium`) |
| `npm run build`                            | Kontrola typów oraz zbudowanie interfejsu i serwera                      |
| `npm run check`                            | Formatowanie, testy serwera i build jedną komendą                        |
| `npm start`                                | Uruchomienie zbudowanej aplikacji pod adresem serwera                    |
| `npm run backup`                           | Spójna kopia bazy SQLite                                                 |
| `npm run service-token -- create <usługa>` | Token usługi wewnętrznej: `monitoring`, `scheduler` albo `backup`        |
| `npm run jobs -- <zadanie>`                | Zadanie usługi wewnętrznej: `ready`, `reconcile`, `cleanup`, `backup`    |

## Zbudowana aplikacja pod jednym adresem

Ustaw w `.env` wartość `APP_ORIGIN=http://localhost:3001`, a potem:

```bash
npm run build
npm start
```

Aplikacja działa wtedy pod `http://localhost:3001`. Przy powrocie do pracy z Vite przywróć `APP_ORIGIN=http://localhost:5173`.

## Uruchomienie przez Docker

Po przygotowaniu `.env` (`npm run setup`) uruchom:

```bash
docker compose up --build -d
docker compose logs -f hotel
```

Otwórz `http://localhost:3001`. Compose ustawia adres interfejsu z `DOCKER_APP_ORIGIN`, niezależnie od ustawienia dla Vite. Przy lokalnym HTTP zostaw `COOKIE_SECURE=false`; dla publicznego HTTPS zmień na `true`. Dane bazy są w wolumenie `hotel-data`, kopie w wolumenie `hotel-backups`. Brakujące dane startowe są dodawane przy starcie serwera.

Zatrzymanie: `docker compose down`. Nie dodawaj `-v`, jeśli chcesz zachować rezerwacje. Nie uruchamiaj równocześnie lokalnego serwera na porcie 3001.

Obraz zbudowaliśmy i uruchomiliśmy 19 listopada 2026 (Docker 29, Compose 5): kontener przechodzi kontrolę stanu, serwuje interfejs i API pod jednym adresem, a dane i kopie zostają w wolumenach po restarcie.

## Kopie bazy

```bash
npm run backup                              # lokalnie, kopia trafia do backups/
docker compose exec hotel npm run backup    # w kontenerze, kopia trafia do wolumenu hotel-backups
```

Skrypt korzysta z mechanizmu kopii SQLite. Zwykłe kopiowanie otwartego pliku mogłoby pominąć dane z dziennika WAL. Przed odtworzeniem zatrzymaj serwer, zachowaj dotychczasowy plik i przywróć kopię razem z tym samym `CONFIG_ENCRYPTION_KEY`.

Kopię może też zlecić usługa kopii zapasowych przez API wewnętrzne (W-05), bez dostępu do powłoki serwera. Opis w następnym punkcie.

## Usługi wewnętrzne

Monitoring, harmonogram i kopia zapasowa korzystają z API `/internal/v1` ([kontrakt](openapi-internal.yaml), [karty W-01–W-05](api/karty-endpointow.md#wewnętrzne-wymagające-tokenu)). Każda usługa dostaje własny token:

```bash
npm run service-token -- create monitoring "Monitoring"   # wartość tokenu jest pokazana tylko raz
npm run service-token -- list                             # lista bez wartości tokenów
npm run service-token -- revoke <id>                      # wyłączenie tokenu
```

Zadania uruchamia się poleceniem `npm run jobs -- <zadanie>` z tokenem w zmiennej środowiska:

| Zadanie     | Token              | Co robi                                                           |
| ----------- | ------------------ | ----------------------------------------------------------------- |
| `ready`     | `MONITORING_TOKEN` | Sprawdza bazę i połączenia; kod wyjścia 1, gdy stan nie jest `ok` |
| `reconcile` | `SCHEDULER_TOKEN`  | Pyta partnerów o wynik wszystkich niepewnych operacji A/B/D       |
| `cleanup`   | `SCHEDULER_TOKEN`  | Usuwa wygasłe sesje i stare klucze ponowienia                     |
| `backup`    | `BACKUP_TOKEN`     | Tworzy kopię bazy w `BACKUP_DIR` serwera                          |

Adres serwera ustawia `INTERNAL_URL` (domyślnie `http://127.0.0.1:3001`). Przykład harmonogramu w cronie i w Dockerze jest w [instrukcji wdrożenia](wdrozenie-vps.md#zadania-harmonogramu). Tokenów nie zapisujemy w repozytorium ani w historii operacji.

## Wdrożenie publiczne

Instrukcja krok po kroku dla serwera VPS (Docker, HTTPS, zapora, zadania harmonogramu, kopie, aktualizacje i udostępnienie API innym grupom) jest na stronie [Wdrożenie na VPS](wdrozenie-vps.md). W skrócie: `NODE_ENV=production`, adres HTTPS w `APP_ORIGIN`, `COOKIE_SECURE=true`, własne sekrety o długości co najmniej 32 znaków, trwały katalog bazy i `TRUST_PROXY=1` za jednym serwerem pośredniczącym. Baza jest przeznaczona dla jednej instancji serwera: nie uruchamiamy kilku kopii kontenera.

## Typowe problemy

- **Zajęty port:** zamknij poprzedni proces albo zmień `PORT`; dla Vite ustaw też zmienną `API_PROXY_TARGET` na nowy adres serwera.
- **Błąd CSRF lub pochodzenia:** korzystaj konsekwentnie z jednego adresu i sprawdź `APP_ORIGIN`. Nie wyłączaj zabezpieczenia, żeby ominąć literówkę w adresie.
- **Brak logowania po zmianie `ADMIN_PASSWORD`:** ta wartość służy tylko do utworzenia pierwszego administratora. Istniejącemu kontu hasło zmienia się w profilu albo przez reset.
- **Aplikacja otwierana z innego komputera w sieci lokalnej:** uruchom zbudowaną wersję (`npm start`) z `HOST=0.0.0.0`, a w `APP_ORIGIN` wpisz dokładnie ten adres, pod którym otwierasz stronę.
- **Partner nie odpowiada:** sprawdź tryb `real`, adres, dopuszczony host, klucz i wynik testu połączenia. Przekroczenie czasu nie oznacza, że żądanie nie dotarło.
- **Niepewna operacja:** otwórz plan pobytu i odśwież wynik albo uruchom `npm run jobs -- reconcile`. Nie twórz drugiego zamówienia.
- **Nie da się wyłączyć połączenia (`PARTNER_IN_USE`):** najpierw zakończ albo anuluj pobyty, które z niego korzystają, i wyjaśnij niepewne operacje.
- **Zmienione środowisko partnera:** przywróć tryb i adres, pod który trafiła dana operacja; nowe środowisko nie zna jej historii.
