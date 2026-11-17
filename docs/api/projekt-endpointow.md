# Projekt endpointów API i kontroli dostępu

Przeznaczenie: podział operacji API na grupy, role i konta techniczne, macierz uprawnień oraz uzasadnienie decyzji (zadanie 2 z przedmiotu Projekt Zespołowy). Opiekunowie: Adrian Zieliński, Andrii Yaremko; uzgodnienie danych: Wiktoria Sobejko.

Szczegóły każdej operacji (parametry, odpowiedzi, błędy) są w [kartach endpointów](karty-endpointow.md), a pełny kontrakt w [openapi.yaml](../openapi.yaml). Instrukcję wywołań dla innych grup zawiera [API hotelu](README.md).

## Zakres systemu

Aurora Hotels to aplikacja jednego hotelu (projekt C). Klient rezerwuje w niej pokój, recepcja prowadzi pobyt gości, a administrator zarządza ofertą, kontami i połączeniami z pozostałymi projektami: masażami (A), zajęciami fitness (B) i voucherami (D). System pracuje wyłącznie na danych fikcyjnych i nie obsługuje płatności.

API ma trzech odbiorców:

- **aplikacja przeglądarkowa** hotelu, z której korzystają gość bez konta, klient, recepcjonista i administrator;
- **serwer partnera**, przede wszystkim projektu D, który sprawdza ofertę i rezerwuje pobyty dla posiadaczy voucherów;
- **usługi techniczne** samego hotelu: harmonogram, kopia zapasowa i monitoring.

Najważniejsze funkcje udostępniane przez API:

- oferta pokoi i pakietów oraz dostępność z wyceną;
- konta: rejestracja, logowanie, profil i hasło;
- rezerwacje: utworzenie, lista, szczegóły, zmiana terminu, anulowanie i plan pobytu;
- recepcja: zameldowanie, wymeldowanie, lista gości, zamawianie masaży i treningów u A i B, obsługa vouchera D;
- administracja: pokoje, pakiety, konta, ustawienia hotelu, połączenia z partnerami, klucze API i historia operacji;
- utrzymanie: gotowość serwera, operacje do wyjaśnienia, porządkowanie bazy i kopia zapasowa.

Katalog obejmuje 54 operacje: 7 publicznych, 42 zewnętrzne z tokenem i 5 wewnętrznych. Operacje publiczne i zewnętrzne z tokenem są zaimplementowane i opisane w pliku `docs/openapi.yaml`; zadanie wymagało projektu, ale ta część powstała wcześniej, więc opisujemy rzeczywiste zachowanie aplikacji. Operacje wewnętrzne są projektem i nie zostały jeszcze zaimplementowane.

## Role i konta techniczne

| Rola lub usługa            | Typ tożsamości                       | Zakres dostępu i ograniczenia                                                                                                                                                                                                                                                    |
| -------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gość                       | brak tożsamości (żądanie bez tokenu) | Oferta, dostępność i wycena, rejestracja, logowanie. Nie widzi żadnych rezerwacji ani danych innych osób.                                                                                                                                                                        |
| Klient                     | użytkownik (sesja)                   | Własny profil i hasło. Własne rezerwacje: utworzenie, odczyt, plan pobytu; zmiana i anulowanie tylko przed dniem przyjazdu. Nie ma dostępu do rezerwacji innych osób, recepcji, administracji ani voucherów.                                                                     |
| Recepcjonista              | użytkownik (sesja)                   | Wszystkie rezerwacje hotelu: utworzenie dla gościa, odczyt, zmiana, anulowanie, zameldowanie, wymeldowanie, lista gości, usługi A/B i voucher D. Nie ma dostępu do oferty, kont, ustawień, połączeń, kluczy API ani historii operacji.                                           |
| Administrator              | użytkownik (sesja)                   | To samo co recepcjonista oraz cała administracja. Nie może zablokować ani zdegradować ostatniego aktywnego administratora. Nie widzi haseł, wartości kluczy ani sekretów partnerów (tylko maski). Nie ma dostępu do operacji wewnętrznych. Historii operacji nie da się zmienić. |
| Partner API, np. projekt D | usługa zewnętrzna (klucz API)        | Wyłącznie operacje objęte zakresami klucza i wyłącznie rezerwacje utworzone kluczami tego partnera. Voucher może przekazać tylko partner oznaczony `D`. Nie ma dostępu do kont, recepcji ani administracji.                                                                      |
| Harmonogram                | usługa wewnętrzna (token usługi)     | W-03 i W-04: wyjaśnianie niepewnych operacji i porządkowanie bazy. Nie tworzy nowych zamówień i nie czyta danych gości.                                                                                                                                                          |
| Kopia zapasowa             | usługa wewnętrzna (token usługi)     | W-05: zlecenie kopii bazy. Nie może kopii pobrać, odtworzyć ani usunąć.                                                                                                                                                                                                          |
| Monitoring                 | usługa wewnętrzna (token usługi)     | W-01 i W-02: stan techniczny i lista operacji do wyjaśnienia, bez danych gości. Publiczne ZP-01 wywołuje bez tokenu.                                                                                                                                                             |

Rolę użytkownika serwer odczytuje z bazy przy każdym żądaniu; nie da się jej przesłać w żądaniu. Konto klienta powstaje przez rejestrację, konta recepcjonisty i administratora tworzy wyłącznie administrator.

Zakresy klucza partnera:

| Zakres                | Na co pozwala                               | Operacje                                        |
| --------------------- | ------------------------------------------- | ----------------------------------------------- |
| `catalog:read`        | Odczyt pokoi, pakietów i dostępności        | ZP-05, ZP-06, ZP-07 (gdy żądanie zawiera klucz) |
| `reservations:create` | Utworzenie rezerwacji                       | ZT-05                                           |
| `reservations:read`   | Odczyt własnych rezerwacji i planu pobytu   | ZT-06, ZT-07, ZT-10                             |
| `reservations:update` | Zmiana własnej potwierdzonej rezerwacji     | ZT-08                                           |
| `reservations:cancel` | Anulowanie własnej potwierdzonej rezerwacji | ZT-09                                           |

Zakresy tokenów usług wewnętrznych (projekt):

| Konto techniczne | Zakresy                                   | Operacje   |
| ---------------- | ----------------------------------------- | ---------- |
| Harmonogram      | `operations:reconcile`, `maintenance:run` | W-03, W-04 |
| Kopia zapasowa   | `backups:create`                          | W-05       |
| Monitoring       | `health:read`, `operations:read`          | W-01, W-02 |

Hotel jest też klientem API pozostałych grup. W każdym z tych systemów potrzebuje konta technicznego z najmniejszym możliwym zakresem: u A i B odczyt oferty i terminów oraz utworzenie, odczyt i anulowanie własnych zamówień; u D sprawdzenie i zgłoszenie wykonania wyłącznie hotelowej części vouchera. Sekrety tych kont są zaszyfrowane w bazie hotelu i nie trafiają do przeglądarki. Są to endpointy innych systemów, dlatego nie należą do naszego katalogu; proponowany kontrakt jest w pliku `docs/api/integracje.md`.

