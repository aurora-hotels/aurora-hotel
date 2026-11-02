# Co sprawdzają testy

Testy korzystają z nowych, tymczasowych baz SQLite. Nie usuwają danych z normalnego uruchomienia aplikacji. Każdy scenariusz przygotowuje własny pokój lub pobyt, więc awaria jednego testu nie powinna zmieniać wyniku pozostałych.

Wynik bieżącego uruchomienia należy odczytać z terminala lub CI. Poniżej opisujemy rzeczywiste asercje, a nie samą listę planowanych prób.

## Wynik uruchomienia — 2 listopada 2026

Sprawdzone na Node 24.22.1, Vitest 5.1.0 i Playwright 1.56.1 (Chromium):

| Polecenie          | Wynik                                          | Czas    |
| ------------------ | ---------------------------------------------- | ------- |
| `npm test`         | **70/70 PASS**, sześć plików testów            | 8,60 s  |
| `npm run test:e2e` | **6/6 PASS**, wszystkie scenariusze w Chromium | 15,30 s |

Oba polecenia zostały faktycznie wykonane w końcowym sprawdzeniu, po formatowaniu kodu. Czas dotyczy tego konkretnego uruchomienia i nie jest wynikiem testu wydajności. Nie uruchamiano testów z serwerami pozostałych grup ani nie zastępowano nimi odbioru manualnego.

Przeszły także: `npm run check` (formatowanie, testy, typy i build), walidacja OpenAPI oraz `npm audit` bez zgłoszonych podatności. W świeżym katalogu wykonano `npm run setup`, build i kopię bazy; SQLite potwierdził integralność kopii (`integrity_check: ok`). Zbudowany serwer w trybie produkcyjnym przeszedł próbę logowania, obsługi routingu klienta i wyświetlenia Swagger UI. Na ekranach 1440 px i 390 px nie wystąpiły błędy JavaScript ani poziome przewijanie całej strony na telefonie.

Konfigurację Dockera sprawdzono przez przegląd plików; kontenera nie uruchamiano, ponieważ środowisko weryfikacji nie udostępnia silnika Docker. Nie sprawdzano jeszcze wdrożenia publicznego HTTPS ani innych przeglądarek niż Chromium.

## Uruchomienie

```bash
npm test
npx playwright install chromium
npm run test:e2e
```

`npm test` sprawdza API, reguły hotelu, uprawnienia i integracje. Playwright sam uruchamia odrębną bazę, API na porcie 3101 i frontend na 5174. Te porty muszą być wolne. Raport przeglądarkowy otwiera `npx playwright show-report`; zrzut i ślad wykonania powstają przy błędzie.

## Pokrycie planu T-01–T-26

| Plan | Co sprawdzamy automatycznie                                                                                                                                                                                                                                    | Gdzie                                                                 |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| T-01 | Rejestracja, duplikat e-mail z inną wielkością liter, logowanie, blokada i unieważnienie sesji                                                                                                                                                                 | `hotel.test.ts`, E2E                                                  |
| T-02 | Próba podania własnej roli przy rejestracji; klient bez dostępu do administracji                                                                                                                                                                               | `hotel.test.ts`                                                       |
| T-03 | Nieistniejąca data, przeszłość, kolejność dat, pojemność i liczba nazwisk gości; brak wolnego pokoju                                                                                                                                                           | `hotel.test.ts`                                                       |
| T-04 | Osiem równoległych żądań: jeden sukces. Dwa osobne procesy API ze wspólną SQLite: jeden sukces i jeden konflikt. Osobna blokada zapisu SQLite: błąd tymczasowy bez częściowego pobytu                                                                          | `hotel.test.ts`, `security-audit.test.ts`                             |
| T-05 | Kolejny gość może przyjechać w dniu wyjazdu poprzedniego                                                                                                                                                                                                       | `hotel.test.ts`                                                       |
| T-06 | Trzy noce i pakiet doliczony raz; ceny pobytu nie zmieniają się po edycji cennika                                                                                                                                                                              | `hotel.test.ts`                                                       |
| T-07 | Zajęty termin, nieaktualna wersja i inna zaakceptowana cena: 409, bez częściowych zmian                                                                                                                                                                        | `hotel.test.ts`                                                       |
| T-08 | Klient i partner nie odczytują ani nie zmieniają cudzych pobytów                                                                                                                                                                                               | `hotel.test.ts`                                                       |
| T-09 | To samo żądanie i klucz idempotencji zwracają ten sam pobyt; zmieniona treść jest odrzucana                                                                                                                                                                    | `hotel.test.ts`                                                       |
| T-10 | Odebranie zakresu lub wyłączenie klucza działa od następnego żądania; rotacja zachowuje tożsamość partnera                                                                                                                                                     | `hotel.test.ts`                                                       |
| T-11 | Kolejność stanów pobytu i uprawnienia recepcji; zakończony pobyt zachowuje zajętość historycznego terminu                                                                                                                                                      | `hotel.test.ts`, `security-audit.test.ts`, E2E                        |
| T-12 | Nieaktywny pakiet nie jest sprzedawany; istniejąca rezerwacja zachowuje cenę i kopię dodatków                                                                                                                                                                  | `hotel.test.ts`, `security-audit.test.ts`                             |
| T-13 | Timeout, błędny JSON, obce ID operacji, zły klucz, brak ujawnienia sekretu; zwykły pobyt działa przy awarii D                                                                                                                                                  | `integrations.test.ts`, `transport.test.ts`, `security-audit.test.ts` |
| T-14 | D utrwala wykorzystanie hotelu mimo utraconej odpowiedzi; świeży proces odzyskuje tę samą operację; C nie potwierdza masażu ani treningu                                                                                                                       | `integrations.test.ts`                                                |
| T-15 | Zmiana integracji demo → lokalny serwer HTTP działa w uruchomionym API. Administrator zmienia scenariusz awarii przez formularz i odczytuje wynik testu połączenia                                                                                             | `integrations.test.ts`, E2E                                           |
| T-16 | CSRF, ochrona ostatniego administratora, wymuszona zmiana hasła, zamknięcie innych sesji, odrzucenie mieszanej autoryzacji                                                                                                                                     | `hotel.test.ts`, `security-audit.test.ts`                             |
| T-17 | Rezerwacja i edycja przez formularze, pusta lista, obsługa klawiatury i widok telefonu. Pełny odbiór dostępności pozostaje manualny                                                                                                                            | `frontend/e2e/hotel.spec.ts`                                          |
| T-18 | Ponowienie seed zachowuje pobyty; start API i frontendu przy testach E2E                                                                                                                                                                                       | `hotel.test.ts`, konfiguracja Playwright                              |
| T-19 | Partner D tworzy pobyt z voucherem; powtórzenie daje jedno ID i jedno powiązanie                                                                                                                                                                               | `integrations.test.ts`                                                |
| T-20 | Usługa poza pobytem i kolizja terminów jednego gościa są odrzucone przed wywołaniem partnera                                                                                                                                                                   | `integrations.test.ts`                                                |
| T-21 | Masaż potwierdzony, trening odrzucony: pozostają hotel i częściowy plan                                                                                                                                                                                        | `integrations.test.ts`                                                |
| T-22 | Timeout po sukcesie A: trwałe ID, zakaz ponownego zakupu i odzyskanie wyniku w nowym procesie Node. To samo po błędnym JSON w prawdziwym HTTP; po 404 od partnera ponowienie zachowuje identyczne ID i treść. Zmienione środowisko partnera blokuje wznowienie | `integrations.test.ts`                                                |
| T-23 | Zmiana dat vouchera ponownie sprawdza D i zachowuje dane przy odmowie lub awarii. Niepewna usługa blokuje zmianę dat; częściowe anulowanie nie zwalnia hotelu; odświeżenie i anulowanie nie nadpisują sobie wyników                                            | `integrations.test.ts`                                                |
| T-24 | Obcy dostawca, rodzaj, część, ważność, użycie i powiązanie vouchera blokują zameldowanie. Ponowna weryfikacja poprzedza też anulowanie                                                                                                                         | `integrations.test.ts`                                                |
| T-25 | Lokalne wymeldowanie zostaje zapisane mimo awarii D; ponowienia potwierdzają tylko jedną część hotelową                                                                                                                                                        | `integrations.test.ts`                                                |
| T-26 | Zakończenie usługi w A aktualizuje plan C; voucher D pozostaje niewykorzystany przez C                                                                                                                                                                         | `integrations.test.ts`                                                |

