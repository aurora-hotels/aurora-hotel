# Sprawdzenie zgodności z planem

Porównano kod z notebookiem „Projekt C — specyfikacja i plan realizacji do wspólnej rewizji”, wersja 0.2, oraz prezentacją prowadzącego udostępnioną w rozmowie. Ten dokument opisuje sprawdzenie techniczne. Nie jest podpisem zespołu pod odbiorem ani potwierdzeniem działania cudzych aplikacji.

## Zakres aplikacji

| Wymaganie                | Co powstało                                                          | Jak sprawdzamy                                                             |
| ------------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| F-01 Konta i role        | Rejestracja klienta, sesja, profil, hasła, personel, blokada i reset | Testy API oraz osobny audyt bezpieczeństwa                                 |
| F-02 Oferta pokoi        | Pojemność, wyposażenie, cena, aktywność i panel edycji               | API ofert, walidacja, uruchomienie interfejsu                              |
| F-03 Dostępność i cena   | Przedziały dni, liczba nocy, całkowite grosze i pakiet doliczany raz | Błędne daty, zajętość, sąsiednie terminy i wycena                          |
| F-04 Rezerwacja          | Klient, recepcja i klucz partnera; jedna transakcja zapisu           | Równoległe żądania, blokada SQLite i idempotencja                          |
| F-05 Zmiana i anulowanie | Właściciel, stan, wersja, cena i zależności A/B/D                    | Konflikty, obce rezerwacje i częściowe anulowanie                          |
| F-06 Obsługa pobytu      | Lista gości, kontakt, zameldowanie i wymeldowanie                    | Poprawne oraz niedozwolone przejścia stanów                                |
| F-07 Pakiety             | Oferta dodatków i osobna kopia każdej kupionej jednostki             | Zmiana ceny, treści i aktywności pakietu po zakupie                        |
| F-08 API C               | Oferta, dostępność, pobyty, zmiany, anulowanie i plan                | Supertest, dokumentacja kontraktu i przykład wywołań                       |
| F-09 Konfiguracja        | Tryb demo/real, adresy, timeouty, sekrety i zakresy kluczy           | Bieżąca zmiana konfiguracji, cofnięcie uprawnień, redakcja sekretów        |
| F-10 Historia            | Autor, czas, obiekt i bezpieczny opis operacji                       | Odczyt historii i kontrola braku haseł/kluczy                              |
| F-11 Usługi A/B          | Oferta, terminy, rezerwacja, odświeżenie i anulowanie                | Symulatory oraz lokalny serwer HTTP; realne grupy pozostają do podłączenia |
| F-12 Voucher D           | Weryfikacja części hotelowej i osobne potwierdzenie wykonania        | Odmowa, nieważność, awaria, timeout po sukcesie i odzyskanie operacji      |
| F-13 Pulpit i plan       | Filtrowanie pobytów, przyjazdy/wyjazdy, plan i błędy partnerów       | API, scenariusze przeglądarkowe oraz odbiór manualny zespołu               |

## Powiązanie z testami z notebooka

Nazwy testów zawierają identyfikatory T-01–T-26. Jedno wymaganie może być sprawdzane przez kilka testów. Określenie „lokalnie” oznacza uruchomioną aplikację C i kontrolowaną odpowiedź partnera, nie serwer innego zespołu.

