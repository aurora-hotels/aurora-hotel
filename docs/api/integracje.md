# Kontrakty z projektami A, B i D

Przeznaczenie: ustalenia dotyczące integracji; format, którego hotel oczekuje od API pozostałych grup. Opiekunowie: Adrian Zieliński, Andrii Yaremko; uzgodnienie danych: Wiktoria Sobejko.

A odpowiada za masaże, B za fitness, nasza grupa C za hotel, a D za vouchery. Hotel przyjmuje rezerwacje przez własne API i łączy się z A, B i D ze swojego serwera. Klucze partnerów pozostają na serwerze i nie trafiają do przeglądarki.

Aplikacja ma dwa tryby połączenia: `demo`, który zwraca odpowiedzi lokalnie, oraz `real`, który wykonuje żądania HTTP. **Poniższy format jest propozycją obsługiwaną przez nasz kod.** Pozostałe grupy muszą go potwierdzić albo wspólnie z nami zmienić. Jeśli ich API ma inne pola lub ścieżki, dostosujemy adaptery.

## Stan integracji

Tryb demo oraz lokalne połączenia HTTP są sprawdzone testami. Wspólna próba z aplikacjami A, B i D pozostaje do wykonania po uzgodnieniu kontraktów i danych połączenia. Tryb demo, test jednostkowy ani odpowiedź `/health` nie są dowodem działającej integracji między grupami.

## Co musimy ustalić

Grupie D przekazujemy adres hotelu, [OpenAPI](../openapi.yaml), [instrukcję z przykładami](README.md) i klucz z potrzebnymi zakresami. Od A, B i D potrzebujemy adresów API, sposobu autoryzacji, identyfikatorów usług i informacji o ponawianiu żądań. Klucze wymieniamy prywatnym kanałem, bez zapisywania ich w repozytorium, Jirze i wynikach testu.

| Do ustalenia                               | A               | B               | D               |
| ------------------------------------------ | --------------- | --------------- | --------------- |
| Osoba kontaktowa                           | do uzupełnienia | do uzupełnienia | do uzupełnienia |
| Adres testowego API                        | do uzupełnienia | do uzupełnienia | do uzupełnienia |
| Uzgodniona wersja kontraktu                | do uzupełnienia | do uzupełnienia | do uzupełnienia |
| Data przekazania klucza, bez jego wartości | do uzupełnienia | do uzupełnienia | do uzupełnienia |
| Identyfikator usługi lub składnika         | do uzupełnienia | do uzupełnienia | do uzupełnienia |
| Termin wspólnej próby                      | do uzupełnienia | do uzupełnienia | do uzupełnienia |