## Podział na grupy

**Zewnętrzne bez tokenu (ZP)** to operacje potrzebne, zanim powstanie jakakolwiek tożsamość: przegląd oferty i cen, rejestracja i logowanie, a także prosty sygnał, że serwer działa. Żadna z nich nie zwraca danych osobowych ani informacji o tym, kto zajmuje pokój.

**Zewnętrzne z tokenem (ZT)** to wszystko, z czego korzysta zalogowany użytkownik w przeglądarce, oraz operacje udostępnione serwerowi partnera. Zgodnie z poleceniem endpoint używany przez aplikację przeglądarkową zaliczamy do zewnętrznych, także wtedy, gdy korzysta z niego wyłącznie personel. Tokenem użytkownika jest sesja w cookie, a tokenem partnera klucz API.

**Wewnętrzne z tokenem (W)** służą usługom technicznym hotelu. Aplikacja jest dziś jednym procesem, więc nie ma jeszcze komunikacji między usługami: porządkowanie bazy wykonuje licznik wewnątrz serwera, a kopię bazy polecenie `npm run backup`. Projektujemy te operacje po to, żeby harmonogram, kopia i monitoring mogły działać jako osobne usługi bez konta administratora i bez dostępu do danych gości. Mają osobny prefiks `/internal/v1`, którego serwer pośredniczący nie wystawia do Internetu, i przyjmują wyłącznie tokeny usług.

Projekty A, B i D są dla nas partnerami integracyjnymi, a nie komponentami naszego systemu. Dlatego operacje, z których korzysta serwer D, należą do grupy ZT, a wywołania wychodzące z hotelu do A, B i D nie są częścią tego katalogu.

## Katalog endpointów

Każdy wiersz to jedna operacja. Identyfikator prowadzi do karty operacji.

### Wewnętrzne wymagające tokenu (W)

Projekt; operacje nie są jeszcze zaimplementowane.