| ID   | Pokrycie i ograniczenie                                                                                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-01 | Rejestracja, normalizacja e-maila, duplikat, logowanie, blokada i unieważnienie sesji: `hotel.test.ts`                                                        |
| T-02 | Brak nadania sobie roli przez rejestrację lub profil: `hotel.test.ts`, `security-audit.test.ts`                                                               |
| T-03 | Nieistniejąca data, przeszłość, kolejność, pojemność i puste wyniki API: `hotel.test.ts`; komunikat pustej listy także w odbiorze UI                          |
| T-04 | Kilka jednoczesnych żądań HTTP, dokładnie jedna rezerwacja: `hotel.test.ts`; dodatkowo zajęta baza z drugiego połączenia: `security-audit.test.ts`            |
| T-05 | Wyjazd i kolejny przyjazd tego samego dnia: `hotel.test.ts`                                                                                                   |
| T-06 | Noclegi plus pakiet raz oraz zachowana wcześniejsza cena: `hotel.test.ts`                                                                                     |
| T-07 | Zajęty termin, stara wersja i niezaakceptowana cena bez częściowego zapisu: `hotel.test.ts`                                                                   |
| T-08 | Własność klienta i partnera, brak ujawnienia cudzego pobytu: `hotel.test.ts`                                                                                  |
| T-09 | Ponowienie z tym samym kluczem oraz konflikt innej treści: `hotel.test.ts`                                                                                    |
| T-10 | Cofnięcie zakresu i wyłączenie klucza bez restartu; rotacja klucza zachowuje tożsamość partnera: `hotel.test.ts`                                              |
| T-11 | Kolejność meldowania/wymeldowania i uprawnienia personelu: `hotel.test.ts`                                                                                    |
| T-12 | Wyłączenie oferty i zachowanie kopii kupionych dodatków mimo ich późniejszej zmiany: `hotel.test.ts`, `security-audit.test.ts`                                |
| T-13 | Timeout, błędny JSON, obce ID operacji, zły klucz, niedostępność i bezpieczne komunikaty: `integrations.test.ts`, `transport.test.ts`                         |
| T-14 | D: lokalne potwierdzenie hotelu, odmowa, timeout po sukcesie i odtworzenie zapisanego ID: `integrations.test.ts`; zgodność rzeczywistego D do wspólnego testu |
| T-15 | Konfiguracja trybu/adresu odczytywana przy operacji: testy integracyjne; ręczna ocena panelu i oznaczenia demo w `testy-manualne.md`                          |
| T-16 | Ostatni administrator, reset, wymuszona zmiana hasła, CSRF i obce Origin: `hotel.test.ts`, `security-audit.test.ts`                                           |
| T-17 | Scenariusze przeglądarkowe uzupełnia manualna próba klawiatury, telefonu i błędów formularzy; nie oznaczamy całego odbioru jako zaliczonego bez wykonawcy     |
| T-18 | Ponowienie seed bez usunięcia danych: `hotel.test.ts`; start według README sprawdzamy również na komputerze osoby prezentującej                               |
| T-19 | D tworzy pobyt z voucherem i bezpiecznie ponawia żądanie: `integrations.test.ts`                                                                              |
| T-20 | Termin poza pobytem i nakładające się usługi jednego gościa: `integrations.test.ts`                                                                           |
| T-21 | Sukces A i odmowa B zachowują hotel oraz udaną usługę: `integrations.test.ts`                                                                                 |
| T-22 | Niepewny zapis, odzyskanie po ID i trwałość danych po uruchomieniu nowego procesu: `integrations.test.ts`                                                     |
| T-23 | Aktywne/niepewne A/B blokują zmianę, a częściowe anulowanie nie zwalnia hotelu: `integrations.test.ts`                                                        |
| T-24 | Zły dostawca/część, wykorzystanie i okres ważności vouchera: `integrations.test.ts`                                                                           |
| T-25 | Awaria D nie cofa lokalnego zakończenia pobytu, ponowienie zachowuje ID: `integrations.test.ts`                                                               |
| T-26 | Stan wykonanej usługi pochodzi z A/B; C nie konsumuje jej części w D: `integrations.test.ts`                                                                  |

Testy znajdują się w `backend/tests/`. Polecenie `npm test` uruchamia aktualny zestaw. Testy tworzą własne tymczasowe bazy; nie używają bazy demonstracyjnej. Raport z konkretnego uruchomienia należy przypisać do testowanego commita.

## Co dodatkowo sprawdził audyt

