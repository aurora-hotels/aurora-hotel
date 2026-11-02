# Konfiguracja i codzienna praca

## Pierwszy start

1. Zainstaluj Node.js 24 LTS.
2. W katalogu repozytorium uruchom `npm run setup`.
3. Otwórz `.env` i odczytaj dane pierwszego administratora.
4. Uruchom `npm run dev`, a następnie wejdź na `http://localhost:5173`.
5. Jako administrator utwórz konto recepcji. Konto klienta załóż przez rejestrację.

`setup` zachowuje istniejący `.env`. Przy aktualizacji projektu wykonaj `npm ci` i `npm run seed`, a potem uruchom testy. Nie usuwaj bazy tylko po to, żeby dodać nową ofertę.

## Zmienne środowiska

| Zmienna                       | Znaczenie                                                                 | Ustawienie lokalne                                        |
| ----------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------- |
| `NODE_ENV`                    | Tryb działania serwera                                                    | `development`                                             |
| `PORT`                        | Port backendu                                                             | `3001`                                                    |
| `HOST`                        | Adres nasłuchiwania                                                       | `127.0.0.1`; w kontenerze `0.0.0.0`                       |
| `COOKIE_SECURE`               | Cookie wysyłane tylko przez HTTPS                                         | Domyślnie w produkcji `true`; lokalny HTTP wymaga `false` |
| `APP_ORIGIN`                  | Dozwolony adres interfejsu; kontrola pochodzenia żądań                    | `http://localhost:5173` dla Vite                          |
| `DATABASE_PATH`               | Plik SQLite                                                               | `./data/aurora.sqlite`                                    |
| `SESSION_SECRET`              | Sekret konfiguracji sesji                                                 | Losowany przez `setup`; nie udostępniaj                   |
| `CONFIG_ENCRYPTION_KEY`       | Klucz szyfrowania danych dostępowych integracji                           | 64 znaki szesnastkowe, losowane przez `setup`             |
| `SESSION_HOURS`               | Czas ważności sesji (1–168 h)                                             | `12`                                                      |
| `PASSWORD_MIN_LENGTH`         | Minimalna długość nowego hasła (8–64)                                     | `10`                                                      |
| `MAX_STAY_NIGHTS`             | Maksymalna długość pobytu (1–365)                                         | `90`                                                      |
| `LOGIN_RATE_LIMIT`            | Limit logowania/rejestracji na minutę dla IP                              | `15`                                                      |
| `PUBLIC_RATE_LIMIT`           | Limit żądań API na minutę dla IP                                          | `300`                                                     |
| `ADMIN_EMAIL`                 | E-mail pierwszego administratora                                          | `admin@aurora.local`                                      |
| `ADMIN_PASSWORD`              | Hasło do inicjalizacji administratora                                     | Losowane przez `setup`                                    |
| `ALLOW_PRIVATE_PARTNER_HOSTS` | Jawnie dopuszczone hosty w sieci lokalnej; muszą być też w głównej liście | Puste                                                     |
| `DOCKER_APP_ORIGIN`           | Adres interfejsu w Docker Compose                                         | `http://localhost:3001`                                   |
| `ALLOWED_PARTNER_HOSTS`       | Dozwolone nazwy hostów rzeczywistych API, oddzielone przecinkami          | Puste, dopóki nie uzgodnimy adresów                       |

Przykładowe nazwy hostów to `api-grupa-a.example,api-grupa-b.example,api-grupa-d.example`. Wpisuj same hosty, a właściwy URL z portem i prefiksem ustaw w panelu integracji. Dopuszczenie hosta jest decyzją operatora: nie dodawaj przypadkowych adresów otrzymanych od użytkowników aplikacji. Adresy metadanych chmury i przekierowania nie służą do integracji.

Do uzgodnionych testów między lokalnymi serwerami można wpisać np. `localhost,127.0.0.1` **w obu** listach `ALLOWED_PARTNER_HOSTS` i `ALLOW_PRIVATE_PARTNER_HOSTS`. Główna lista sama nie dopuszcza adresów prywatnych. Nie ustawiaj tego wyjątku dla nieznanego hosta.

Zmiana `CONFIG_ENCRYPTION_KEY` przy istniejącej bazie uniemożliwi odszyfrowanie zapisanych sekretów. Zachowaj klucz wraz z bezpieczną kopią konfiguracji. Klucze API przekazuj osobnym kanałem, nigdy w zgłoszeniu, zrzucie ekranu lub commicie.

## Ustawienia w panelu

Administrator może zmieniać ofertę pokoi i pakietów, konta, godziny pobytu, tryb połączenia A/B/D, adres API, timeout i dane dostępowe. Te ustawienia nie wymagają przebudowy frontendu. Hasła i tokeny pozostają po stronie serwera. Klucz wejściowy C jest wyświetlany w całości tylko przy utworzeniu.