Lokalne serwery kontraktowe sprawdzają ścieżki, nagłówki i treść komunikatów dla A, B i D. Dodatkowe testy transportu sprawdzają rzeczywiste połączenie przez IP i nazwę `localhost`, nagłówek z zaszyfrowanym sekretem, brak śledzenia przekierowań oraz blokadę nieuzgodnionych hostów i prywatnych adresów. Osobne próby potwierdzają, że limit czasu obejmuje również DNS, a nagłówek Authorization otrzymuje poprawny prefiks Bearer. To właśnie próba przez nazwę hosta wykryła problem zgodności z mechanizmem DNS w Node 24; poprawka jest objęta regresją.

Test dwóch procesów dotyczy atomowości zapisu w SQLite. Nie oznacza zgody na uruchamianie wielu instancji serwera w normalnym wdrożeniu: blokady długich operacji integracyjnych są lokalne dla jednego procesu, zgodnie z instrukcją uruchomienia.

## Próby przeglądarkowe

1. Klient zakłada konto, widzi pustą listę, wyszukuje i rezerwuje pokój, zmienia termin oraz anuluje pobyt. Test sprawdza także zapis po stronie API.
2. Recepcja planuje masaż u symulowanego partnera, melduje i wymeldowuje gościa.
3. Formularz logowania działa z klawiatury na ekranie 390 px, a oferta nie wychodzi poza ekran.
4. Administrator tworzy pokój, zmienia cenę i usuwa go z aktywnej oferty przez dezaktywację.
5. Administrator zmienia scenariusz integracji, tworzy klucz API, sprawdza jego działanie i odbiera mu dostęp. Klucz nie pojawia się ponownie po odświeżeniu strony.
6. Voucher demo powstaje w formularzu, trafia do rezerwacji i po wymeldowaniu ma potwierdzone wykonanie części hotelowej w D.

## Co zespół musi jeszcze potwierdzić

Nie oznaczamy symulacji jako integracji z aplikacjami innych grup. Lokalne testy HTTP sprawdzają nasz kontrakt i obsługę sieci, ale nie dowodzą zgodności z gotowymi serwerami A, B i D. Po uzgodnieniu ich adresów, nagłówków, identyfikatorów ofert i formatu odpowiedzi trzeba wykonać wspólny scenariusz oraz zapisać wyniki bez sekretów.

Pozostają również rzeczywiste testy manualne zespołu: zrozumiałość komunikatów, obsługa czytnika ekranu, sprawdzenie własnych telefonów, pierwsze uruchomienie na komputerze innej osoby i końcowa akceptacja wymagań. Nie przypisujemy wykonania tych prób osobom, które ich jeszcze nie przeprowadziły.
