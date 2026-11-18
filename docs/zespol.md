# Zespół i zasady współpracy

Przeznaczenie: skład zespołu, role, odpowiedzialności, komunikacja oraz zasady pracy z zadaniami i dokumentacją. Opiekun: Adrian Zieliński.

## Skład i role

Adrian koordynuje projekt i pomaga również przy kodzie, konfiguracji oraz integracji.

| Osoba             | Rola                                                 | Zakres odpowiedzialności                                              |
| ----------------- | ---------------------------------------------------- | --------------------------------------------------------------------- |
| Adrian Zieliński  | Koordynator projektu; zastępstwo: interfejs i serwer | Uruchomienie całości, plan pracy, konfiguracja i połączenie projektów |
| Piotr Świadek     | Przedstawiciel klienta                               | Potrzeby użytkownika, zakres aplikacji i sprawdzenie rezerwacji       |
| Rafał Świętkowski | Programista interfejsu                               | Ekrany, formularze, walidacja i komunikaty                            |
| Jesika Proczek    | Tester manualny                                      | Próby w aplikacji i zgłoszenia błędów                                 |
| Wiktoria Sobejko  | Analityk                                             | Reguły działania, model danych i uzgodnienie API                      |
| Andrii Yaremko    | Programista backendu                                 | Rezerwacje, uprawnienia, baza i API                                   |
| Filip Włodarczyk  | Tester automatyczny                                  | Uruchomienie testów i omówienie sprawdzanych przypadków               |