Przy `Authorization` pole sekretu może zawierać sam token lub `Bearer …`; serwer dopisuje prefiks tylko raz. Limit czasu integracji obejmuje DNS i HTTP jednej próby.

Tryb i adres API są zapamiętywane przy każdej operacji A/B oraz realizacji części D. Przed przełączeniem na inne środowisko wyjaśnij operacje oczekujące. Jeśli ustawienia już zmieniono, przywróć wcześniejsze `mode` i `baseUrl`, aby odczytać lub ponowić ich wynik. Zmiana klucza dostępu do tego samego środowiska jest dozwolona.

Zmiana oferty wpływa na nowe wyceny. Istniejąca rezerwacja przechowuje kopię ceny i dodatków z chwili zapisu.

## Polecenia

| Polecenie                                 | Kiedy użyć                                                |
| ----------------------------------------- | --------------------------------------------------------- |
| `npm run dev`                             | Praca nad kodem; Vite i backend z automatycznym restartem |
| `npm run seed`                            | Uzupełnienie początkowych danych bez kasowania rezerwacji |
| `npm run format` / `npm run format:check` | Ujednolicenie formatowania / sprawdzenie formatowania     |
| `npm run typecheck`                       | Sprawdzenie typów TypeScript                              |
| `npm test`                                | Automatyczne testy logiki i API                           |
| `npm run test:e2e`                        | Scenariusze przeglądarkowe                                |
| `npm run build`                           | Kontrola typów oraz zbudowanie klienta i serwera          |
| `npm start`                               | Uruchomienie gotowego wydania pod adresem backendu        |
| `npm run backup`                          | Spójna kopia bazy SQLite                                  |

## Uruchomienie przez Docker

Po przygotowaniu `.env` uruchom:

```bash
docker compose up --build -d
docker compose logs -f hotel
```

Otwórz `http://localhost:3001`. Compose ustawia adres interfejsu z `DOCKER_APP_ORIGIN`, niezależnie od konfiguracji Vite. Przy lokalnym HTTP pozostaw `COOKIE_SECURE=false`; dla publicznego HTTPS zmień na `true`. Dane bazy są w trwałym wolumenie `hotel-data`, a brakujące dane początkowe są dodawane przy starcie serwera.

Zatrzymanie: `docker compose down`. Nie dodawaj `-v`, jeśli chcesz zachować rezerwacje. Nie uruchamiaj równocześnie lokalnego backendu na porcie 3001. Komenda `npm run backup` dotyczy bazy wskazanej w lokalnym `.env`; bazę kontenera kopiuj mechanizmem SQLite w kontenerze lub po jego zatrzymaniu z wolumenu.

## Wydanie i kopie

Przed wydaniem wykonaj pełne sprawdzenie i zapisz identyfikator commita. Baza jest przeznaczona do pojedynczej instancji backendu. Nie uruchamiaj wielu kopii kontenera z osobnymi plikami bazy i nie oczekuj, że będą współdzielić dostępność.

Przy zbudowanej aplikacji ustaw `APP_ORIGIN=http://localhost:3001`. Dla prawdziwego publicznego wdrożenia ustaw `NODE_ENV=production`, prawidłowy adres HTTPS i `COOKIE_SECURE=true`. Nie używaj ustawienia HTTP z pokazu jako konfiguracji publicznego wdrożenia.

Używaj `npm run backup`; kopie trafiają do `backups/`. Skrypt korzysta z mechanizmu SQLite. Zwykłe kopiowanie otwartego pliku może pominąć dane z dziennika WAL. Przed odtworzeniem zatrzymaj serwer, zachowaj dotychczasowy plik i przywróć spójną kopię wraz z konfiguracją szyfrowania.

## Typowe problemy

- **Zajęty port:** zamknij poprzedni proces albo zmień `PORT`; dla Vite popraw również adres proxy w `frontend/vite.config.ts`.
- **Błąd CSRF lub pochodzenia:** korzystaj konsekwentnie z jednego adresu i sprawdź `APP_ORIGIN`. Nie wyłączaj zabezpieczenia, żeby ominąć literówkę w adresie.
- **Brak logowania po zmianie `.env`:** wartość inicjalizacyjna nie jest resetem istniejącego konta. Użyj funkcji zmiany/resetu hasła.
- **Partner nie odpowiada:** sprawdź tryb `real`, URL, dopuszczony host, klucz i wynik testu połączenia. Timeout nie oznacza, że żądanie nie dotarło.
- **Niepewna operacja:** otwórz plan i odśwież wynik. Nie twórz drugiego zamówienia z nowym identyfikatorem. Po 404 dla niepewnego zamówienia bez zewnętrznego id backend może ponowić pierwotne żądanie z zapisanej, zaszyfrowanej kopii i z tym samym id.
- **Zmienione środowisko partnera:** przywróć tryb i adres, pod który trafiła dana operacja; nowe środowisko nie zna jej historii.
