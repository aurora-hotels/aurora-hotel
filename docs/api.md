# API C — krótka instrukcja dla innych grup

Bazowy adres lokalny: `http://localhost:3001/api/v1`. Adres wspólnego środowiska ustalamy osobno. Schemat wszystkich operacji znajduje się w [openapi.yaml](openapi.yaml), a uruchomiony backend udostępnia go pod `/api/openapi.yaml` i jako interaktywny opis pod `/api/docs`.

## Dostęp partnera

Administrator C tworzy klucz z oznaczeniem partnera, np. `D`. Klucz jest widoczny tylko raz. Partner przesyła go w `X-API-Key: …` **albo** `Authorization: Bearer …`. Nie przesyłaj obu naraz ani razem z cookie użytkownika. Klucze są przeznaczone do komunikacji backend–backend.

| Zakres                | Operacje                                  |
| --------------------- | ----------------------------------------- |
| `catalog:read`        | Pokoje, pakiety, dostępność               |
| `reservations:create` | Utworzenie pobytu                         |
| `reservations:read`   | Lista i szczegóły własnych pobytów, plan  |
| `reservations:update` | Zmiana własnego potwierdzonego pobytu     |
| `reservations:cancel` | Anulowanie własnego potwierdzonego pobytu |

Nadaj tylko potrzebne zakresy. Publiczny katalog można odczytać bez klucza, ale podanie niepoprawnego klucza kończy się błędem. Partner nie może zmienić ceny, statusu, danych administracyjnych ani odczytać rezerwacji innego partnera. Recepcja wykonuje zameldowanie, wymeldowanie oraz planowanie usług A/B.

## Szybka próba przez curl

Poniższe komendy są dla Bash. Wartości `C_API_KEY`, daty i identyfikatory należy zastąpić danymi testowymi. Dla bezpieczeństwa wczytaj klucz bez zapisywania go dosłownie w historii terminala:

```bash
export C_BASE_URL='http://localhost:3001/api/v1'
read -rs -p 'Klucz API C: ' C_API_KEY
export C_API_KEY
curl --fail-with-body -sS "$C_BASE_URL/rooms" -H "X-API-Key: $C_API_KEY"
curl --fail-with-body -sS "$C_BASE_URL/packages" -H "X-API-Key: $C_API_KEY"
curl --fail-with-body -sS "$C_BASE_URL/availability?checkIn=2027-06-15&checkOut=2027-06-17&guests=1" \
  -H "X-API-Key: $C_API_KEY"
```

Zawsze wybieraj przyszłe daty. Z odpowiedzi dostępności pobierz `id` pokoju i `pricing.totalMinor`. Poniższy przykład dotyczy początkowego pokoju 101: 2 noce × 240 zł = `48000` groszy. Jeśli cennik lub termin jest inny, użyj nowej wyceny.

```bash
curl --fail-with-body -sS -X POST "$C_BASE_URL/reservations" \
  -H "X-API-Key: $C_API_KEY" \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: demo-d-20270615-001' \
  --data '{
    "roomId": "room-101",
    "checkIn": "2027-06-15",
    "checkOut": "2027-06-17",
    "guests": 1,
    "expectedTotalMinor": 48000,
    "guest": {"name": "Anna Testowa", "email": "anna@example.com", "phone": ""},
    "guestNames": ["Anna Testowa"]
  }'
```

Zapamiętaj `id` zwróconej rezerwacji. Każda osoba w pokoju musi mieć wpis w `guestNames`; długość tablicy jest równa `guests`. Pakiet jest opcjonalny (`packageId`). Jeśli go wybierasz, uwzględnij go w zapytaniu dostępności, aby dostać cenę z pakietem.

```bash
C_RESERVATION_ID='id-z-odpowiedzi'
curl --fail-with-body -sS "$C_BASE_URL/reservations/$C_RESERVATION_ID" \
  -H "X-API-Key: $C_API_KEY"
curl --fail-with-body -sS "$C_BASE_URL/reservations/$C_RESERVATION_ID/plan" \
  -H "X-API-Key: $C_API_KEY"
curl --fail-with-body -sS -X POST "$C_BASE_URL/reservations/$C_RESERVATION_ID/cancel" \
  -H "X-API-Key: $C_API_KEY" -H 'Content-Type: application/json' --data '{}'
```

Po próbie usuń zmienną z bieżącego terminala: `unset C_API_KEY`.

## Cena, wersja i powtórzenia

