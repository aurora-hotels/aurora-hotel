# Połączenie projektów A, B, C i D

C to hotel, A odpowiada za masaże, B za fitness, a D za vouchery. Hotel przyjmuje rezerwacje przez swoje API oraz wywołuje A/B/D z backendu. Sekret partnera nie trafia do przeglądarki klienta.

Implementacja zawiera dwa tryby: `demo` z lokalnymi odpowiedziami i `real` z HTTP. Poniższy kontrakt A/B/D jest **propozycją obsługiwaną przez adaptery C**. Pozostałe grupy muszą go potwierdzić albo wspólnie z nami dostosować mapowanie. Nie mamy jeszcze dowodu wykonania scenariusza na rzeczywistych serwerach A/B/D.

## Co przekazać drugiej grupie

Do D przekazujemy adres C, plik [OpenAPI](openapi.yaml), przykład z [instrukcji API](api.md) oraz klucz C z potrzebnymi zakresami. Do A/B/D wysyłamy tę stronę i ustalamy ich adresy, uwierzytelnienie, identyfikatory usług i zachowanie przy ponawianiu. Klucze wymieniamy prywatnym kanałem, bez wklejania do repozytorium, Jiry i protokołu testu.

| Ustalenie                               | A               | B               | D               |
| --------------------------------------- | --------------- | --------------- | --------------- |
| Osoba kontaktowa                        | do uzupełnienia | do uzupełnienia | do uzupełnienia |
| Adres testowego API                     | do uzupełnienia | do uzupełnienia | do uzupełnienia |
| Wersja zatwierdzonego kontraktu         | do uzupełnienia | do uzupełnienia | do uzupełnienia |
| Przekazanie klucza — data, bez wartości | do uzupełnienia | do uzupełnienia | do uzupełnienia |
| Identyfikator usługi / składnika        | do uzupełnienia | do uzupełnienia | do uzupełnienia |
| Termin wspólnej próby                   | do uzupełnienia | do uzupełnienia | do uzupełnienia |

## Ustawienia w C

Administrator wybiera partnera i ustawia `enabled`, `mode`, `baseUrl`, `timeoutMs`, `authHeader`, `secret`. Obsługiwane nagłówki to `X-API-Key` albo `Authorization: Bearer …`. Dla `Authorization` można wpisać sam token albo wartość z `Bearer`; adapter wysyła dokładnie jeden prefiks `Bearer`. `timeoutMs` mieści się w zakresie 1000–30000 i obejmuje łącznie DNS oraz HTTP pojedynczego wywołania. Odczyt z dodatkową próbą może trwać dłużej niż jeden taki limit. Sekret wpisuje się tylko przy ustawianiu lub zmianie; jego odczyt jest zamaskowany. Nazwa hosta musi dodatkowo znaleźć się w `ALLOWED_PARTNER_HOSTS` w środowisku backendu. Przy uzgodnionym połączeniu w sieci lokalnej wymaga też wpisu w `ALLOW_PRIVATE_PARTNER_HOSTS`.

`baseUrl` może zawierać prefiks API, np. `https://api-grupa-a.example/api/v1`. Adapter dopisuje ścieżki z tabel poniżej. Nie próbujemy zgadywać dowolnych adresów. Jeżeli partner ma inne ścieżki lub pola, zmieniamy adapter i test kontraktu w jednym commicie.

## Wspólny format i powtórzenia

- JSON kodowany w UTF-8, daty pobytu `YYYY-MM-DD`, terminy usług ISO 8601 z offsetem, np. `2027-06-15T15:00:00+02:00`.
- `operationId` jednoznacznie identyfikuje czynność; ponowienie tej samej operacji nie tworzy drugiego zamówienia. Partner musi zapewnić to także dla dwóch równoległych wywołań, gdy pierwsze wciąż jest przetwarzane.
- `GET /operations/{operationId}` musi pozwolić wyjaśnić wynik po utracie odpowiedzi. Samo 404 nie jest dowodem, że zlecenie na pewno nie zostanie jeszcze wykonane.
- Statusy końcowe i anulowanie trzeba uzgodnić; odpowiedzi muszą dotyczyć wysłanej operacji i odpowiedniej usługi.
- C automatycznie może powtórzyć odczyt po timeout. Przy odświeżaniu niepewnego zamówienia A/B bez zewnętrznego id, po odpowiedzi 404, może ponowić zapis: wyłącznie z tym samym `operationId` i dokładnie tą samą treścią odzyskaną z zaszyfrowanej kopii. Wymaga to opisanej wyżej idempotencji po stronie partnera.
- Każdy partner powinien mieć `GET /health` zwracający `{ "ok": true }`. Test połączenia sprawdza ten endpoint, a nie cały scenariusz biznesowy.

Operacja pamięta swój `mode` i `baseUrl`. Gdy administrator zmieni środowisko partnera, odświeżenie lub ponowienie starej operacji A/B albo wykonania części D wymaga przywrócenia pierwotnego celu. W ten sposób dane demo nie zostaną przypadkowo wysłane do rzeczywistego systemu.

Odświeżenie anulowania A/B pyta o zapisany `cancelOperationId`. Po 404 pozostawia `cancel_pending`; kolejne użycie „Anuluj usługę” ponawia anulowanie z tym samym id. Ponowienie zgłoszenia wykonania do D najpierw pyta o wynik, a po 404 wysyła ponownie tę samą czynność z dotychczasowym `operationId`.