Zadanie w Jirze: [KAN-13](https://zielinskiadis.atlassian.net/browse/KAN-13).

## Ustawienia po naszej stronie

W panelu administratora wybieramy partnera i ustawiamy `enabled`, `mode`, `baseUrl`, `timeoutMs`, `authHeader` oraz `secret`.

- `baseUrl` może zawierać prefiks, np. `https://api-grupa-a.example/api/v1`. Kod dopisuje do niego ścieżki z tabel poniżej.
- `authHeader` to `X-API-Key` lub `Authorization`. W drugim przypadku można wpisać sam token albo `Bearer …`; prefiks zostanie dodany tylko raz.
- `timeoutMs` przyjmuje od 1000 do 30000 ms. To wspólny limit na DNS i HTTP jednej próby. Wywołanie z ponowieniem może łącznie potrwać dłużej.
- `secret` wpisujemy przy konfiguracji lub zmianie klucza. Zapisana wartość jest zaszyfrowana i pokazywana tylko jako maska.
- Host musi znaleźć się w `ALLOWED_PARTNER_HOSTS`. Dla połączenia w sieci lokalnej potrzebny jest także wpis w `ALLOW_PRIVATE_PARTNER_HOSTS`. Opis jest w [konfiguracji](../konfiguracja.md#hosty-partnerów).

Adresy wpisujemy po uzgodnieniu z drugą grupą. Zmianę ścieżek lub pól w adapterze wysyłamy razem z testem kontraktu w tym samym commicie.

## Wspólny format i ponawianie

- JSON w UTF-8. Daty pobytu mają format `YYYY-MM-DD`, a terminy usług ISO 8601 z przesunięciem strefy, np. `2027-06-15T15:00:00+02:00`.
- Każda czynność ma stały `operationId`. Ponowienie z tym samym identyfikatorem musi dać ten sam wynik, również gdy pierwsze żądanie jest jeszcze przetwarzane. Partner musi więc obsłużyć dwa równoległe wywołania bez utworzenia dwóch zamówień.
- Po utracie odpowiedzi hotel sprawdza `GET /operations/{operationId}`. Sam kod 404 nie gwarantuje, że pierwsze żądanie nie zostanie jeszcze wykonane.
- Przy odświeżaniu niepewnego zamówienia A/B bez identyfikatora nadanego przez partnera hotel może po 404 ponowić zapis: wyłącznie z tym samym `operationId` i identyczną treścią, odczytaną z zaszyfrowanej kopii. Odczyt może zostać automatycznie powtórzony raz po przekroczeniu czasu.
- Anulowanie A/B ma osobny `cancelOperationId`. Odświeżenie pyta o wynik tego identyfikatora; po 404 pozostaje stan `cancel_pending`. Kolejne użycie „Anuluj usługę” ponawia anulowanie z dotychczasowym identyfikatorem.
- Zgłoszenie wykonania części D działa podobnie: najpierw sprawdza wynik, a po 404 ponawia tę samą czynność z tym samym `operationId`.
- Przy każdej operacji zapisujemy `mode` i `baseUrl`. Po przełączeniu partnera na inny adres albo z `demo` na `real` trzeba przywrócić stare ustawienia, żeby wyjaśnić wcześniejszą operację. Dzięki temu zamówienie z trybu demo nie trafi przypadkiem do rzeczywistego systemu.
- Każdy partner powinien mieć `GET /health` zwracający `{ "ok": true }`. Test połączenia sprawdza ten adres, a nie cały scenariusz biznesowy.
- Hotel nie podąża za przekierowaniami i łączy się tylko z dopuszczonymi hostami.

Uzgadniamy również stany końcowe i zachowanie anulowania. Odpowiedź musi dotyczyć wysłanej operacji i właściwej usługi; odpowiedź z innym `operationId` nie jest potwierdzeniem.

## Masaże A i fitness B

| Metoda i ścieżka                | Dane żądania                           | Odpowiedź                                                         |
| ------------------------------- | -------------------------------------- | ----------------------------------------------------------------- |
| `GET /offers`                   | Brak                                   | `{ "items": [{ "id", "name", "durationMinutes" }] }`              |
| `GET /availability`             | Query: `offerId`, `startsAt`, `endsAt` | `{ "items": [{ "offerId", "startsAt", "endsAt", "available" }] }` |
| `POST /bookings`                | Przykład poniżej                       | Rezerwacja usługi                                                 |
| `GET /bookings/{id}`            | Identyfikator nadany przez partnera    | Rezerwacja usługi                                                 |
| `POST /bookings/{id}/cancel`    | `{ "operationId": "…" }`               | Rezerwacja usługi z identyfikatorem anulowania                    |
| `GET /operations/{operationId}` | Stały identyfikator czynności          | Rezerwacja usługi lub 404                                         |

Żądanie utworzenia usługi:

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

Jeżeli pobyt ma voucher, żądanie zawiera też `voucherReference`. A i B odnajdują w D swoją część na podstawie numeru vouchera i własnej oferty. Hotel nie przekazuje im hotelowego `hotelComponentId`.

Przykładowa odpowiedź:

```json
{
  "id": "a-booking-456",
  "status": "confirmed",
  "operationId": "c-booking-123",
  "startsAt": "2027-06-15T15:00:00+02:00",
  "endsAt": "2027-06-15T16:00:00+02:00"
}
```

Obsługujemy odpowiedzi ze stanem `confirmed`, `completed`, `cancelled` lub `rejected`. Inny stan nie jest uznawany za potwierdzenie. Po naszej stronie są dodatkowo stany dla operacji oczekujących i niepewnych.

Dane wysyłane do A i B ograniczamy do minimum: imię i nazwisko gościa, termin, identyfikator oferty i pobytu. Nie wysyłamy e-maila ani telefonu.

## Voucher D

Przy sprawdzaniu hotelowej części vouchera hotel wysyła `POST /vouchers/check`:

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

W tym żądaniu `reservationId` może być pominięty. Odpowiedź powinna mieć postać:

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

Samo `valid: true` nie wystarczy. Sprawdzamy także usługodawcę, rodzaj składnika, daty, zgodność identyfikatora, wcześniejsze wykorzystanie i przypisanie do innej rezerwacji.

Po wymeldowaniu wywołujemy `POST /vouchers/complete`:

```json
{
  "reference": "numer-vouchera-testowego",
  "componentId": "id-czesci-hotelowej",
  "provider": "C",
  "reservationId": "id-pobytu-w-C",
  "operationId": "c-completion-789"
}
```

Odpowiedź:

```json
{
  "status": "reported",
  "operationId": "c-completion-789",
  "componentId": "id-czesci-hotelowej",
  "provider": "C",
  "reservationId": "id-pobytu-w-C"
}
```

Ten sam wynik powinien być dostępny przez `GET /operations/{operationId}`; gdy operacji nie znaleziono, D zwraca 404.

Hotel zgłasza wyłącznie wykonanie noclegu. Nie obciąża karty, nie wystawia faktury i nie wykorzystuje części vouchera należących do A i B.

## Jak przejść z demo do realnej próby

1. Uzgodnij powyższe pola i sprawdź, czy partner potrafi odnaleźć operację po `operationId`.
2. Przygotuj osobne dane testowe, ustal termin i osoby po obu stronach.
3. Dodaj dozwolony host, ustaw tryb `real`, adres i klucz, uruchom test połączenia.
4. Sprawdź katalog i dostępność, a następnie utwórz jedną rezerwację oraz pobierz jej wynik.
5. Sprawdź powtórzenie z tym samym identyfikatorem i treścią, także podczas przetwarzania pierwszego żądania. Sprawdź odrzucenie terminu i anulowanie.
6. W scenariuszu D powiąż część hotelową, zamelduj, wymelduj i potwierdź, że D oznaczyło tylko część C.
7. Zapisz poniższy protokół i odnośnik do zmiany, jeżeli trzeba było dostosować adapter.

## Protokół wspólnego testu

Do wypełnienia po wykonaniu próby. Kopię z wynikami zapisujemy w [testach i odbiorze](../testy-i-odbior.md).

```text
Data i uczestnicy:
Commit C oraz wersje A/B/D:
Adresy środowisk (bez kluczy):
Scenariusz i dane fikcyjne:
Id rezerwacji C / id usług A i B / id części D:
Id operacji do porównania w logach:
Oczekiwany wynik:
Wynik rzeczywisty:
Załączniki: zanonimizowane żądania, odpowiedzi, logi lub zrzuty
Błędy i odnośniki do zadań:
Potwierdzenie drugiej grupy:
```