`POST /reservations` wymaga `Idempotency-Key` długości 8–128 znaków (`A–Z`, `a–z`, cyfry, `.`, `_`, `:`, `-`). Dla jednej czynności biznesowej zachowaj ten sam klucz i tę samą treść. Pierwszy zapis zwraca `201`; odtworzenie wyniku `200` i nagłówek `Idempotency-Replayed: true`. Ten sam klucz z innymi danymi zwraca `409 IDEMPOTENCY_CONFLICT`. Klucz obowiązuje w zakresie tożsamości użytkownika lub partnera.

Nie zmieniaj identyfikatora tylko dlatego, że minął timeout. To mogłoby utworzyć dwa pobyty. Przy nowej, świadomej rezerwacji użyj nowego klucza.

Do zmiany pobytu służy `PATCH /reservations/{id}`:

```json
{
  "checkIn": "2027-06-15",
  "checkOut": "2027-06-18",
  "guests": 1,
  "guestNames": ["Anna Testowa"],
  "expectedVersion": 1,
  "expectedTotalMinor": 72000
}
```

`expectedVersion` pobierz z aktualnej rezerwacji, a cenę przelicz na podstawie aktualnej oferty. Dostępność może nie zwracać własnego zajętego pokoju; edycja po stronie serwera wyłącza edytowaną rezerwację ze sprawdzenia konfliktu. Nie dodawaj do PATCH pól `roomId`, `status`, `fundingSource` ani dowolnej zaakceptowanej przez klienta kwoty. Po `PRICE_CHANGED` lub `VERSION_CONFLICT` odśwież dane i świadomie ponów operację.

## Pobyt z voucherem D

Tylko klucz oznaczony partnerem `D` oraz recepcja/administrator mogą przy tworzeniu przekazać **oba** pola `voucherReference` i `hotelComponentId`. C odpytuje D i sam ustala `fundingSource`. Nie przesyłaj `fundingSource`, `paid`, `voucherValid` ani kwoty rozliczenia.

Zmiana dat przez `PATCH /reservations/{id}` jest możliwa także dla pobytu z voucherem. Przed zapisem C sprawdza w D ważność części dla nowego terminu. Brak odpowiedzi, odmowa lub konflikt wersji nie zmieniają zapisanego pobytu. Nadal obowiązuje warunek wyjaśnienia aktywnych usług A/B.

W trybie demo D dostępne są `voucherReference: "DEMO-HOTEL-001"` i `hotelComponentId: "hotel-demo-001"`. Po wykonaniu składnika ten voucher jest zużyty. Do następnej próby administrator tworzy nowy voucher demo. Tryb realny wymaga danych wystawionych przez prawdziwy projekt D oraz potwierdzenia [kontraktu integracji](integracje.md).

## Błędy i lista wyników

Błędy mają wspólny format:

```json
{
  "error": {
    "code": "ROOM_UNAVAILABLE",
    "message": "Pokój jest już zajęty w wybranym terminie.",
    "fields": {}
  }
}
```

| HTTP | Znaczenie / reakcja                                         |
| ---- | ----------------------------------------------------------- |
| 400  | Niepoprawne dane; popraw wskazane pola                      |
| 401  | Brak lub niepoprawne uwierzytelnienie                       |
| 403  | Brak zakresu/roli, błędny CSRF lub wymagane nowe hasło      |
| 404  | Brak obiektu albo brak dostępu do cudzej rezerwacji         |
| 409  | Konflikt terminu, ceny, wersji, vouchera lub stanu operacji |
| 429  | Za dużo prób; odczekaj czas z `Retry-After`                 |
| 503  | Partner niedostępny lub odpowiedź nie pasuje do kontraktu   |

Nie każda niepewna operacja partnera zwraca HTTP 503. Utworzenie/odświeżenie usługi może zwrócić zapisany obiekt ze statusem `unknown` lub `cancel_pending`. Sprawdzaj treść `status` i `error`, a nie tylko kod HTTP.

Zwykłe listy mają `{items,total,page,pageSize}`. Parametry `page` i `pageSize` służą do stronicowania; domyślnie 20, maksymalnie 100 elementów. Lista pobytów obsługuje też `status` oraz `search` po numerze pobytu lub nazwie gościa. Plan jest jednym obiektem zawierającym pozycje pakietu i ich historię usług.

## Sesja użytkownika w przeglądarce

Frontend najpierw wykonuje `GET /auth/csrf` z obsługą cookie, zachowuje `csrfToken` i przesyła `X-CSRF-Token` przy POST/PATCH. Rejestracja/logowanie oraz zmiana hasła rotują sesję i zwracają nowy token. Żądania użytkownika muszą pochodzić z adresu wskazanego w `APP_ORIGIN`. Backend partnera używający klucza API nie potrzebuje CSRF ani sesji.