- Hasła są haszowane; identyfikator cookie nie jest identyfikatorem sesji zapisanym w bazie. Logowanie wymienia sesję, a reset kończy wcześniejsze sesje.
- Hasło tymczasowe pozwala przejść do zmiany hasła, ale blokuje pozostałe operacje. Profil nie służy do zmiany roli.
- API nie łączy uprawnień sesji administratora z kluczem partnera. Pusty lub błędny klucz nie daje dostępu anonimowego.
- Sekrety połączeń są szyfrowane. Lista integracji, kluczy i historia nie ujawniają pełnych wartości. Maska sekretu nie nadpisuje zapisanego klucza.
- Blokada zapisu SQLite powstaje przed odczytem zajętości. Po wyczerpaniu czasu oczekiwania odpowiedź 503 nie pozostawia rezerwacji ani rekordu idempotencji; żądanie można ponowić.
- Zakończony pobyt nadal zajmuje swój przedział. Edycja pakietu nie podmienia kupionych jednostek usług.
- Połączenie z partnerem nie podąża za przekierowaniem. Sprawdza dozwolony host i adres sieciowy, a wynik DNS jest przypięty do połączenia.
- Operacje zewnętrzne jednej rezerwacji są blokowane na czas wywołania HTTP. Starsza odpowiedź nie może cofnąć stanu anulowanego/wykonanego, a późniejszy błąd nie cofa potwierdzenia zgłoszonego D.

## Świadome doprecyzowania planu

1. Użyto `node:sqlite` zamiast proponowanej Prisma. Pozostała jedna baza SQLite i jawne transakcje. Z tego powodu zmienna środowiskowa nazywa się `DATABASE_PATH`; repo nie wymaga generatora ani migracji Prisma.
2. Aplikacja działa jako **jedna instancja backendu**. Blokada operacji HTTP jest w pamięci procesu. Nie deklarujemy obsługi klastra kilku instancji ani wysokiej dostępności.
3. Zmiana pobytu może przyjąć `guestNames`, aby przy zmianie liczby osób nie tworzyć fikcyjnych nazwisk. Osobny endpoint personelu edytuje listę gości i kontakt. Serwer nadal sam ustala autora, właściciela, źródło i status.
4. Zmiana pobytu finansowanego voucherem wymaga uzgodnienia z D i zwraca konflikt. Projekt C nie wykonuje zwrotów ani rozliczeń za inne firmy.
5. Wartość `unknown` jest celowym stanem wymagającym wyjaśnienia. Nie oznacza sukcesu ani prawa do stworzenia drugiej takiej samej usługi.

## Co pozostaje do wspólnego odbioru

- A/B/D muszą przekazać rzeczywiste adresy, klucze, identyfikatory ofert i uzgodnione kontrakty. Trzeba wykonać wspólny przebieg z ich uruchomionymi aplikacjami i zachować identyfikatory operacji oraz wynik. Symulatory i lokalny HTTP nie zastępują tego wymagania.
- Każda osoba wykonuje własny odbiór swojej części, zapisuje faktyczny wkład i omawia jeden test. Nie ma tu deklaracji wykonania pracy, akceptacji ani przeglądu PR przez osobę, która tego nie potwierdziła.
- Na komputerze przeznaczonym do demonstracji trzeba powtórzyć instrukcję startu, skonfigurować połączenia i wykonać próbę prezentacji. Dane do pokazu powinny pozostać fikcyjne.
- Wyniki manualne, daty etapów, dostęp prowadzącego do repo oraz uzgodnienia kontraktów wpisujemy po ich rzeczywistym potwierdzeniu. Lista kroków jest w dokumentach zespołu, integracji i testów manualnych.

Zakres wsparcia narzędzi oraz sposób weryfikacji opisuje [wsparcie-ai.md](wsparcie-ai.md). Dokumentacja jest napisana dla zespołu i służy do samodzielnej edycji oraz obrony projektu.
