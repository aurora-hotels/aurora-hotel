# Plan realizacji projektu C

Celem jest działająca aplikacja jednego hotelu: od rezerwacji pokoju do zakończenia pobytu oraz obsługi usług A/B i hotelowej części vouchera D. Najpierw uruchamiamy całość lokalnie. Osobnym etapem odbioru jest wspólna próba z rzeczywistymi aplikacjami innych zespołów.

## Kolejność zmian w repozytorium

| Etap                        | Co trafia do kodu                                           | Jak sprawdzamy rezultat                                       |
| --------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| 1. Środowisko               | Skrypty, konfiguracja, baza, szkielet serwera i interfejsu  | Czysta instalacja i uruchomienie                              |
| 2. Podstawy hotelu          | Konta, role, pokoje, dostępność, rezerwacje i pakiety       | Testy uprawnień, dat, cen i równoczesnego zapisu              |
| 3. Recepcja i administracja | Zmiana/anulowanie, obsługa pobytu, oferta, konta i historia | Testy stanów oraz formularze personelu                        |
| 4. Integracje               | Klucze API, adaptery A/B/D, trwałe operacje i tryb demo     | Pełny scenariusz, częściowa odmowa, timeout i ponowienie      |
| 5. Interfejs                | Widoki klienta, recepcji i administratora                   | Budowanie oraz testy przeglądarkowe                           |
| 6. Odbiór                   | Dokumentacja, przykłady API, regresja i poprawki            | Powtórne uruchomienie testów; następnie wspólna próba A/B/C/D |

Commity opisują konkretne zmiany. Ich daty i autorzy wynikają z rzeczywistych operacji w repozytorium. Przydzielenie roli nie oznacza, że dana osoba napisała już przypisany moduł. Każdy potwierdza własny wkład i odbiór po wykonaniu pracy.

## Powiązanie z wymaganiami

| ID   | Zakres                              | Główne miejsce w aplikacji             | Sprawdzenie                                                         |
| ---- | ----------------------------------- | -------------------------------------- | ------------------------------------------------------------------- |
| F-01 | Konta, profil, hasła, blokady, role | Uwierzytelnianie i panel kont          | Klient nie nadaje sobie roli; blokada kończy sesję                  |
| F-02 | Oferta pokoi                        | Oferta klienta i pokoje administratora | Wyłączone pokoje nie są dostępne do nowej rezerwacji                |
| F-03 | Dostępność i wycena                 | Wyszukiwarka oraz `/availability`      | Daty, pojemność, liczba nocy, kwoty w groszach                      |
| F-04 | Rezerwacja                          | Formularz i `/reservations`            | Ponowienie nie duplikuje zapisu; brak nakładających się pobytów     |
| F-05 | Zmiana i anulowanie                 | Szczegóły pobytu                       | Wersja i cena sprawdzane ponownie; obca rezerwacja niedostępna      |
| F-06 | Obsługa pobytu                      | Recepcja                               | Wyłącznie dozwolone przejścia stanów                                |
| F-07 | Pakiety                             | Oferta i konfiguracja pakietów         | Dodatki oraz cena zapamiętane przy rezerwacji                       |
| F-08 | API C                               | `/api/v1` i OpenAPI                    | Klucz, zakresy oraz dostęp wyłącznie do własnych pobytów            |
| F-09 | Konfiguracja                        | Ustawienia hotelu, integracje i klucze | Zmiany bez przebudowy; sekrety nie są zwracane na listach           |
| F-10 | Historia                            | Rejestr operacji administratora        | Autor, czas, obiekt i bezpieczny opis                               |
| F-11 | Usługi A/B                          | Plan pobytu                            | Termin w pobycie, brak konfliktu gościa, obsługa odmowy/niepewności |
| F-12 | Voucher D                           | Weryfikacja i zgłoszenie noclegu       | C potwierdza tylko swoją część po zakończeniu pobytu                |
| F-13 | Pulpit i plan                       | Recepcja i szczegóły rezerwacji        | Przyjazdy/wyjazdy i odświeżenie stanu partnerów                     |

## Co uzgadniamy z innymi grupami

Adresy ich środowisk, klucze, identyfikatory ofert, struktury odpowiedzi i sposób odczytania wyniku po utracie połączenia. Tryb demo pomaga sprawdzić naszą aplikację przed tym uzgodnieniem. Nie stanowi dowodu, że cudzy system realizuje ten sam kontrakt.

Wspólną datę pokazu i daty etapów wpisujemy po uzgodnieniu terminu zajęć. Nie cofamy dat commitów, żeby odtwarzać planowane tygodnie pracy.
