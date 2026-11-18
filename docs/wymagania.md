# Wymagania aplikacji

Przeznaczenie: wymagania funkcjonalne i pozafunkcjonalne, reguły działania oraz ich powiązanie z zadaniami i testami. Opiekun: Wiktoria Sobejko.

Zakres pochodzi z notebooka „Projekt C — specyfikacja i plan realizacji do wspólnej rewizji”, wersja 0.2 z 11 października 2026, oraz z prezentacji prowadzącego. Notebook jest w [materiałach](materialy/README.md). Tam, gdzie gotowa aplikacja różni się od pierwszego planu, obowiązuje ta strona; różnice wypisuje sekcja [Zmiany względem pierwszego planu](#zmiany-względem-pierwszego-planu).

## Wymagania funkcjonalne

| ID   | Wymaganie           | Co jest w aplikacji                                                     | Jak sprawdzamy                                  |
| ---- | ------------------- | ----------------------------------------------------------------------- | ----------------------------------------------- |
| F-01 | Konta i role        | Rejestracja, logowanie, profil, hasła, blokada konta i reset            | Testy kont, sesji i uprawnień                   |
| F-02 | Oferta pokoi        | Numer, typ, pojemność, wyposażenie, cena i aktywność pokoju             | API oraz panel administratora                   |
| F-03 | Dostępność i cena   | Sprawdzenie dat, liczby osób, liczby nocy i ceny w groszach             | Błędne daty, zajęte i sąsiednie terminy         |
| F-04 | Rezerwacja          | Zapis klienta, recepcji lub partnera w jednej transakcji                | Równoległe zapisy, blokada SQLite i ponowienia  |
| F-05 | Zmiana i anulowanie | Kontrola właściciela, statusu, wersji, ceny oraz usług A/B/D            | Konflikty i częściowe anulowanie                |
| F-06 | Obsługa pobytu      | Lista gości, kontakt, zameldowanie i wymeldowanie                       | Dozwolona kolejność stanów                      |
| F-07 | Pakiety             | Oferta dodatków i kopia kupionych usług w rezerwacji                    | Zmiana ceny, treści i aktywności pakietu        |
| F-08 | API hotelu          | Oferta, dostępność, tworzenie, odczyt, zmiana, anulowanie i plan pobytu | Testy API, OpenAPI i przykłady żądań            |
| F-09 | Konfiguracja        | Tryb demo/real, adresy, limity czasu, klucze i ich uprawnienia          | Zmiana ustawień w działającej aplikacji         |
| F-10 | Historia operacji   | Autor, czas, obiekt i opis zmiany                                       | Odczyt historii i brak sekretów w odpowiedziach |
| F-11 | Usługi A/B          | Katalog, terminy, zamówienie, odświeżenie i anulowanie                  | Tryb demo i lokalny serwer HTTP                 |
| F-12 | Voucher D           | Sprawdzenie hotelowej części i zgłoszenie jej wykonania                 | Odmowa, ważność, awaria i ponowienie            |
| F-13 | Pulpit recepcji     | Filtrowanie pobytów, przyjazdy, wyjazdy i plan usług                    | API oraz testy w przeglądarce                   |

Przypadki testowe T-01–T-26 i miejsca, w których są zautomatyzowane, opisuje [pokrycie planu testów](testy-i-odbior.md#pokrycie-planu-testów-t-01t-26). Próby wykonywane ręcznie są w [testach ręcznych](testy-manualne.md).

## Zadania w Jirze

| Historyjka                                                  | Wymagania                    |
| ----------------------------------------------------------- | ---------------------------- |
| [KAN-1](https://zielinskiadis.atlassian.net/browse/KAN-1)   | F-01                         |
| [KAN-7](https://zielinskiadis.atlassian.net/browse/KAN-7)   | F-02, F-03                   |
| [KAN-9](https://zielinskiadis.atlassian.net/browse/KAN-9)   | F-04, F-05                   |
| [KAN-11](https://zielinskiadis.atlassian.net/browse/KAN-11) | F-06, F-07, F-09, F-10, F-13 |
| [KAN-13](https://zielinskiadis.atlassian.net/browse/KAN-13) | F-08, F-11, F-12             |

Kryteria akceptacji każdej historyjki są w jej opisie w Jirze. Nie kopiujemy ich tutaj, żeby nie utrzymywać dwóch wersji.

## Najważniejsze zasady pobytu

- Przyjazd poprzedza wyjazd. Nowej rezerwacji nie można zaczynać w przeszłości. Pobyt trwa od 1 do 90 nocy (ustawienie `MAX_STAY_NIGHTS`).
- Liczba gości musi mieścić się w pokoju i zgadzać się z listą imion i nazwisk.
- Dzień wyjazdu nie zajmuje kolejnej nocy. Następny gość może przyjechać tego samego dnia.
- Termin zajmują pobyty potwierdzone, trwające i zakończone. Anulowany pobyt zwalnia pokój.
- Cena to liczba nocy razy cena pokoju plus jednorazowa cena pakietu. Kwoty zapisujemy w groszach.
- Rezerwacja przechowuje cenę i kopię usług pakietu z chwili zapisu. Późniejsza zmiana oferty ich nie zmienia.
- Klient i partner mogą zmienić lub anulować własny potwierdzony pobyt przed dniem przyjazdu. Od dnia przyjazdu robi to recepcja.
- Zmiana terminu wymaga wolnego pokoju, aktualnej wersji rezerwacji i zaakceptowania nowej ceny. Aktywne lub niepewne usługi A/B trzeba wcześniej anulować albo wyjaśnić.
- Pokój lub pakiet wycofany z oferty nie przyjmuje nowych rezerwacji. Istniejący pobyt pozostaje ważny i nadal można zmienić jego termin.
- Dozwolone przejścia stanów: potwierdzony → anulowany, potwierdzony → zameldowany, zameldowany → zakończony. Stanu nie da się ustawić dowolnie przez formularz ani przez API.
- Zameldować gości można najwcześniej w dniu przyjazdu.
- Dane kontaktowe gościa recepcja może poprawić zawsze przed zakończeniem pobytu. Imienia i nazwiska gościa, który ma trwającą usługę A/B, nie da się zmienić bez anulowania tej usługi, bo zostało już wysłane partnerowi.
- Terminy A/B muszą mieścić się w pobycie i nie mogą nakładać się dla tej samej osoby. Godziny liczymy w strefie Europe/Warsaw; domyślnie pobyt trwa od 14:00 w dniu przyjazdu do 11:00 w dniu wyjazdu.
- Anulowanie pobytu kończy się dopiero po potwierdzonym anulowaniu usług A/B. Przy częściowym błędzie pobyt pozostaje aktywny.
- Voucher D jest sprawdzany przy tworzeniu pobytu, przed zameldowaniem, przed zmianą dat i przed anulowaniem. Po wymeldowaniu hotel potwierdza w D tylko własną część.

## Reguły bezpieczeństwa sprawdzane osobno

- Rejestracja i edycja profilu nie pozwalają nadać sobie roli personelu. Nie można zablokować ani zdegradować ostatniego aktywnego administratora.
- Logowanie wymienia sesję, a reset i zmiana hasła unieważniają pozostałe sesje. Hasło tymczasowe wymaga zmiany przed wykonaniem innych operacji.
- Zmiana adresu e-mail w profilu wymaga podania obecnego hasła.
- Sesja użytkownika i klucz API to dwa oddzielne sposoby dostępu. Nie można połączyć ich uprawnień w jednym żądaniu.
- Odpowiedzi i historia nie ujawniają haseł ani kluczy. Odesłanie maski sekretu nie nadpisuje zapisanej wartości.
- Blokada zapisu SQLite powstaje przed sprawdzeniem zajętości. Jeśli baza pozostaje zajęta, błąd 503 nie zostawia częściowej rezerwacji ani rekordu ponowienia.
- Połączenia z partnerami sprawdzają host i adres sieciowy. Nie podążają za przekierowaniami, a wynik DNS jest przypięty do połączenia.
- Operacje usług tej samej rezerwacji nie wykonują się równolegle. Opóźniona odpowiedź nie może cofnąć anulowania ani zakończenia.

Kto może wykonać którą operację API, opisuje [projekt endpointów](api/projekt-endpointow.md).

## Wymagania pozafunkcjonalne

| Obszar         | Wymaganie                                                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Bezpieczeństwo | Hasła haszowane (scrypt), sesja po stronie serwera w cookie `HttpOnly`, token CSRF przy zmianach, klucze API jako skróty, sekrety szyfrowane |
| Uprawnienia    | Serwer sprawdza rolę, zakres klucza i właściciela zasobu przy każdym żądaniu; nieznane pola są odrzucane                                     |
| Spójność       | Sprawdzenie dostępności i zapis rezerwacji w jednej transakcji; równoległe żądania nie tworzą dwóch pobytów w jednym pokoju                  |
| Ponawianie     | Utworzenie rezerwacji i operacje u partnerów mają stały identyfikator; ponowienie nie tworzy duplikatu                                       |
| Konfiguracja   | Oferta, konta, godziny pobytu i połączenia z A/B/D zmienia się w panelu, bez przebudowy aplikacji                                            |
| Interfejs      | Działa na laptopie i telefonie (sprawdzane przy szerokości 390 px), ma etykiety pól i obsługę klawiatury; błąd nie kasuje wpisanych danych   |
| Uruchomienie   | Node.js 24, jedna komenda przygotowania (`npm run setup`), baza SQLite w jednym pliku, bez osobnego serwera bazy                             |
| Skala          | Jeden hotel i jedna instancja serwera; brak klastra i wysokiej dostępności                                                                   |
| Dane           | Wyłącznie dane fikcyjne; żadnych prawdziwych płatności ani danych gości                                                                      |
| Ograniczenia   | Limit żądań na adres IP (domyślnie 300 na minutę, 15 na minutę dla logowania i rejestracji), treść żądania do 64 KB                          |

## Zmiany względem pierwszego planu

1. Zamiast Prisma używamy wbudowanego modułu `node:sqlite`. Plik bazy wskazuje `DATABASE_PATH`; generator i migracje Prisma nie są potrzebne. Powód: początek transakcji i kolejność sprawdzeń widać wprost w kodzie. Opis jest w [budowie aplikacji](budowa-aplikacji.md#rezerwowanie-pokoju).
2. Aplikacja działa w jednym procesie serwera. Test dwóch procesów sprawdza blokadę SQLite, ale blokady dłuższych operacji integracyjnych są lokalne dla jednej instancji.
3. Przy zmianie liczby osób można podać nową listę `guestNames`. Personel ma też osobną operację do edycji gości i kontaktu. Właściciela, status i źródło finansowania zawsze ustala serwer.
4. Termin pobytu z voucherem można zmienić po ponownym sprawdzeniu ważności w D. Odmowa, awaria lub konflikt wersji nie zmieniają zapisanych dat. Zwroty i rozliczenia pozostałych grup są poza zakresem C.
5. Stan `unknown` oznacza brak rozstrzygnięcia u partnera. Wymaga odświeżenia istniejącej operacji, a nie złożenia nowego zamówienia.
6. Zadania i błędy prowadzimy w Jirze, a nie w GitHub Issues, jak zakładał notebook.

## Ustalenia z odbiorcą

Odbiorcą projektu jest prowadzący przedmiot, a potrzeby użytkownika reprezentuje w zespole Piotr Świadek. Ustalenia z grupami A, B i D zapisujemy w [kontraktach](api/integracje.md#co-musimy-ustalić); żadne z nich nie jest jeszcze potwierdzone przez drugą stronę.

## Stan weryfikacji

Testy lokalne używają trybu demo oraz serwerów HTTP uruchamianych w testach; każda próba z [testów ręcznych](testy-manualne.md) ma odpowiadający jej test automatyczny. Wspólny scenariusz na aplikacjach A i B pozostaje do wykonania po uzgodnieniu adresów, kluczy i identyfikatorów ofert. Projektu D w grupie nie ma, więc vouchery sprawdzamy w trybie demo.
