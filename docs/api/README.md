# API hotelu — instrukcja dla innych grup

Przeznaczenie: jak wywoływać API projektu C z innego projektu albo z przeglądarki. Opiekunowie: Adrian Zieliński, Andrii Yaremko; uzgodnienie danych: Wiktoria Sobejko.

Powiązane strony:

- [Projekt endpointów](projekt-endpointow.md): role, grupy operacji, macierz uprawnień i uzasadnienie decyzji;
- [Karty endpointów](karty-endpointow.md): parametry, odpowiedzi i błędy każdej operacji;
- [Kontrakty A/B/D](integracje.md): czego hotel oczekuje od API pozostałych grup;
- [openapi.yaml](../openapi.yaml): pełny kontrakt w formacie OpenAPI 3.

Lokalny adres API to `http://localhost:3001/api/v1`. Do wspólnego testu podamy adres naszego serwera. Po uruchomieniu aplikacji interaktywny opis jest pod `/api/docs`, a plik specyfikacji pod `/api/openapi.yaml`.

## Klucz i uprawnienia partnera

Administrator hotelu tworzy klucz dla konkretnej grupy, np. `D`. Pełną wartość klucza można skopiować tylko przy tworzeniu. W żądaniu użyj jednego nagłówka:

```http
Authorization: Bearer <klucz>
```

albo

```http
X-API-Key: <klucz>
```

Klucz służy do połączenia między serwerami. Nie łącz go z drugim nagłówkiem autoryzacji ani z cookie użytkownika: takie żądanie zostanie odrzucone.

| Zakres klucza         | Co pozwala zrobić                        |
| --------------------- | ---------------------------------------- |
| `catalog:read`        | Odczytać pokoje, pakiety i dostępność    |
| `reservations:create` | Utworzyć rezerwację                      |
| `reservations:read`   | Odczytać własne rezerwacje i plan pobytu |
| `reservations:update` | Zmienić własną potwierdzoną rezerwację   |
| `reservations:cancel` | Anulować własną potwierdzoną rezerwację  |

Nadajemy tylko zakresy potrzebne drugiej grupie. Ofertę można odczytać także bez klucza, ale błędny klucz zawsze zwróci błąd. Partner widzi tylko rezerwacje utworzone swoimi kluczami. Nie może narzucić ceny, zmienić statusu ani danych administracyjnych. Zameldowanie, wymeldowanie i planowanie usług A/B wykonuje recepcja.

## Pierwsza rezerwacja przez curl

Przykłady są dla Bash. Podmień daty i identyfikatory na dane swojej próby. Polecenie `read` pozwala wpisać klucz bez zapisywania jego wartości w historii terminala.

```bash
export C_BASE_URL='http://localhost:3001/api/v1'
read -rs -p 'Klucz API C: ' C_API_KEY
export C_API_KEY
curl --fail-with-body -sS "$C_BASE_URL/rooms" -H "X-API-Key: $C_API_KEY"
curl --fail-with-body -sS "$C_BASE_URL/packages" -H "X-API-Key: $C_API_KEY"
curl --fail-with-body -sS "$C_BASE_URL/availability?checkIn=2027-06-15&checkOut=2027-06-17&guests=1" \
  -H "X-API-Key: $C_API_KEY"
```

Wybierz termin w przyszłości. Z odpowiedzi `/availability` weź `id` pokoju oraz `pricing.totalMinor`. W przykładzie pokój 101 kosztuje 240 zł za noc, więc dwie noce to `48000` groszy. Po zmianie dat lub cennika pobierz nową wycenę.

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

Zapisz zwrócone `id` rezerwacji. W `guestNames` musi być dokładnie tyle osób, ile podano w `guests`. Jeśli wybierasz pakiet, przekaż `packageId` również przy sprawdzaniu dostępności, żeby wycena go uwzględniła.

Tak pobierzesz rezerwację i plan, a następnie anulujesz pobyt:

```bash
C_RESERVATION_ID='id-z-odpowiedzi'
curl --fail-with-body -sS "$C_BASE_URL/reservations/$C_RESERVATION_ID" \
  -H "X-API-Key: $C_API_KEY"
curl --fail-with-body -sS "$C_BASE_URL/reservations/$C_RESERVATION_ID/plan" \
  -H "X-API-Key: $C_API_KEY"
curl --fail-with-body -sS -X POST "$C_BASE_URL/reservations/$C_RESERVATION_ID/cancel" \
  -H "X-API-Key: $C_API_KEY" -H 'Content-Type: application/json' --data '{}'
```

Po zakończeniu usuń klucz ze zmiennych terminala: `unset C_API_KEY`.

## Ponowienie i zmiana rezerwacji

`POST /reservations` wymaga nagłówka `Idempotency-Key`: od 8 do 128 znaków, dozwolone są `A-Z`, `a-z`, cyfry, `.`, `_`, `:` i `-`. Dla ponowienia tej samej rezerwacji zachowaj ten sam klucz i tę samą treść żądania, także po przekroczeniu czasu. Nowy klucz oznacza nową rezerwację.

Pierwszy zapis zwraca `201`. Ponowienie zwraca wcześniejszy wynik z kodem `200` i nagłówkiem `Idempotency-Replayed: true`. Inne dane pod tym samym kluczem dają `409 IDEMPOTENCY_CONFLICT`. Każdy użytkownik i każdy partner ma własną przestrzeń kluczy. Klucze ponowienia przechowujemy 7 dni.