## A — masaże i B — fitness

| Metoda i ścieżka                | Żądanie                                | Odpowiedź                                                         |
| ------------------------------- | -------------------------------------- | ----------------------------------------------------------------- |
| `GET /offers`                   | —                                      | `{ "items": [{ "id", "name", "durationMinutes" }] }`              |
| `GET /availability`             | Query: `offerId`, `startsAt`, `endsAt` | `{ "items": [{ "offerId", "startsAt", "endsAt", "available" }] }` |
| `POST /bookings`                | Dane poniżej                           | Rezerwacja usługi                                                 |
| `GET /bookings/{id}`            | Id usługi partnera                     | Rezerwacja usługi                                                 |
| `POST /bookings/{id}/cancel`    | `{ "operationId": "…" }`               | Rezerwacja usługi; id operacji anulowania                         |
| `GET /operations/{operationId}` | Stałe id czynności                     | Rezerwacja usługi lub 404                                         |

Przykład utworzenia:

```json
{
  "operationId": "c-booking-123",
  "reservationId": "id-pobytu-w-C",
  "offerId": "A-MASSAGE",
  "guestName": "Anna Testowa",
  "startsAt": "2027-06-15T15:00:00+02:00",
  "endsAt": "2027-06-15T16:00:00+02:00"
}
```

Opcjonalne `voucherReference` pojawia się tylko dla powiązanej rezerwacji. A/B muszą na podstawie numeru vouchera i własnej oferty odnaleźć w D swoją część; C nie przekazuje im hotelowego `hotelComponentId` do realizacji. Przykład odpowiedzi:

```json
{
  "id": "a-booking-456",
  "status": "confirmed",
  "operationId": "c-booking-123",
  "startsAt": "2027-06-15T15:00:00+02:00",
  "endsAt": "2027-06-15T16:00:00+02:00"
}
```

Dopuszczalne statusy odpowiedzi: `confirmed`, `completed`, `cancelled`, `rejected`. Nasz lokalny stan dodatkowo rozróżnia operacje niepewne. Nie traktujemy nieznanego statusu partnera jak potwierdzenia.

## D — weryfikacja i wykonanie części hotelowej

`POST /vouchers/check` otrzymuje:

```json
{
  "reference": "numer-vouchera-testowego",
  "componentId": "id-czesci-hotelowej",
  "provider": "C",
  "reservationId": "id-pobytu-w-C",
  "checkIn": "2027-06-15",
  "checkOut": "2027-06-17"
}
```

`reservationId` może być pominięty w kontrakcie weryfikacji. Oczekiwana odpowiedź:

```json
{
  "valid": true,
  "provider": "C",
  "kind": "hotel",
  "componentId": "id-czesci-hotelowej",
  "used": false,
  "reservationId": null,
  "validFrom": "2027-01-01",
  "validUntil": "2027-12-31",
  "reference": "numer-vouchera-testowego"
}
```

C sprawdza również usługodawcę, rodzaj, daty, zgodność identyfikatora oraz brak wykorzystania lub obcego przypisania. Samo `valid: true` nie wystarczy.

Po wymeldowaniu C wywołuje `POST /vouchers/complete`:

```json
{
  "reference": "numer-vouchera-testowego",
  "componentId": "id-czesci-hotelowej",
  "provider": "C",
  "reservationId": "id-pobytu-w-C",
  "operationId": "c-completion-789"
}
```

Odpowiedź: `{ "status": "reported", "operationId": "c-completion-789", "componentId": "id-czesci-hotelowej", "provider": "C", "reservationId": "id-pobytu-w-C" }`. `GET /operations/{operationId}` zwraca ten sam wynik lub 404. To potwierdzenie wykonania części C, a nie obciążenie karty, wystawienie faktury lub wykorzystanie części A/B.

## Jak przejść z demo do realnej próby

1. Uzgodnij powyższe pola i sprawdź, czy partner potrafi odnaleźć operację po `operationId`.
2. Utwórz osobne dane testowe, ustal termin i osoby po obu stronach.
3. Dodaj dozwolony host, ustaw `real`, URL i klucz, uruchom test połączenia.
4. Sprawdź katalog i dostępność, a następnie utwórz jedną rezerwację oraz pobierz jej wynik.
5. Sprawdź powtórzenie z tym samym id i treścią, także podczas przetwarzania pierwszego żądania. Sprawdź odrzucenie terminu i anulowanie.
6. W scenariuszu D powiąż część hotelową, zamelduj, wymelduj i potwierdź, że D oznaczyło tylko część C.
7. Zapisz poniższy protokół i link do PR, jeżeli konieczna była zmiana adaptera.

## Protokół wspólnego testu — do wypełnienia po wykonaniu

```text
Data i uczestnicy:
Commit C oraz wersje A/B/D:
Adresy środowisk (bez kluczy):
Scenariusz i dane fikcyjne:
Id rezerwacji C / id usług A/B / id części D:
Id operacji do porównania w logach:
Oczekiwany wynik:
Wynik rzeczywisty:
Załączniki: zanonimizowane żądania, odpowiedzi, logi lub zrzuty
Błędy i odnośniki do zadań:
Potwierdzenie drugiej grupy:
```

Dopiero taki wynik jest podstawą do opisania działającej integracji między grupami. Sam tryb `demo`, test jednostkowy lub odpowiedź `/health` tego nie potwierdza.