| ID                                                                             | Metoda HTTP i ścieżka                                  | Funkcja i odbiorca                                                                                                                           |
| ------------------------------------------------------------------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [W-01](karty-endpointow.md#w-01--sprawdź-gotowość-serwera-i-połączeń)          | `GET /internal/v1/health/ready`                        | Szczegółowa gotowość: baza danych oraz stan połączeń z A, B i D. Odbiorca: usługa monitoringu.                                               |
| [W-02](karty-endpointow.md#w-02--pokaż-operacje-partnerów-do-wyjaśnienia)      | `GET /internal/v1/operations/pending`                  | Lista operacji A/B/D o niepewnym wyniku, żeby monitoring mógł zgłosić je recepcji. Odbiorca: usługa monitoringu.                             |
| [W-03](karty-endpointow.md#w-03--ustal-wynik-niepewnej-operacji)               | `POST /internal/v1/operations/{operationId}/reconcile` | Ponowne zapytanie partnera o wynik jednej niepewnej operacji, tak jak robi to recepcja przyciskiem „Odśwież”. Odbiorca: usługa harmonogramu. |
| [W-04](karty-endpointow.md#w-04--usuń-wygasłe-sesje-i-stare-klucze-ponowienia) | `POST /internal/v1/maintenance/cleanup`                | Porządkowanie bazy: wygasłe sesje i klucze ponowienia starsze niż 7 dni. Odbiorca: usługa harmonogramu.                                      |
| [W-05](karty-endpointow.md#w-05--utwórz-spójną-kopię-bazy)                     | `POST /internal/v1/backups`                            | Kopia bazy SQLite wykonana mechanizmem kopii zapasowej. Odbiorca: usługa kopii zapasowych.                                                   |

### Zewnętrzne wymagające tokenu (ZT)

| ID                                                                                             | Metoda HTTP i ścieżka                                                 | Funkcja i odbiorca                                                                                                                       |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [ZT-01](karty-endpointow.md#zt-01--wyloguj-się)                                                | `POST /api/v1/auth/logout`                                            | Zakończenie sesji użytkownika. Odbiorca: zalogowany użytkownik w przeglądarce.                                                           |
| [ZT-02](karty-endpointow.md#zt-02--pobierz-swój-profil)                                        | `GET /api/v1/me`                                                      | Odczyt własnego profilu i roli. Odbiorca: zalogowany użytkownik; interfejs używa go do pokazania właściwego menu.                        |
| [ZT-03](karty-endpointow.md#zt-03--zmień-dane-profilu)                                         | `PATCH /api/v1/me`                                                    | Zmiana własnego imienia i nazwiska, telefonu lub adresu e-mail. Odbiorca: zalogowany użytkownik.                                         |
| [ZT-04](karty-endpointow.md#zt-04--zmień-hasło-i-zakończ-poprzednie-sesje)                     | `POST /api/v1/me/change-password`                                     | Zmiana własnego hasła; kończy pozostałe sesje tego konta. Odbiorca: zalogowany użytkownik, także z hasłem tymczasowym.                   |
| [ZT-05](karty-endpointow.md#zt-05--zarezerwuj-pobyt)                                           | `POST /api/v1/reservations`                                           | Utworzenie rezerwacji pobytu. Odbiorca: klient w przeglądarce, recepcja dla gościa bez konta, serwer partnera D dla posiadacza vouchera. |
| [ZT-06](karty-endpointow.md#zt-06--pokaż-rezerwacje)                                           | `GET /api/v1/reservations`                                            | Lista rezerwacji z filtrowaniem. Odbiorca: klient (moje rezerwacje), recepcja (pulpit przyjazdów i wyjazdów), serwer partnera.           |
| [ZT-07](karty-endpointow.md#zt-07--pobierz-szczegóły-rezerwacji)                               | `GET /api/v1/reservations/{id}`                                       | Szczegóły jednej rezerwacji. Odbiorca: właściciel rezerwacji, recepcja, administrator.                                                   |
| [ZT-08](karty-endpointow.md#zt-08--zmień-daty-i-liczbę-gości)                                  | `PATCH /api/v1/reservations/{id}`                                     | Zmiana dat i liczby gości. Odbiorca: właściciel rezerwacji przed dniem przyjazdu, recepcja i administrator także później.                |
| [ZT-09](karty-endpointow.md#zt-09--anuluj-rezerwację-pobytu)                                   | `POST /api/v1/reservations/{id}/cancel`                               | Anulowanie rezerwacji; najpierw anuluje usługi A/B. Odbiorca: właściciel rezerwacji przed dniem przyjazdu, recepcja i administrator.     |
| [ZT-10](karty-endpointow.md#zt-10--pokaż-usługi-w-planie-pobytu)                               | `GET /api/v1/reservations/{id}/plan`                                  | Plan pobytu: usługi pakietu, ich zamówienia u A/B i stan zgłoszenia do D. Odbiorca: właściciel rezerwacji, recepcja, administrator.      |
| [ZT-11](karty-endpointow.md#zt-11--zamelduj-gościa)                                            | `POST /api/v1/reservations/{id}/check-in`                             | Zameldowanie gości. Odbiorca: recepcja.                                                                                                  |
| [ZT-12](karty-endpointow.md#zt-12--zakończ-pobyt-i-potwierdź-nocleg-w-d)                       | `POST /api/v1/reservations/{id}/check-out`                            | Wymeldowanie gości i zgłoszenie do D wykonania noclegu. Odbiorca: recepcja.                                                              |
| [ZT-13](karty-endpointow.md#zt-13--popraw-listę-gości-i-dane-kontaktowe)                       | `PATCH /api/v1/reservations/{id}/guests`                              | Poprawa listy gości i danych kontaktowych. Odbiorca: recepcja.                                                                           |
| [ZT-14](karty-endpointow.md#zt-14--zmień-przypisanie-usługi-notatkę-lub-stan-usługi-hotelowej) | `PATCH /api/v1/reservations/{id}/items/{itemId}`                      | Zmiana przypisania usługi pakietu do gościa, notatki albo stanu usługi hotelowej. Odbiorca: recepcja.                                    |
| [ZT-15](karty-endpointow.md#zt-15--sprawdź-dostępność-masażu-lub-treningu)                     | `GET /api/v1/reservations/{id}/partner-availability`                  | Wolne terminy masażu (A) lub treningu (B) dla usługi z pakietu. Odbiorca: recepcja.                                                      |
| [ZT-16](karty-endpointow.md#zt-16--zarezerwuj-usługę-z-pakietu-u-partnera)                     | `POST /api/v1/reservations/{id}/partner-bookings`                     | Zamówienie usługi z pakietu u partnera A lub B. Odbiorca: recepcja.                                                                      |
| [ZT-17](karty-endpointow.md#zt-17--sprawdź-wynik-rezerwacji-u-partnera)                        | `POST /api/v1/reservations/{id}/partner-bookings/{bookingId}/refresh` | Sprawdzenie u partnera wyniku wcześniejszego zamówienia. Odbiorca: recepcja.                                                             |
| [ZT-18](karty-endpointow.md#zt-18--anuluj-usługę-ab)                                           | `POST /api/v1/reservations/{id}/partner-bookings/{bookingId}/cancel`  | Anulowanie usługi A/B u partnera. Odbiorca: recepcja.                                                                                    |
| [ZT-19](karty-endpointow.md#zt-19--sprawdź-voucher-pobytu-w-d)                                 | `POST /api/v1/reservations/{id}/voucher/check`                        | Sprawdzenie w D hotelowej części vouchera przypisanego do pobytu. Odbiorca: recepcja.                                                    |
| [ZT-20](karty-endpointow.md#zt-20--potwierdź-wykonanie-noclegu-w-d)                            | `POST /api/v1/reservations/{id}/voucher/confirm-completion`           | Ponowienie zgłoszenia do D, że nocleg został wykonany. Odbiorca: recepcja.                                                               |
| [ZT-21](karty-endpointow.md#zt-21--pokaż-wszystkie-pokoje-także-wycofane)                      | `GET /api/v1/admin/rooms`                                             | Lista wszystkich pokoi, także wycofanych z oferty. Odbiorca: administrator.                                                              |
| [ZT-22](karty-endpointow.md#zt-22--dodaj-pokój)                                                | `POST /api/v1/admin/rooms`                                            | Dodanie pokoju. Odbiorca: administrator.                                                                                                 |
| [ZT-23](karty-endpointow.md#zt-23--zmień-dane-pokoju)                                          | `PATCH /api/v1/admin/rooms/{id}`                                      | Zmiana danych pokoju albo wycofanie go z oferty. Odbiorca: administrator.                                                                |
| [ZT-24](karty-endpointow.md#zt-24--pokaż-wszystkie-pakiety-także-wycofane)                     | `GET /api/v1/admin/packages`                                          | Lista wszystkich pakietów, także wycofanych. Odbiorca: administrator.                                                                    |
| [ZT-25](karty-endpointow.md#zt-25--dodaj-pakiet)                                               | `POST /api/v1/admin/packages`                                         | Dodanie pakietu z listą usług. Odbiorca: administrator.                                                                                  |
| [ZT-26](karty-endpointow.md#zt-26--zmień-pakiet)                                               | `PATCH /api/v1/admin/packages/{id}`                                   | Zmiana pakietu albo wycofanie go z oferty. Odbiorca: administrator.                                                                      |
| [ZT-27](karty-endpointow.md#zt-27--pokaż-konta-użytkowników)                                   | `GET /api/v1/admin/users`                                             | Lista kont użytkowników. Odbiorca: administrator.                                                                                        |
| [ZT-28](karty-endpointow.md#zt-28--dodaj-konto-użytkownika)                                    | `POST /api/v1/admin/users`                                            | Utworzenie konta, także recepcjonisty lub administratora. Odbiorca: administrator.                                                       |
| [ZT-29](karty-endpointow.md#zt-29--zmień-konto-lub-uprawnienia-użytkownika)                    | `PATCH /api/v1/admin/users/{id}`                                      | Zmiana danych, roli albo blokada konta. Odbiorca: administrator.                                                                         |
| [ZT-30](karty-endpointow.md#zt-30--ustaw-hasło-tymczasowe)                                     | `POST /api/v1/admin/users/{id}/reset-password`                        | Ustawienie hasła tymczasowego. Odbiorca: administrator.                                                                                  |
| [ZT-31](karty-endpointow.md#zt-31--pobierz-ustawienia-hotelu)                                  | `GET /api/v1/admin/hotel-settings`                                    | Odczyt nazwy hotelu i godzin pobytu. Odbiorca: administrator.                                                                            |
| [ZT-32](karty-endpointow.md#zt-32--zmień-nazwę-hotelu-i-godziny-pobytu)                        | `PATCH /api/v1/admin/hotel-settings`                                  | Zmiana nazwy hotelu i godzin pobytu. Odbiorca: administrator.                                                                            |
| [ZT-33](karty-endpointow.md#zt-33--pokaż-historię-operacji)                                    | `GET /api/v1/admin/audit-events`                                      | Historia operacji z filtrowaniem. Odbiorca: administrator.                                                                               |
| [ZT-34](karty-endpointow.md#zt-34--pokaż-połączenia-z-a-b-i-d)                                 | `GET /api/v1/admin/integrations`                                      | Lista połączeń z A, B i D. Odbiorca: administrator.                                                                                      |
| [ZT-35](karty-endpointow.md#zt-35--pobierz-ustawienia-połączenia-z-partnerem)                  | `GET /api/v1/admin/integrations/{partner}`                            | Ustawienia jednego połączenia. Odbiorca: administrator.                                                                                  |
| [ZT-36](karty-endpointow.md#zt-36--zmień-ustawienia-połączenia-z-partnerem)                    | `PATCH /api/v1/admin/integrations/{partner}`                          | Zmiana trybu, adresu, limitu czasu, nagłówka lub sekretu połączenia. Odbiorca: administrator.                                            |
| [ZT-37](karty-endpointow.md#zt-37--sprawdź-połączenie-z-partnerem)                             | `POST /api/v1/admin/integrations/{partner}/test`                      | Test połączenia z partnerem; zapisuje wynik. Odbiorca: administrator.                                                                    |
| [ZT-38](karty-endpointow.md#zt-38--pobierz-ofertę-masaży-lub-treningów)                        | `GET /api/v1/admin/integrations/{partner}/catalog`                    | Oferta masaży (A) lub treningów (B) pobrana od partnera, potrzebna przy tworzeniu pakietu. Odbiorca: administrator.                      |
| [ZT-39](karty-endpointow.md#zt-39--pokaż-klucze-dostępu-do-api-hotelu)                         | `GET /api/v1/admin/api-keys`                                          | Lista kluczy dostępu do API hotelu. Odbiorca: administrator.                                                                             |
| [ZT-40](karty-endpointow.md#zt-40--utwórz-klucz-dla-partnera)                                  | `POST /api/v1/admin/api-keys`                                         | Utworzenie klucza dla partnera z wybranymi zakresami. Odbiorca: administrator.                                                           |
| [ZT-41](karty-endpointow.md#zt-41--zmień-uprawnienia-klucza-lub-wyłącz-go)                     | `PATCH /api/v1/admin/api-keys/{id}`                                   | Zmiana nazwy lub zakresów klucza albo jego wyłączenie. Odbiorca: administrator.                                                          |
| [ZT-42](karty-endpointow.md#zt-42--dodaj-voucher-testowy)                                      | `POST /api/v1/admin/demo-vouchers`                                    | Dodanie vouchera testowego do symulatora D. Odbiorca: administrator podczas pokazu.                                                      |

### Zewnętrzne bez tokenu (ZP)

| ID                                                              | Metoda HTTP i ścieżka        | Funkcja i odbiorca                                                                                                        |
| --------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [ZP-01](karty-endpointow.md#zp-01--sprawdź-czy-serwer-działa)   | `GET /health`                | Sprawdzenie, czy serwer działa. Odbiorca: Docker (healthcheck), monitoring, osoba uruchamiająca aplikację.                |
| [ZP-02](karty-endpointow.md#zp-02--pobierz-token-csrf)          | `GET /api/v1/auth/csrf`      | Utworzenie anonimowej sesji i pobranie tokenu CSRF przed logowaniem lub rejestracją. Odbiorca: aplikacja przeglądarkowa.  |
| [ZP-03](karty-endpointow.md#zp-03--załóż-konto-klienta)         | `POST /api/v1/auth/register` | Założenie konta klienta. Odbiorca: gość korzystający z aplikacji przeglądarkowej.                                         |
| [ZP-04](karty-endpointow.md#zp-04--zaloguj-się)                 | `POST /api/v1/auth/login`    | Zalogowanie użytkownika i rozpoczęcie sesji. Odbiorca: klient, recepcjonista i administrator w aplikacji przeglądarkowej. |
| [ZP-05](karty-endpointow.md#zp-05--pokaż-pokoje-w-ofercie)      | `GET /api/v1/rooms`          | Lista pokoi w ofercie. Odbiorca: gość i klient w przeglądarce oraz serwer partnera (D).                                   |
| [ZP-06](karty-endpointow.md#zp-06--pokaż-pakiety-w-ofercie)     | `GET /api/v1/packages`       | Lista pakietów w ofercie. Odbiorca: gość i klient w przeglądarce oraz serwer partnera (D).                                |
| [ZP-07](karty-endpointow.md#zp-07--sprawdź-wolne-pokoje-i-cenę) | `GET /api/v1/availability`   | Wolne pokoje i wycena dla podanych dat i liczby gości. Odbiorca: gość i klient w przeglądarce oraz serwer partnera (D).   |

Poza katalogiem pozostają dwa adresy z dokumentacją, dostępne bez tokenu: `/api/docs` (interaktywny opis) i `/api/openapi.yaml` (plik kontraktu). Nie są operacjami na danych hotelu.

## Macierz uprawnień

- **B** — brak dostępu;
- **D** — dostęp bez dodatkowego ograniczenia zasobu (nie zwalnia z uwierzytelnienia);
- **WŁ** — wyłącznie własne dane: dla użytkownika jego konto i rezerwacje utworzone z tego konta, dla partnera rezerwacje utworzone kluczami z jego oznaczeniem;
- **O1–O5** — dostęp z ograniczeniem opisanym niżej;
- **—** — nie dotyczy: operacja nie ma zastosowania dla tej tożsamości i nie jest to odmowa dostępu.

| ID operacji | Gość | Klient | Recepcjonista | Administrator | Partner API | Harmonogram | Kopia zapasowa | Monitoring |
| ----------- | ---- | ------ | ------------- | ------------- | ----------- | ----------- | -------------- | ---------- |
| W-01        | B    | B      | B             | B             | B           | B           | B              | O5         |
| W-02        | B    | B      | B             | B             | B           | B           | B              | O5         |
| W-03        | B    | B      | B             | B             | B           | O5          | B              | B          |
| W-04        | B    | B      | B             | B             | B           | O5          | B              | B          |
| W-05        | B    | B      | B             | B             | B           | B           | O5             | B          |
| ZT-01       | —    | WŁ     | WŁ            | WŁ            | —           | B           | B              | B          |
| ZT-02       | B    | WŁ     | WŁ            | WŁ            | B           | B           | B              | B          |
| ZT-03       | B    | WŁ     | WŁ            | WŁ            | B           | B           | B              | B          |
| ZT-04       | B    | WŁ     | WŁ            | WŁ            | B           | B           | B              | B          |
| ZT-05       | B    | WŁ, O3 | D             | D             | O1, O3      | B           | B              | B          |
| ZT-06       | B    | WŁ     | D             | D             | WŁ, O1      | B           | B              | B          |
| ZT-07       | B    | WŁ     | D             | D             | WŁ, O1      | B           | B              | B          |
| ZT-08       | B    | WŁ, O2 | D             | D             | WŁ, O1, O2  | B           | B              | B          |
| ZT-09       | B    | WŁ, O2 | D             | D             | WŁ, O1, O2  | B           | B              | B          |
| ZT-10       | B    | WŁ     | D             | D             | WŁ, O1      | B           | B              | B          |
| ZT-11       | B    | B      | D             | D             | B           | B           | B              | B          |
| ZT-12       | B    | B      | D             | D             | B           | B           | B              | B          |
| ZT-13       | B    | B      | D             | D             | B           | B           | B              | B          |
| ZT-14       | B    | B      | D             | D             | B           | B           | B              | B          |
| ZT-15       | B    | B      | D             | D             | B           | B           | B              | B          |
| ZT-16       | B    | B      | D             | D             | B           | B           | B              | B          |
| ZT-17       | B    | B      | D             | D             | B           | B           | B              | B          |
| ZT-18       | B    | B      | D             | D             | B           | B           | B              | B          |
| ZT-19       | B    | B      | D             | D             | B           | B           | B              | B          |
| ZT-20       | B    | B      | D             | D             | B           | B           | B              | B          |
| ZT-21       | B    | B      | B             | D             | B           | B           | B              | B          |
| ZT-22       | B    | B      | B             | D             | B           | B           | B              | B          |
| ZT-23       | B    | B      | B             | D             | B           | B           | B              | B          |
| ZT-24       | B    | B      | B             | D             | B           | B           | B              | B          |
| ZT-25       | B    | B      | B             | D             | B           | B           | B              | B          |
| ZT-26       | B    | B      | B             | D             | B           | B           | B              | B          |
| ZT-27       | B    | B      | B             | D             | B           | B           | B              | B          |
| ZT-28       | B    | B      | B             | D             | B           | B           | B              | B          |
| ZT-29       | B    | B      | B             | O4            | B           | B           | B              | B          |
| ZT-30       | B    | B      | B             | D             | B           | B           | B              | B          |
| ZT-31       | B    | B      | B             | D             | B           | B           | B              | B          |
| ZT-32       | B    | B      | B             | D             | B           | B           | B              | B          |
| ZT-33       | B    | B      | B             | D             | B           | B           | B              | B          |
| ZT-34       | B    | B      | B             | D             | B           | B           | B              | B          |
| ZT-35       | B    | B      | B             | D             | B           | B           | B              | B          |
| ZT-36       | B    | B      | B             | D             | B           | B           | B              | B          |
| ZT-37       | B    | B      | B             | D             | B           | B           | B              | B          |
| ZT-38       | B    | B      | B             | D             | B           | B           | B              | B          |
| ZT-39       | B    | B      | B             | D             | B           | B           | B              | B          |
| ZT-40       | B    | B      | B             | D             | B           | B           | B              | B          |
| ZT-41       | B    | B      | B             | D             | B           | B           | B              | B          |
| ZT-42       | B    | B      | B             | D             | B           | B           | B              | B          |
| ZP-01       | D    | D      | D             | D             | D           | D           | D              | D          |
| ZP-02       | D    | D      | D             | D             | —           | —           | —              | —          |
| ZP-03       | D    | D      | D             | D             | —           | —           | —              | —          |
| ZP-04       | D    | D      | D             | D             | —           | —           | —              | —          |
| ZP-05       | D    | D      | D             | D             | O1          | —           | —              | —          |
| ZP-06       | D    | D      | D             | D             | O1          | —           | —              | —          |
| ZP-07       | D    | D      | D             | D             | O1          | —           | —              | —          |

Opis ograniczeń:

- **O1** — klucz partnera musi mieć zakres wymagany przez operację: `catalog:read` (ZP-05–ZP-07), `reservations:create` (ZT-05), `reservations:read` (ZT-06, ZT-07, ZT-10), `reservations:update` (ZT-08), `reservations:cancel` (ZT-09).
- **O2** — tylko rezerwacja w stanie „potwierdzona” i tylko przed dniem przyjazdu. Od dnia przyjazdu zmianę i anulowanie wykonuje personel.
- **O3** — pola vouchera (`voucherReference`, `hotelComponentId`) przyjmowane są wyłącznie od personelu i od partnera oznaczonego `D`. Klient i pozostali partnerzy tworzą tylko zwykłe rezerwacje.
- **O4** — administrator nie może zablokować ani zdegradować ostatniego aktywnego administratora, także samego siebie.
- **O5** — token usługi musi mieć zakres tej jednej operacji; odpowiedź nie zawiera danych gości.

Dodatkowa zasada dla wszystkich użytkowników: konto z hasłem tymczasowym może wykonać tylko ZT-01 (wylogowanie), ZT-02 (odczyt profilu) i ZT-04 (zmiana hasła). Pozostałe operacje zwracają 403 `PASSWORD_CHANGE_REQUIRED`, dopóki użytkownik nie ustawi własnego hasła.

Symbol D w kolumnach recepcjonisty i administratora oznacza wszystkie rezerwacje hotelu. System obsługuje jeden hotel, więc nie ma ograniczenia do „swojej placówki”.

Kolumny usług wewnętrznych mają B przy operacjach ZT, ponieważ token usługi nie jest przyjmowany pod prefiksem `/api/v1`.

## Zasady sprawdzania dostępu

### Jak sprawdzamy tożsamość użytkownika lub usługi i ważność tokenu?

- **Sesja użytkownika.** Po zalogowaniu przeglądarka dostaje cookie `aurora_session` (`HttpOnly`, `SameSite=Lax`, przy HTTPS także `Secure`) z losowym identyfikatorem. Serwer przechowuje tylko jego skrót HMAC-SHA-256 i termin ważności, domyślnie 12 godzin. Przy każdym żądaniu wyszukuje niewygasłą sesję, a potem konto i sprawdza, czy jest aktywne. Zablokowane konto traci dostęp od następnego żądania. Logowanie, rejestracja i zmiana hasła tworzą nową sesję; zmiana i reset hasła kończą pozostałe.
- **Token CSRF.** Każde żądanie zapisu z przeglądarki musi mieć nagłówek `X-CSRF-Token` zgodny z sesją oraz nagłówek `Origin` zgodny z adresem aplikacji. Token CSRF nie uwierzytelnia; chroni przed wykonaniem operacji przez obcą stronę.
- **Klucz partnera.** Klucz ma postać `aurora_` i 32 losowe bajty. W bazie jest tylko jego skrót SHA-256. Przy każdym żądaniu serwer liczy skrót, wyszukuje klucz, sprawdza, czy jest aktywny, i odczytuje jego zakresy. Odebranie zakresu albo wyłączenie klucza działa od następnego żądania, bez restartu.
- **Token usługi wewnętrznej (projekt).** Ten sam mechanizm co klucz partnera, ale osobny zbiór tokenów przyjmowany wyłącznie pod `/internal/v1`.
- **Jedna tożsamość na żądanie.** Żądanie z dwoma nagłówkami klucza dostaje 400, a żądanie z kluczem i sesją jednocześnie 403 `AMBIGUOUS_AUTH`. Uprawnień sesji i klucza nie da się połączyć.

### Jak sprawdzamy rolę lub zakres uprawnień wymagany przez operację?

Każda operacja ma w kodzie serwera zadeklarowany wymóg: rolę (`recepcjonista`, `administrator`) albo zakres klucza. Wszystkie adresy pod `/admin` mają wspólny warunek „tylko administrator”, więc nowa operacja administracyjna jest chroniona domyślnie. Rola pochodzi z bazy, a zakres z zapisanego klucza; nigdy z treści żądania. Schematy żądań odrzucają nieznane pola, dlatego nie da się przemycić `role`, `status`, `userId` ani `partnerId`.

Sam poprawny token nie wystarcza. Zalogowany klient dostaje 403 w panelu administratora, recepcjonista 403 przy zarządzaniu kontami, a partner z poprawnym kluczem 403 przy zameldowaniu i przy każdej operacji spoza zakresów klucza.

### Jak weryfikujemy własność zasobu i zapobiegamy dostępowi po podmianie identyfikatora?

- Każda operacja na rezerwacji najpierw pobiera ją po identyfikatorze, a potem porównuje właściciela z tożsamością z sesji lub klucza. Robi to jedna wspólna funkcja używana przy odczycie, zmianie, anulowaniu i planie pobytu.
- Personel widzi wszystkie rezerwacje. Klient widzi te, które utworzył ze swojego konta, a partner te, które utworzył swoimi kluczami.
- Cudza rezerwacja daje tę samą odpowiedź co nieistniejąca: 404 `RESERVATION_NOT_FOUND`. Odpowiedź nie zdradza, czy podany identyfikator istnieje.
- Listy filtruje serwer. Parametrem zapytania nie da się poprosić o rezerwacje innej osoby.
- Operacje na własnym koncie (`/me`) nie mają identyfikatora w adresie: zawsze dotyczą właściciela sesji.
- Zasoby podrzędne są sprawdzane razem z nadrzędnymi: zamówienie usługi i usługa pakietu muszą należeć do rezerwacji z adresu.
- Właściciela nowej rezerwacji ustala serwer. Własność partnera jest związana z jego oznaczeniem, nie z pojedynczym kluczem, więc wymiana klucza nie odbiera dostępu do wcześniejszych rezerwacji.
- Identyfikatory są losowe (UUID), ale nie traktujemy tego jako zabezpieczenia.

### Jakie dane można przekazywać lub zwracać bez tokenu i dlaczego?

Bez tokenu zwracamy tylko to, co hotel i tak pokazuje publicznie: pokoje, pakiety, ceny oraz listę pokoi wolnych w podanym terminie. Odpowiedź o dostępności nie mówi, kto zajmuje pozostałe pokoje ani ile jest rezerwacji. Adres `/health` zwraca wyłącznie `{"status":"ok"}`.

Bez tokenu przyjmujemy dane rejestracji i logowania, bo użytkownik nie ma jeszcze tożsamości. Chronią je limit prób (15 na minutę z jednego adresu IP), token CSRF i jednakowa odpowiedź na błędne logowanie. Rejestracja ujawnia, że adres e-mail jest zajęty (409 `EMAIL_TAKEN`); przyjęliśmy to świadomie, bo aplikacja nie wysyła e-maili i nie może potwierdzić adresu w inny sposób.

### Odpowiedzi przy braku tokenu, nieprawidłowym tokenie i braku uprawnień

| Sytuacja                                                        | Odpowiedź                                       | Co oznacza                                                             |
| --------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------- |
| Chroniona operacja odczytu bez sesji i bez klucza               | 401 `AUTH_REQUIRED`                             | Nie wiemy, kto pyta                                                    |
| Sesja wygasła, została zakończona albo konto zablokowano        | 401 `AUTH_REQUIRED`                             | Taka sesja jest traktowana jak brak sesji                              |
| Klucz partnera błędny lub wyłączony                             | 401 `INVALID_API_KEY`                           | Token nie potwierdza tożsamości                                        |
| Pusty klucz albo `Authorization` w schemacie innym niż `Bearer` | 401 `API_KEY_INVALID` / `INVALID_AUTHORIZATION` | Token nie potwierdza tożsamości                                        |
| Żądanie zapisu z przeglądarki bez zgodnego tokenu CSRF          | 403 `CSRF_INVALID`                              | Żądanie nie pochodzi z naszego formularza; sprawdzane przed logowaniem |
| Żądanie zapisu z poprawnym tokenem CSRF, ale bez zalogowania    | 401 `AUTH_REQUIRED`                             | Nie wiemy, kto pyta                                                    |
| Poprawna sesja, rola bez uprawnień do operacji                  | 403 `FORBIDDEN`                                 | Wiemy, kto pyta, ale nie ma on prawa do operacji                       |
| Poprawny klucz bez wymaganego zakresu                           | 403 `SCOPE_REQUIRED`                            | Jak wyżej, dla partnera                                                |
| Poprawny klucz na operacji przeznaczonej dla użytkownika        | 403 `USER_REQUIRED` albo `FORBIDDEN`            | Jak wyżej                                                              |
| Konto z hasłem tymczasowym                                      | 403 `PASSWORD_CHANGE_REQUIRED`                  | Najpierw trzeba ustawić własne hasło                                   |
| Sesja i klucz w jednym żądaniu                                  | 403 `AMBIGUOUS_AUTH`                            | Nie łączymy dwóch tożsamości                                           |
| Poprawna tożsamość, cudza rezerwacja                            | 404 `RESERVATION_NOT_FOUND`                     | Nie potwierdzamy istnienia cudzego zasobu                              |
| Za dużo żądań                                                   | 429 `RATE_LIMITED`                              | Nagłówek `Retry-After` podaje czas oczekiwania                         |

Zasada: **401** oznacza „nie wiemy, kim jesteś” i wymaga zalogowania albo poprawnego klucza. **403** oznacza „wiemy, kim jesteś, ale nie możesz tego zrobić”; ponowne logowanie nic nie zmieni. **404** stosujemy zamiast 403 tam, gdzie sama informacja o istnieniu zasobu byłaby wyciekiem.

## Przykładowe żądania i odpowiedzi

Przykłady grup ZT i ZP są zapisem rzeczywistych odpowiedzi uruchomionej aplikacji z 16 listopada 2026, na danych fikcyjnych. Zamiast klucza podajemy `<TOKEN_TESTOWY>`. Przykład grupy W jest projektowy.

### Operacja wewnętrzna z tokenem

ID operacji: **W-03**

Żądanie HTTP:

```http
POST /internal/v1/operations/c-booking-7f3a2c/reconcile HTTP/1.1
Host: 127.0.0.1:3001
Authorization: Bearer <TOKEN_TESTOWY>
```

Odpowiedź poprawna: 200 OK. Przykład projektowy: operacja nie jest jeszcze zaimplementowana.

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Cache-Control: no-store

{
  "operationId": "c-booking-7f3a2c",
  "partner": "A",
  "status": "confirmed",
  "changed": true
}
```

Scenariusz błędny: To samo żądanie z tokenem usługi „Kopia zapasowa”, który ma tylko zakres `backups:create`.

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json; charset=utf-8

{
  "error": {
    "code": "SCOPE_REQUIRED",
    "message": "Token usługi nie ma wymaganego uprawnienia.",
    "fields": {}
  }
}
```

### Operacja zewnętrzna z tokenem

ID operacji: **ZT-05**

Żądanie HTTP:

```http
POST /api/v1/reservations HTTP/1.1
Host: localhost:3001
Authorization: Bearer <TOKEN_TESTOWY>
Idempotency-Key: demo-d-20270615-001
Content-Type: application/json

{
  "roomId": "room-101",
  "checkIn": "2027-06-15",
  "checkOut": "2027-06-17",
  "guests": 1,
  "expectedTotalMinor": 48000,
  "guest": {
    "name": "Anna Testowa",
    "email": "anna@example.com",
    "phone": ""
  },
  "guestNames": [
    "Anna Testowa"
  ]
}
```

Odpowiedź poprawna: 201 Created. Token należy do partnera D. Właściciela (`partnerId`), numer, status i cenę ustalił serwer.

```http
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
Cache-Control: no-store

{
  "id": "dbe83f76-b166-4300-bb51-c932c5bd746a",
  "number": "AH-2026-AAE5EAF3",
  "userId": null,
  "partnerId": "D",
  "roomId": "room-101",
  "packageId": null,
  "room": {
    "id": "room-101",
    "number": "101",
    "type": "Standard",
    "description": "Przytulny pokój dwuosobowy z łazienką.",
    "capacity": 2,
    "nightlyRateMinor": 24000,
    "equipment": [
      "Wi-Fi",
      "Telewizor",
      "Prysznic"
    ],
    "active": true
  },
  "package": null,
  "checkIn": "2027-06-15",
  "checkOut": "2027-06-17",
  "guests": 1,
  "guest": {
    "name": "Anna Testowa",
    "email": "anna@example.com",
    "phone": ""
  },
  "guestNames": [
    "Anna Testowa"
  ],
  "status": "confirmed",
  "version": 1,
  "pricing": {
    "nights": 2,
    "nightlyRateMinor": 24000,
    "packagePriceMinor": 0,
    "totalMinor": 48000,
    "currency": "PLN"
  },
  "nightlyRateMinor": 24000,
  "packagePriceMinor": 0,
  "totalMinor": 48000,
  "fundingSource": "direct",
  "hasVoucher": false,
  "hotelComponentId": null,
  "items": [],
  "createdAt": "2026-11-16T15:59:48.748Z",
  "updatedAt": "2026-11-16T15:59:48.748Z"
}
```

Scenariusz błędny: To samo żądanie z kluczem partnera, który ma tylko zakres `reservations:read`.

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json; charset=utf-8

{
  "error": {
    "code": "SCOPE_REQUIRED",
    "message": "Klucz nie ma wymaganego uprawnienia.",
    "fields": {}
  }
}
```

Drugi scenariusz błędny: Inny partner odczytuje tę rezerwację: `GET /api/v1/reservations/dbe83f76-b166-4300-bb51-c932c5bd746a` z własnym, poprawnym kluczem.

```http
HTTP/1.1 404 Not Found
Content-Type: application/json; charset=utf-8

{
  "error": {
    "code": "RESERVATION_NOT_FOUND",
    "message": "Nie znaleziono rezerwacji.",
    "fields": {}
  }
}
```

### Operacja zewnętrzna bez tokenu

ID operacji: **ZP-07**

Żądanie HTTP:

```http
GET /api/v1/availability?checkIn=2027-06-15&checkOut=2027-06-17&guests=1 HTTP/1.1
Host: localhost:3001
Accept: application/json
```

Odpowiedź poprawna: 200 OK. Odpowiedź skrócona do dwóch z 5 pokoi.

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Cache-Control: no-store

{
  "items": [
    {
      "id": "room-101",
      "number": "101",
      "type": "Standard",
      "description": "Przytulny pokój dwuosobowy z łazienką.",
      "capacity": 2,
      "nightlyRateMinor": 24000,
      "equipment": [
        "Wi-Fi",
        "Telewizor",
        "Prysznic"
      ],
      "active": true,
      "pricing": {
        "nights": 2,
        "nightlyRateMinor": 24000,
        "packagePriceMinor": 0,
        "totalMinor": 48000,
        "currency": "PLN"
      }
    },
    {
      "id": "room-102",
      "number": "102",
      "type": "Standard",
      "description": "Pokój dla jednej lub dwóch osób.",
      "capacity": 2,
      "nightlyRateMinor": 24000,
      "equipment": [
        "Wi-Fi",
        "Biurko",
        "Prysznic"
      ],
      "active": true,
      "pricing": {
        "nights": 2,
        "nightlyRateMinor": 24000,
        "packagePriceMinor": 0,
        "totalMinor": 48000,
        "currency": "PLN"
      }
    }
  ],
  "total": 5,
  "page": 1,
  "pageSize": 20
}
```

Scenariusz błędny: Wyjazd wcześniejszy niż przyjazd: `checkIn=2027-06-17&checkOut=2027-06-15`.

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json; charset=utf-8

{
  "error": {
    "code": "DATES_INVALID",
    "message": "Pobyt musi trwać od 1 do 90 nocy.",
    "fields": {}
  }
}
```

## Scenariusze kontroli dostępu

| Operacja i warunek                                                        | Oczekiwany wynik                                  | Stan                                      |
| ------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------- |
| ZT-06 `GET /api/v1/reservations` bez sesji i bez klucza                   | 401 `AUTH_REQUIRED`; brak danych                  | sprawdzone                                |
| ZT-06 z cookie nieistniejącej lub wygasłej sesji                          | 401 `AUTH_REQUIRED`                               | sprawdzone; test automatyczny             |
| ZT-06 z błędnym albo wyłączonym kluczem partnera                          | 401 `INVALID_API_KEY`                             | sprawdzone; test automatyczny             |
| ZT-05 `POST /api/v1/reservations` z przeglądarki bez tokenu CSRF          | 403 `CSRF_INVALID`; nic nie zapisano              | sprawdzone; test automatyczny             |
| ZT-21 `GET /api/v1/admin/rooms` jako zalogowany klient albo recepcjonista | 403 `FORBIDDEN`                                   | sprawdzone; test automatyczny dla klienta |
| ZT-11 zameldowanie jako klient albo z kluczem partnera                    | 403 `FORBIDDEN`; stan pobytu bez zmian            | sprawdzone; test automatyczny dla klienta |
| ZT-05 z kluczem, który ma tylko `reservations:read`                       | 403 `SCOPE_REQUIRED`; rezerwacja nie powstaje     | sprawdzone; test automatyczny             |
| ZT-07 klient podmienia identyfikator na rezerwację innego klienta         | 404 `RESERVATION_NOT_FOUND`; brak danych          | sprawdzone; test automatyczny             |
| ZT-08 i ZT-09 na cudzej rezerwacji (klient i partner)                     | 404 `RESERVATION_NOT_FOUND`; rezerwacja bez zmian | sprawdzone; test automatyczny             |
| ZT-06 jako klient lub partner                                             | Lista zawiera tylko własne rezerwacje             | sprawdzone; test automatyczny             |
| ZT-03 `PATCH /api/v1/me` z polem `role`                                   | 400 `VALIDATION_ERROR`; rola bez zmian            | sprawdzone; test automatyczny             |
| ZT-05 klient przekazuje pola vouchera                                     | 403 `VOUCHER_FORBIDDEN`                           | sprawdzone                                |
| ZT-06 z sesją administratora i kluczem partnera jednocześnie              | 403 `AMBIGUOUS_AUTH`                              | sprawdzone; test automatyczny             |
| Dowolna operacja ZT kontem z hasłem tymczasowym                           | 403 `PASSWORD_CHANGE_REQUIRED`                    | sprawdzone; test automatyczny             |
| ZT-29 blokada ostatniego administratora                                   | 409 `LAST_ADMIN`                                  | sprawdzone; test automatyczny             |
| ZT-02 po wylogowaniu                                                      | 401 `AUTH_REQUIRED`                               | sprawdzone                                |
| W-03 bez nagłówka `Authorization`                                         | 401 `AUTH_REQUIRED`                               | zaplanowane (projekt)                     |
| W-03 z tokenem usługi „Kopia zapasowa”                                    | 403 `SCOPE_REQUIRED`                              | zaplanowane (projekt)                     |
| W-05 z sesją administratora albo kluczem partnera                         | 401 `INVALID_API_KEY`: to nie jest token usługi   | zaplanowane (projekt)                     |

„Sprawdzone” oznacza, że 16 listopada 2026 wykonaliśmy takie żądanie na uruchomionej aplikacji i otrzymaliśmy podany wynik. „Test automatyczny” oznacza, że ten sam przypadek sprawdza test w `backend/tests/` (głównie `hotel.test.ts` i `security-audit.test.ts`) przy każdym uruchomieniu `npm test`.

## Decyzje projektowe

### Dlaczego wskazane operacje są dostępne publicznie?

Gość musi zobaczyć ofertę i cenę, zanim zdecyduje się założyć konto, a rejestracja i logowanie z natury nie mogą wymagać tokenu. Wymaganie konta do przeglądania oferty zniechęcałoby klientów i nie chroniłoby żadnych danych, bo oferta jest informacją handlową. Publiczne operacje nie zwracają danych osobowych, a przed nadużyciem chronią je limit żądań i walidacja parametrów. Partner może czytać ofertę także z kluczem; wtedy wymagamy zakresu `catalog:read`, żeby błędnie skonfigurowany klucz od razu dawał czytelny błąd zamiast po cichu działać jak gość.

### Które dane i operacje wymagają najściślejszego ograniczenia dostępu?

- **Dane gości i rezerwacje**: imiona i nazwiska, e-mail, telefon, terminy pobytu. Dostęp ma tylko właściciel i personel.
- **Konta i role**: tworzenie personelu, zmiana roli, blokada i reset hasła są wyłącznie dla administratora, z ochroną ostatniego administratora.
- **Klucze API i sekrety partnerów**: tworzy i zmienia je tylko administrator; wartości nie da się odczytać ponownie.
- **Ustawienia połączeń**: adres partnera decyduje, dokąd serwer wysyła dane, więc może go zmienić tylko administrator i tylko na host dopuszczony w konfiguracji serwera.
- **Zmiany stanu pobytu**: zameldowanie, wymeldowanie i zamawianie usług wykonuje wyłącznie personel; stanu nie da się ustawić polem w żądaniu.
- **Voucher**: numer vouchera jest przechowywany w postaci zaszyfrowanej i nie jest zwracany; powiązać go może tylko personel i partner D.
- **Historia operacji**: tylko do odczytu, tylko dla administratora.
- **Kopia bazy**: zawiera wszystkie dane, dlatego usługa kopii może ją tylko zlecić, a nie pobrać.

### Jak rozdzielono uprawnienia użytkowników i usług wewnętrznych?

Użytkownicy i usługi mają osobne rodzaje tokenów i osobne prefiksy adresów. Sesja użytkownika działa tylko pod `/api/v1`, a token usługi tylko pod `/internal/v1`. Administrator nie ma dostępu do operacji wewnętrznych, a usługa wewnętrzna nie ma dostępu do niczego, co widzi użytkownik.

Każde konto techniczne dostaje tylko zakresy potrzebne do swojej pracy. Harmonogram może uruchomić porządkowanie i ponowić zapytanie o wynik operacji, ale nie może utworzyć zamówienia ani przeczytać danych gościa. Usługa kopii może zlecić kopię, ale nie może jej pobrać. Monitoring czyta wyłącznie stan techniczny. Przejęcie jednego tokenu nie daje więc dostępu do danych osobowych ani do konfiguracji.

Partner zewnętrzny jest traktowany podobnie: klucz ma jawnie wybrane zakresy, a brak zaznaczenia oznacza brak dostępu. Ten sam partner może mieć kilka kluczy o różnych zakresach, np. osobny do odczytu oferty.

### Jak rozróżniamy brak uwierzytelnienia od braku uprawnień?

Brak albo nieważny token to 401, a poprawna tożsamość bez uprawnień to 403. Każdy błąd ma stały kod w polu `code`, więc aplikacja kliencka rozpoznaje sytuację bez czytania komunikatu: po 401 kieruje do logowania, po 403 pokazuje brak uprawnień. Dla cudzych rezerwacji celowo zwracamy 404. Pełne zestawienie jest w tabeli odpowiedzi przy braku tokenu, nieprawidłowym tokenie i braku uprawnień.

### Jak zapobiegamy odczytaniu lub zmianie cudzych danych przez podmianę identyfikatora?

Identyfikator z adresu nigdy nie jest jedynym warunkiem. Serwer zawsze porównuje właściciela zasobu z tożsamością z tokenu, w jednym wspólnym miejscu kodu, a przy braku zgodności odpowiada tak, jakby zasób nie istniał. Szczegóły opisuje punkt o weryfikacji własności zasobu.

## Kwestie do uzgodnienia

1. **Operacje wewnętrzne nie są zaimplementowane.** Trzeba zdecydować, czy są potrzebne na pokaz, czy wystarczy obecny licznik w serwerze i polecenie kopii.
2. **403 zamiast 401 przy zapisie bez sesji.** Żądanie zapisu bez sesji i bez klucza dostaje dziś 403 `CSRF_INVALID`, bo token CSRF jest sprawdzany przed logowaniem. Partner, który zapomni o kluczu, zobaczy więc błąd CSRF. Proponujemy zwracać 401 `AUTH_REQUIRED`, gdy żądanie nie ma ani sesji, ani klucza.
3. **Dwa kody dla złego klucza.** Pusty klucz daje `API_KEY_INVALID`, a błędny `INVALID_API_KEY`. Warto zostawić jeden.
4. **Rezerwacja założona przez recepcję** należy do konta pracownika. Klient, dla którego ją założono, nie zobaczy jej na swoim koncie. Do rozstrzygnięcia: czy recepcja ma wskazywać konto klienta.
5. **Klucze partnerów nie mają terminu ważności.** Wymiana jest ręczna. Do rozważenia data wygaśnięcia.
6. **Limit żądań liczymy na adres IP,** a nie na klucz. Kilku partnerów za jednym adresem dzieli wspólny limit.
7. **Uprawnienie do vouchera jest związane z oznaczeniem `D`** zapisanym w kodzie. Osobny zakres, np. `vouchers:bind`, byłby czytelniejszy.
8. **Kontrakty z A, B i D nie są potwierdzone** przez pozostałe grupy. Dotyczy to także zakresów, które dostanie klucz projektu D.
9. **Klasyfikacja integracji.** Operacje dla serwera D zaliczyliśmy do zewnętrznych z tokenem, bo D jest partnerem integracyjnym. Jeśli prowadzący traktuje cztery projekty jako jeden system, te same operacje należałoby przenieść do grupy wewnętrznej.
