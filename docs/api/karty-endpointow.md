# Karty endpointów

Przeznaczenie: szczegółowy opis każdej operacji z [katalogu endpointów](projekt-endpointow.md#katalog-endpointów): parametry, odpowiedzi, uprawnienia i błędy. Opiekunowie: Adrian Zieliński, Andrii Yaremko; uzgodnienie danych: Wiktoria Sobejko.

Karty operacji ZT i ZP powstały z kontraktu [openapi.yaml](../openapi.yaml) i opisują działającą aplikację. Karty operacji W opisują projekt, który nie jest jeszcze zaimplementowany.

Adres bazowy: `http://localhost:3001`. Wszystkie żądania i odpowiedzi z treścią używają JSON w UTF-8. Kwoty są w groszach, daty pobytu w formacie `RRRR-MM-DD`, a terminy usług w ISO 8601 ze strefą czasową.

## Błędy wspólne

Każdy błąd ma postać `{"error":{"code":"…","message":"…","fields":{}}}`. Poniższe błędy mogą wystąpić w wielu operacjach, dlatego karty tylko się do nich odwołują.

| Kod HTTP | Kod błędu                            | Kiedy                                                                                                    |
| -------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| 400      | `VALIDATION_ERROR`                   | Brak wymaganego pola, zły typ lub zakres wartości albo nieznane pole. `fields` wskazuje błędne pola.     |
| 400      | `INVALID_JSON`                       | Treść żądania nie jest poprawnym JSON-em.                                                                |
| 400      | `AMBIGUOUS_AUTH`                     | Żądanie zawiera jednocześnie `X-API-Key` i `Authorization`.                                              |
| 401      | `AUTH_REQUIRED`                      | Operacja chroniona, a żądanie nie ma ważnej sesji ani klucza.                                            |
| 401      | `INVALID_API_KEY`, `API_KEY_INVALID` | Klucz partnera jest błędny, wyłączony albo pusty.                                                        |
| 401      | `INVALID_AUTHORIZATION`              | Nagłówek `Authorization` w schemacie innym niż `Bearer`.                                                 |
| 403      | `CSRF_INVALID`, `ORIGIN_INVALID`     | Żądanie zapisu z przeglądarki bez zgodnego tokenu CSRF albo z obcej strony.                              |
| 403      | `FORBIDDEN`                          | Tożsamość jest znana, ale jej rola nie pozwala na operację.                                              |
| 403      | `SCOPE_REQUIRED`                     | Klucz partnera nie ma zakresu wymaganego przez operację.                                                 |
| 403      | `USER_REQUIRED`                      | Operacja na własnym koncie wywołana kluczem partnera.                                                    |
| 403      | `AMBIGUOUS_AUTH`                     | Żądanie zawiera jednocześnie sesję użytkownika i klucz partnera.                                         |
| 403      | `PASSWORD_CHANGE_REQUIRED`           | Konto z hasłem tymczasowym próbuje wykonać cokolwiek poza zmianą hasła, odczytem profilu i wylogowaniem. |
| 404      | `NOT_FOUND`                          | Nie ma takiej operacji API.                                                                              |
| 413      | `PAYLOAD_TOO_LARGE`                  | Treść żądania większa niż 64 KB.                                                                         |
| 429      | `RATE_LIMITED`                       | Przekroczony limit żądań z jednego adresu IP; nagłówek `Retry-After` podaje czas w sekundach.            |
| 500      | `INTERNAL_ERROR`                     | Nieoczekiwany błąd serwera; odpowiedź nie zawiera szczegółów technicznych.                               |
| 503      | `DATABASE_BUSY`                      | Baza jest chwilowo zajęta; nic nie zostało zapisane i żądanie można ponowić.                             |

## Wewnętrzne wymagające tokenu (projekt)

### W-01 — Sprawdź gotowość serwera i połączeń

| Element                        | Opis                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Grupa                          | W — wewnętrzny z tokenem; projekt, operacja niezaimplementowana                                                                      |
| Metoda i ścieżka               | `GET /internal/v1/health/ready`                                                                                                      |
| Cel operacji i odbiorca        | Szczegółowa gotowość: baza danych oraz stan połączeń z A, B i D. Odbiorca: usługa monitoringu.                                       |
| Wymagany token i tożsamość     | `Authorization: Bearer <token usługi>`; reprezentuje konto techniczne „Monitoring”.                                                  |
| Dozwolone role lub uprawnienia | Wyłącznie konto techniczne „Monitoring” z zakresem `health:read`. Użytkownicy, także administrator, oraz partnerzy nie mają dostępu. |
| Ograniczenia dostępu do zasobu | Tylko stan techniczny; żadnych danych gości, rezerwacji ani sekretów.                                                                |

Parametry i dane wejściowe:

Brak parametrów.

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — `status` (string: `ok` albo `degraded`), `database` (string: `ok`), `integrations` (obiekt: dla A, B i D pola `enabled` (boolean), `mode` (`demo`/`real`), `lastTestOk` (boolean lub null), `lastTestAt` (data i czas lub null)).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu              | Warunek wystąpienia                                                                   |
| -------- | ---------------------- | ------------------------------------------------------------------------------------- |
| 401      | `AUTH_REQUIRED`        | Brak nagłówka `Authorization`.                                                        |
| 401      | `INVALID_API_KEY`      | Token usługi jest błędny, wyłączony albo jest kluczem partnera lub sesją użytkownika. |
| 403      | `SCOPE_REQUIRED`       | Token usługi nie ma zakresu `health:read`.                                            |
| 503      | `DATABASE_UNAVAILABLE` | Baza danych nie odpowiada.                                                            |
| —        | błędy wspólne          | 429 `RATE_LIMITED`                                                                    |

### W-02 — Pokaż operacje partnerów do wyjaśnienia

| Element                        | Opis                                                                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Grupa                          | W — wewnętrzny z tokenem; projekt, operacja niezaimplementowana                                                                          |
| Metoda i ścieżka               | `GET /internal/v1/operations/pending`                                                                                                    |
| Cel operacji i odbiorca        | Lista operacji A/B/D o niepewnym wyniku, żeby monitoring mógł zgłosić je recepcji. Odbiorca: usługa monitoringu.                         |
| Wymagany token i tożsamość     | `Authorization: Bearer <token usługi>`; reprezentuje konto techniczne „Monitoring”.                                                      |
| Dozwolone role lub uprawnienia | Wyłącznie konto techniczne „Monitoring” z zakresem `operations:read`. Użytkownicy, także administrator, oraz partnerzy nie mają dostępu. |
| Ograniczenia dostępu do zasobu | Zwraca wyłącznie identyfikatory i stany operacji; bez nazwisk gości, numerów voucherów i treści żądań.                                   |

Parametry i dane wejściowe:

| Nazwa i miejsce            | Typ i wymagalność | Opis i reguły walidacji                                    |
| -------------------------- | ----------------- | ---------------------------------------------------------- |
| `partner` (query)          | string; nie       | Jedno z `A`, `B`, `D`; brak oznacza wszystkich.            |
| `page`, `pageSize` (query) | integer; nie      | Jak w pozostałych listach: domyślnie 1 i 20, najwyżej 100. |

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — `{items,total,page,pageSize}`; element: `operationId` (string), `partner` (`A`/`B`/`D`), `kind` (`booking`/`cancellation`/`voucher_completion`), `status` (`pending`/`unknown`/`cancel_pending`), `reservationId` (string), `updatedAt` (data i czas).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu          | Warunek wystąpienia                                                                   |
| -------- | ------------------ | ------------------------------------------------------------------------------------- |
| 401      | `AUTH_REQUIRED`    | Brak nagłówka `Authorization`.                                                        |
| 401      | `INVALID_API_KEY`  | Token usługi jest błędny, wyłączony albo jest kluczem partnera lub sesją użytkownika. |
| 403      | `SCOPE_REQUIRED`   | Token usługi nie ma zakresu `operations:read`.                                        |
| 400      | `VALIDATION_ERROR` | Nieznany partner albo `pageSize` poza zakresem.                                       |
| —        | błędy wspólne      | 429 `RATE_LIMITED`                                                                    |

### W-03 — Ustal wynik niepewnej operacji

| Element                        | Opis                                                                                                                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grupa                          | W — wewnętrzny z tokenem; projekt, operacja niezaimplementowana                                                                                                                               |
| Metoda i ścieżka               | `POST /internal/v1/operations/{operationId}/reconcile`                                                                                                                                        |
| Cel operacji i odbiorca        | Ponowne zapytanie partnera o wynik jednej niepewnej operacji, tak jak robi to recepcja przyciskiem „Odśwież”. Odbiorca: usługa harmonogramu.                                                  |
| Wymagany token i tożsamość     | `Authorization: Bearer <token usługi>`; reprezentuje konto techniczne „Harmonogram”.                                                                                                          |
| Dozwolone role lub uprawnienia | Wyłącznie konto techniczne „Harmonogram” z zakresem `operations:reconcile`. Użytkownicy, także administrator, oraz partnerzy nie mają dostępu.                                                |
| Ograniczenia dostępu do zasobu | Tylko operacje w stanie `pending`, `unknown` lub `cancel_pending`. Nie tworzy nowych zamówień: używa zapisanego `operationId` i trafia wyłącznie do środowiska, w którym operację rozpoczęto. |

Parametry i dane wejściowe:

| Nazwa i miejsce         | Typ i wymagalność | Opis i reguły walidacji                                    |
| ----------------------- | ----------------- | ---------------------------------------------------------- |
| `operationId` (ścieżka) | string; tak       | Identyfikator operacji zapisany przez hotel, 1–100 znaków. |

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — `operationId` (string), `partner` (string), `status` (nowy stan, np. `confirmed`, `cancelled`, `reported` albo nadal `unknown`), `changed` (boolean).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu                                | Warunek wystąpienia                                                                   |
| -------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| 401      | `AUTH_REQUIRED`                          | Brak nagłówka `Authorization`.                                                        |
| 401      | `INVALID_API_KEY`                        | Token usługi jest błędny, wyłączony albo jest kluczem partnera lub sesją użytkownika. |
| 403      | `SCOPE_REQUIRED`                         | Token usługi nie ma zakresu `operations:reconcile`.                                   |
| 404      | `OPERATION_NOT_FOUND`                    | Operacja nie istnieje.                                                                |
| 409      | `OPERATION_SETTLED`                      | Operacja ma już ostateczny wynik.                                                     |
| 409      | `PARTNER_TARGET_CHANGED`                 | Od rozpoczęcia operacji zmieniono tryb lub adres partnera.                            |
| 503      | `PARTNER_UNAVAILABLE`, `PARTNER_TIMEOUT` | Partner nadal nie odpowiada; stan pozostaje bez zmian.                                |
| —        | błędy wspólne                            | 429 `RATE_LIMITED`                                                                    |

### W-04 — Usuń wygasłe sesje i stare klucze ponowienia

| Element                        | Opis                                                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Grupa                          | W — wewnętrzny z tokenem; projekt, operacja niezaimplementowana                                                                           |
| Metoda i ścieżka               | `POST /internal/v1/maintenance/cleanup`                                                                                                   |
| Cel operacji i odbiorca        | Porządkowanie bazy: wygasłe sesje i klucze ponowienia starsze niż 7 dni. Odbiorca: usługa harmonogramu.                                   |
| Wymagany token i tożsamość     | `Authorization: Bearer <token usługi>`; reprezentuje konto techniczne „Harmonogram”.                                                      |
| Dozwolone role lub uprawnienia | Wyłącznie konto techniczne „Harmonogram” z zakresem `maintenance:run`. Użytkownicy, także administrator, oraz partnerzy nie mają dostępu. |
| Ograniczenia dostępu do zasobu | Usuwa wyłącznie dane techniczne. Nie dotyka rezerwacji, kont ani historii operacji.                                                       |

Parametry i dane wejściowe:

Brak parametrów.

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — `sessionsRemoved` (integer), `idempotencyRecordsRemoved` (integer).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu         | Warunek wystąpienia                                                                   |
| -------- | ----------------- | ------------------------------------------------------------------------------------- |
| 401      | `AUTH_REQUIRED`   | Brak nagłówka `Authorization`.                                                        |
| 401      | `INVALID_API_KEY` | Token usługi jest błędny, wyłączony albo jest kluczem partnera lub sesją użytkownika. |
| 403      | `SCOPE_REQUIRED`  | Token usługi nie ma zakresu `maintenance:run`.                                        |
| 503      | `DATABASE_BUSY`   | Baza jest chwilowo zajęta; operację można ponowić.                                    |
| —        | błędy wspólne     | 429 `RATE_LIMITED`                                                                    |

### W-05 — Utwórz spójną kopię bazy

| Element                        | Opis                                                                                                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grupa                          | W — wewnętrzny z tokenem; projekt, operacja niezaimplementowana                                                                                                |
| Metoda i ścieżka               | `POST /internal/v1/backups`                                                                                                                                    |
| Cel operacji i odbiorca        | Kopia bazy SQLite wykonana mechanizmem kopii zapasowej. Odbiorca: usługa kopii zapasowych.                                                                     |
| Wymagany token i tożsamość     | `Authorization: Bearer <token usługi>`; reprezentuje konto techniczne „Kopia zapasowa”.                                                                        |
| Dozwolone role lub uprawnienia | Wyłącznie konto techniczne „Kopia zapasowa” z zakresem `backups:create`. Użytkownicy, także administrator, oraz partnerzy nie mają dostępu.                    |
| Ograniczenia dostępu do zasobu | Kopia powstaje w katalogu `BACKUP_DIR` na serwerze; odpowiedź zawiera tylko nazwę pliku, nigdy jego treść. Usługa nie może kopii pobrać, odtworzyć ani usunąć. |

Parametry i dane wejściowe:

Brak parametrów.

Treść żądania: Brak treści.

Odpowiedź poprawna: 201 — `file` (string, nazwa pliku), `sizeBytes` (integer), `createdAt` (data i czas).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu         | Warunek wystąpienia                                                                   |
| -------- | ----------------- | ------------------------------------------------------------------------------------- |
| 401      | `AUTH_REQUIRED`   | Brak nagłówka `Authorization`.                                                        |
| 401      | `INVALID_API_KEY` | Token usługi jest błędny, wyłączony albo jest kluczem partnera lub sesją użytkownika. |
| 403      | `SCOPE_REQUIRED`  | Token usługi nie ma zakresu `backups:create`.                                         |
| 503      | `BACKUP_FAILED`   | Nie udało się zapisać kopii, np. brak miejsca.                                        |
| —        | błędy wspólne     | 429 `RATE_LIMITED`                                                                    |

## Zewnętrzne wymagające tokenu

### ZT-01 — Wyloguj się

| Element                        | Opis                                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                                                    |
| Metoda i ścieżka               | `POST /api/v1/auth/logout`                                                                                                   |
| Cel operacji i odbiorca        | Zakończenie sesji użytkownika. Odbiorca: zalogowany użytkownik w przeglądarce.                                               |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i nagłówek `X-CSRF-Token`; reprezentuje zalogowanego użytkownika.                              |
| Dozwolone role lub uprawnienia | Klient, recepcjonista, administrator.                                                                                        |
| Ograniczenia dostępu do zasobu | Kończy tylko sesję, z której przyszło żądanie. Żądanie z samą sesją anonimową nie jest błędem: serwer usuwa ją i zwraca 204. |

Parametry i dane wejściowe:

Brak parametrów.

Treść żądania: Brak treści.

Odpowiedź poprawna: 204 — bez treści.

Odpowiedzi błędów:

| Kod HTTP | Kod błędu      | Warunek wystąpienia                   |
| -------- | -------------- | ------------------------------------- |
| 403      | `CSRF_INVALID` | Brak sesji albo niezgodny token CSRF. |
| —        | błędy wspólne  | 429 `RATE_LIMITED`                    |

### ZT-02 — Pobierz swój profil

| Element                        | Opis                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                                                            |
| Metoda i ścieżka               | `GET /api/v1/me`                                                                                                                     |
| Cel operacji i odbiorca        | Odczyt własnego profilu i roli. Odbiorca: zalogowany użytkownik; interfejs używa go do pokazania właściwego menu.                    |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session`; reprezentuje zalogowanego użytkownika.                                                                |
| Dozwolone role lub uprawnienia | Klient, recepcjonista, administrator. Klucz partnera nie ma dostępu.                                                                 |
| Ograniczenia dostępu do zasobu | Zawsze profil właściciela sesji; identyfikatora użytkownika nie podaje się w adresie. Dostępne także dla konta z hasłem tymczasowym. |

Parametry i dane wejściowe:

Brak parametrów.

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — obiekt [User](#user).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu       | Warunek wystąpienia                                            |
| -------- | --------------- | -------------------------------------------------------------- |
| 401      | `AUTH_REQUIRED` | Brak sesji albo sesja wygasła.                                 |
| 403      | `USER_REQUIRED` | Żądanie z kluczem partnera: operacja wymaga konta użytkownika. |
| —        | błędy wspólne   | 429 `RATE_LIMITED`                                             |

### ZT-03 — Zmień dane profilu

| Element                        | Opis                                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                                                                        |
| Metoda i ścieżka               | `PATCH /api/v1/me`                                                                                                                               |
| Cel operacji i odbiorca        | Zmiana własnego imienia i nazwiska, telefonu lub adresu e-mail. Odbiorca: zalogowany użytkownik.                                                 |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i nagłówek `X-CSRF-Token`; reprezentuje zalogowanego użytkownika.                                                  |
| Dozwolone role lub uprawnienia | Klient, recepcjonista, administrator. Klucz partnera nie ma dostępu.                                                                             |
| Ograniczenia dostępu do zasobu | Zawsze profil właściciela sesji. Nie da się zmienić roli ani blokady konta: takie pola są odrzucane. Zmiana adresu e-mail wymaga obecnego hasła. |

Parametry i dane wejściowe:

| Nazwa i miejsce               | Typ i wymagalność                                   | Opis i reguły walidacji                                                                             |
| ----------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `email` (pole body)           | string (e-mail, do 254 znaków); nie                 | Adres e-mail; jest loginem.                                                                         |
| `name` (pole body)            | string (2–120 znaków); nie                          | Imię i nazwisko.                                                                                    |
| `phone` (pole body)           | string (do 30 znaków, wzorzec `^[+\d\s()-]*$`); nie | Telefon; może być pusty.                                                                            |
| `currentPassword` (pole body) | string (1–128 znaków); nie                          | Obecne hasło; wymagane tylko przy zmianie adresu e-mail. Wymagane tylko przy zmianie adresu e-mail. |

Treść żądania: JSON, obiekt ProfilePatch; nieznane pola są odrzucane.

Odpowiedź poprawna: 200 — obiekt [User](#user).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu           | Warunek wystąpienia                                                                                                     |
| -------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 403      | `CSRF_INVALID`      | Brak ważnej sesji albo niezgodny token CSRF.                                                                            |
| 401      | `AUTH_REQUIRED`     | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.                                                |
| 400      | `PASSWORD_REQUIRED` | Zmiana adresu e-mail bez pola `currentPassword`.                                                                        |
| 400      | `PASSWORD_INVALID`  | Podane obecne hasło jest niepoprawne.                                                                                   |
| 409      | `EMAIL_TAKEN`       | Nowy adres e-mail należy do innego konta.                                                                               |
| 400      | `VALIDATION_ERROR`  | Nieznane pole, np. `role` albo `active`.                                                                                |
| 403      | `USER_REQUIRED`     | Żądanie z kluczem partnera.                                                                                             |
| —        | błędy wspólne       | 400 `VALIDATION_ERROR`, 400 `INVALID_JSON`, 413 `PAYLOAD_TOO_LARGE`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

### ZT-04 — Zmień hasło i zakończ poprzednie sesje

| Element                        | Opis                                                                                                                   |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                                              |
| Metoda i ścieżka               | `POST /api/v1/me/change-password`                                                                                      |
| Cel operacji i odbiorca        | Zmiana własnego hasła; kończy pozostałe sesje tego konta. Odbiorca: zalogowany użytkownik, także z hasłem tymczasowym. |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i nagłówek `X-CSRF-Token`; reprezentuje zalogowanego użytkownika.                        |
| Dozwolone role lub uprawnienia | Klient, recepcjonista, administrator. Klucz partnera nie ma dostępu.                                                   |
| Ograniczenia dostępu do zasobu | Zawsze konto właściciela sesji. Wymaga obecnego hasła. Po zmianie powstaje nowa sesja i nowy token CSRF.               |

Parametry i dane wejściowe:

| Nazwa i miejsce               | Typ i wymagalność           | Opis i reguły walidacji                                                                              |
| ----------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------- |
| `currentPassword` (pole body) | string (1–128 znaków); tak  | Obecne hasło.                                                                                        |
| `newPassword` (pole body)     | string (10–128 znaków); tak | Nowe hasło; inne niż obecne. Domyślnie minimum 10 znaków; operator może zmienić PASSWORD_MIN_LENGTH. |

Treść żądania: JSON, obiekt PasswordChange; nieznane pola są odrzucane.

Odpowiedź poprawna: 200 — obiekt [CsrfToken](#csrftoken).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu            | Warunek wystąpienia                                                                     |
| -------- | -------------------- | --------------------------------------------------------------------------------------- |
| 403      | `CSRF_INVALID`       | Brak ważnej sesji albo niezgodny token CSRF.                                            |
| 401      | `AUTH_REQUIRED`      | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.                |
| 400      | `PASSWORD_INVALID`   | Obecne hasło jest niepoprawne.                                                          |
| 400      | `PASSWORD_UNCHANGED` | Nowe hasło jest takie samo jak dotychczasowe.                                           |
| 403      | `USER_REQUIRED`      | Żądanie z kluczem partnera.                                                             |
| —        | błędy wspólne        | 400 `VALIDATION_ERROR`, 400 `INVALID_JSON`, 413 `PAYLOAD_TOO_LARGE`; 429 `RATE_LIMITED` |

### ZT-05 — Zarezerwuj pobyt

| Element                        | Opis                                                                                                                                                                                                                                                                        |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                                                                                                                                                                                                   |
| Metoda i ścieżka               | `POST /api/v1/reservations`                                                                                                                                                                                                                                                 |
| Cel operacji i odbiorca        | Utworzenie rezerwacji pobytu. Odbiorca: klient w przeglądarce, recepcja dla gościa bez konta, serwer partnera D dla posiadacza vouchera.                                                                                                                                    |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i `X-CSRF-Token` (użytkownik) albo klucz partnera w `Authorization: Bearer` lub `X-API-Key` (serwer partnera).                                                                                                                                |
| Dozwolone role lub uprawnienia | Klient, recepcjonista, administrator; partner z zakresem `reservations:create`.                                                                                                                                                                                             |
| Ograniczenia dostępu do zasobu | Właściciela ustala serwer: użytkownik z sesji albo partner z klucza; nie da się go podać w żądaniu. Cenę liczy serwer; `expectedTotalMinor` tylko potwierdza, że klient ją zaakceptował. Pola vouchera przyjmowane są wyłącznie od personelu i od partnera oznaczonego `D`. |

Parametry i dane wejściowe:

| Nazwa i miejsce                  | Typ i wymagalność                                        | Opis i reguły walidacji                                                                                                                                           |
| -------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Idempotency-Key` (nagłówek)     | string (8–128 znaków, wzorzec `^[A-Za-z0-9._:-]+$`); tak | Ten sam klucz i treść żądania zwracają wynik wcześniejszej rezerwacji. Użycie klucza z inną treścią zwraca 409. Klucze są przypisane do użytkownika lub partnera. |
| `checkIn` (pole body)            | string (data RRRR-MM-DD); tak                            | Dzień przyjazdu.                                                                                                                                                  |
| `checkOut` (pole body)           | string (data RRRR-MM-DD); tak                            | Dzień wyjazdu.                                                                                                                                                    |
| `guests` (pole body)             | integer (1–30); tak                                      | Liczba gości.                                                                                                                                                     |
| `roomId` (pole body)             | string (1–100 znaków); tak                               | Identyfikator pokoju.                                                                                                                                             |
| `packageId` (pole body)          | string (1–100 znaków) lub null; nie                      | Identyfikator pakietu; może być pusty.                                                                                                                            |
| `expectedTotalMinor` (pole body) | integer (0–1000000000); tak                              | Kwota zaakceptowana przez klienta, w groszach; serwer porównuje ją z własną wyceną.                                                                               |
| `guest.name` (pole body)         | string (2–120 znaków); tak                               | Imię i nazwisko osoby kontaktowej.                                                                                                                                |
| `guest.email` (pole body)        | string (e-mail, do 254 znaków); tak                      | E-mail osoby kontaktowej.                                                                                                                                         |
| `guest.phone` (pole body)        | string (do 30 znaków, wzorzec `^[+\d\s()-]*$`); nie      | Telefon; może być pusty.                                                                                                                                          |
| `guestNames` (pole body)         | lista: string (2–120 znaków); tak                        | Imiona i nazwiska wszystkich gości; tyle pozycji, ile `guests`.                                                                                                   |
| `voucherReference` (pole body)   | string (1–200 znaków); nie                               | Numer vouchera z projektu D; tylko personel i partner D.                                                                                                          |
| `hotelComponentId` (pole body)   | string (1–100 znaków); nie                               | Identyfikator hotelowej części vouchera.                                                                                                                          |

Treść żądania: JSON, obiekt ReservationCreate; nieznane pola są odrzucane.

Odpowiedź poprawna: 201 — obiekt [Reservation](#reservation). 200 — obiekt [Reservation](#reservation) (ponowienie z tym samym `Idempotency-Key`; nagłówek `Idempotency-Replayed: true`).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu                                                                              | Warunek wystąpienia                                                                                                                              |
| -------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 403      | `CSRF_INVALID`                                                                         | Żądanie z przeglądarki bez ważnej sesji i zgodnego tokenu CSRF. Nie dotyczy żądań z kluczem partnera.                                            |
| 401      | `AUTH_REQUIRED`                                                                        | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.                                                                         |
| 401      | `INVALID_API_KEY`                                                                      | Klucz partnera jest błędny albo wyłączony.                                                                                                       |
| 403      | `SCOPE_REQUIRED`                                                                       | Klucz partnera nie ma zakresu `reservations:create`.                                                                                             |
| 409      | `ROOM_UNAVAILABLE`                                                                     | Pokój jest zajęty w wybranym terminie.                                                                                                           |
| 409      | `PRICE_CHANGED`                                                                        | Podana kwota różni się od wyceny serwera; w `fields` jest aktualna cena.                                                                         |
| 409      | `IDEMPOTENCY_CONFLICT`                                                                 | Ten sam `Idempotency-Key` użyty z inną treścią żądania.                                                                                          |
| 400      | `CAPACITY_EXCEEDED`                                                                    | Liczba gości większa niż pojemność pokoju.                                                                                                       |
| 400      | `DATES_INVALID`, `DATE_IN_PAST`                                                        | Błędna kolejność dat, pobyt dłuższy niż 90 nocy albo przyjazd w przeszłości.                                                                     |
| 404      | `ROOM_NOT_FOUND`, `PACKAGE_NOT_FOUND`                                                  | Pokój lub pakiet nie istnieje albo jest wycofany z oferty.                                                                                       |
| 403      | `VOUCHER_FORBIDDEN`                                                                    | Pola vouchera przekazał klient albo partner inny niż D.                                                                                          |
| 400      | `VOUCHER_FIELDS_REQUIRED`                                                              | Podano tylko jedno z pól `voucherReference` i `hotelComponentId`.                                                                                |
| 409      | `VOUCHER_INVALID`, `VOUCHER_USED`, `VOUCHER_OUTSIDE_VALIDITY`, `VOUCHER_ALREADY_BOUND` | D nie potwierdził hotelowej części vouchera dla tego pobytu.                                                                                     |
| 503      | `PARTNER_UNAVAILABLE`, `PARTNER_TIMEOUT`, `DATABASE_BUSY`                              | D nie odpowiada przy rezerwacji z voucherem albo baza jest chwilowo zajęta; nic nie zostało zapisane, żądanie można ponowić z tym samym kluczem. |
| —        | błędy wspólne                                                                          | 400 `VALIDATION_ERROR`, 400 `INVALID_JSON`, 413 `PAYLOAD_TOO_LARGE`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED`                          |

### ZT-06 — Pokaż rezerwacje

| Element                        | Opis                                                                                                                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                                                                                                                |
| Metoda i ścieżka               | `GET /api/v1/reservations`                                                                                                                                                               |
| Cel operacji i odbiorca        | Lista rezerwacji z filtrowaniem. Odbiorca: klient (moje rezerwacje), recepcja (pulpit przyjazdów i wyjazdów), serwer partnera.                                                           |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` (użytkownik) albo klucz partnera w `Authorization: Bearer` lub `X-API-Key` (serwer partnera).                                                              |
| Dozwolone role lub uprawnienia | Klient, recepcjonista, administrator; partner z zakresem `reservations:read`.                                                                                                            |
| Ograniczenia dostępu do zasobu | Filtr właściciela dokłada serwer: klient dostaje tylko rezerwacje swojego konta, partner tylko utworzone jego kluczami, personel wszystkie. Parametrem nie da się poprosić o cudze dane. |

Parametry i dane wejściowe:

| Nazwa i miejsce    | Typ i wymagalność                                                | Opis i reguły walidacji                                                             |
| ------------------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `page` (query)     | integer (co najmniej 1, domyślnie 1); nie                        | Numer strony wyników.                                                               |
| `pageSize` (query) | integer (1–100, domyślnie 20); nie                               | Liczba wyników na stronie.                                                          |
| `status` (query)   | string: `confirmed`, `checked_in`, `completed`, `cancelled`; nie | Tylko rezerwacje w tym stanie.                                                      |
| `date` (query)     | string (data RRRR-MM-DD); nie                                    | Tylko pobyty obejmujące wskazany dzień, od dnia przyjazdu do dnia wyjazdu włącznie. |
| `search` (query)   | string (do 100 znaków); nie                                      | Fragment numeru rezerwacji albo imienia i nazwiska osoby kontaktowej.               |

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — lista `{items,total,page,pageSize}`; element: obiekt [Reservation](#reservation).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu          | Warunek wystąpienia                                                        |
| -------- | ------------------ | -------------------------------------------------------------------------- |
| 401      | `AUTH_REQUIRED`    | Brak sesji lub klucza albo sesja wygasła.                                  |
| 401      | `INVALID_API_KEY`  | Klucz partnera jest błędny albo wyłączony.                                 |
| 403      | `SCOPE_REQUIRED`   | Klucz partnera nie ma zakresu `reservations:read`.                         |
| 400      | `VALIDATION_ERROR` | Nieznany status, błędna data albo `pageSize` poza zakresem 1–100.          |
| —        | błędy wspólne      | 400 `VALIDATION_ERROR`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

### ZT-07 — Pobierz szczegóły rezerwacji

| Element                        | Opis                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                                                      |
| Metoda i ścieżka               | `GET /api/v1/reservations/{id}`                                                                                                |
| Cel operacji i odbiorca        | Szczegóły jednej rezerwacji. Odbiorca: właściciel rezerwacji, recepcja, administrator.                                         |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` (użytkownik) albo klucz partnera w `Authorization: Bearer` lub `X-API-Key` (serwer partnera).    |
| Dozwolone role lub uprawnienia | Klient, recepcjonista, administrator; partner z zakresem `reservations:read`.                                                  |
| Ograniczenia dostępu do zasobu | Serwer porównuje właściciela rezerwacji z tożsamością z sesji lub klucza. Cudza rezerwacja wygląda tak samo jak nieistniejąca. |

Parametry i dane wejściowe:

| Nazwa i miejsce | Typ i wymagalność          | Opis i reguły walidacji                                   |
| --------------- | -------------------------- | --------------------------------------------------------- |
| `id` (ścieżka)  | string (1–100 znaków); tak | Identyfikator zasobu z odpowiedzi tworzenia albo z listy. |

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — obiekt [Reservation](#reservation).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu               | Warunek wystąpienia                                                        |
| -------- | ----------------------- | -------------------------------------------------------------------------- |
| 401      | `AUTH_REQUIRED`         | Brak sesji lub klucza albo sesja wygasła.                                  |
| 401      | `INVALID_API_KEY`       | Klucz partnera jest błędny albo wyłączony.                                 |
| 403      | `SCOPE_REQUIRED`        | Klucz partnera nie ma zakresu `reservations:read`.                         |
| 404      | `RESERVATION_NOT_FOUND` | Rezerwacja nie istnieje albo należy do innego klienta lub partnera.        |
| —        | błędy wspólne           | 400 `VALIDATION_ERROR`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

### ZT-08 — Zmień daty i liczbę gości

| Element                        | Opis                                                                                                                                                                                                                             |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                                                                                                                                                        |
| Metoda i ścieżka               | `PATCH /api/v1/reservations/{id}`                                                                                                                                                                                                |
| Cel operacji i odbiorca        | Zmiana dat i liczby gości. Odbiorca: właściciel rezerwacji przed dniem przyjazdu, recepcja i administrator także później.                                                                                                        |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i `X-CSRF-Token` (użytkownik) albo klucz partnera w `Authorization: Bearer` lub `X-API-Key` (serwer partnera).                                                                                     |
| Dozwolone role lub uprawnienia | Klient, recepcjonista, administrator; partner z zakresem `reservations:update`.                                                                                                                                                  |
| Ograniczenia dostępu do zasobu | Tylko własna rezerwacja (personel: każda) w stanie „potwierdzona”. Klient i partner mogą ją zmienić wyłącznie przed dniem przyjazdu. Nie da się zmienić pokoju, pakietu, statusu, właściciela ani ceny: takie pola są odrzucane. |

Parametry i dane wejściowe:

| Nazwa i miejsce                  | Typ i wymagalność                 | Opis i reguły walidacji                                                                                   |
| -------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `id` (ścieżka)                   | string (1–100 znaków); tak        | Identyfikator zasobu z odpowiedzi tworzenia albo z listy.                                                 |
| `checkIn` (pole body)            | string (data RRRR-MM-DD); tak     | Dzień przyjazdu.                                                                                          |
| `checkOut` (pole body)           | string (data RRRR-MM-DD); tak     | Dzień wyjazdu.                                                                                            |
| `guests` (pole body)             | integer (1–30); tak               | Liczba gości.                                                                                             |
| `expectedVersion` (pole body)    | integer (co najmniej 1); tak      | Wersja rezerwacji, którą widział klient; chroni przed nadpisaniem cudzej zmiany.                          |
| `expectedTotalMinor` (pole body) | integer (co najmniej 0); tak      | Kwota zaakceptowana przez klienta, w groszach; serwer porównuje ją z własną wyceną. Kwota w groszach PLN. |
| `guestNames` (pole body)         | lista: string (2–120 znaków); nie | Nowa lista gości; potrzebna przy zmianie liczby osób.                                                     |

Treść żądania: JSON, obiekt ReservationPatch; nieznane pola są odrzucane.

Odpowiedź poprawna: 200 — obiekt [Reservation](#reservation).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu                                     | Warunek wystąpienia                                                                                                     |
| -------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 403      | `CSRF_INVALID`                                | Żądanie z przeglądarki bez ważnej sesji i zgodnego tokenu CSRF. Nie dotyczy żądań z kluczem partnera.                   |
| 401      | `AUTH_REQUIRED`                               | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.                                                |
| 401      | `INVALID_API_KEY`                             | Klucz partnera jest błędny albo wyłączony.                                                                              |
| 403      | `SCOPE_REQUIRED`                              | Klucz partnera nie ma zakresu `reservations:update`.                                                                    |
| 404      | `RESERVATION_NOT_FOUND`                       | Rezerwacja nie istnieje albo należy do kogoś innego.                                                                    |
| 409      | `INVALID_STATUS`                              | Rezerwacja nie jest w stanie „potwierdzona”.                                                                            |
| 409      | `ARRIVAL_STARTED`                             | Klient lub partner próbuje zmiany w dniu przyjazdu albo później.                                                        |
| 409      | `VERSION_CONFLICT`                            | `expectedVersion` jest nieaktualne: ktoś zmienił rezerwację wcześniej.                                                  |
| 409      | `PRICE_CHANGED`                               | Podana kwota różni się od nowej wyceny serwera.                                                                         |
| 409      | `ROOM_UNAVAILABLE`                            | Pokój jest zajęty w nowym terminie.                                                                                     |
| 409      | `ACTIVE_PARTNER_SERVICES`                     | Pobyt ma aktywne lub niepewne usługi A/B; trzeba je najpierw anulować albo wyjaśnić.                                    |
| 409      | `GUEST_ASSIGNED_TO_SERVICE`                   | Zmniejszenie liczby gości usunęłoby osobę przypisaną do usługi pakietu.                                                 |
| 400      | `CAPACITY_EXCEEDED`, `GUEST_NAMES_INVALID`    | Za dużo gości albo lista nazwisk niezgodna z liczbą gości.                                                              |
| 409      | `VOUCHER_INVALID`, `VOUCHER_OUTSIDE_VALIDITY` | D nie potwierdził vouchera dla nowych dat.                                                                              |
| 503      | `PARTNER_UNAVAILABLE`, `PARTNER_TIMEOUT`      | D nie odpowiada przy pobycie z voucherem; dane pozostają bez zmian.                                                     |
| —        | błędy wspólne                                 | 400 `VALIDATION_ERROR`, 400 `INVALID_JSON`, 413 `PAYLOAD_TOO_LARGE`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

### ZT-09 — Anuluj rezerwację pobytu

| Element                        | Opis                                                                                                                                                                                    |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                                                                                                               |
| Metoda i ścieżka               | `POST /api/v1/reservations/{id}/cancel`                                                                                                                                                 |
| Cel operacji i odbiorca        | Anulowanie rezerwacji; najpierw anuluje usługi A/B. Odbiorca: właściciel rezerwacji przed dniem przyjazdu, recepcja i administrator.                                                    |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i `X-CSRF-Token` (użytkownik) albo klucz partnera w `Authorization: Bearer` lub `X-API-Key` (serwer partnera).                                            |
| Dozwolone role lub uprawnienia | Klient, recepcjonista, administrator; partner z zakresem `reservations:cancel`.                                                                                                         |
| Ograniczenia dostępu do zasobu | Tylko własna rezerwacja (personel: każda) w stanie „potwierdzona”; klient i partner wyłącznie przed dniem przyjazdu. Ponowne anulowanie anulowanej rezerwacji zwraca jej aktualny stan. |

Parametry i dane wejściowe:

| Nazwa i miejsce | Typ i wymagalność          | Opis i reguły walidacji                                   |
| --------------- | -------------------------- | --------------------------------------------------------- |
| `id` (ścieżka)  | string (1–100 znaków); tak | Identyfikator zasobu z odpowiedzi tworzenia albo z listy. |

Treść żądania: JSON: pusty obiekt `{}` albo brak treści.

Odpowiedź poprawna: 200 — obiekt [Reservation](#reservation).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu                                | Warunek wystąpienia                                                                                   |
| -------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 403      | `CSRF_INVALID`                           | Żądanie z przeglądarki bez ważnej sesji i zgodnego tokenu CSRF. Nie dotyczy żądań z kluczem partnera. |
| 401      | `AUTH_REQUIRED`                          | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.                              |
| 401      | `INVALID_API_KEY`                        | Klucz partnera jest błędny albo wyłączony.                                                            |
| 403      | `SCOPE_REQUIRED`                         | Klucz partnera nie ma zakresu `reservations:cancel`.                                                  |
| 404      | `RESERVATION_NOT_FOUND`                  | Rezerwacja nie istnieje albo należy do kogoś innego.                                                  |
| 409      | `INVALID_STATUS`                         | Pobyt jest już zameldowany albo zakończony.                                                           |
| 409      | `ARRIVAL_STARTED`                        | Klient lub partner próbuje anulować w dniu przyjazdu albo później.                                    |
| 409      | `EXTERNAL_CANCELLATION_PENDING`          | Nie udało się anulować wszystkich usług A/B; pobyt pozostaje aktywny.                                 |
| 409      | `VERSION_CONFLICT`                       | Pobyt zmienił się w trakcie anulowania; trzeba odświeżyć dane.                                        |
| 409      | `VOUCHER_INVALID`, `VOUCHER_USED`        | D nie potwierdził vouchera albo jego hotelowa część została już wykorzystana.                         |
| 503      | `PARTNER_UNAVAILABLE`, `PARTNER_TIMEOUT` | D nie odpowiada przy pobycie z voucherem; pobyt pozostaje aktywny.                                    |
| —        | błędy wspólne                            | 400 `VALIDATION_ERROR`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED`                            |

### ZT-10 — Pokaż usługi w planie pobytu

| Element                        | Opis                                                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                                                                 |
| Metoda i ścieżka               | `GET /api/v1/reservations/{id}/plan`                                                                                                      |
| Cel operacji i odbiorca        | Plan pobytu: usługi pakietu, ich zamówienia u A/B i stan zgłoszenia do D. Odbiorca: właściciel rezerwacji, recepcja, administrator.       |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` (użytkownik) albo klucz partnera w `Authorization: Bearer` lub `X-API-Key` (serwer partnera).               |
| Dozwolone role lub uprawnienia | Klient, recepcjonista, administrator; partner z zakresem `reservations:read`.                                                             |
| Ograniczenia dostępu do zasobu | Te same zasady własności co przy szczegółach rezerwacji. Klient i partner widzą plan, ale zamawiać i anulować usługi może tylko personel. |

Parametry i dane wejściowe:

| Nazwa i miejsce | Typ i wymagalność          | Opis i reguły walidacji                                   |
| --------------- | -------------------------- | --------------------------------------------------------- |
| `id` (ścieżka)  | string (1–100 znaków); tak | Identyfikator zasobu z odpowiedzi tworzenia albo z listy. |

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — obiekt [Plan](#plan).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu               | Warunek wystąpienia                                                        |
| -------- | ----------------------- | -------------------------------------------------------------------------- |
| 401      | `AUTH_REQUIRED`         | Brak sesji lub klucza albo sesja wygasła.                                  |
| 401      | `INVALID_API_KEY`       | Klucz partnera jest błędny albo wyłączony.                                 |
| 403      | `SCOPE_REQUIRED`        | Klucz partnera nie ma zakresu `reservations:read`.                         |
| 404      | `RESERVATION_NOT_FOUND` | Rezerwacja nie istnieje albo należy do kogoś innego.                       |
| —        | błędy wspólne           | 400 `VALIDATION_ERROR`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

### ZT-11 — Zamelduj gościa

| Element                        | Opis                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                                                       |
| Metoda i ścieżka               | `POST /api/v1/reservations/{id}/check-in`                                                                                       |
| Cel operacji i odbiorca        | Zameldowanie gości. Odbiorca: recepcja.                                                                                         |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i nagłówek `X-CSRF-Token`; reprezentuje zalogowanego pracownika.                                  |
| Dozwolone role lub uprawnienia | Recepcjonista, administrator.                                                                                                   |
| Ograniczenia dostępu do zasobu | Dowolna rezerwacja w stanie „potwierdzona”, najwcześniej w dniu przyjazdu. Pobyt z voucherem wymaga pozytywnej weryfikacji w D. |

Parametry i dane wejściowe:

| Nazwa i miejsce | Typ i wymagalność          | Opis i reguły walidacji                                   |
| --------------- | -------------------------- | --------------------------------------------------------- |
| `id` (ścieżka)  | string (1–100 znaków); tak | Identyfikator zasobu z odpowiedzi tworzenia albo z listy. |

Treść żądania: JSON: pusty obiekt `{}` albo brak treści.

Odpowiedź poprawna: 200 — obiekt [Reservation](#reservation).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu                                                     | Warunek wystąpienia                                                        |
| -------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 403      | `CSRF_INVALID`                                                | Brak ważnej sesji albo niezgodny token CSRF.                               |
| 401      | `AUTH_REQUIRED`                                               | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.   |
| 403      | `FORBIDDEN`                                                   | Zalogowany klient albo klucz partnera: operacja tylko dla personelu.       |
| 404      | `RESERVATION_NOT_FOUND`                                       | Rezerwacja nie istnieje.                                                   |
| 409      | `INVALID_STATUS`                                              | Rezerwacja nie jest w stanie „potwierdzona”.                               |
| 409      | `CHECK_IN_TOO_EARLY`                                          | Dzień przyjazdu jeszcze nie nadszedł.                                      |
| 409      | `VOUCHER_INVALID`, `VOUCHER_USED`, `VOUCHER_OUTSIDE_VALIDITY` | D nie potwierdził hotelowej części vouchera.                               |
| 503      | `PARTNER_UNAVAILABLE`, `PARTNER_TIMEOUT`                      | D nie odpowiada: pobytu z voucherem nie można zameldować.                  |
| —        | błędy wspólne                                                 | 400 `VALIDATION_ERROR`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

### ZT-12 — Zakończ pobyt i potwierdź nocleg w D

| Element                        | Opis                                                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                                                                                                       |
| Metoda i ścieżka               | `POST /api/v1/reservations/{id}/check-out`                                                                                                                                      |
| Cel operacji i odbiorca        | Wymeldowanie gości i zgłoszenie do D wykonania noclegu. Odbiorca: recepcja.                                                                                                     |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i nagłówek `X-CSRF-Token`; reprezentuje zalogowanego pracownika.                                                                                  |
| Dozwolone role lub uprawnienia | Recepcjonista, administrator.                                                                                                                                                   |
| Ograniczenia dostępu do zasobu | Dowolna rezerwacja w stanie „zameldowana”; dla już zakończonej ponawia tylko zgłoszenie do D. Awaria D nie cofa zakończenia pobytu; zgłoszenie pozostaje do ponowienia (ZT-20). |

Parametry i dane wejściowe:

| Nazwa i miejsce | Typ i wymagalność          | Opis i reguły walidacji                                   |
| --------------- | -------------------------- | --------------------------------------------------------- |
| `id` (ścieżka)  | string (1–100 znaków); tak | Identyfikator zasobu z odpowiedzi tworzenia albo z listy. |

Treść żądania: JSON: pusty obiekt `{}` albo brak treści.

Odpowiedź poprawna: 200 — obiekt [CheckedOutReservation](#checkedoutreservation).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu               | Warunek wystąpienia                                                        |
| -------- | ----------------------- | -------------------------------------------------------------------------- |
| 403      | `CSRF_INVALID`          | Brak ważnej sesji albo niezgodny token CSRF.                               |
| 401      | `AUTH_REQUIRED`         | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.   |
| 403      | `FORBIDDEN`             | Zalogowany klient albo klucz partnera: operacja tylko dla personelu.       |
| 404      | `RESERVATION_NOT_FOUND` | Rezerwacja nie istnieje.                                                   |
| 409      | `INVALID_STATUS`        | Goście nie zostali jeszcze zameldowani albo pobyt jest anulowany.          |
| —        | błędy wspólne           | 400 `VALIDATION_ERROR`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

### ZT-13 — Popraw listę gości i dane kontaktowe

| Element                        | Opis                                                                                                                             |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                                                        |
| Metoda i ścieżka               | `PATCH /api/v1/reservations/{id}/guests`                                                                                         |
| Cel operacji i odbiorca        | Poprawa listy gości i danych kontaktowych. Odbiorca: recepcja.                                                                   |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i nagłówek `X-CSRF-Token`; reprezentuje zalogowanego pracownika.                                   |
| Dozwolone role lub uprawnienia | Recepcjonista, administrator.                                                                                                    |
| Ograniczenia dostępu do zasobu | Rezerwacja w stanie „potwierdzona” lub „zameldowana”. Nie można zmienić imienia i nazwiska gościa, który ma trwającą usługę A/B. |

Parametry i dane wejściowe:

| Nazwa i miejsce               | Typ i wymagalność                 | Opis i reguły walidacji                                                                         |
| ----------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------- |
| `id` (ścieżka)                | string (1–100 znaków); tak        | Identyfikator zasobu z odpowiedzi tworzenia albo z listy.                                       |
| `expectedVersion` (pole body) | integer (co najmniej 1); tak      | Wersja rezerwacji, którą widział klient; chroni przed nadpisaniem cudzej zmiany.                |
| `guestNames` (pole body)      | lista: string (2–120 znaków); tak | Imiona i nazwiska wszystkich gości; tyle pozycji, ile `guests`.                                 |
| `guest` (pole body)           | obiekt Guest; nie                 | Nowe dane osoby kontaktowej; pominięcie zostawia dotychczasowe. Pola: `name`, `email`, `phone`. |

Treść żądania: JSON, obiekt ReservationGuestsPatch; nieznane pola są odrzucane.

Odpowiedź poprawna: 200 — obiekt [Reservation](#reservation).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu                 | Warunek wystąpienia                                                                                                     |
| -------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 403      | `CSRF_INVALID`            | Brak ważnej sesji albo niezgodny token CSRF.                                                                            |
| 401      | `AUTH_REQUIRED`           | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.                                                |
| 403      | `FORBIDDEN`               | Zalogowany klient albo klucz partnera: operacja tylko dla personelu.                                                    |
| 404      | `RESERVATION_NOT_FOUND`   | Rezerwacja nie istnieje.                                                                                                |
| 409      | `INVALID_STATUS`          | Pobyt jest zakończony albo anulowany.                                                                                   |
| 409      | `VERSION_CONFLICT`        | `expectedVersion` jest nieaktualne.                                                                                     |
| 400      | `GUEST_NAMES_INVALID`     | Liczba nazwisk różni się od liczby gości.                                                                               |
| 409      | `ACTIVE_PARTNER_SERVICES` | Zmiana nazwiska gościa z trwającą usługą A/B.                                                                           |
| —        | błędy wspólne             | 400 `VALIDATION_ERROR`, 400 `INVALID_JSON`, 413 `PAYLOAD_TOO_LARGE`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

### ZT-14 — Zmień przypisanie usługi, notatkę lub stan usługi hotelowej

| Element                        | Opis                                                                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                                                         |
| Metoda i ścieżka               | `PATCH /api/v1/reservations/{id}/items/{itemId}`                                                                                  |
| Cel operacji i odbiorca        | Zmiana przypisania usługi pakietu do gościa, notatki albo stanu usługi hotelowej. Odbiorca: recepcja.                             |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i nagłówek `X-CSRF-Token`; reprezentuje zalogowanego pracownika.                                    |
| Dozwolone role lub uprawnienia | Recepcjonista, administrator.                                                                                                     |
| Ograniczenia dostępu do zasobu | Stan usługi A/B zmienia się wyłącznie przez odpowiedź partnera, nie ręcznie. W anulowanej rezerwacji można dopisać tylko notatkę. |

Parametry i dane wejściowe:

| Nazwa i miejsce          | Typ i wymagalność                                  | Opis i reguły walidacji                                         |
| ------------------------ | -------------------------------------------------- | --------------------------------------------------------------- |
| `id` (ścieżka)           | string (1–100 znaków); tak                         | Identyfikator zasobu z odpowiedzi tworzenia albo z listy.       |
| `itemId` (ścieżka)       | string (1–100 znaków); tak                         | Identyfikator usługi pakietu z planu pobytu.                    |
| `guestIndex` (pole body) | integer (co najmniej 0); nie                       | Numer gościa na liście `guestNames`, od 0.                      |
| `note` (pole body)       | string (do 2000 znaków); nie                       | Notatka recepcji.                                               |
| `status` (pole body)     | string: `unplanned`, `completed`, `cancelled`; nie | Stan usługi hotelowej; stanu usług A/B nie zmienia się ręcznie. |

Treść żądania: JSON, obiekt ReservationItemPatch; nieznane pola są odrzucane.

Odpowiedź poprawna: 200 — obiekt [ReservationItem](#reservationitem).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu                                 | Warunek wystąpienia                                                                                                     |
| -------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 403      | `CSRF_INVALID`                            | Brak ważnej sesji albo niezgodny token CSRF.                                                                            |
| 401      | `AUTH_REQUIRED`                           | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.                                                |
| 403      | `FORBIDDEN`                               | Zalogowany klient albo klucz partnera: operacja tylko dla personelu.                                                    |
| 404      | `RESERVATION_NOT_FOUND`, `ITEM_NOT_FOUND` | Rezerwacja albo usługa pakietu nie istnieje.                                                                            |
| 409      | `PARTNER_STATUS_READ_ONLY`                | Próba ręcznej zmiany stanu usługi A/B.                                                                                  |
| 400      | `INVALID_GUEST`                           | Wskazany gość nie należy do rezerwacji.                                                                                 |
| 409      | `ITEM_ALREADY_BOOKED`                     | Usługa ma aktywne zamówienie; najpierw trzeba je anulować albo wyjaśnić.                                                |
| 409      | `RESERVATION_CLOSED`                      | Rezerwacja jest anulowana.                                                                                              |
| —        | błędy wspólne                             | 400 `VALIDATION_ERROR`, 400 `INVALID_JSON`, 413 `PAYLOAD_TOO_LARGE`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

### ZT-15 — Sprawdź dostępność masażu lub treningu

| Element                        | Opis                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                           |
| Metoda i ścieżka               | `GET /api/v1/reservations/{id}/partner-availability`                                |
| Cel operacji i odbiorca        | Wolne terminy masażu (A) lub treningu (B) dla usługi z pakietu. Odbiorca: recepcja. |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session`; reprezentuje zalogowanego pracownika.                |
| Dozwolone role lub uprawnienia | Recepcjonista, administrator.                                                       |
| Ograniczenia dostępu do zasobu | Tylko dla usług pakietu tej rezerwacji; termin musi mieścić się w pobycie.          |

Parametry i dane wejściowe:

| Nazwa i miejsce    | Typ i wymagalność                  | Opis i reguły walidacji                                   |
| ------------------ | ---------------------------------- | --------------------------------------------------------- |
| `id` (ścieżka)     | string (1–100 znaków); tak         | Identyfikator zasobu z odpowiedzi tworzenia albo z listy. |
| `itemId` (query)   | string (1–100 znaków); tak         | Identyfikator usługi pakietu z planu pobytu.              |
| `startsAt` (query) | string (data i czas ISO 8601); tak | Początek szukanego terminu, ze strefą czasową.            |
| `endsAt` (query)   | string (data i czas ISO 8601); tak | Koniec szukanego terminu, ze strefą czasową.              |

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — lista `{items,total,page,pageSize}`; element: obiekt [PartnerAvailabilityItem](#partneravailabilityitem), dodatkowo `mode`, `partner`.

Odpowiedzi błędów:

| Kod HTTP | Kod błędu                                                    | Warunek wystąpienia                                                        |
| -------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| 401      | `AUTH_REQUIRED`                                              | Brak sesji albo sesja wygasła.                                             |
| 403      | `FORBIDDEN`                                                  | Zalogowany klient albo klucz partnera: operacja tylko dla personelu.       |
| 404      | `RESERVATION_NOT_FOUND`, `ITEM_NOT_FOUND`                    | Rezerwacja albo usługa A/B w pakiecie nie istnieje.                        |
| 400      | `OUTSIDE_STAY`                                               | Termin wykracza poza godziny pobytu.                                       |
| 503      | `PARTNER_DISABLED`, `PARTNER_UNAVAILABLE`, `PARTNER_TIMEOUT` | Połączenie z partnerem jest wyłączone albo partner nie odpowiada.          |
| —        | błędy wspólne                                                | 400 `VALIDATION_ERROR`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

### ZT-16 — Zarezerwuj usługę z pakietu u partnera

| Element                        | Opis                                                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                                                                                     |
| Metoda i ścieżka               | `POST /api/v1/reservations/{id}/partner-bookings`                                                                                                             |
| Cel operacji i odbiorca        | Zamówienie usługi z pakietu u partnera A lub B. Odbiorca: recepcja.                                                                                           |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i nagłówek `X-CSRF-Token`; reprezentuje zalogowanego pracownika.                                                                |
| Dozwolone role lub uprawnienia | Recepcjonista, administrator.                                                                                                                                 |
| Ograniczenia dostępu do zasobu | Rezerwacja musi być aktywna. Termin mieści się w pobycie i nie koliduje z inną usługą tego gościa. Jedna usługa pakietu ma najwyżej jedno aktywne zamówienie. |

Parametry i dane wejściowe:

| Nazwa i miejsce          | Typ i wymagalność                  | Opis i reguły walidacji                                                                        |
| ------------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| `id` (ścieżka)           | string (1–100 znaków); tak         | Identyfikator zasobu z odpowiedzi tworzenia albo z listy.                                      |
| `itemId` (pole body)     | string (1–100 znaków); tak         | Identyfikator usługi pakietu w rezerwacji.                                                     |
| `guestIndex` (pole body) | integer (co najmniej 0); tak       | Numer gościa na liście `guestNames`, od 0.                                                     |
| `startsAt` (pole body)   | string (data i czas ISO 8601); tak | Początek usługi, ze strefą czasową. ISO 8601 ze strefą czasową, np. 2027-06-15T15:00:00+02:00. |
| `endsAt` (pole body)     | string (data i czas ISO 8601); tak | Koniec usługi, ze strefą czasową. ISO 8601 ze strefą czasową, np. 2027-06-15T15:00:00+02:00.   |

Treść żądania: JSON, obiekt BookingCreate; nieznane pola są odrzucane.

Odpowiedź poprawna: 201 — obiekt [Booking](#booking).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu                                 | Warunek wystąpienia                                                                                                     |
| -------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 403      | `CSRF_INVALID`                            | Brak ważnej sesji albo niezgodny token CSRF.                                                                            |
| 401      | `AUTH_REQUIRED`                           | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.                                                |
| 403      | `FORBIDDEN`                               | Zalogowany klient albo klucz partnera: operacja tylko dla personelu.                                                    |
| 404      | `RESERVATION_NOT_FOUND`, `ITEM_NOT_FOUND` | Rezerwacja albo usługa pakietu nie istnieje.                                                                            |
| 409      | `RESERVATION_CLOSED`                      | Pobyt jest zakończony albo anulowany.                                                                                   |
| 400      | `OUTSIDE_STAY`                            | Usługa nie mieści się między przyjazdem a wyjazdem.                                                                     |
| 400      | `INVALID_GUEST`                           | Gość nie jest przypisany do tej usługi pakietu.                                                                         |
| 409      | `ITEM_ALREADY_BOOKED`                     | Usługa jest już zamówiona albo czeka na potwierdzenie.                                                                  |
| 409      | `GUEST_TIME_CONFLICT`                     | Gość ma w tym czasie inną usługę A/B.                                                                                   |
| 503      | `PARTNER_DISABLED`                        | Połączenie z partnerem jest wyłączone.                                                                                  |
| —        | błędy wspólne                             | 400 `VALIDATION_ERROR`, 400 `INVALID_JSON`, 413 `PAYLOAD_TOO_LARGE`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

### ZT-17 — Sprawdź wynik rezerwacji u partnera

| Element                        | Opis                                                                                                      |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                                 |
| Metoda i ścieżka               | `POST /api/v1/reservations/{id}/partner-bookings/{bookingId}/refresh`                                     |
| Cel operacji i odbiorca        | Sprawdzenie u partnera wyniku wcześniejszego zamówienia. Odbiorca: recepcja.                              |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i nagłówek `X-CSRF-Token`; reprezentuje zalogowanego pracownika.            |
| Dozwolone role lub uprawnienia | Recepcjonista, administrator.                                                                             |
| Ograniczenia dostępu do zasobu | Dotyczy tylko zamówienia tej rezerwacji. Operacja trafia wyłącznie do środowiska, w którym ją rozpoczęto. |

Parametry i dane wejściowe:

| Nazwa i miejsce       | Typ i wymagalność          | Opis i reguły walidacji                                   |
| --------------------- | -------------------------- | --------------------------------------------------------- |
| `id` (ścieżka)        | string (1–100 znaków); tak | Identyfikator zasobu z odpowiedzi tworzenia albo z listy. |
| `bookingId` (ścieżka) | string (1–100 znaków); tak | Identyfikator zamówienia usługi z planu pobytu.           |

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — obiekt [Booking](#booking).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu                                    | Warunek wystąpienia                                                        |
| -------- | -------------------------------------------- | -------------------------------------------------------------------------- |
| 403      | `CSRF_INVALID`                               | Brak ważnej sesji albo niezgodny token CSRF.                               |
| 401      | `AUTH_REQUIRED`                              | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.   |
| 403      | `FORBIDDEN`                                  | Zalogowany klient albo klucz partnera: operacja tylko dla personelu.       |
| 404      | `RESERVATION_NOT_FOUND`, `BOOKING_NOT_FOUND` | Rezerwacja albo zamówienie nie istnieje.                                   |
| 409      | `PARTNER_TARGET_CHANGED`                     | Od rozpoczęcia operacji zmieniono tryb lub adres partnera.                 |
| —        | błędy wspólne                                | 400 `VALIDATION_ERROR`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

### ZT-18 — Anuluj usługę A/B

| Element                        | Opis                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                      |
| Metoda i ścieżka               | `POST /api/v1/reservations/{id}/partner-bookings/{bookingId}/cancel`                           |
| Cel operacji i odbiorca        | Anulowanie usługi A/B u partnera. Odbiorca: recepcja.                                          |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i nagłówek `X-CSRF-Token`; reprezentuje zalogowanego pracownika. |
| Dozwolone role lub uprawnienia | Recepcjonista, administrator.                                                                  |
| Ograniczenia dostępu do zasobu | Dotyczy tylko zamówienia tej rezerwacji. Wykonanej usługi nie da się anulować.                 |

Parametry i dane wejściowe:

| Nazwa i miejsce       | Typ i wymagalność          | Opis i reguły walidacji                                   |
| --------------------- | -------------------------- | --------------------------------------------------------- |
| `id` (ścieżka)        | string (1–100 znaków); tak | Identyfikator zasobu z odpowiedzi tworzenia albo z listy. |
| `bookingId` (ścieżka) | string (1–100 znaków); tak | Identyfikator zamówienia usługi z planu pobytu.           |

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — obiekt [Booking](#booking).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu                                    | Warunek wystąpienia                                                        |
| -------- | -------------------------------------------- | -------------------------------------------------------------------------- |
| 403      | `CSRF_INVALID`                               | Brak ważnej sesji albo niezgodny token CSRF.                               |
| 401      | `AUTH_REQUIRED`                              | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.   |
| 403      | `FORBIDDEN`                                  | Zalogowany klient albo klucz partnera: operacja tylko dla personelu.       |
| 404      | `RESERVATION_NOT_FOUND`, `BOOKING_NOT_FOUND` | Rezerwacja albo zamówienie nie istnieje.                                   |
| 409      | `SERVICE_COMPLETED`                          | Partner potwierdził już wykonanie usługi.                                  |
| 409      | `EXTERNAL_CANCELLATION_PENDING`              | Wynik zamówienia jest niepewny; najpierw trzeba go ustalić (ZT-17).        |
| 409      | `PARTNER_TARGET_CHANGED`                     | Od rozpoczęcia operacji zmieniono tryb lub adres partnera.                 |
| —        | błędy wspólne                                | 400 `VALIDATION_ERROR`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

### ZT-19 — Sprawdź voucher pobytu w D

| Element                        | Opis                                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                      |
| Metoda i ścieżka               | `POST /api/v1/reservations/{id}/voucher/check`                                                 |
| Cel operacji i odbiorca        | Sprawdzenie w D hotelowej części vouchera przypisanego do pobytu. Odbiorca: recepcja.          |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i nagłówek `X-CSRF-Token`; reprezentuje zalogowanego pracownika. |
| Dozwolone role lub uprawnienia | Recepcjonista, administrator.                                                                  |
| Ograniczenia dostępu do zasobu | Tylko rezerwacja z voucherem. Numer vouchera nie jest zwracany w odpowiedzi.                   |

Parametry i dane wejściowe:

| Nazwa i miejsce | Typ i wymagalność          | Opis i reguły walidacji                                   |
| --------------- | -------------------------- | --------------------------------------------------------- |
| `id` (ścieżka)  | string (1–100 znaków); tak | Identyfikator zasobu z odpowiedzi tworzenia albo z listy. |

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — obiekt [VoucherCheckResult](#vouchercheckresult).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu                                                     | Warunek wystąpienia                                                        |
| -------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 403      | `CSRF_INVALID`                                                | Brak ważnej sesji albo niezgodny token CSRF.                               |
| 401      | `AUTH_REQUIRED`                                               | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.   |
| 403      | `FORBIDDEN`                                                   | Zalogowany klient albo klucz partnera: operacja tylko dla personelu.       |
| 404      | `RESERVATION_NOT_FOUND`                                       | Rezerwacja nie istnieje.                                                   |
| 400      | `NO_VOUCHER`                                                  | Rezerwacja nie ma vouchera.                                                |
| 409      | `VOUCHER_INVALID`, `VOUCHER_USED`, `VOUCHER_OUTSIDE_VALIDITY` | D nie potwierdził hotelowej części vouchera.                               |
| 503      | `PARTNER_UNAVAILABLE`, `PARTNER_TIMEOUT`                      | D nie odpowiada.                                                           |
| —        | błędy wspólne                                                 | 400 `VALIDATION_ERROR`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

### ZT-20 — Potwierdź wykonanie noclegu w D

| Element                        | Opis                                                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                                                     |
| Metoda i ścieżka               | `POST /api/v1/reservations/{id}/voucher/confirm-completion`                                                                   |
| Cel operacji i odbiorca        | Ponowienie zgłoszenia do D, że nocleg został wykonany. Odbiorca: recepcja.                                                    |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i nagłówek `X-CSRF-Token`; reprezentuje zalogowanego pracownika.                                |
| Dozwolone role lub uprawnienia | Recepcjonista, administrator.                                                                                                 |
| Ograniczenia dostępu do zasobu | Tylko zakończony pobyt z voucherem. Zachowuje identyfikator operacji; zgłoszenie już potwierdzone nie jest wysyłane ponownie. |

Parametry i dane wejściowe:

| Nazwa i miejsce | Typ i wymagalność          | Opis i reguły walidacji                                   |
| --------------- | -------------------------- | --------------------------------------------------------- |
| `id` (ścieżka)  | string (1–100 znaków); tak | Identyfikator zasobu z odpowiedzi tworzenia albo z listy. |

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — obiekt [VoucherOperation](#voucheroperation).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu                | Warunek wystąpienia                                                        |
| -------- | ------------------------ | -------------------------------------------------------------------------- |
| 403      | `CSRF_INVALID`           | Brak ważnej sesji albo niezgodny token CSRF.                               |
| 401      | `AUTH_REQUIRED`          | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.   |
| 403      | `FORBIDDEN`              | Zalogowany klient albo klucz partnera: operacja tylko dla personelu.       |
| 404      | `RESERVATION_NOT_FOUND`  | Rezerwacja nie istnieje.                                                   |
| 400      | `NO_VOUCHER`             | Rezerwacja nie ma vouchera.                                                |
| 409      | `HOTEL_NOT_COMPLETED`    | Pobyt nie został jeszcze zakończony.                                       |
| 409      | `PARTNER_TARGET_CHANGED` | Od rozpoczęcia operacji zmieniono tryb lub adres D.                        |
| —        | błędy wspólne            | 400 `VALIDATION_ERROR`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

### ZT-21 — Pokaż wszystkie pokoje, także wycofane

| Element                        | Opis                                                                        |
| ------------------------------ | --------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                   |
| Metoda i ścieżka               | `GET /api/v1/admin/rooms`                                                   |
| Cel operacji i odbiorca        | Lista wszystkich pokoi, także wycofanych z oferty. Odbiorca: administrator. |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session`; reprezentuje zalogowanego administratora.    |
| Dozwolone role lub uprawnienia | Wyłącznie administrator.                                                    |
| Ograniczenia dostępu do zasobu | Brak ograniczeń zasobu: jeden hotel.                                        |

Parametry i dane wejściowe:

| Nazwa i miejsce    | Typ i wymagalność                         | Opis i reguły walidacji    |
| ------------------ | ----------------------------------------- | -------------------------- |
| `page` (query)     | integer (co najmniej 1, domyślnie 1); nie | Numer strony wyników.      |
| `pageSize` (query) | integer (1–100, domyślnie 20); nie        | Liczba wyników na stronie. |

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — lista `{items,total,page,pageSize}`; element: obiekt [Room](#room).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu       | Warunek wystąpienia                                                                         |
| -------- | --------------- | ------------------------------------------------------------------------------------------- |
| 401      | `AUTH_REQUIRED` | Brak sesji albo sesja wygasła.                                                              |
| 403      | `FORBIDDEN`     | Zalogowany klient lub recepcjonista albo klucz partnera: operacja tylko dla administratora. |
| —        | błędy wspólne   | 400 `VALIDATION_ERROR`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED`                  |

### ZT-22 — Dodaj pokój

| Element                        | Opis                                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                          |
| Metoda i ścieżka               | `POST /api/v1/admin/rooms`                                                                         |
| Cel operacji i odbiorca        | Dodanie pokoju. Odbiorca: administrator.                                                           |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i nagłówek `X-CSRF-Token`; reprezentuje zalogowanego administratora. |
| Dozwolone role lub uprawnienia | Wyłącznie administrator.                                                                           |
| Ograniczenia dostępu do zasobu | Numer pokoju musi być unikalny.                                                                    |

Parametry i dane wejściowe:

| Nazwa i miejsce                | Typ i wymagalność                 | Opis i reguły walidacji   |
| ------------------------------ | --------------------------------- | ------------------------- |
| `number` (pole body)           | string (1–20 znaków); tak         | Numer pokoju; unikalny.   |
| `type` (pole body)             | string (2–80 znaków); tak         | Typ pokoju, np. Standard. |
| `description` (pole body)      | string (do 2000 znaków); nie      | Opis.                     |
| `capacity` (pole body)         | integer (1–30); tak               | Liczba miejsc w pokoju.   |
| `nightlyRateMinor` (pole body) | integer (0–100000000); tak        | Cena za noc w groszach.   |
| `equipment` (pole body)        | lista: string (1–100 znaków); nie | Wyposażenie pokoju.       |
| `active` (pole body)           | boolean (domyślnie True); nie     | Czy wpis jest aktywny.    |

Treść żądania: JSON, obiekt RoomInput; nieznane pola są odrzucane.

Odpowiedź poprawna: 201 — obiekt [Room](#room).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu           | Warunek wystąpienia                                                                                                     |
| -------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 403      | `CSRF_INVALID`      | Brak ważnej sesji albo niezgodny token CSRF.                                                                            |
| 401      | `AUTH_REQUIRED`     | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.                                                |
| 403      | `FORBIDDEN`         | Zalogowany klient lub recepcjonista albo klucz partnera: operacja tylko dla administratora.                             |
| 409      | `ROOM_NUMBER_TAKEN` | Pokój o takim numerze już istnieje.                                                                                     |
| —        | błędy wspólne       | 400 `VALIDATION_ERROR`, 400 `INVALID_JSON`, 413 `PAYLOAD_TOO_LARGE`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

### ZT-23 — Zmień dane pokoju

| Element                        | Opis                                                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                                                     |
| Metoda i ścieżka               | `PATCH /api/v1/admin/rooms/{id}`                                                                                              |
| Cel operacji i odbiorca        | Zmiana danych pokoju albo wycofanie go z oferty. Odbiorca: administrator.                                                     |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i nagłówek `X-CSRF-Token`; reprezentuje zalogowanego administratora.                            |
| Dozwolone role lub uprawnienia | Wyłącznie administrator.                                                                                                      |
| Ograniczenia dostępu do zasobu | Zmiana ceny nie wpływa na zapisane rezerwacje. Pojemności nie można zmniejszyć poniżej liczby gości w istniejącej rezerwacji. |

Parametry i dane wejściowe:

| Nazwa i miejsce                | Typ i wymagalność                 | Opis i reguły walidacji                                   |
| ------------------------------ | --------------------------------- | --------------------------------------------------------- |
| `id` (ścieżka)                 | string (1–100 znaków); tak        | Identyfikator zasobu z odpowiedzi tworzenia albo z listy. |
| `number` (pole body)           | string (1–20 znaków); nie         | Numer pokoju; unikalny.                                   |
| `type` (pole body)             | string (2–80 znaków); nie         | Typ pokoju, np. Standard.                                 |
| `description` (pole body)      | string (do 2000 znaków); nie      | Opis.                                                     |
| `capacity` (pole body)         | integer (1–30); nie               | Liczba miejsc w pokoju.                                   |
| `nightlyRateMinor` (pole body) | integer (0–100000000); nie        | Cena za noc w groszach.                                   |
| `equipment` (pole body)        | lista: string (1–100 znaków); nie | Wyposażenie pokoju.                                       |
| `active` (pole body)           | boolean; nie                      | Czy wpis jest aktywny.                                    |

Treść żądania: JSON, obiekt RoomPatch; nieznane pola są odrzucane.

Odpowiedź poprawna: 200 — obiekt [Room](#room).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu           | Warunek wystąpienia                                                                                                     |
| -------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 403      | `CSRF_INVALID`      | Brak ważnej sesji albo niezgodny token CSRF.                                                                            |
| 401      | `AUTH_REQUIRED`     | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.                                                |
| 403      | `FORBIDDEN`         | Zalogowany klient lub recepcjonista albo klucz partnera: operacja tylko dla administratora.                             |
| 404      | `ROOM_NOT_FOUND`    | Pokój nie istnieje.                                                                                                     |
| 409      | `ROOM_NUMBER_TAKEN` | Numer należy do innego pokoju.                                                                                          |
| 409      | `CAPACITY_IN_USE`   | Pokój ma rezerwację dla większej liczby gości.                                                                          |
| —        | błędy wspólne       | 400 `VALIDATION_ERROR`, 400 `INVALID_JSON`, 413 `PAYLOAD_TOO_LARGE`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

### ZT-24 — Pokaż wszystkie pakiety, także wycofane

| Element                        | Opis                                                                     |
| ------------------------------ | ------------------------------------------------------------------------ |
| Grupa                          | ZT — zewnętrzny z tokenem                                                |
| Metoda i ścieżka               | `GET /api/v1/admin/packages`                                             |
| Cel operacji i odbiorca        | Lista wszystkich pakietów, także wycofanych. Odbiorca: administrator.    |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session`; reprezentuje zalogowanego administratora. |
| Dozwolone role lub uprawnienia | Wyłącznie administrator.                                                 |
| Ograniczenia dostępu do zasobu | Brak ograniczeń zasobu.                                                  |

Parametry i dane wejściowe:

| Nazwa i miejsce    | Typ i wymagalność                         | Opis i reguły walidacji    |
| ------------------ | ----------------------------------------- | -------------------------- |
| `page` (query)     | integer (co najmniej 1, domyślnie 1); nie | Numer strony wyników.      |
| `pageSize` (query) | integer (1–100, domyślnie 20); nie        | Liczba wyników na stronie. |

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — lista `{items,total,page,pageSize}`; element: obiekt [Package](#package).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu       | Warunek wystąpienia                                                                         |
| -------- | --------------- | ------------------------------------------------------------------------------------------- |
| 401      | `AUTH_REQUIRED` | Brak sesji albo sesja wygasła.                                                              |
| 403      | `FORBIDDEN`     | Zalogowany klient lub recepcjonista albo klucz partnera: operacja tylko dla administratora. |
| —        | błędy wspólne   | 400 `VALIDATION_ERROR`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED`                  |

### ZT-25 — Dodaj pakiet

| Element                        | Opis                                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                          |
| Metoda i ścieżka               | `POST /api/v1/admin/packages`                                                                      |
| Cel operacji i odbiorca        | Dodanie pakietu z listą usług. Odbiorca: administrator.                                            |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i nagłówek `X-CSRF-Token`; reprezentuje zalogowanego administratora. |
| Dozwolone role lub uprawnienia | Wyłącznie administrator.                                                                           |
| Ograniczenia dostępu do zasobu | Usługa pakietu wskazuje wykonawcę: hotel, A albo B.                                                |

Parametry i dane wejściowe:

| Nazwa i miejsce           | Typ i wymagalność                   | Opis i reguły walidacji                                                   |
| ------------------------- | ----------------------------------- | ------------------------------------------------------------------------- |
| `name` (pole body)        | string (2–120 znaków); tak          | Nazwa pakietu.                                                            |
| `description` (pole body) | string (do 2000 znaków); nie        | Opis.                                                                     |
| `priceMinor` (pole body)  | integer (0–100000000); tak          | Jednorazowa cena pakietu w groszach.                                      |
| `active` (pole body)      | boolean (domyślnie True); nie       | Czy wpis jest aktywny.                                                    |
| `items` (pole body)       | lista: obiekt PackageItemInput; nie | Usługi wchodzące w skład pakietu. Suma quantity nie może przekraczać 100. |

Treść żądania: JSON, obiekt PackageInput; nieznane pola są odrzucane.

Odpowiedź poprawna: 201 — obiekt [Package](#package).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu       | Warunek wystąpienia                                                                                                     |
| -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 403      | `CSRF_INVALID`  | Brak ważnej sesji albo niezgodny token CSRF.                                                                            |
| 401      | `AUTH_REQUIRED` | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.                                                |
| 403      | `FORBIDDEN`     | Zalogowany klient lub recepcjonista albo klucz partnera: operacja tylko dla administratora.                             |
| —        | błędy wspólne   | 400 `VALIDATION_ERROR`, 400 `INVALID_JSON`, 413 `PAYLOAD_TOO_LARGE`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

### ZT-26 — Zmień pakiet

| Element                        | Opis                                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                          |
| Metoda i ścieżka               | `PATCH /api/v1/admin/packages/{id}`                                                                |
| Cel operacji i odbiorca        | Zmiana pakietu albo wycofanie go z oferty. Odbiorca: administrator.                                |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i nagłówek `X-CSRF-Token`; reprezentuje zalogowanego administratora. |
| Dozwolone role lub uprawnienia | Wyłącznie administrator.                                                                           |
| Ograniczenia dostępu do zasobu | Zmiana nie wpływa na kopie usług w zapisanych rezerwacjach.                                        |

Parametry i dane wejściowe:

| Nazwa i miejsce           | Typ i wymagalność                   | Opis i reguły walidacji                                                         |
| ------------------------- | ----------------------------------- | ------------------------------------------------------------------------------- |
| `id` (ścieżka)            | string (1–100 znaków); tak          | Identyfikator zasobu z odpowiedzi tworzenia albo z listy.                       |
| `name` (pole body)        | string (2–120 znaków); nie          | Nazwa pakietu.                                                                  |
| `description` (pole body) | string (do 2000 znaków); nie        | Opis.                                                                           |
| `priceMinor` (pole body)  | integer (0–100000000); nie          | Jednorazowa cena pakietu w groszach.                                            |
| `active` (pole body)      | boolean; nie                        | Czy wpis jest aktywny.                                                          |
| `items` (pole body)       | lista: obiekt PackageItemInput; nie | Nowa lista usług; zastępuje poprzednią. Suma quantity nie może przekraczać 100. |

Treść żądania: JSON, obiekt PackagePatch; nieznane pola są odrzucane.

Odpowiedź poprawna: 200 — obiekt [Package](#package).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu           | Warunek wystąpienia                                                                                                     |
| -------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 403      | `CSRF_INVALID`      | Brak ważnej sesji albo niezgodny token CSRF.                                                                            |
| 401      | `AUTH_REQUIRED`     | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.                                                |
| 403      | `FORBIDDEN`         | Zalogowany klient lub recepcjonista albo klucz partnera: operacja tylko dla administratora.                             |
| 404      | `PACKAGE_NOT_FOUND` | Pakiet nie istnieje.                                                                                                    |
| —        | błędy wspólne       | 400 `VALIDATION_ERROR`, 400 `INVALID_JSON`, 413 `PAYLOAD_TOO_LARGE`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

### ZT-27 — Pokaż konta użytkowników

| Element                        | Opis                                                                     |
| ------------------------------ | ------------------------------------------------------------------------ |
| Grupa                          | ZT — zewnętrzny z tokenem                                                |
| Metoda i ścieżka               | `GET /api/v1/admin/users`                                                |
| Cel operacji i odbiorca        | Lista kont użytkowników. Odbiorca: administrator.                        |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session`; reprezentuje zalogowanego administratora. |
| Dozwolone role lub uprawnienia | Wyłącznie administrator.                                                 |
| Ograniczenia dostępu do zasobu | Odpowiedź nie zawiera skrótów haseł.                                     |

Parametry i dane wejściowe:

| Nazwa i miejsce    | Typ i wymagalność                         | Opis i reguły walidacji    |
| ------------------ | ----------------------------------------- | -------------------------- |
| `page` (query)     | integer (co najmniej 1, domyślnie 1); nie | Numer strony wyników.      |
| `pageSize` (query) | integer (1–100, domyślnie 20); nie        | Liczba wyników na stronie. |

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — lista `{items,total,page,pageSize}`; element: obiekt [User](#user).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu       | Warunek wystąpienia                                                                         |
| -------- | --------------- | ------------------------------------------------------------------------------------------- |
| 401      | `AUTH_REQUIRED` | Brak sesji albo sesja wygasła.                                                              |
| 403      | `FORBIDDEN`     | Zalogowany klient lub recepcjonista albo klucz partnera: operacja tylko dla administratora. |
| —        | błędy wspólne   | 400 `VALIDATION_ERROR`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED`                  |

### ZT-28 — Dodaj konto użytkownika

| Element                        | Opis                                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                          |
| Metoda i ścieżka               | `POST /api/v1/admin/users`                                                                         |
| Cel operacji i odbiorca        | Utworzenie konta, także recepcjonisty lub administratora. Odbiorca: administrator.                 |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i nagłówek `X-CSRF-Token`; reprezentuje zalogowanego administratora. |
| Dozwolone role lub uprawnienia | Wyłącznie administrator.                                                                           |
| Ograniczenia dostępu do zasobu | Jedyny sposób nadania roli personelu. Nowe konto musi zmienić hasło przy pierwszym logowaniu.      |

Parametry i dane wejściowe:

| Nazwa i miejsce        | Typ i wymagalność                                   | Opis i reguły walidacji                                                                                                                |
| ---------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `name` (pole body)     | string (2–120 znaków); tak                          | Imię i nazwisko.                                                                                                                       |
| `email` (pole body)    | string (e-mail, do 254 znaków); tak                 | Adres e-mail; jest loginem.                                                                                                            |
| `phone` (pole body)    | string (do 30 znaków, wzorzec `^[+\d\s()-]*$`); nie | Telefon; może być pusty.                                                                                                               |
| `password` (pole body) | string (10–128 znaków); tak                         | Hasło startowe; użytkownik zmieni je przy pierwszym logowaniu. Domyślnie minimum 10 znaków; operator może zmienić PASSWORD_MIN_LENGTH. |
| `role` (pole body)     | string: `client`, `receptionist`, `admin`; tak      | Rola nowego konta.                                                                                                                     |

Treść żądania: JSON, obiekt UserCreate; nieznane pola są odrzucane.

Odpowiedź poprawna: 201 — obiekt [User](#user).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu       | Warunek wystąpienia                                                                                                     |
| -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 403      | `CSRF_INVALID`  | Brak ważnej sesji albo niezgodny token CSRF.                                                                            |
| 401      | `AUTH_REQUIRED` | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.                                                |
| 403      | `FORBIDDEN`     | Zalogowany klient lub recepcjonista albo klucz partnera: operacja tylko dla administratora.                             |
| 409      | `EMAIL_TAKEN`   | Adres e-mail jest już zarejestrowany.                                                                                   |
| —        | błędy wspólne   | 400 `VALIDATION_ERROR`, 400 `INVALID_JSON`, 413 `PAYLOAD_TOO_LARGE`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

### ZT-29 — Zmień konto lub uprawnienia użytkownika

| Element                        | Opis                                                                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                                                              |
| Metoda i ścieżka               | `PATCH /api/v1/admin/users/{id}`                                                                                                       |
| Cel operacji i odbiorca        | Zmiana danych, roli albo blokada konta. Odbiorca: administrator.                                                                       |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i nagłówek `X-CSRF-Token`; reprezentuje zalogowanego administratora.                                     |
| Dozwolone role lub uprawnienia | Wyłącznie administrator.                                                                                                               |
| Ograniczenia dostępu do zasobu | Nie można zablokować ani zdegradować ostatniego aktywnego administratora, także samego siebie. Blokada natychmiast kończy sesje konta. |

Parametry i dane wejściowe:

| Nazwa i miejsce      | Typ i wymagalność                                   | Opis i reguły walidacji                                   |
| -------------------- | --------------------------------------------------- | --------------------------------------------------------- |
| `id` (ścieżka)       | string (1–100 znaków); tak                          | Identyfikator zasobu z odpowiedzi tworzenia albo z listy. |
| `name` (pole body)   | string (2–120 znaków); nie                          | Imię i nazwisko.                                          |
| `phone` (pole body)  | string (do 30 znaków, wzorzec `^[+\d\s()-]*$`); nie | Telefon; może być pusty.                                  |
| `role` (pole body)   | string: `client`, `receptionist`, `admin`; nie      | Nowa rola konta.                                          |
| `active` (pole body) | boolean; nie                                        | Fałsz blokuje konto i kończy jego sesje.                  |

Treść żądania: JSON, obiekt UserPatch; nieznane pola są odrzucane.

Odpowiedź poprawna: 200 — obiekt [User](#user).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu        | Warunek wystąpienia                                                                                                     |
| -------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 403      | `CSRF_INVALID`   | Brak ważnej sesji albo niezgodny token CSRF.                                                                            |
| 401      | `AUTH_REQUIRED`  | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.                                                |
| 403      | `FORBIDDEN`      | Zalogowany klient lub recepcjonista albo klucz partnera: operacja tylko dla administratora.                             |
| 404      | `USER_NOT_FOUND` | Konto nie istnieje.                                                                                                     |
| 409      | `LAST_ADMIN`     | Zmiana pozostawiłaby hotel bez aktywnego administratora.                                                                |
| —        | błędy wspólne    | 400 `VALIDATION_ERROR`, 400 `INVALID_JSON`, 413 `PAYLOAD_TOO_LARGE`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

### ZT-30 — Ustaw hasło tymczasowe

| Element                        | Opis                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                                    |
| Metoda i ścieżka               | `POST /api/v1/admin/users/{id}/reset-password`                                                               |
| Cel operacji i odbiorca        | Ustawienie hasła tymczasowego. Odbiorca: administrator.                                                      |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i nagłówek `X-CSRF-Token`; reprezentuje zalogowanego administratora.           |
| Dozwolone role lub uprawnienia | Wyłącznie administrator.                                                                                     |
| Ograniczenia dostępu do zasobu | Kończy sesje konta i wymusza zmianę hasła przy logowaniu. Hasło przekazuje się użytkownikowi poza aplikacją. |

Parametry i dane wejściowe:

| Nazwa i miejsce                 | Typ i wymagalność           | Opis i reguły walidacji                                                                   |
| ------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------- |
| `id` (ścieżka)                  | string (1–100 znaków); tak  | Identyfikator zasobu z odpowiedzi tworzenia albo z listy.                                 |
| `temporaryPassword` (pole body) | string (10–128 znaków); tak | Hasło tymczasowe. Domyślnie minimum 10 znaków; operator może zmienić PASSWORD_MIN_LENGTH. |

Treść żądania: JSON, obiekt PasswordReset; nieznane pola są odrzucane.

Odpowiedź poprawna: 200 — obiekt [User](#user).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu        | Warunek wystąpienia                                                                                                     |
| -------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 403      | `CSRF_INVALID`   | Brak ważnej sesji albo niezgodny token CSRF.                                                                            |
| 401      | `AUTH_REQUIRED`  | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.                                                |
| 403      | `FORBIDDEN`      | Zalogowany klient lub recepcjonista albo klucz partnera: operacja tylko dla administratora.                             |
| 404      | `USER_NOT_FOUND` | Konto nie istnieje.                                                                                                     |
| —        | błędy wspólne    | 400 `VALIDATION_ERROR`, 400 `INVALID_JSON`, 413 `PAYLOAD_TOO_LARGE`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

### ZT-31 — Pobierz ustawienia hotelu

| Element                        | Opis                                                                     |
| ------------------------------ | ------------------------------------------------------------------------ |
| Grupa                          | ZT — zewnętrzny z tokenem                                                |
| Metoda i ścieżka               | `GET /api/v1/admin/hotel-settings`                                       |
| Cel operacji i odbiorca        | Odczyt nazwy hotelu i godzin pobytu. Odbiorca: administrator.            |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session`; reprezentuje zalogowanego administratora. |
| Dozwolone role lub uprawnienia | Wyłącznie administrator.                                                 |
| Ograniczenia dostępu do zasobu | Brak ograniczeń zasobu.                                                  |

Parametry i dane wejściowe:

Brak parametrów.

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — obiekt [HotelSettings](#hotelsettings).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu       | Warunek wystąpienia                                                                         |
| -------- | --------------- | ------------------------------------------------------------------------------------------- |
| 401      | `AUTH_REQUIRED` | Brak sesji albo sesja wygasła.                                                              |
| 403      | `FORBIDDEN`     | Zalogowany klient lub recepcjonista albo klucz partnera: operacja tylko dla administratora. |
| —        | błędy wspólne   | 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED`                                          |

### ZT-32 — Zmień nazwę hotelu i godziny pobytu

| Element                        | Opis                                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                          |
| Metoda i ścieżka               | `PATCH /api/v1/admin/hotel-settings`                                                               |
| Cel operacji i odbiorca        | Zmiana nazwy hotelu i godzin pobytu. Odbiorca: administrator.                                      |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i nagłówek `X-CSRF-Token`; reprezentuje zalogowanego administratora. |
| Dozwolone role lub uprawnienia | Wyłącznie administrator.                                                                           |
| Ograniczenia dostępu do zasobu | Godziny wpływają na dozwolone terminy usług A/B.                                                   |

Parametry i dane wejściowe:

| Nazwa i miejsce            | Typ i wymagalność                                  | Opis i reguły walidacji                |
| -------------------------- | -------------------------------------------------- | -------------------------------------- |
| `hotelName` (pole body)    | string (2–120 znaków); nie                         | Nazwa hotelu.                          |
| `checkInTime` (pole body)  | string (wzorzec `^([01]\d\|2[0-3]):[0-5]\d$`); nie | Godzina, od której trwa pobyt (GG:MM). |
| `checkOutTime` (pole body) | string (wzorzec `^([01]\d\|2[0-3]):[0-5]\d$`); nie | Godzina, do której trwa pobyt (GG:MM). |

Treść żądania: JSON, obiekt HotelSettingsPatch; nieznane pola są odrzucane.

Odpowiedź poprawna: 200 — obiekt [HotelSettings](#hotelsettings).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu       | Warunek wystąpienia                                                                                                     |
| -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 403      | `CSRF_INVALID`  | Brak ważnej sesji albo niezgodny token CSRF.                                                                            |
| 401      | `AUTH_REQUIRED` | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.                                                |
| 403      | `FORBIDDEN`     | Zalogowany klient lub recepcjonista albo klucz partnera: operacja tylko dla administratora.                             |
| —        | błędy wspólne   | 400 `VALIDATION_ERROR`, 400 `INVALID_JSON`, 413 `PAYLOAD_TOO_LARGE`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

### ZT-33 — Pokaż historię operacji

| Element                        | Opis                                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                          |
| Metoda i ścieżka               | `GET /api/v1/admin/audit-events`                                                                   |
| Cel operacji i odbiorca        | Historia operacji z filtrowaniem. Odbiorca: administrator.                                         |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session`; reprezentuje zalogowanego administratora.                           |
| Dozwolone role lub uprawnienia | Wyłącznie administrator.                                                                           |
| Ograniczenia dostępu do zasobu | Wpisy nie zawierają haseł, kluczy ani pełnych treści żądań. Historii nie da się zmienić przez API. |

Parametry i dane wejściowe:

| Nazwa i miejsce    | Typ i wymagalność                         | Opis i reguły walidacji          |
| ------------------ | ----------------------------------------- | -------------------------------- |
| `page` (query)     | integer (co najmniej 1, domyślnie 1); nie | Numer strony wyników.            |
| `pageSize` (query) | integer (1–100, domyślnie 20); nie        | Liczba wyników na stronie.       |
| `action` (query)   | string (do 150 znaków); nie               | Dokładna nazwa operacji.         |
| `entityId` (query) | string (do 150 znaków); nie               | Identyfikator obiektu.           |
| `actorId` (query)  | string (do 150 znaków); nie               | Identyfikator autora operacji.   |
| `from` (query)     | string (data i czas ISO 8601); nie        | Wpisy nie starsze niż ta chwila. |
| `to` (query)       | string (data i czas ISO 8601); nie        | Wpisy nie nowsze niż ta chwila.  |

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — lista `{items,total,page,pageSize}`; element: obiekt [AuditEvent](#auditevent).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu          | Warunek wystąpienia                                                                         |
| -------- | ------------------ | ------------------------------------------------------------------------------------------- |
| 401      | `AUTH_REQUIRED`    | Brak sesji albo sesja wygasła.                                                              |
| 403      | `FORBIDDEN`        | Zalogowany klient lub recepcjonista albo klucz partnera: operacja tylko dla administratora. |
| 400      | `VALIDATION_ERROR` | Błędny format daty w `from` lub `to`.                                                       |
| —        | błędy wspólne      | 400 `VALIDATION_ERROR`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED`                  |

### ZT-34 — Pokaż połączenia z A, B i D

| Element                        | Opis                                                                     |
| ------------------------------ | ------------------------------------------------------------------------ |
| Grupa                          | ZT — zewnętrzny z tokenem                                                |
| Metoda i ścieżka               | `GET /api/v1/admin/integrations`                                         |
| Cel operacji i odbiorca        | Lista połączeń z A, B i D. Odbiorca: administrator.                      |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session`; reprezentuje zalogowanego administratora. |
| Dozwolone role lub uprawnienia | Wyłącznie administrator.                                                 |
| Ograniczenia dostępu do zasobu | Sekrety partnerów są zwracane wyłącznie jako maska.                      |

Parametry i dane wejściowe:

| Nazwa i miejsce    | Typ i wymagalność                         | Opis i reguły walidacji    |
| ------------------ | ----------------------------------------- | -------------------------- |
| `page` (query)     | integer (co najmniej 1, domyślnie 1); nie | Numer strony wyników.      |
| `pageSize` (query) | integer (1–100, domyślnie 20); nie        | Liczba wyników na stronie. |

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — lista `{items,total,page,pageSize}`; element: obiekt [Integration](#integration).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu       | Warunek wystąpienia                                                                         |
| -------- | --------------- | ------------------------------------------------------------------------------------------- |
| 401      | `AUTH_REQUIRED` | Brak sesji albo sesja wygasła.                                                              |
| 403      | `FORBIDDEN`     | Zalogowany klient lub recepcjonista albo klucz partnera: operacja tylko dla administratora. |
| —        | błędy wspólne   | 400 `VALIDATION_ERROR`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED`                  |

### ZT-35 — Pobierz ustawienia połączenia z partnerem

| Element                        | Opis                                                                     |
| ------------------------------ | ------------------------------------------------------------------------ |
| Grupa                          | ZT — zewnętrzny z tokenem                                                |
| Metoda i ścieżka               | `GET /api/v1/admin/integrations/{partner}`                               |
| Cel operacji i odbiorca        | Ustawienia jednego połączenia. Odbiorca: administrator.                  |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session`; reprezentuje zalogowanego administratora. |
| Dozwolone role lub uprawnienia | Wyłącznie administrator.                                                 |
| Ograniczenia dostępu do zasobu | Sekret partnera jest zwracany wyłącznie jako maska.                      |

Parametry i dane wejściowe:

| Nazwa i miejsce     | Typ i wymagalność          | Opis i reguły walidacji |
| ------------------- | -------------------------- | ----------------------- |
| `partner` (ścieżka) | string: `A`, `B`, `D`; tak | Oznaczenie partnera.    |

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — obiekt [Integration](#integration).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu       | Warunek wystąpienia                                                                         |
| -------- | --------------- | ------------------------------------------------------------------------------------------- |
| 401      | `AUTH_REQUIRED` | Brak sesji albo sesja wygasła.                                                              |
| 403      | `FORBIDDEN`     | Zalogowany klient lub recepcjonista albo klucz partnera: operacja tylko dla administratora. |
| —        | błędy wspólne   | 400 `VALIDATION_ERROR`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED`                  |

### ZT-36 — Zmień ustawienia połączenia z partnerem

| Element                        | Opis                                                                                                                                                                        |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                                                                                                   |
| Metoda i ścieżka               | `PATCH /api/v1/admin/integrations/{partner}`                                                                                                                                |
| Cel operacji i odbiorca        | Zmiana trybu, adresu, limitu czasu, nagłówka lub sekretu połączenia. Odbiorca: administrator.                                                                               |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i nagłówek `X-CSRF-Token`; reprezentuje zalogowanego administratora.                                                                          |
| Dozwolone role lub uprawnienia | Wyłącznie administrator.                                                                                                                                                    |
| Ograniczenia dostępu do zasobu | Adres musi wskazywać host z listy `ALLOWED_PARTNER_HOSTS`; adresy prywatne wymagają osobnej zgody w konfiguracji serwera. Odesłanie maski nie nadpisuje zapisanego sekretu. |

Parametry i dane wejściowe:

| Nazwa i miejsce            | Typ i wymagalność                                                                                               | Opis i reguły walidacji                                                                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `partner` (ścieżka)        | string: `A`, `B`, `D`; tak                                                                                      | Oznaczenie partnera.                                                                                                                                                        |
| `mode` (pole body)         | string: `demo`, `real`; nie                                                                                     | Tryb: `demo` (symulator) albo `real` (HTTP).                                                                                                                                |
| `enabled` (pole body)      | boolean; nie                                                                                                    | Czy połączenie jest włączone.                                                                                                                                               |
| `baseUrl` (pole body)      | string (do 1000 znaków); nie                                                                                    | Adres API partnera.                                                                                                                                                         |
| `secret` (pole body)       | string (do 2000 znaków); nie                                                                                    | Sekret partnera; w odpowiedzi tylko maska. Pominięcie pola zachowuje obecny klucz. Pusty tekst go usuwa. Przesłanie zamaskowanej wartości pozostawia klucz bez zmian.       |
| `timeoutMs` (pole body)    | integer (1000–30000); nie                                                                                       | Limit czasu jednego wywołania w milisekundach. Limit czasu jednej próby w milisekundach. Obejmuje wyszukiwanie DNS i żądanie HTTP.                                          |
| `authHeader` (pole body)   | string: `X-API-Key`, `Authorization`; nie                                                                       | Nagłówek, w którym wysyłamy sekret. Przy nagłówku Authorization można podać sam token albo token z prefiksem Bearer. Aplikacja dopisze prefiks tylko wtedy, gdy go brakuje. |
| `demoScenario` (pole body) | string: `normal`, `reject`, `timeout`, `timeout_after_success`, `invalid_json`, `unavailable`, `completed`; nie | Zachowanie symulatora w trybie demo.                                                                                                                                        |

Treść żądania: JSON, obiekt IntegrationPatch; nieznane pola są odrzucane.

Odpowiedź poprawna: 200 — obiekt [Integration](#integration).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu                                  | Warunek wystąpienia                                                                                                     |
| -------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| 403      | `CSRF_INVALID`                             | Brak ważnej sesji albo niezgodny token CSRF.                                                                            |
| 401      | `AUTH_REQUIRED`                            | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.                                                |
| 403      | `FORBIDDEN`                                | Zalogowany klient lub recepcjonista albo klucz partnera: operacja tylko dla administratora.                             |
| 400      | `INVALID_PARTNER_URL`                      | Adres nie jest pełnym adresem HTTP/HTTPS albo zawiera login, parametry lub fragment.                                    |
| 400      | `PARTNER_HOST_DENIED`                      | Host nie jest na liście dozwolonych.                                                                                    |
| 400      | `PRIVATE_ADDRESS_DENIED`, `HTTPS_REQUIRED` | Adres prywatny bez zgody albo HTTP poza lokalnym symulatorem.                                                           |
| —        | błędy wspólne                              | 400 `VALIDATION_ERROR`, 400 `INVALID_JSON`, 413 `PAYLOAD_TOO_LARGE`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

### ZT-37 — Sprawdź połączenie z partnerem

| Element                        | Opis                                                                                                                       |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                                                  |
| Metoda i ścieżka               | `POST /api/v1/admin/integrations/{partner}/test`                                                                           |
| Cel operacji i odbiorca        | Test połączenia z partnerem; zapisuje wynik. Odbiorca: administrator.                                                      |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i nagłówek `X-CSRF-Token`; reprezentuje zalogowanego administratora.                         |
| Dozwolone role lub uprawnienia | Wyłącznie administrator.                                                                                                   |
| Ograniczenia dostępu do zasobu | Wywołuje tylko adres `/health` partnera. Wynik, także negatywny, zapisuje w ustawieniach połączenia i w historii operacji. |

Parametry i dane wejściowe:

| Nazwa i miejsce     | Typ i wymagalność          | Opis i reguły walidacji |
| ------------------- | -------------------------- | ----------------------- |
| `partner` (ścieżka) | string: `A`, `B`, `D`; tak | Oznaczenie partnera.    |

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — obiekt [ConnectionTest](#connectiontest).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu                                                                                | Warunek wystąpienia                                                                         |
| -------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 403      | `CSRF_INVALID`                                                                           | Brak ważnej sesji albo niezgodny token CSRF.                                                |
| 401      | `AUTH_REQUIRED`                                                                          | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.                    |
| 403      | `FORBIDDEN`                                                                              | Zalogowany klient lub recepcjonista albo klucz partnera: operacja tylko dla administratora. |
| 503      | `PARTNER_DISABLED`, `PARTNER_UNAVAILABLE`, `PARTNER_TIMEOUT`, `PARTNER_INVALID_RESPONSE` | Połączenie jest wyłączone, partner nie odpowiada albo odpowiedź nie pasuje do kontraktu.    |
| —        | błędy wspólne                                                                            | 400 `VALIDATION_ERROR`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED`                  |

### ZT-38 — Pobierz ofertę masaży lub treningów

| Element                        | Opis                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                                           |
| Metoda i ścieżka               | `GET /api/v1/admin/integrations/{partner}/catalog`                                                                  |
| Cel operacji i odbiorca        | Oferta masaży (A) lub treningów (B) pobrana od partnera, potrzebna przy tworzeniu pakietu. Odbiorca: administrator. |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session`; reprezentuje zalogowanego administratora.                                            |
| Dozwolone role lub uprawnienia | Wyłącznie administrator.                                                                                            |
| Ograniczenia dostępu do zasobu | Tylko partnerzy A i B.                                                                                              |

Parametry i dane wejściowe:

| Nazwa i miejsce     | Typ i wymagalność                         | Opis i reguły walidacji    |
| ------------------- | ----------------------------------------- | -------------------------- |
| `partner` (ścieżka) | string: `A`, `B`; tak                     | Oznaczenie partnera.       |
| `page` (query)      | integer (co najmniej 1, domyślnie 1); nie | Numer strony wyników.      |
| `pageSize` (query)  | integer (1–100, domyślnie 20); nie        | Liczba wyników na stronie. |

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — lista `{items,total,page,pageSize}`; element: obiekt [PartnerOffer](#partneroffer), dodatkowo `mode`.

Odpowiedzi błędów:

| Kod HTTP | Kod błędu                                                    | Warunek wystąpienia                                                                         |
| -------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| 401      | `AUTH_REQUIRED`                                              | Brak sesji albo sesja wygasła.                                                              |
| 403      | `FORBIDDEN`                                                  | Zalogowany klient lub recepcjonista albo klucz partnera: operacja tylko dla administratora. |
| 503      | `PARTNER_DISABLED`, `PARTNER_UNAVAILABLE`, `PARTNER_TIMEOUT` | Połączenie jest wyłączone albo partner nie odpowiada.                                       |
| —        | błędy wspólne                                                | 400 `VALIDATION_ERROR`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED`                  |

### ZT-39 — Pokaż klucze dostępu do API hotelu

| Element                        | Opis                                                                     |
| ------------------------------ | ------------------------------------------------------------------------ |
| Grupa                          | ZT — zewnętrzny z tokenem                                                |
| Metoda i ścieżka               | `GET /api/v1/admin/api-keys`                                             |
| Cel operacji i odbiorca        | Lista kluczy dostępu do API hotelu. Odbiorca: administrator.             |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session`; reprezentuje zalogowanego administratora. |
| Dozwolone role lub uprawnienia | Wyłącznie administrator.                                                 |
| Ograniczenia dostępu do zasobu | Odpowiedź nie zawiera wartości kluczy ani ich skrótów.                   |

Parametry i dane wejściowe:

| Nazwa i miejsce    | Typ i wymagalność                         | Opis i reguły walidacji    |
| ------------------ | ----------------------------------------- | -------------------------- |
| `page` (query)     | integer (co najmniej 1, domyślnie 1); nie | Numer strony wyników.      |
| `pageSize` (query) | integer (1–100, domyślnie 20); nie        | Liczba wyników na stronie. |

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — lista `{items,total,page,pageSize}`; element: obiekt [ApiKey](#apikey).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu       | Warunek wystąpienia                                                                         |
| -------- | --------------- | ------------------------------------------------------------------------------------------- |
| 401      | `AUTH_REQUIRED` | Brak sesji albo sesja wygasła.                                                              |
| 403      | `FORBIDDEN`     | Zalogowany klient lub recepcjonista albo klucz partnera: operacja tylko dla administratora. |
| —        | błędy wspólne   | 400 `VALIDATION_ERROR`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED`                  |

### ZT-40 — Utwórz klucz dla partnera

| Element                        | Opis                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                                                      |
| Metoda i ścieżka               | `POST /api/v1/admin/api-keys`                                                                                                  |
| Cel operacji i odbiorca        | Utworzenie klucza dla partnera z wybranymi zakresami. Odbiorca: administrator.                                                 |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i nagłówek `X-CSRF-Token`; reprezentuje zalogowanego administratora.                             |
| Dozwolone role lub uprawnienia | Wyłącznie administrator.                                                                                                       |
| Ograniczenia dostępu do zasobu | Pełna wartość klucza jest zwracana tylko w tej jednej odpowiedzi. Klucz bez zaznaczonych zakresów nie daje dostępu do niczego. |

Parametry i dane wejściowe:

| Nazwa i miejsce       | Typ i wymagalność                                                                                                            | Opis i reguły walidacji                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `name` (pole body)    | string (2–100 znaków); tak                                                                                                   | Nazwa klucza.                                                   |
| `partner` (pole body) | string (wzorzec `^[A-Z][A-Z0-9_-]{0,31}$`); tak                                                                              | Oznaczenie partnera, np. `D`; wielkie litery, cyfry, `_` i `-`. |
| `scopes` (pole body)  | lista: string: `catalog:read`, `reservations:create`, `reservations:read`, `reservations:update`, `reservations:cancel`; tak | Zakresy klucza.                                                 |

Treść żądania: JSON, obiekt ApiKeyCreate; nieznane pola są odrzucane.

Odpowiedź poprawna: 201 — obiekt [CreatedApiKey](#createdapikey).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu       | Warunek wystąpienia                                                                                                     |
| -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 403      | `CSRF_INVALID`  | Brak ważnej sesji albo niezgodny token CSRF.                                                                            |
| 401      | `AUTH_REQUIRED` | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.                                                |
| 403      | `FORBIDDEN`     | Zalogowany klient lub recepcjonista albo klucz partnera: operacja tylko dla administratora.                             |
| —        | błędy wspólne   | 400 `VALIDATION_ERROR`, 400 `INVALID_JSON`, 413 `PAYLOAD_TOO_LARGE`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

### ZT-41 — Zmień uprawnienia klucza lub wyłącz go

| Element                        | Opis                                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                          |
| Metoda i ścieżka               | `PATCH /api/v1/admin/api-keys/{id}`                                                                |
| Cel operacji i odbiorca        | Zmiana nazwy lub zakresów klucza albo jego wyłączenie. Odbiorca: administrator.                    |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i nagłówek `X-CSRF-Token`; reprezentuje zalogowanego administratora. |
| Dozwolone role lub uprawnienia | Wyłącznie administrator.                                                                           |
| Ograniczenia dostępu do zasobu | Zmiana działa od następnego żądania partnera, bez restartu.                                        |

Parametry i dane wejściowe:

| Nazwa i miejsce      | Typ i wymagalność                                                                                                            | Opis i reguły walidacji                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `id` (ścieżka)       | string (1–100 znaków); tak                                                                                                   | Identyfikator zasobu z odpowiedzi tworzenia albo z listy. |
| `name` (pole body)   | string (2–100 znaków); nie                                                                                                   | Nazwa klucza.                                             |
| `active` (pole body) | boolean; nie                                                                                                                 | Czy wpis jest aktywny.                                    |
| `scopes` (pole body) | lista: string: `catalog:read`, `reservations:create`, `reservations:read`, `reservations:update`, `reservations:cancel`; nie | Zakresy klucza.                                           |

Treść żądania: JSON, obiekt ApiKeyPatch; nieznane pola są odrzucane.

Odpowiedź poprawna: 200 — obiekt [ApiKey](#apikey).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu       | Warunek wystąpienia                                                                                                     |
| -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 403      | `CSRF_INVALID`  | Brak ważnej sesji albo niezgodny token CSRF.                                                                            |
| 401      | `AUTH_REQUIRED` | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.                                                |
| 403      | `FORBIDDEN`     | Zalogowany klient lub recepcjonista albo klucz partnera: operacja tylko dla administratora.                             |
| 404      | `KEY_NOT_FOUND` | Klucz nie istnieje.                                                                                                     |
| —        | błędy wspólne   | 400 `VALIDATION_ERROR`, 400 `INVALID_JSON`, 413 `PAYLOAD_TOO_LARGE`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

### ZT-42 — Dodaj voucher testowy

| Element                        | Opis                                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| Grupa                          | ZT — zewnętrzny z tokenem                                                                           |
| Metoda i ścieżka               | `POST /api/v1/admin/demo-vouchers`                                                                  |
| Cel operacji i odbiorca        | Dodanie vouchera testowego do symulatora D. Odbiorca: administrator podczas pokazu.                 |
| Wymagany token i tożsamość     | Cookie sesji `aurora_session` i nagłówek `X-CSRF-Token`; reprezentuje zalogowanego administratora.  |
| Dozwolone role lub uprawnienia | Wyłącznie administrator.                                                                            |
| Ograniczenia dostępu do zasobu | Działa wyłącznie w trybie demo połączenia z D; nie tworzy vouchera w rzeczywistym systemie grupy D. |

Parametry i dane wejściowe:

| Nazwa i miejsce           | Typ i wymagalność             | Opis i reguły walidacji                  |
| ------------------------- | ----------------------------- | ---------------------------------------- |
| `reference` (pole body)   | string (3–100 znaków); tak    | Numer vouchera testowego.                |
| `componentId` (pole body) | string (3–100 znaków); tak    | Identyfikator hotelowej części vouchera. |
| `validFrom` (pole body)   | string (data RRRR-MM-DD); tak | Początek ważności.                       |
| `validUntil` (pole body)  | string (data RRRR-MM-DD); tak | Koniec ważności.                         |

Treść żądania: JSON, obiekt DemoVoucherCreate; nieznane pola są odrzucane.

Odpowiedź poprawna: 201 — obiekt [DemoVoucher](#demovoucher).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu        | Warunek wystąpienia                                                                                                     |
| -------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 403      | `CSRF_INVALID`   | Brak ważnej sesji albo niezgodny token CSRF.                                                                            |
| 401      | `AUTH_REQUIRED`  | Token CSRF poprawny, ale sesja jest anonimowa: nikt nie jest zalogowany.                                                |
| 403      | `FORBIDDEN`      | Zalogowany klient lub recepcjonista albo klucz partnera: operacja tylko dla administratora.                             |
| 409      | `DEMO_ONLY`      | Połączenie z D jest w trybie `real`.                                                                                    |
| 409      | `ALREADY_EXISTS` | Voucher o takim numerze już istnieje.                                                                                   |
| —        | błędy wspólne    | 400 `VALIDATION_ERROR`, 400 `INVALID_JSON`, 413 `PAYLOAD_TOO_LARGE`; 403 `PASSWORD_CHANGE_REQUIRED`; 429 `RATE_LIMITED` |

## Zewnętrzne bez tokenu

### ZP-01 — Sprawdź, czy serwer działa

| Element                        | Opis                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Grupa                          | ZP — zewnętrzny bez tokenu                                                                                                     |
| Metoda i ścieżka               | `GET /health`                                                                                                                  |
| Cel operacji i odbiorca        | Sprawdzenie, czy serwer działa. Odbiorca: Docker (healthcheck), monitoring, osoba uruchamiająca aplikację.                     |
| Wymagany token i tożsamość     | Brak tokenu.                                                                                                                   |
| Dozwolone role lub uprawnienia | Każdy, bez logowania.                                                                                                          |
| Ograniczenia dostępu do zasobu | Zwraca wyłącznie `{"status":"ok"}`; żadnych danych o hotelu ani gościach. Adres poza prefiksem `/api/v1` i poza limitem żądań. |

Parametry i dane wejściowe:

Brak parametrów.

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — obiekt: `status` (string: `ok`).

Odpowiedzi błędów:

Brak błędów właściwych dla tej operacji.

### ZP-02 — Pobierz token CSRF

| Element                        | Opis                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Grupa                          | ZP — zewnętrzny bez tokenu                                                                                               |
| Metoda i ścieżka               | `GET /api/v1/auth/csrf`                                                                                                  |
| Cel operacji i odbiorca        | Utworzenie anonimowej sesji i pobranie tokenu CSRF przed logowaniem lub rejestracją. Odbiorca: aplikacja przeglądarkowa. |
| Wymagany token i tożsamość     | Brak tokenu uwierzytelniającego.                                                                                         |
| Dozwolone role lub uprawnienia | Każdy, bez logowania.                                                                                                    |
| Ograniczenia dostępu do zasobu | Token CSRF chroni formularze przed żądaniami z obcych stron; nie potwierdza tożsamości i nie daje żadnych uprawnień.     |

Parametry i dane wejściowe:

Brak parametrów.

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — obiekt [CsrfToken](#csrftoken).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu     | Warunek wystąpienia |
| -------- | ------------- | ------------------- |
| —        | błędy wspólne | 429 `RATE_LIMITED`  |

### ZP-03 — Załóż konto klienta

| Element                        | Opis                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Grupa                          | ZP — zewnętrzny bez tokenu                                                                                                      |
| Metoda i ścieżka               | `POST /api/v1/auth/register`                                                                                                    |
| Cel operacji i odbiorca        | Założenie konta klienta. Odbiorca: gość korzystający z aplikacji przeglądarkowej.                                               |
| Wymagany token i tożsamość     | Brak tokenu uwierzytelniającego. Wymagana anonimowa sesja i token CSRF z ZP-02; chronią formularz, nie potwierdzają tożsamości. |
| Dozwolone role lub uprawnienia | Każdy, bez logowania.                                                                                                           |
| Ograniczenia dostępu do zasobu | Powstaje wyłącznie konto z rolą klienta; pole roli jest odrzucane. Limit 15 prób na minutę z jednego adresu IP.                 |

Parametry i dane wejściowe:

| Nazwa i miejsce        | Typ i wymagalność                                   | Opis i reguły walidacji                                                                               |
| ---------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `email` (pole body)    | string (e-mail, do 254 znaków); tak                 | Adres e-mail; jest loginem.                                                                           |
| `password` (pole body) | string (10–128 znaków); tak                         | Hasło; co najmniej 10 znaków. Domyślnie minimum 10 znaków; operator może zmienić PASSWORD_MIN_LENGTH. |
| `name` (pole body)     | string (2–120 znaków); tak                          | Imię i nazwisko.                                                                                      |
| `phone` (pole body)    | string (do 30 znaków, wzorzec `^[+\d\s()-]*$`); nie | Telefon; może być pusty.                                                                              |

Treść żądania: JSON, obiekt Register; nieznane pola są odrzucane.

Odpowiedź poprawna: 201 — obiekt [AuthenticatedUser](#authenticateduser).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu          | Warunek wystąpienia                                                                     |
| -------- | ------------------ | --------------------------------------------------------------------------------------- |
| 409      | `EMAIL_TAKEN`      | Adres e-mail jest już zarejestrowany (wielkość liter nie ma znaczenia).                 |
| 400      | `VALIDATION_ERROR` | Hasło krótsze niż 10 znaków, błędny e-mail albo nieznane pole, np. `role`.              |
| 403      | `CSRF_INVALID`     | Brak anonimowej sesji z ZP-02 albo niezgodny token CSRF.                                |
| —        | błędy wspólne      | 400 `VALIDATION_ERROR`, 400 `INVALID_JSON`, 413 `PAYLOAD_TOO_LARGE`; 429 `RATE_LIMITED` |

### ZP-04 — Zaloguj się

| Element                        | Opis                                                                                                                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grupa                          | ZP — zewnętrzny bez tokenu                                                                                                                                              |
| Metoda i ścieżka               | `POST /api/v1/auth/login`                                                                                                                                               |
| Cel operacji i odbiorca        | Zalogowanie użytkownika i rozpoczęcie sesji. Odbiorca: klient, recepcjonista i administrator w aplikacji przeglądarkowej.                                               |
| Wymagany token i tożsamość     | Brak tokenu uwierzytelniającego. Wymagana anonimowa sesja i token CSRF z ZP-02; chronią formularz, nie potwierdzają tożsamości.                                         |
| Dozwolone role lub uprawnienia | Każdy, bez logowania.                                                                                                                                                   |
| Ograniczenia dostępu do zasobu | Odpowiedź nie zdradza, czy konto istnieje: zły e-mail, złe hasło i zablokowane konto dają ten sam błąd w tym samym czasie. Limit 15 prób na minutę z jednego adresu IP. |

Parametry i dane wejściowe:

| Nazwa i miejsce        | Typ i wymagalność                   | Opis i reguły walidacji       |
| ---------------------- | ----------------------------------- | ----------------------------- |
| `email` (pole body)    | string (e-mail, do 254 znaków); tak | Adres e-mail; jest loginem.   |
| `password` (pole body) | string (1–128 znaków); tak          | Hasło; co najmniej 10 znaków. |

Treść żądania: JSON, obiekt Login; nieznane pola są odrzucane.

Odpowiedź poprawna: 200 — obiekt [AuthenticatedUser](#authenticateduser).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu             | Warunek wystąpienia                                                                     |
| -------- | --------------------- | --------------------------------------------------------------------------------------- |
| 401      | `INVALID_CREDENTIALS` | Niepoprawny e-mail lub hasło albo konto zablokowane.                                    |
| 403      | `CSRF_INVALID`        | Brak anonimowej sesji z ZP-02 albo niezgodny token CSRF.                                |
| —        | błędy wspólne         | 400 `VALIDATION_ERROR`, 400 `INVALID_JSON`, 413 `PAYLOAD_TOO_LARGE`; 429 `RATE_LIMITED` |

### ZP-05 — Pokaż pokoje w ofercie

| Element                        | Opis                                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Grupa                          | ZP — zewnętrzny bez tokenu                                                                                                                       |
| Metoda i ścieżka               | `GET /api/v1/rooms`                                                                                                                              |
| Cel operacji i odbiorca        | Lista pokoi w ofercie. Odbiorca: gość i klient w przeglądarce oraz serwer partnera (D).                                                          |
| Wymagany token i tożsamość     | Brak tokenu. Opcjonalnie klucz partnera (`Authorization: Bearer` albo `X-API-Key`), który reprezentuje serwer partnera.                          |
| Dozwolone role lub uprawnienia | Każdy, bez logowania. Klucz partnera, jeśli został podany, musi mieć zakres `catalog:read`.                                                      |
| Ograniczenia dostępu do zasobu | Tylko aktywne pokoje; brak danych o rezerwacjach i gościach. Jeśli żądanie zawiera klucz API, musi on być poprawny i mieć zakres `catalog:read`. |

Parametry i dane wejściowe:

| Nazwa i miejsce    | Typ i wymagalność                         | Opis i reguły walidacji    |
| ------------------ | ----------------------------------------- | -------------------------- |
| `page` (query)     | integer (co najmniej 1, domyślnie 1); nie | Numer strony wyników.      |
| `pageSize` (query) | integer (1–100, domyślnie 20); nie        | Liczba wyników na stronie. |

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — lista `{items,total,page,pageSize}`; element: obiekt [Room](#room).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu         | Warunek wystąpienia                                |
| -------- | ----------------- | -------------------------------------------------- |
| 401      | `INVALID_API_KEY` | Podano klucz API, który jest błędny lub wyłączony. |
| 403      | `SCOPE_REQUIRED`  | Podano klucz API bez zakresu `catalog:read`.       |
| —        | błędy wspólne     | 400 `VALIDATION_ERROR`; 429 `RATE_LIMITED`         |

### ZP-06 — Pokaż pakiety w ofercie

| Element                        | Opis                                                                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Grupa                          | ZP — zewnętrzny bez tokenu                                                                                              |
| Metoda i ścieżka               | `GET /api/v1/packages`                                                                                                  |
| Cel operacji i odbiorca        | Lista pakietów w ofercie. Odbiorca: gość i klient w przeglądarce oraz serwer partnera (D).                              |
| Wymagany token i tożsamość     | Brak tokenu. Opcjonalnie klucz partnera (`Authorization: Bearer` albo `X-API-Key`), który reprezentuje serwer partnera. |
| Dozwolone role lub uprawnienia | Każdy, bez logowania. Klucz partnera, jeśli został podany, musi mieć zakres `catalog:read`.                             |
| Ograniczenia dostępu do zasobu | Tylko aktywne pakiety. Jeśli żądanie zawiera klucz API, musi on być poprawny i mieć zakres `catalog:read`.              |

Parametry i dane wejściowe:

| Nazwa i miejsce    | Typ i wymagalność                         | Opis i reguły walidacji    |
| ------------------ | ----------------------------------------- | -------------------------- |
| `page` (query)     | integer (co najmniej 1, domyślnie 1); nie | Numer strony wyników.      |
| `pageSize` (query) | integer (1–100, domyślnie 20); nie        | Liczba wyników na stronie. |

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — lista `{items,total,page,pageSize}`; element: obiekt [Package](#package).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu         | Warunek wystąpienia                                |
| -------- | ----------------- | -------------------------------------------------- |
| 401      | `INVALID_API_KEY` | Podano klucz API, który jest błędny lub wyłączony. |
| 403      | `SCOPE_REQUIRED`  | Podano klucz API bez zakresu `catalog:read`.       |
| —        | błędy wspólne     | 400 `VALIDATION_ERROR`; 429 `RATE_LIMITED`         |

### ZP-07 — Sprawdź wolne pokoje i cenę

| Element                        | Opis                                                                                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Grupa                          | ZP — zewnętrzny bez tokenu                                                                                                                      |
| Metoda i ścieżka               | `GET /api/v1/availability`                                                                                                                      |
| Cel operacji i odbiorca        | Wolne pokoje i wycena dla podanych dat i liczby gości. Odbiorca: gość i klient w przeglądarce oraz serwer partnera (D).                         |
| Wymagany token i tożsamość     | Brak tokenu. Opcjonalnie klucz partnera (`Authorization: Bearer` albo `X-API-Key`), który reprezentuje serwer partnera.                         |
| Dozwolone role lub uprawnienia | Każdy, bez logowania. Klucz partnera, jeśli został podany, musi mieć zakres `catalog:read`.                                                     |
| Ograniczenia dostępu do zasobu | Odpowiedź pokazuje tylko pokoje wolne; nie ujawnia, kto zajmuje pozostałe. Jeśli żądanie zawiera klucz API, musi on mieć zakres `catalog:read`. |

Parametry i dane wejściowe:

| Nazwa i miejsce     | Typ i wymagalność                         | Opis i reguły walidacji                 |
| ------------------- | ----------------------------------------- | --------------------------------------- |
| `checkIn` (query)   | string (data RRRR-MM-DD); tak             | Dzień przyjazdu; nie w przeszłości.     |
| `checkOut` (query)  | string (data RRRR-MM-DD); tak             | Dzień wyjazdu; późniejszy niż przyjazd. |
| `guests` (query)    | integer (1–30); tak                       | Liczba gości.                           |
| `packageId` (query) | string (1–100 znaków); nie                | Pakiet doliczany do wyceny.             |
| `page` (query)      | integer (co najmniej 1, domyślnie 1); nie | Numer strony wyników.                   |
| `pageSize` (query)  | integer (1–100, domyślnie 20); nie        | Liczba wyników na stronie.              |

Treść żądania: Brak treści.

Odpowiedź poprawna: 200 — lista `{items,total,page,pageSize}`; element: obiekt [AvailableRoom](#availableroom).

Odpowiedzi błędów:

| Kod HTTP | Kod błędu           | Warunek wystąpienia                                                                 |
| -------- | ------------------- | ----------------------------------------------------------------------------------- |
| 400      | `DATES_INVALID`     | Wyjazd nie jest późniejszy niż przyjazd albo pobyt dłuższy niż 90 nocy.             |
| 400      | `DATE_IN_PAST`      | Data przyjazdu jest w przeszłości.                                                  |
| 400      | `VALIDATION_ERROR`  | Brak parametru, nieistniejąca data (np. 30 lutego) albo liczba gości poza zakresem. |
| 404      | `PACKAGE_NOT_FOUND` | Podany pakiet nie istnieje albo jest wycofany z oferty.                             |
| 403      | `SCOPE_REQUIRED`    | Podano klucz API bez zakresu `catalog:read`.                                        |
| —        | błędy wspólne       | 400 `VALIDATION_ERROR`; 429 `RATE_LIMITED`                                          |

## Słownik odpowiedzi

Obiekty zwracane przez operacje. Pełne definicje, razem z ograniczeniami pól, są w [openapi.yaml](../openapi.yaml).

### CsrfToken

| Pole        | Typ    | Znaczenie                             |
| ----------- | ------ | ------------------------------------- |
| `csrfToken` | string | Token CSRF do nagłówka `X-CSRF-Token` |

### AuthenticatedUser

Wszystkie pola obiektu [User](#user) oraz dodatkowo:

| Pole | Typ | Znaczenie |
| ---- | --- | --------- |

### Room

| Pole               | Typ                          | Znaczenie                |
| ------------------ | ---------------------------- | ------------------------ |
| `id`               | string (1–100 znaków)        | Identyfikator obiektu    |
| `number`           | string (1–20 znaków)         | Numer pokoju; unikalny   |
| `type`             | string (2–80 znaków)         | Typ pokoju, np. Standard |
| `description`      | string (do 2000 znaków)      | Opis                     |
| `capacity`         | integer (1–30)               | Liczba miejsc w pokoju   |
| `nightlyRateMinor` | integer (0–100000000)        | Cena za noc w groszach   |
| `equipment`        | lista: string (1–100 znaków) | Wyposażenie pokoju       |
| `active`           | boolean (domyślnie True)     | Czy wpis jest aktywny    |

### Package

| Pole          | Typ                       | Znaczenie                           |
| ------------- | ------------------------- | ----------------------------------- |
| `id`          | string (1–100 znaków)     | Identyfikator obiektu               |
| `name`        | string (2–120 znaków)     | Nazwa pakietu                       |
| `description` | string (do 2000 znaków)   | Opis                                |
| `priceMinor`  | integer (0–100000000)     | Jednorazowa cena pakietu w groszach |
| `active`      | boolean (domyślnie True)  | Czy wpis jest aktywny               |
| `items`       | lista: obiekt PackageItem | Usługi wchodzące w skład pakietu    |

### AvailableRoom

Wszystkie pola obiektu [Room](#room) oraz dodatkowo:

| Pole      | Typ            | Znaczenie                                   |
| --------- | -------------- | ------------------------------------------- |
| `pricing` | obiekt Pricing | Wycena pobytu w tym pokoju dla podanych dat |

### User

| Pole                 | Typ                                            | Znaczenie                                       |
| -------------------- | ---------------------------------------------- | ----------------------------------------------- |
| `id`                 | string (1–100 znaków)                          | Identyfikator obiektu                           |
| `email`              | string (e-mail, do 254 znaków)                 | Adres e-mail; jest loginem                      |
| `name`               | string (2–120 znaków)                          | Imię i nazwisko                                 |
| `phone`              | string (do 30 znaków, wzorzec `^[+\d\s()-]*$`) | Telefon; może być pusty                         |
| `role`               | string: `client`, `receptionist`, `admin`      | Rola konta                                      |
| `active`             | boolean                                        | Czy wpis jest aktywny                           |
| `mustChangePassword` | boolean                                        | Czy konto ma hasło tymczasowe i musi je zmienić |
| `createdAt`          | string (data i czas ISO 8601)                  | Czas utworzenia (UTC)                           |

### Reservation

| Pole                | Typ                                                         | Znaczenie                                                             |
| ------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------- |
| `id`                | string (1–100 znaków)                                       | Identyfikator obiektu                                                 |
| `number`            | string                                                      | Numer rezerwacji do rozmowy z gościem, np. `AH-2026-1A2B3C4D`         |
| `userId`            | string (1–100 znaków) lub null                              | Konto, które utworzyło rezerwację; puste dla partnera                 |
| `partnerId`         | string (1–100 znaków) lub null                              | Oznaczenie partnera, który utworzył rezerwację; puste dla użytkownika |
| `roomId`            | string (1–100 znaków)                                       | Identyfikator pokoju                                                  |
| `packageId`         | string (1–100 znaków) lub null                              | Identyfikator pakietu; może być pusty                                 |
| `room`              | obiekt Room                                                 | Dane pokoju                                                           |
| `package`           | obiekt lub null                                             | Wybrany pakiet (`id`, `name`) albo null                               |
| `checkIn`           | string (data RRRR-MM-DD)                                    | Dzień przyjazdu                                                       |
| `checkOut`          | string (data RRRR-MM-DD)                                    | Dzień wyjazdu                                                         |
| `guests`            | integer (1–30)                                              | Liczba gości                                                          |
| `guest`             | obiekt Guest                                                | Osoba kontaktowa                                                      |
| `guestNames`        | lista: string (2–120 znaków)                                | Imiona i nazwiska wszystkich gości; tyle pozycji, ile `guests`        |
| `status`            | string: `confirmed`, `checked_in`, `completed`, `cancelled` | Stan pobytu                                                           |
| `version`           | integer (co najmniej 1)                                     | Numer wersji; rośnie przy każdej zmianie                              |
| `pricing`           | obiekt Pricing                                              | Wycena pobytu                                                         |
| `nightlyRateMinor`  | integer (co najmniej 0)                                     | Cena za noc w groszach                                                |
| `packagePriceMinor` | integer (co najmniej 0)                                     | Cena pakietu w groszach                                               |
| `totalMinor`        | integer (co najmniej 0)                                     | Suma za pobyt w groszach                                              |
| `fundingSource`     | string: `direct`, `voucher`                                 | Źródło finansowania ustalane przez serwer                             |
| `hasVoucher`        | boolean                                                     | Czy pobyt ma przypisany voucher                                       |
| `hotelComponentId`  | string (1–100 znaków) lub null                              | Identyfikator hotelowej części vouchera                               |
| `items`             | lista: obiekt ReservationItem                               | Usługi pakietu skopiowane w chwili rezerwacji                         |
| `createdAt`         | string (data i czas ISO 8601)                               | Czas utworzenia (UTC)                                                 |
| `updatedAt`         | string (data i czas ISO 8601)                               | Czas ostatniej zmiany (UTC)                                           |

### Plan

| Pole            | Typ                              | Znaczenie                                                                   |
| --------------- | -------------------------------- | --------------------------------------------------------------------------- |
| `reservationId` | string (1–100 znaków)            | Identyfikator rezerwacji                                                    |
| `items`         | lista: obiekt ReservationItem    | Usługi pakietu; każda ma dodatkowo pole `bookings` z listą obiektów Booking |
| `voucher`       | obiekt VoucherOperation lub null | Stan zgłoszenia do D albo null, gdy go jeszcze nie było                     |

### CheckedOutReservation

Wszystkie pola obiektu [Reservation](#reservation) oraz dodatkowo:

| Pole               | Typ                              | Znaczenie                              |
| ------------------ | -------------------------------- | -------------------------------------- |
| `voucherOperation` | obiekt VoucherOperation lub null | Stan zgłoszenia wykonania noclegu do D |

### ReservationItem

| Pole            | Typ                                                                                                            | Znaczenie                                 |
| --------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `id`            | string (1–100 znaków)                                                                                          | Identyfikator obiektu                     |
| `reservationId` | string (1–100 znaków)                                                                                          | Identyfikator rezerwacji                  |
| `name`          | string                                                                                                         | Nazwa usługi                              |
| `partner`       | string: `HOTEL`, `A`, `B`                                                                                      | Wykonawca usługi: hotel, A albo B         |
| `offerId`       | string                                                                                                         | Identyfikator oferty u partnera           |
| `guestIndex`    | integer (co najmniej 0)                                                                                        | Numer gościa na liście `guestNames`, od 0 |
| `status`        | string: `unplanned`, `pending`, `confirmed`, `unknown`, `cancel_pending`, `completed`, `cancelled`, `rejected` | Stan usługi pakietu                       |
| `note`          | string                                                                                                         | Notatka recepcji                          |

### PartnerAvailabilityItem

| Pole        | Typ                           | Znaczenie                          |
| ----------- | ----------------------------- | ---------------------------------- |
| `offerId`   | string (1–100 znaków)         | Identyfikator oferty u partnera    |
| `startsAt`  | string (data i czas ISO 8601) | Początek usługi, ze strefą czasową |
| `endsAt`    | string (data i czas ISO 8601) | Koniec usługi, ze strefą czasową   |
| `available` | boolean                       | Czy termin jest wolny              |

### Booking

| Pole                | Typ                                                                                                            | Znaczenie                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `id`                | string (1–100 znaków)                                                                                          | Identyfikator obiektu                     |
| `reservationId`     | string (1–100 znaków)                                                                                          | Identyfikator rezerwacji                  |
| `itemId`            | string (1–100 znaków)                                                                                          | Identyfikator usługi pakietu w rezerwacji |
| `partner`           | string: `A`, `B`                                                                                               | Partner: A albo B                         |
| `guestIndex`        | integer (co najmniej 0)                                                                                        | Numer gościa na liście `guestNames`, od 0 |
| `offerId`           | string (1–100 znaków)                                                                                          | Identyfikator oferty u partnera           |
| `startsAt`          | string (data i czas ISO 8601)                                                                                  | Początek usługi, ze strefą czasową        |
| `endsAt`            | string (data i czas ISO 8601)                                                                                  | Koniec usługi, ze strefą czasową          |
| `status`            | string: `unplanned`, `pending`, `confirmed`, `unknown`, `cancel_pending`, `completed`, `cancelled`, `rejected` | Stan zamówienia u partnera                |
| `operationId`       | string (1–100 znaków)                                                                                          | Stały identyfikator operacji u partnera   |
| `cancelOperationId` | string (1–100 znaków) lub null                                                                                 | Identyfikator operacji anulowania         |
| `externalId`        | string (1–100 znaków) lub null                                                                                 | Identyfikator nadany przez partnera       |
| `error`             | string lub null                                                                                                | Opis błędu albo null                      |
| `createdAt`         | string (data i czas ISO 8601)                                                                                  | Czas utworzenia (UTC)                     |
| `updatedAt`         | string (data i czas ISO 8601)                                                                                  | Czas ostatniej zmiany (UTC)               |

### VoucherCheckResult

| Pole            | Typ                            | Znaczenie                          |
| --------------- | ------------------------------ | ---------------------------------- |
| `valid`         | boolean                        | Czy D potwierdził voucher          |
| `provider`      | string: `C`                    | Usługodawca części vouchera        |
| `kind`          | string: `hotel`                | Rodzaj części vouchera             |
| `componentId`   | string (1–100 znaków)          | Identyfikator części vouchera      |
| `used`          | boolean                        | Czy część została już wykorzystana |
| `reservationId` | string (1–100 znaków) lub null | Identyfikator rezerwacji           |
| `validFrom`     | string (data RRRR-MM-DD)       | Początek ważności                  |
| `validUntil`    | string (data RRRR-MM-DD)       | Koniec ważności                    |
| `reference`     | string                         | Numer vouchera                     |

### VoucherOperation

| Pole            | Typ                                                  | Znaczenie                               |
| --------------- | ---------------------------------------------------- | --------------------------------------- |
| `reservationId` | string (1–100 znaków)                                | Identyfikator rezerwacji                |
| `operationId`   | string (1–100 znaków)                                | Stały identyfikator operacji u partnera |
| `status`        | string: `pending`, `unknown`, `rejected`, `reported` | Stan zgłoszenia do D                    |
| `error`         | string lub null                                      | Opis błędu albo null                    |
| `updatedAt`     | string (data i czas ISO 8601)                        | Czas ostatniej zmiany (UTC)             |

### HotelSettings

| Pole           | Typ                                           | Znaczenie                             |
| -------------- | --------------------------------------------- | ------------------------------------- |
| `id`           | string: `1`                                   | Zawsze 1: jeden hotel                 |
| `hotelName`    | string (2–120 znaków)                         | Nazwa hotelu                          |
| `checkInTime`  | string (wzorzec `^([01]\d\|2[0-3]):[0-5]\d$`) | Godzina, od której trwa pobyt (GG:MM) |
| `checkOutTime` | string (wzorzec `^([01]\d\|2[0-3]):[0-5]\d$`) | Godzina, do której trwa pobyt (GG:MM) |
| `timezone`     | string: `Europe/Warsaw`                       | Strefa czasowa hotelu                 |
| `currency`     | string: `PLN`                                 | Waluta                                |

### AuditEvent

| Pole        | Typ                           | Znaczenie                                    |
| ----------- | ----------------------------- | -------------------------------------------- |
| `id`        | string (1–100 znaków)         | Identyfikator obiektu                        |
| `actorType` | string: `user`, `partner`     | Kto wykonał operację: użytkownik czy partner |
| `actorId`   | string (1–100 znaków)         | Identyfikator autora                         |
| `actorName` | string                        | Nazwa autora                                 |
| `action`    | string                        | Nazwa operacji, np. `reservation.created`    |
| `entityId`  | string                        | Identyfikator obiektu, którego dotyczy wpis  |
| `details`   | obiekt                        | Bezpieczny opis zmiany, bez haseł i kluczy   |
| `createdAt` | string (data i czas ISO 8601) | Czas utworzenia (UTC)                        |

### Integration

| Pole             | Typ                                                                                                        | Znaczenie                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `partner`        | string: `A`, `B`, `D`                                                                                      | Partner: A, B albo D                          |
| `mode`           | string: `demo`, `real`                                                                                     | Tryb: `demo` (symulator) albo `real` (HTTP)   |
| `enabled`        | boolean                                                                                                    | Czy połączenie jest włączone                  |
| `baseUrl`        | string (do 1000 znaków)                                                                                    | Adres API partnera                            |
| `secret`         | string                                                                                                     | Sekret partnera; w odpowiedzi tylko maska     |
| `timeoutMs`      | integer (1000–30000)                                                                                       | Limit czasu jednego wywołania w milisekundach |
| `authHeader`     | string: `X-API-Key`, `Authorization`                                                                       | Nagłówek, w którym wysyłamy sekret            |
| `demoScenario`   | string: `normal`, `reject`, `timeout`, `timeout_after_success`, `invalid_json`, `unavailable`, `completed` | Zachowanie symulatora w trybie demo           |
| `hasSecret`      | boolean                                                                                                    | Czy sekret jest zapisany                      |
| `lastTestAt`     | string (data i czas ISO 8601) lub null                                                                     | Czas ostatniego testu połączenia              |
| `lastTestResult` | string lub null                                                                                            | Wynik ostatniego testu                        |

### ConnectionTest

| Pole      | Typ                    | Znaczenie                    |
| --------- | ---------------------- | ---------------------------- |
| `ok`      | boolean                | Wynik testu                  |
| `mode`    | string: `demo`, `real` | Tryb, w którym wykonano test |
| `message` | string                 | Komunikat                    |

### PartnerOffer

| Pole              | Typ                     | Znaczenie                      |
| ----------------- | ----------------------- | ------------------------------ |
| `id`              | string (1–100 znaków)   | Identyfikator obiektu          |
| `name`            | string                  | Nazwa usługi                   |
| `durationMinutes` | integer (co najmniej 1) | Czas trwania usługi w minutach |

### ApiKey

| Pole         | Typ                                                                                                                     | Znaczenie                                                         |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `id`         | string (1–100 znaków)                                                                                                   | Identyfikator obiektu                                             |
| `name`       | string (2–100 znaków)                                                                                                   | Nazwa klucza                                                      |
| `partner`    | string (wzorzec `^[A-Z][A-Z0-9_-]{0,31}$`)                                                                              | Oznaczenie partnera, np. `D`; od niego zależy własność rezerwacji |
| `scopes`     | lista: string: `catalog:read`, `reservations:create`, `reservations:read`, `reservations:update`, `reservations:cancel` | Zakresy klucza                                                    |
| `active`     | boolean                                                                                                                 | Czy wpis jest aktywny                                             |
| `createdAt`  | string (data i czas ISO 8601)                                                                                           | Czas utworzenia (UTC)                                             |
| `lastUsedAt` | string (data i czas ISO 8601) lub null                                                                                  | Czas ostatniego użycia klucza                                     |

### CreatedApiKey

Wszystkie pola obiektu [ApiKey](#apikey) oraz dodatkowo:

| Pole  | Typ    | Znaczenie                                             |
| ----- | ------ | ----------------------------------------------------- |
| `key` | string | Pełna wartość klucza; zwracana tylko w tej odpowiedzi |

### DemoVoucher

Wszystkie pola obiektu [DemoVoucherCreate](#demovouchercreate) oraz dodatkowo:

| Pole       | Typ             | Znaczenie                          |
| ---------- | --------------- | ---------------------------------- |
| `mode`     | string: `demo`  | Zawsze `demo`                      |
| `provider` | string: `C`     | Usługodawca części vouchera        |
| `kind`     | string: `hotel` | Rodzaj części vouchera             |
| `used`     | boolean         | Czy część została już wykorzystana |

### Error

| Pole    | Typ    | Znaczenie                                                                  |
| ------- | ------ | -------------------------------------------------------------------------- |
| `error` | obiekt | Obiekt błędu: `code` (stały kod), `message` (opis), `fields` (błędne pola) |

### DemoVoucherCreate

| Pole          | Typ                      | Znaczenie                               |
| ------------- | ------------------------ | --------------------------------------- |
| `reference`   | string (3–100 znaków)    | Numer vouchera testowego                |
| `componentId` | string (3–100 znaków)    | Identyfikator hotelowej części vouchera |
| `validFrom`   | string (data RRRR-MM-DD) | Początek ważności                       |
| `validUntil`  | string (data RRRR-MM-DD) | Koniec ważności                         |

### PackageItem

| Pole       | Typ                       | Znaczenie                         |
| ---------- | ------------------------- | --------------------------------- |
| `id`       | string (1–100 znaków)     | Identyfikator obiektu             |
| `name`     | string (2–120 znaków)     | Nazwa usługi                      |
| `partner`  | string: `HOTEL`, `A`, `B` | Wykonawca usługi: hotel, A albo B |
| `offerId`  | string (do 100 znaków)    | Identyfikator oferty u partnera   |
| `quantity` | integer (1–30)            | Liczba usług w pakiecie           |

### Pricing

| Pole                | Typ                     | Znaczenie                |
| ------------------- | ----------------------- | ------------------------ |
| `nights`            | integer (co najmniej 1) | Liczba nocy              |
| `nightlyRateMinor`  | integer (co najmniej 0) | Cena za noc w groszach   |
| `packagePriceMinor` | integer (co najmniej 0) | Cena pakietu w groszach  |
| `totalMinor`        | integer (co najmniej 0) | Suma za pobyt w groszach |
| `currency`          | string: `PLN`           | Waluta                   |

### Guest

| Pole    | Typ                                            | Znaczenie                         |
| ------- | ---------------------------------------------- | --------------------------------- |
| `name`  | string (2–120 znaków)                          | Imię i nazwisko osoby kontaktowej |
| `email` | string (e-mail, do 254 znaków)                 | E-mail osoby kontaktowej          |
| `phone` | string (do 30 znaków, wzorzec `^[+\d\s()-]*$`) | Telefon; może być pusty           |
