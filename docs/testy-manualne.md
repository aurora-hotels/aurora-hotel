# Próby przed pokazem

Używamy danych fikcyjnych i osobnej bazy demonstracyjnej. Wynik wpisujemy dopiero po wykonaniu próby. Oczekiwane zachowanie w tabeli nie jest potwierdzeniem zaliczenia testu.

| Próba                      | Kroki                                                                                            | Oczekiwany wynik                                                                               | Wynik / osoba / data |
| -------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | -------------------- |
| Konto                      | Zarejestruj klienta; spróbuj powtórzyć ten sam e-mail; zaloguj się błędnym hasłem                | Jedno konto; czytelne komunikaty; brak dostępu po błędnym haśle                                |                      |
| Rezerwacja                 | Wybierz przyszły termin, pokój, gości i pakiet; sprawdź sumę; zapisz                             | Numer pobytu, prawidłowa cena i dane gości                                                     |                      |
| Brak miejsca               | W drugim oknie wybierz ten sam pokój i nakładający się termin                                    | Pokój niedostępny lub konflikt przy zapisie                                                    |                      |
| Styk terminów              | Zarezerwuj pokój od dnia wyjazdu poprzedniego gościa                                             | Rezerwacja dozwolona                                                                           |                      |
| Błędne dane                | Ustaw wyjazd przed przyjazdem, zbyt wielu gości albo brak nazwiska                               | Brak zapisu; komunikat nie usuwa pozostałych danych formularza                                 |                      |
| Zmiana ceny                | Zmień cenę pokoju jako administrator; sprawdź istniejącą rezerwację                              | Stary pobyt zachowuje zapisaną cenę                                                            |                      |
| Zmiana pobytu              | Zmień termin własnej rezerwacji i zaakceptuj nową wycenę                                         | Zmienia się data i wersja; stary termin jest zwolniony                                         |                      |
| Obcy pobyt                 | Klient 2 próbuje otworzyć adres szczegółów klienta 1                                             | Brak danych i możliwości zmiany                                                                |                      |
| Recepcja                   | Otwórz pobyt, zamelduj, wymelduj; ponów nieprawidłowe przejście                                  | Dozwolona kolejność stanów; klient nie ma przycisków personelu                                 |                      |
| Blokada                    | Zablokuj zalogowanego klienta jako administrator; wykonaj akcję w jego oknie                     | Sesja przestaje działać; konto nie loguje się ponownie                                         |                      |
| Ostatni administrator      | Spróbuj zablokować lub zdegradować ostatniego aktywnego administratora                           | Operacja odrzucona                                                                             |                      |
| Reset hasła                | Zresetuj hasło konta i zaloguj się hasłem tymczasowym                                            | Wymagana zmiana hasła; stare sesje nie działają                                                |                      |
| Usługi A/B                 | Wybierz pakiet, pobierz terminy i zarezerwuj dwa dodatki                                         | W planie są identyfikatory i stany obu usług                                                   |                      |
| Konflikt usług             | Wybierz nakładające się usługi dla tej samej osoby lub termin poza pobytem                       | Operacja odrzucona przed wysłaniem do partnera                                                 |                      |
| Niepewny wynik             | W środowisku testowym zasymuluj timeout po wykonaniu operacji, odśwież plan                      | Brak fałszywego sukcesu i brak drugiego zamówienia                                             |                      |
| Częściowe anulowanie       | Jedna usługa anuluje się poprawnie, druga odmawia                                                | Hotel pozostaje aktywny; widać co wymaga wyjaśnienia                                           |                      |
| Voucher                    | Zweryfikuj hotelową część; zamelduj; wymelduj; ponów potwierdzenie                               | Jedno wykonanie części C; A/B pozostają poza rozliczeniem C                                    |                      |
| Zmiana dat vouchera        | Zmień daty na mieszczące się w ważności D, a potem spróbuj dat poza ważnością lub przy awarii D  | Pierwsza zmiana dozwolona po weryfikacji; błędna próba pozostawia poprzednie daty i cenę       |                      |
| Zmiana środowiska partnera | Dla niepewnej operacji zmień demo/real lub URL, spróbuj odświeżyć, następnie przywróć ustawienia | Brak wysłania starej operacji do nowego celu; odzyskanie po przywróceniu właściwego środowiska |                      |
| Awaria D                   | Wymelduj po poprawnej weryfikacji, gdy D nie odpowiada                                           | Pobyt zakończony lokalnie, osobny stan oczekiwania na potwierdzenie                            |                      |
| Uprawnienia klucza         | Odbierz zakres lub wyłącz klucz; ponów wywołanie                                                 | Dostęp blokowany bez restartu C                                                                |                      |
| Telefon i klawiatura       | Wąskie okno, Tab/Shift+Tab, Enter, czytnik etykiet pól                                           | Formularze dostępne, tabele czytelne, komunikaty widoczne                                      |                      |

## Zgłoszenie błędu

```text
Tytuł:
Wersja / commit:
Konto i rola (bez hasła):
Kroki:
Dane przykładowe:
Oczekiwany wynik:
Faktyczny wynik:
Zrzut / bezpieczny komunikat błędu:
Wynik ponownej próby po poprawce:
```

Nie dołączamy haseł, kluczy API, ciasteczek sesji ani prawdziwych danych gości. Przy błędzie integracji wystarczą ID rezerwacji i operacji oraz bezpieczny kod błędu.
