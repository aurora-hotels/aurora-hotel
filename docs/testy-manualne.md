# Testy ręczne

Przeznaczenie: lista prób wykonywanych ręcznie przed pokazem i szablon zgłoszenia błędu. Opiekun: Jesika Proczek.

Używamy danych fikcyjnych i osobnej bazy. Wynik wpisuje osoba, która rzeczywiście wykonała próbę, razem z datą. Oczekiwane zachowanie w tabeli nie jest potwierdzeniem zaliczenia testu. **Żadna próba nie ma jeszcze wpisanego wyniku.**

Zadanie w Jirze: [KAN-22](https://zielinskiadis.atlassian.net/browse/KAN-22).

| Próba                      | Kroki                                                                                           | Oczekiwany wynik                                                                           | Wynik, osoba, data |
| -------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------ |
| Konto                      | Zarejestruj klienta; spróbuj powtórzyć ten sam e-mail; zaloguj się błędnym hasłem               | Jedno konto; czytelne komunikaty; brak dostępu po błędnym haśle                            |                    |
| Rezerwacja                 | Wybierz przyszły termin, pokój, gości i pakiet; sprawdź sumę; zapisz                            | Numer pobytu, prawidłowa cena i dane gości                                                 |                    |
| Brak miejsca               | W drugim oknie wybierz ten sam pokój i nakładający się termin                                   | Pokój niedostępny lub konflikt przy zapisie                                                |                    |
| Styk terminów              | Zarezerwuj pokój od dnia wyjazdu poprzedniego gościa                                            | Rezerwacja dozwolona                                                                       |                    |
| Błędne dane                | Ustaw wyjazd przed przyjazdem, zbyt wielu gości albo brak nazwiska                              | Brak zapisu; komunikat nie usuwa pozostałych danych formularza                             |                    |
| Zmiana ceny                | Zmień cenę pokoju jako administrator; sprawdź istniejącą rezerwację                             | Stary pobyt zachowuje zapisaną cenę                                                        |                    |
| Zmiana pobytu              | Zmień termin własnej rezerwacji i zaakceptuj nową wycenę                                        | Zmienia się data i wersja; stary termin jest zwolniony                                     |                    |
| Wycofany pokój             | Wycofaj z oferty pokój z przyszłym pobytem; jako klient zmień termin tego pobytu                | Zmiana terminu działa; nowej rezerwacji w tym pokoju nie da się założyć                    |                    |
| Obcy pobyt                 | Klient 2 próbuje otworzyć adres szczegółów pobytu klienta 1                                     | Brak danych i możliwości zmiany                                                            |                    |
| Recepcja                   | Otwórz pobyt zaczynający się dziś, zamelduj, wymelduj; ponów nieprawidłowe przejście            | Dozwolona kolejność stanów; klient nie ma przycisków personelu                             |                    |
| Zameldowanie przed czasem  | Otwórz pobyt zaczynający się jutro i spróbuj zameldować gości                                   | Przycisk nieaktywny z informacją o dniu przyjazdu                                          |                    |
| Zmiana e-maila             | W profilu zmień adres e-mail bez hasła, potem z poprawnym hasłem                                | Bez hasła zmiana odrzucona; z hasłem zapisana                                              |                    |
| Blokada                    | Zablokuj zalogowanego klienta jako administrator; wykonaj akcję w jego oknie                    | Sesja przestaje działać; konto nie loguje się ponownie                                     |                    |
| Ostatni administrator      | Spróbuj zablokować lub zdegradować ostatniego aktywnego administratora                          | Operacja odrzucona                                                                         |                    |
| Reset hasła                | Zresetuj hasło konta i zaloguj się hasłem tymczasowym                                           | Wymagana zmiana hasła; stare sesje nie działają                                            |                    |
| Usługi A/B                 | Wybierz pakiet, pobierz terminy i zarezerwuj dwa dodatki                                        | W planie są identyfikatory i stany obu usług                                               |                    |
| Konflikt usług             | Wybierz nakładające się usługi dla tej samej osoby lub termin poza pobytem                      | Operacja odrzucona przed wysłaniem do partnera                                             |                    |
| Niepewny wynik             | W trybie demo ustaw przekroczenie czasu po wykonaniu operacji, zamów usługę, odśwież plan       | Brak fałszywego sukcesu i brak drugiego zamówienia                                         |                    |
| Częściowe anulowanie       | Jedna usługa anuluje się poprawnie, druga odmawia                                               | Hotel pozostaje aktywny; widać, co wymaga wyjaśnienia                                      |                    |
| Voucher                    | Zweryfikuj hotelową część; zamelduj; wymelduj; ponów potwierdzenie                              | Jedno wykonanie części C; A i B pozostają poza rozliczeniem C                              |                    |
| Zmiana dat vouchera        | Zmień daty na mieszczące się w ważności D, a potem spróbuj dat poza ważnością lub przy awarii D | Pierwsza zmiana dozwolona po weryfikacji; błędna próba pozostawia poprzednie daty i cenę   |                    |
| Zmiana środowiska partnera | Dla niepewnej operacji zmień tryb lub adres, spróbuj odświeżyć, następnie przywróć ustawienia   | Stara operacja nie trafia do nowego celu; odzyskanie po przywróceniu właściwego środowiska |                    |
| Awaria D                   | Wymelduj po poprawnej weryfikacji, gdy D nie odpowiada                                          | Pobyt zakończony lokalnie, osobny stan oczekiwania na potwierdzenie                        |                    |
| Uprawnienia klucza         | Odbierz zakres lub wyłącz klucz; ponów wywołanie                                                | Dostęp blokowany bez restartu aplikacji                                                    |                    |
| Telefon i klawiatura       | Wąskie okno, Tab i Shift+Tab, Enter, czytnik etykiet pól                                        | Formularze dostępne, tabele czytelne, komunikaty widoczne                                  |                    |
| Uruchomienie od zera       | Na innym komputerze wykonaj kroki z [konfiguracji](konfiguracja.md#pierwszy-start)              | Aplikacja startuje; da się zalogować jako administrator                                    |                    |

## Zgłoszenie błędu

Błąd zgłaszamy w Jirze jako kartę typu „Błąd”:

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

Nie dołączamy haseł, kluczy API, ciasteczek sesji ani prawdziwych danych gości. Przy błędzie integracji wystarczą identyfikatory rezerwacji i operacji oraz kod błędu.
