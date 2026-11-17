# Testy i odbiór

Przeznaczenie: wyniki testów, pokrycie planu T-01–T-26, zasady odbioru i zgłaszania błędów. Opiekun: Filip Włodarczyk; testy ręczne: Jesika Proczek.

## Wyniki

| Data       | Wersja kodu                               | Testy serwera | Testy w przeglądarce (Chromium) | Pozostałe kontrole                                                         | Gdzie uruchomiono                                                                                      |
| ---------- | ----------------------------------------- | ------------- | ------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 02.11.2026 | commit `7fa5f61`                          | 70 z 70       | 6 z 6                           | Typy, build, formatowanie, OpenAPI                                         | Lokalnie oraz [GitHub Actions](https://github.com/aurora-hotels/aurora-hotel/actions/runs/41496505034) |
| 17.11.2026 | poprawki po przeglądzie i ta dokumentacja | 77 z 77       | 6 z 6                           | Typy, build, formatowanie, OpenAPI, `npm audit` bez zgłoszonych podatności | Lokalnie, Node.js 24.22.3; przebieg na GitHubie pojawi się po wysłaniu zmian                           |

Aktualny wynik zawsze pokazuje terminal albo zakładka Actions w repozytorium; tabela zapisuje tylko uruchomienia, które rzeczywiście wykonaliśmy.

Testy obejmują tryb demo i lokalne serwery HTTP. **Nie wykonano jeszcze**: wspólnego testu z aplikacjami A, B i D, pełnego ręcznego odbioru przez zespół, próby z czytnikiem ekranu, prób w przeglądarkach innych niż Chromium ani uruchomienia kontenera Docker.

## Jak uruchomić testy

```bash
npm test                          # reguły hotelu, API, uprawnienia i integracje
npx playwright install chromium   # jednorazowo
npm run test:e2e                  # scenariusze w przeglądarce
npm run check                     # formatowanie, testy serwera i build
```

Testy korzystają z nowych, tymczasowych baz SQLite i nie ruszają danych zwykłego uruchomienia. Każdy scenariusz przygotowuje własny pokój lub pobyt. Playwright sam uruchamia osobną bazę, API na porcie 3101 i interfejs na porcie 5174; te porty muszą być wolne. Raport otwiera `npx playwright show-report`.

Każda zmiana wysłana do gałęzi `main` i każdy pull request uruchamia te same kontrole oraz testy w przeglądarce w GitHub Actions (`.github/workflows/check.yml`).

## Najważniejsze scenariusze

| Obszar               | Oczekiwany wynik                                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Konta i uprawnienia  | Klient widzi własne dane i nie ma dostępu do funkcji personelu.                                                  |
| Rezerwacje i ceny    | Poprawne daty, pojemność i cena; jedna rezerwacja przy równoczesnej próbie zajęcia tego samego pokoju.           |
| Zmiana i anulowanie  | Sprawdzenie wersji, ceny i usług; brak częściowego zapisu po błędzie.                                            |
| Pobyt i pakiety      | Dozwolona kolejność meldowania, zameldowanie od dnia przyjazdu, zachowanie ceny zakupu i zamówionych usług.      |
| Masaże A i fitness B | Brak kolizji usług tego samego gościa; ponowienie nie tworzy drugiego zamówienia; można odzyskać niepewny wynik. |
| Voucher D            | Weryfikacja części hotelowej i jedno potwierdzenie wykonania po wymeldowaniu.                                    |
| Interfejs            | Formularze klienta, recepcji i administratora; podstawowa obsługa klawiatury i widok o szerokości 390 px.        |

## Pokrycie planu testów T-01–T-26

Identyfikatory pochodzą z planu w notebooku. Większość testów ma identyfikator w nazwie; wyjątki są zaznaczone. „Lokalnie” oznacza uruchomioną aplikację C i kontrolowaną odpowiedź partnera, nie serwer innego zespołu.

| ID   | Co sprawdzamy automatycznie                                                                                                                      | Gdzie                                                                   |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| T-01 | Rejestracja, powtórzony e-mail z inną wielkością liter, logowanie, blokada konta i unieważnienie sesji                                           | `hotel.test.ts`, E2E                                                    |
| T-02 | Rejestracja i edycja profilu nie pozwalają wybrać roli                                                                                           | `hotel.test.ts`, `security-audit.test.ts`                               |
| T-03 | Nieistniejąca data, przeszłość, zła kolejność dat, pojemność i liczba nazwisk                                                                    | `hotel.test.ts`                                                         |
| T-04 | Równoczesne żądania dają jedną rezerwację; dwa osobne procesy API na wspólnej bazie: jeden sukces i jeden konflikt; zajęta baza: błąd bez zapisu | `hotel.test.ts`, `security-audit.test.ts`                               |
| T-05 | Kolejny gość może przyjechać w dniu wyjazdu poprzedniego                                                                                         | `hotel.test.ts`                                                         |
| T-06 | Cena noclegów z pakietem doliczonym raz; cena pobytu nie zmienia się po edycji cennika                                                           | `hotel.test.ts`                                                         |
| T-07 | Zajęty termin, nieaktualna wersja i inna zaakceptowana cena: 409, bez częściowych zmian                                                          | `hotel.test.ts`                                                         |
| T-08 | Klient i partner nie odczytują, nie zmieniają ani nie anulują cudzych pobytów                                                                    | `hotel.test.ts`                                                         |
| T-09 | To samo żądanie i klucz ponowienia zwracają ten sam pobyt; zmieniona treść jest odrzucana                                                        | `hotel.test.ts`                                                         |
| T-10 | Odebranie zakresu lub wyłączenie klucza działa od następnego żądania; wymiana klucza zachowuje tożsamość partnera                                | `hotel.test.ts`                                                         |
| T-11 | Kolejność stanów pobytu, uprawnienia recepcji i zameldowanie dopiero od dnia przyjazdu; zakończony pobyt nadal zajmuje swój termin               | `hotel.test.ts`, `security-audit.test.ts`, E2E                          |
| T-12 | Nieaktywny pakiet nie jest sprzedawany; istniejąca rezerwacja zachowuje cenę i kopię usług                                                       | `hotel.test.ts`, `security-audit.test.ts`                               |
| T-13 | Przekroczenie czasu, błędny JSON, obcy identyfikator operacji, zły klucz, brak ujawnienia sekretu; zwykły pobyt działa przy awarii D             | `integrations.test.ts`, `transport.test.ts`, `security-audit.test.ts`   |
| T-14 | Hotelowa część vouchera: potwierdzenie raz mimo utraconej odpowiedzi, odzyskanie w nowym procesie; C nie potwierdza masażu ani treningu          | `integrations.test.ts` (testy T-25 i T-26), `partner-contracts.test.ts` |
| T-15 | Zmiana trybu integracji działa bez restartu; administrator zmienia scenariusz awarii w formularzu                                                | `integrations.test.ts` (bez identyfikatora w nazwie), E2E               |
| T-16 | CSRF, obce pochodzenie żądania, ochrona ostatniego administratora, wymuszona zmiana hasła, odrzucenie mieszanej autoryzacji                      | `hotel.test.ts`, `security-audit.test.ts`                               |
| T-17 | Rezerwacja i edycja przez formularze, pusta lista, obsługa klawiatury i widok telefonu; pełny odbiór dostępności pozostaje ręczny                | `frontend/e2e/hotel.spec.ts` (bez identyfikatora w nazwie)              |
| T-18 | Ponowne zasilenie bazy zachowuje pobyty                                                                                                          | `hotel.test.ts`                                                         |
| T-19 | Partner D tworzy pobyt z voucherem; powtórzenie daje jedną rezerwację i jedno powiązanie                                                         | `integrations.test.ts`                                                  |
| T-20 | Usługa poza pobytem i kolizja terminów jednego gościa są odrzucone przed wywołaniem partnera                                                     | `integrations.test.ts`                                                  |
| T-21 | Masaż potwierdzony, trening odrzucony: pozostają hotel i częściowy plan                                                                          | `integrations.test.ts`                                                  |
| T-22 | Przekroczenie czasu po sukcesie: trwały identyfikator, brak ponownego zakupu, odzyskanie wyniku; po 404 od partnera ponowienie z tym samym ID    | `integrations.test.ts`                                                  |
| T-23 | Aktywna lub niepewna usługa blokuje zmianę dat; częściowe anulowanie nie zwalnia hotelu                                                          | `integrations.test.ts`                                                  |
| T-24 | Obcy dostawca, zła część, wykorzystanie i ważność vouchera blokują zameldowanie; ponowna weryfikacja poprzedza anulowanie                        | `integrations.test.ts`                                                  |
| T-25 | Wymeldowanie zostaje zapisane mimo awarii D; ponowienia potwierdzają jedną część hotelową                                                        | `integrations.test.ts`                                                  |
| T-26 | Zakończenie usługi w A aktualizuje plan hotelu; voucher D pozostaje niewykorzystany przez C                                                      | `integrations.test.ts`                                                  |

Dodatkowe testy bez identyfikatora planu sprawdzają m.in.: połączenie z partnerem przez adres IP i nazwę hosta, blokadę nieuzgodnionych hostów i adresów prywatnych, brak podążania za przekierowaniem, limit czasu obejmujący DNS, wymianę sesji przy logowaniu, wygaśnięcie sesji, odpowiedź 413 dla zbyt dużego żądania oraz poprawki z przeglądu z 16 listopada (wycofana oferta, zmiana e-maila z hasłem, wyszukiwanie znaków `%` i `_`, sprzątanie sesji, ochrona nazwiska gościa z usługą A/B). Osobny test pilnuje, żeby każda operacja z `openapi.yaml` miała wpis w [katalogu endpointów](api/projekt-endpointow.md).

Test dwóch procesów dotyczy atomowości zapisu w SQLite. Nie oznacza zgody na uruchamianie wielu instancji serwera: blokady długich operacji integracyjnych są lokalne dla jednego procesu.

## Scenariusze w przeglądarce

1. Klient zakłada konto, widzi pustą listę, wyszukuje i rezerwuje pokój, zmienia termin oraz anuluje pobyt.
2. Recepcja planuje masaż u symulowanego partnera, melduje i wymeldowuje gościa.
3. Formularz logowania działa z klawiatury na ekranie 390 px, a oferta nie wychodzi poza ekran.
4. Administrator tworzy pokój, zmienia cenę i wycofuje go z oferty.
5. Administrator zmienia scenariusz integracji, tworzy klucz API, sprawdza jego działanie i odbiera mu dostęp.
6. Voucher demo powstaje w formularzu, trafia do rezerwacji i po wymeldowaniu ma potwierdzone wykonanie części hotelowej w D.

## Odbiór zadania

Zadanie jest gotowe po spełnieniu kryteriów i sprawdzeniu przez drugą osobę. Odbiór obejmuje zwykły przebieg oraz błędne dane. Nieudana próba powoduje zwrot do pracy. Pełna lista warunków jest na stronie [Zespół](zespol.md#kiedy-zadanie-jest-gotowe).

Testy automatyczne prowadzi zadanie [KAN-18](https://zielinskiadis.atlassian.net/browse/KAN-18), próby ręczne [KAN-22](https://zielinskiadis.atlassian.net/browse/KAN-22). Wyniki odbioru zapisujemy w komentarzu do zadania w Jirze, a wyniki prób ręcznych także w [testach ręcznych](testy-manualne.md).

## Zgłaszanie błędów

Błąd zgłaszamy w Jirze jako kartę typu „Błąd”, z odnośnikiem do historyjki, której dotyczy. Zgłoszenie zawiera kroki, oczekiwany i rzeczywisty wynik oraz wersję aplikacji; szablon jest w [testach ręcznych](testy-manualne.md#zgłoszenie-błędu). Do tej pory nie zgłoszono żadnej karty tego typu.

Błędy znalezione w przeglądzie kodu z 16 listopada 2026 poprawiono w jednej zmianie razem z testami. Były to m.in.: zameldowanie możliwe przed dniem przyjazdu, brak możliwości zmiany terminu po wycofaniu pokoju z oferty, zmiana e-maila bez hasła oraz dwie różne reguły dla klucza szyfrowania.

## Próba przepływu w Jirze

25 października 2026 na koncie Adriana sprawdzono zadanie próbne [KAN-2](https://zielinskiadis.atlassian.net/browse/KAN-2?focusedCommentId=10000):

Pomysł → Do zrobienia → W toku → W trakcie weryfikacji → zwrot do poprawy (W toku) → W trakcie weryfikacji → Gotowe.

Wszystkie przejścia działają. Zadanie miało przypisaną osobę odpowiedzialną i komentarz z wynikiem; wynik próby: pozytywny. Próba dotyczyła konta administratora. Osobiste sprawdzenia dostępu pozostałych osób są w [KAN-3](https://zielinskiadis.atlassian.net/browse/KAN-3) i nie są jeszcze kompletne.

## Próba odnalezienia dokumentacji

Próbę odnalezienia trzech materiałów przez osobę inną niż autor opisuje strona [W6](spotkania/W6-organizacja-dokumentacji.md#próba-odnalezienia-trzech-materiałów). Wynik nie został jeszcze zapisany.

## Wspólny test A/B/C/D

Jeszcze niewykonany. Po próbie wpisujemy tu wypełniony [protokół](api/integracje.md#protokół-wspólnego-testu).