Do zmiany terminu lub liczby gości służy `PATCH /reservations/{id}`:

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

`expectedVersion` weź z aktualnej rezerwacji, a `expectedTotalMinor` oblicz z aktualnej oferty. Wyszukiwarka może nie pokazać tego pokoju jako wolnego, bo zajmuje go właśnie edytowany pobyt. Przy zapisie serwer pomija tę rezerwację w sprawdzaniu kolizji.

`PATCH` nie przyjmuje `roomId`, `status` ani `fundingSource`. Cena musi zgadzać się z wyliczeniem serwera. Po `PRICE_CHANGED` lub `VERSION_CONFLICT` pobierz świeże dane, sprawdź zmianę i dopiero ponów zapis.

Anulowanie jest bezpieczne do powtórzenia: ponowne anulowanie anulowanej rezerwacji zwraca jej aktualny stan.

## Rezerwacja z voucherem D

Przy tworzeniu pobytu trzeba podać razem `voucherReference` i `hotelComponentId`. Może to zrobić partner oznaczony `D`, recepcja lub administrator. Hotel sprawdza voucher w D i sam ustawia `fundingSource`. W żądaniu nie podawaj `fundingSource`, `paid`, `voucherValid` ani kwoty rozliczenia: nieznane pola są odrzucane.

Pobyt z voucherem można zmienić przez `PATCH /reservations/{id}`. Hotel najpierw sprawdzi w D, czy nowe daty mieszczą się w ważności składnika. Odmowa, brak odpowiedzi lub konflikt wersji pozostawią stare dane. Przed zmianą dat trzeba też anulować aktywne usługi A/B i wyjaśnić operacje z niepewnym wynikiem.

Do próby w trybie demo służą `voucherReference: "DEMO-HOTEL-001"` oraz `hotelComponentId: "hotel-demo-001"`. Po wykorzystaniu części hotelowej administrator tworzy nowy voucher testowy w panelu. W trybie `real` potrzebne są dane z projektu D i uzgodniony format połączenia.

## Odpowiedzi i błędy

Każdy błąd ma tę samą postać:

```json
{
  "error": {
    "code": "ROOM_UNAVAILABLE",
    "message": "Pokój jest już zajęty w wybranym terminie.",
    "fields": {}
  }
}
```

Pole `code` jest stałe i nadaje się do obsługi w kodzie. `message` jest tekstem dla człowieka. `fields` wskazuje błędne pola przy błędach walidacji.

| HTTP | Znaczenie                                          | Co sprawdzić                                              |
| ---- | -------------------------------------------------- | --------------------------------------------------------- |
| 400  | Niepoprawne dane                                   | Pola wskazane w `fields`; nieznane pola też dają ten błąd |
| 401  | Brak uwierzytelnienia albo błędny klucz            | Nagłówek z kluczem, ważność sesji                         |
| 403  | Znamy tożsamość, ale nie ma ona uprawnień          | Zakres klucza, rola, token CSRF, obowiązek zmiany hasła   |
| 404  | Brak zasobu albo zasób należy do kogoś innego      | Identyfikator i to, czy rezerwacja jest Twoja             |
| 409  | Konflikt terminu, ceny, wersji, vouchera lub stanu | Pobierz świeże dane i ponów świadomie                     |
| 413  | Treść żądania większa niż 64 KB                    | Rozmiar żądania                                           |
| 429  | Za dużo żądań                                      | Odczekaj czas z nagłówka `Retry-After`                    |
| 503  | Partner niedostępny albo baza chwilowo zajęta      | Ponów później; przy zapisie z tym samym `Idempotency-Key` |

Cudza rezerwacja i nieistniejąca rezerwacja dają ten sam błąd `404 RESERVATION_NOT_FOUND`, żeby odpowiedź nie zdradzała, czy dany identyfikator istnieje. Dokładne rozróżnienie 401 i 403 opisuje [projekt endpointów](projekt-endpointow.md#zasady-sprawdzania-dostępu).

Przy usługach A/B sprawdzaj również pola `status` i `error`. Żądanie może zakończyć się poprawnym kodem HTTP, ale zwrócić usługę ze stanem `unknown` lub `cancel_pending`.

Listy mają postać `{items,total,page,pageSize}`. Stronę wybierasz przez `page`, a liczbę wyników przez `pageSize` (domyślnie 20, maksymalnie 100). Listę pobytów można filtrować przez `status` i `date` oraz przeszukiwać przez `search` po numerze rezerwacji lub imieniu i nazwisku osoby kontaktowej. Plan pobytu jest osobnym obiektem z usługami pakietu i historią ich zamówień.

## Logowanie z przeglądarki

Interfejs wywołuje `GET /auth/csrf` z obsługą cookie i przesyła otrzymany `csrfToken` w nagłówku `X-CSRF-Token` przy każdym `POST` i `PATCH`. Rejestracja, logowanie oraz zmiana hasła tworzą nową sesję i nowy token. Adres strony musi zgadzać się z `APP_ORIGIN`. Połączenie między serwerami z kluczem API nie wymaga sesji ani tokenu CSRF.
