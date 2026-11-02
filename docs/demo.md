# Pokaz projektu krok po kroku

Pracujemy na fikcyjnych danych i świadomie włączonym trybie `demo`. Pokaz zajmie około 10–15 minut. Przed zajęciami wykonaj `npm run setup`, testy oraz próbę całego scenariusza. Jeżeli baza zawiera poprzednie rezerwacje, wybierz inne wolne daty; nie usuwaj cudzych danych.

## Przygotowanie

1. Uruchom aplikację według README. Dane administratora odczytaj z lokalnego `.env`.
2. W administracji sprawdź pokoje i pakiety. Dane startowe: pokoje 101/102 — 240 zł za noc, 201 — 380 zł, 202 — 320 zł, 301 — 520 zł. Pakiety: „Spokojny odpoczynek” — 180 zł, „Aktywny pobyt” — 260 zł jednorazowo. Bieżąca oferta w panelu jest rozstrzygająca, jeśli ceny zostały zmienione.
3. Utwórz konto recepcji i ustaw własne hasło po pierwszym logowaniu. Załóż osobne konto klienta przez rejestrację.
4. W integracjach A/B/D wybierz `demo`, włącz połączenia i scenariusz `normal`. Test połączenia powinien jasno pokazać tryb symulatora.

## 1. Klient rezerwuje pobyt

Wyszukaj wolny pokój dla jednej osoby na dwie noce. Wybierz pakiet „Aktywny pobyt”. Dla niezmienionej oferty pokoju 101 cena wyniesie 740 zł: 2 × 240 + 260. Wpisz fikcyjne dane gościa, zapisz pobyt i pokaż numer, wycenę oraz dwa składniki A/B. Odśwież stronę — dane mają pozostać.

Pokaż, że zalogowanie na inne konto klienta nie daje dostępu do tego pobytu. Zmianę dat można pokazać przed planowaniem usług. Po zamówieniu A/B zmiana wymaga najpierw anulowania lub wyjaśnienia usług.

## 2. Recepcja planuje usługi

Otwórz pobyt jako recepcja. Wybierz masaż A oraz trening B dla właściwego gościa. Terminy muszą mieścić się w pobycie, między godziną przyjazdu i wyjazdu ustawioną w hotelu; domyślnie 14:00 i 11:00 w Europe/Warsaw.

Zaplanuj masaż np. 15:00–16:00 pierwszego dnia. Spróbuj dodać trening tej samej osoby 15:30–16:30: aplikacja ma zgłosić konflikt. Wybierz 16:00–17:00 — sąsiadujące terminy są dozwolone. Pokaż wspólny plan i identyfikatory operacji. W danych demo A oferuje masaże, B trening personalny i jogę.

## 3. Utrata odpowiedzi partnera

Na osobnym pobycie lub niewykorzystanym składniku ustaw A na `timeout_after_success`. Zamów usługę. Partner demo zapisze ją, ale C nie dostanie odpowiedzi; lokalny stan będzie niepewny. Nie twórz nowej usługi. Przywróć `normal`, odśwież istniejącą operację i pokaż odzyskane potwierdzenie z tym samym id.

Opcjonalnie pokaż `reject` lub `unavailable`. Sprawdź, czy panel pokazuje rzeczywisty stan, a nie sam komunikat „zapisano”. Po próbie przywróć `normal`.

## 4. Pobyt z voucherem D

Administrator lub recepcja tworzy nowy pobyt z voucherem demo `DEMO-HOTEL-001` i częścią `hotel-demo-001`. Te dane działają tylko do pierwszego wykorzystania. Na kolejną próbę administrator dodaje nowy voucher demonstracyjny i nowy identyfikator części; nie resetujemy historii wcześniejszej realizacji.

Zamelduj gościa — C weryfikuje ważność w D. Następnie ustaw D na `unavailable` i wymelduj gościa. Pobyt ma zakończyć się lokalnie, a zgłoszenie wykonania części C pozostać do wyjaśnienia. Przywróć `normal` i ponów potwierdzenie wykonania. Pokaż `reported` oraz brak ponownego wykorzystania tej samej części hotelowej.

## 5. API i konfiguracja

Pokaż `/api/docs` lub [openapi.yaml](openapi.yaml). Przedstaw partnerowi D katalog, dostępność, utworzenie, odczyt, zmianę i anulowanie pobytu. Przykładowe komendy znajdują się w [api.md](api.md). Nie pokazuj pełnego klucza na projektorze.

W administracji pokaż zmianę ceny, konta i role, maskowanie sekretu oraz dziennik zmian. Wyjaśnij na jednym przykładzie `Idempotency-Key`, `expectedTotalMinor` i `expectedVersion`.

## Co zapisać po pokazie

Osoby, które rzeczywiście wykonały scenariusze, uzupełniają [listę manualną](testy-manualne.md) i [swój wkład](zespol.md). W prezentacji oddzielamy wyniki testów lokalnych od wspólnej próby z A/B/D. Do zaliczenia rzeczywistej współpracy trzeba dodatkowo wykonać i zapisać [protokół integracji](integracje.md).
