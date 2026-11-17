# Scenariusz pokazu

Przeznaczenie: pokaz projektu krok po kroku na zajęciach. Opiekun: Adrian Zieliński.

Pracujemy na fikcyjnych danych i jawnie włączonym trybie `demo`. Pokaz zajmuje około 10–15 minut. Przed zajęciami wykonaj `npm run setup`, testy oraz próbę całego scenariusza. Jeżeli baza zawiera poprzednie rezerwacje, wybierz inne wolne daty; nie usuwaj cudzych danych.

## Przygotowanie

1. Uruchom aplikację według [konfiguracji](konfiguracja.md#pierwszy-start). Dane administratora odczytaj z lokalnego `.env`.
2. W administracji sprawdź pokoje i pakiety. Dane startowe: pokoje 101 i 102 — 240 zł za noc, 201 — 380 zł, 202 — 320 zł, 301 — 520 zł. Pakiety: „Spokojny odpoczynek” — 180 zł, „Aktywny pobyt” — 260 zł jednorazowo. Jeśli ceny zostały zmienione, obowiązuje bieżąca oferta w panelu.
3. Utwórz konto recepcji i ustaw własne hasło po pierwszym logowaniu. Załóż osobne konto klienta przez rejestrację.
4. W integracjach A, B i D wybierz tryb `demo`, włącz połączenia i scenariusz `normal`. Test połączenia powinien jasno pokazać tryb symulatora.

Zameldować gości można najwcześniej w dniu przyjazdu. Pobyty, które chcesz zameldować podczas pokazu (kroki 2 i 4), muszą więc zaczynać się w dniu pokazu.

## 1. Klient rezerwuje pobyt

Wyszukaj wolny pokój dla jednej osoby na dwie noce, z przyjazdem dzisiaj. Wybierz pakiet „Aktywny pobyt”. Dla niezmienionej oferty pokoju 101 cena wyniesie 740 zł: 2 × 240 + 260. Wpisz fikcyjne dane gościa, zapisz pobyt i pokaż numer, wycenę oraz dwie usługi pakietu: trening i masaż. Odśwież stronę: dane mają pozostać.

Pokaż, że zalogowanie na inne konto klienta nie daje dostępu do tego pobytu. Zmianę dat pokaż na osobnej rezerwacji z przyjazdem w przyszłości, bo klient zmienia termin tylko przed dniem przyjazdu, a po zamówieniu usług A/B zmiana wymaga najpierw ich anulowania lub wyjaśnienia.

## 2. Recepcja planuje usługi

Otwórz pobyt jako recepcja. Wybierz masaż A oraz trening B dla właściwego gościa. Terminy muszą mieścić się w pobycie, między godziną przyjazdu i wyjazdu ustawioną w hotelu; domyślnie 14:00 i 11:00 czasu polskiego.

Zaplanuj masaż np. 15:00–16:00 drugiego dnia pobytu. Spróbuj dodać trening tej samej osoby 15:30–16:30: aplikacja ma zgłosić konflikt. Wybierz 16:00–17:00, bo terminy stykające się są dozwolone. Pokaż wspólny plan i identyfikatory operacji. Zamelduj gości.

## 3. Utrata odpowiedzi partnera

Na osobnym pobycie albo niewykorzystanej usłudze ustaw dla A scenariusz `timeout_after_success`. Zamów usługę. Symulator zapisze ją, ale hotel nie dostanie odpowiedzi; lokalny stan będzie niepewny. Nie twórz nowej usługi. Przywróć `normal`, odśwież istniejącą operację i pokaż odzyskane potwierdzenie z tym samym identyfikatorem.

Opcjonalnie pokaż scenariusz `reject` lub `unavailable`. Sprawdź, czy panel pokazuje rzeczywisty stan, a nie sam komunikat „zapisano”. Po próbie przywróć `normal`.

## 4. Pobyt z voucherem D

Administrator lub recepcja tworzy nowy pobyt z przyjazdem dzisiaj, z voucherem demo `DEMO-HOTEL-001` i częścią `hotel-demo-001`. Te dane działają tylko do pierwszego wykorzystania. Na kolejną próbę administrator dodaje nowy voucher testowy; historii wcześniejszej realizacji nie kasujemy.

Zamelduj gościa: hotel weryfikuje ważność w D. Następnie ustaw D na `unavailable` i wymelduj gościa. Pobyt ma zakończyć się lokalnie, a zgłoszenie wykonania części hotelowej pozostać do wyjaśnienia. Przywróć `normal` i ponów potwierdzenie wykonania. Pokaż stan `reported` oraz brak ponownego wykorzystania tej samej części.

## 5. API i konfiguracja

Pokaż `/api/docs` lub [openapi.yaml](openapi.yaml). Przedstaw partnerowi D katalog, dostępność, utworzenie, odczyt, zmianę i anulowanie pobytu. Przykładowe polecenia są w [instrukcji API](api/README.md). Nie pokazuj pełnego klucza na projektorze.

W administracji pokaż zmianę ceny, konta i role, maskowanie sekretu oraz historię operacji. Wyjaśnij na jednym przykładzie `Idempotency-Key`, `expectedTotalMinor` i `expectedVersion`. Pokaż odebranie zakresu kluczowi i odmowę przy następnym żądaniu.

## 6. Uprawnienia

Na podstawie [macierzy uprawnień](api/projekt-endpointow.md#macierz-uprawnień) pokaż trzy odmowy: żądanie bez logowania (401), klienta w panelu administratora (403) oraz cudzą rezerwację (404).

## Co zapisać po pokazie

Osoby, które rzeczywiście wykonały scenariusze, uzupełniają [testy ręczne](testy-manualne.md) i [zapis własnego wkładu](zespol.md#zapis-własnego-wkładu). W prezentacji oddzielamy wyniki testów lokalnych od wspólnej próby z A, B i D. Do zaliczenia rzeczywistej współpracy trzeba dodatkowo wykonać i zapisać [protokół wspólnego testu](api/integracje.md#protokół-wspólnego-testu).