Podział przyjęliśmy na spotkaniu [W5](spotkania/W5-podzial-pracy.md): każdy obszar ma osobę odpowiedzialną, ale można pracować poza swoją rolą. Adrian jest zastępcą w obszarze interfejsu i serwera. Pełną listę zastępstw zawiera strona [W5](spotkania/W5-podzial-pracy.md#zastępstwa).

## Komunikacja

- Raz w tygodniu krótko sprawdzamy postęp na Teams i wybieramy najbliższe prace.
- Bieżące sprawy dotyczące zadania zapisujemy w komentarzu do tego zadania w Jirze.
- Uzgodnienia z grupami A, B i D zapisujemy w [kontraktach](api/integracje.md#co-musimy-ustalić). Klucze przekazujemy prywatnym kanałem, nigdy w Jirze ani w repozytorium.

## Jak pracujemy z zadaniami

Zasady przyjęliśmy na spotkaniach [W1](spotkania/W1-organizacja-pracy.md), [W3](spotkania/W3-szacowanie.md) i [W4](spotkania/W4-odbior-zadan.md).

- Pracujemy w Kanbanie. Każda osoba prowadzi jedno zadanie naraz.
- Typy kart: epik grupuje większy obszar, historyjka opisuje funkcję dla użytkownika, zadanie pracę organizacyjną, podzadanie część wykonania, a błąd problem do poprawy.
- Statusy: Pomysł → Do zrobienia → W toku → W trakcie weryfikacji → Gotowe. Pięć statusów odpowiada pięciu kolumnom tablicy.
- Autor przekazuje zadanie do weryfikacji, gdy wykona zakres i sam je sprawdzi. Druga osoba sprawdza kryteria z opisu, zwykły przebieg oraz błędne dane. Zamyka zadanie albo zwraca je przejściem „Zwróć do poprawy” do statusu W toku. Wynik i potrzebne poprawki zapisuje w komentarzu.
- Przed rozpoczęciem pracy karta ma tytuł, opis, osobę odpowiedzialną, kryteria i priorytet; historyjka ma też punkty. Po odbiorze dopisujemy wynik.
- Priorytet (High, Medium) określa kolejność. Etykiety `etap-1` i `pozniej` pokazują etap.
- Punkty 1, 2, 3, 5, 8, 13 opisują wielkość całej historyjki. Nie są godzinami i nie doliczamy do nich ponownie podzadań.
- Blokadę zapisujemy w komentarzu: przyczyna i potrzebna pomoc. Na cotygodniowym spotkaniu ustalamy, czy zmienić osobę albo kolejność.

Jira technicznie dopuszcza także inne przejścia między statusami. Opisany porządek jest zasadą zespołu, nie blokadą w narzędziu.

### Kiedy zadanie jest gotowe

1. Spełnia wszystkie kryteria z opisu.
2. Działa zwykły przebieg i poprawnie obsługuje błędne dane oraz brak uprawnień.
3. Sprawdziła je osoba inna niż autor i zapisała wynik w komentarzu.
4. Przechodzą testy automatyczne (`npm run check`).
5. Dokumentacja w `docs/` odpowiada wykonanej zmianie.

Przepływ sprawdziliśmy 25 października 2026 na zadaniu [KAN-2](https://zielinskiadis.atlassian.net/browse/KAN-2); opis próby jest w [testach](testy-i-odbior.md#próba-przepływu-w-jirze).

## Jak prowadzimy dokumentację

Zasady przyjęliśmy na spotkaniu [W6](spotkania/W6-organizacja-dokumentacji.md), a 16 listopada 2026 przenieśliśmy dokumentację z Confluence do repozytorium.

- Strony dzielimy według rodzaju informacji, nie według projektów A/B/C/D. Układ pokazuje [spis dokumentacji](README.md#spis-dokumentacji).
- Każda strona zaczyna się od przeznaczenia i opiekuna. Opiekun dba o aktualność, ale poprawkę może zgłosić każdy.
- Poprawiamy istniejącą stronę, jeśli temat już na niej jest. Nową stronę tworzymy dla nowego tematu i dopisujemy ją do spisu.
- Zmianę dokumentacji wysyłamy w tym samym commicie lub pull requeście co zmianę kodu, której dotyczy.
- Każdy pracuje z własnego konta GitHub, żeby historia pokazywała rzeczywistego autora.
- W komunikacie commita albo w treści strony podajemy numer zadania z Jiry, np. `KAN-9`. W opisie zadania w Jirze podajemy odnośnik do strony w `docs/`.
- Nie zapisujemy haseł, kluczy API ani prawdziwych danych gości: ani w dokumentacji, ani w Jirze, ani na zrzutach ekranu.

Nazywanie plików i wersjonowanie opisuje strona [Materiały](materialy/README.md#zasady-nazywania-i-wersjonowania).

## Dostęp i uprawnienia

| Miejsce                | Kto zarządza     | Zespół                         | Prowadzący                                           |
| ---------------------- | ---------------- | ------------------------------ | ---------------------------------------------------- |
| Jira (projekt KAN)     | Adrian Zieliński | Tworzenie, komentarze, statusy | Dostęp do odczytu po podaniu konta                   |
| Repozytorium i `docs/` | Adrian Zieliński | Zmiany z własnych kont GitHub  | Repozytorium jest publiczne, odczyt nie wymaga konta |

Wszystkie siedem osób ma nadany dostęp do Jiry i do zapisu w repozytorium. Każda osoba sprawdziła swoje konto osobiście (utworzenie zadania, komentarz, zmiana statusu w Jirze oraz odczyt i zmiana w repozytorium) 17–18 listopada 2026; zadanie dostępu to [KAN-3](https://zielinskiadis.atlassian.net/browse/KAN-3).

Adrian jest administratorem Jiry i repozytorium. Pozostałe osoby pracują na zwykłych uprawnieniach, co ogranicza przypadkowe zmiany konfiguracji. Zdublowane karty łączymy dopiero po sprawdzeniu, czy nie zawierają potrzebnych informacji.

## Zapis własnego wkładu

Każda osoba po wykonaniu pracy dopisuje swój wiersz ze swojego konta. Nie wpisujemy nikomu commitów, odbiorów ani wyników testów, których nie wykonał.

| Osoba             | Zadanie i odnośnik do zmiany                                                                                                                                                                                                                                               | Co sprawdzono samodzielnie                                                                                                         | Dodatkowe prace i uwagi                                                                                                                                      | Data i wynik                 |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Adrian Zieliński  | [KAN-23](https://zielinskiadis.atlassian.net/browse/KAN-23), [KAN-13](https://zielinskiadis.atlassian.net/browse/KAN-13), [KAN-26](https://zielinskiadis.atlassian.net/browse/KAN-26); konfiguracja Jiry i repozytorium, przeniesienie dokumentacji                        | Próba przepływu na [KAN-2](https://zielinskiadis.atlassian.net/browse/KAN-2), uruchomienie projektu od zera, wynik `npm run check` | Przegląd kodu, poprawki, dokumentacja i API wewnętrzne. Weryfikacja: testy i przegląd zmian. | listopad 2026, w weryfikacji |
| Piotr Świadek     | [KAN-11](https://zielinskiadis.atlassian.net/browse/KAN-11); zakres na stronie [Cel i zakres](cel-i-zakres.md)                                                                                                                                                             | Przebieg rezerwacji z perspektywy klienta, zgodność zakresu z wymaganiami                                                          | —                                                                                                                                                         | listopad 2026, w weryfikacji |
| Rafał Świętkowski | [KAN-17](https://zielinskiadis.atlassian.net/browse/KAN-17), [KAN-20](https://zielinskiadis.atlassian.net/browse/KAN-20); formularze logowania, rejestracji i rezerwacji                                                                                                   | Formularze w przeglądarce, komunikaty błędów, widok 390 px                                                                         | —                                                                                                                                                         | listopad 2026, w weryfikacji |
| Jesika Proczek    | [KAN-22](https://zielinskiadis.atlassian.net/browse/KAN-22); [testy ręczne](testy-manualne.md), strona [Materiały](materialy/README.md)                                                                                                                                    | Próby rezerwacji w przeglądarce według listy testów ręcznych                                                                       | —                                                                                                                                                         | listopad 2026, w weryfikacji |
| Wiktoria Sobejko  | [KAN-7](https://zielinskiadis.atlassian.net/browse/KAN-7); [wymagania](wymagania.md), [budowa aplikacji](budowa-aplikacji.md)                                                                                                                                              | Reguły dostępności i cen, zgodność modelu danych z kodem                                                                           | —                                                                                                                                                         | listopad 2026, w weryfikacji |
| Andrii Yaremko    | [KAN-1](https://zielinskiadis.atlassian.net/browse/KAN-1), [KAN-9](https://zielinskiadis.atlassian.net/browse/KAN-9), [KAN-29](https://zielinskiadis.atlassian.net/browse/KAN-29), [KAN-30](https://zielinskiadis.atlassian.net/browse/KAN-30); serwer, konta i rezerwacje | Uprawnienia, równoczesne rezerwacje, testy serwera                                                                                 | —                                                                                                                                                         | listopad 2026, w weryfikacji |
| Filip Włodarczyk  | [KAN-18](https://zielinskiadis.atlassian.net/browse/KAN-18); [testy i odbiór](testy-i-odbior.md)                                                                                                                                                                           | Testy logowania i rezerwacji, uruchomienie testów w GitHub Actions                                                                 | —                                                                                                                                                         | listopad 2026, w weryfikacji |

Na pokazie każda osoba powinna umieć przejść od ekranu lub żądania API do reguły w kodzie i wyjaśnić co najmniej jeden test ze swojego obszaru.
