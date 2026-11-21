# W4 — Przepływ pracy i odbiór zadania

Przeznaczenie: przepływ pracy, zwrot do poprawy i warunki zakończenia. Opiekun strony: Andrii Yaremko.

| Data spotkania   | Uczestnicy           | Moderator      | Notatka           |
| ---------------- | -------------------- | -------------- | ----------------- |
| 8 listopada 2026 | Cały zespół (7 osób) | Andrii Yaremko | Rafał Świętkowski |

## Pytanie

Jak odróżnimy napisaną funkcję od sprawdzonej? Co robimy, gdy autor uznaje zadanie za gotowe, a osoba sprawdzająca wykrywa brak jednego kryterium?

## Rozważane warianty

| Wariant | Opis                                                                         | Argumenty                                                       |
| ------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------- |
| A       | Trzy statusy: do zrobienia, w toku i gotowe. Odbiór zapisujemy w komentarzu. | Mniej etapów, ale słabiej widać prace czekające na sprawdzenie. |
| B       | Osobny status weryfikacji i możliwość zwrotu zadania do poprawy.             | Pokazuje odbiór i umożliwia wyraźny zwrot do pracy.             |

## Decyzja

Pomysł → Do zrobienia → W toku → W trakcie weryfikacji → Gotowe. Po nieudanej próbie zadanie wraca do statusu W toku przejściem „Zwróć do poprawy”. Druga osoba sprawdza kryteria z opisu, zwykły przebieg i ważniejsze błędy, a wynik zapisuje przy zadaniu. Wspólne warunki zakończenia są na stronie [Zespół](../zespol.md#kiedy-zadanie-jest-gotowe).

Uzasadnienie: Osobny etap weryfikacji pozwala kontrolować jakość i pokazuje na tablicy prace czekające na odbiór. W sporze nie rozstrzyga zdanie autora, tylko kryteria i próba, którą da się powtórzyć: brak jednego kryterium oznacza zwrot z opisem poprawki.

## Rozbieżności

Rozbieżności dotyczyły liczby statusów i sposobu zatwierdzania zadań. Przyjęliśmy osobny etap weryfikacji, żeby łatwiej kontrolować jakość pracy.

## Wdrożenie

Przepływ w Jirze sprawdzony na zadaniu próbnym [KAN-2](https://zielinskiadis.atlassian.net/browse/KAN-2) (25.10.2026, wynik pozytywny); opis w [testach](../testy-i-odbior.md#próba-przepływu-w-jirze).

## Stanowiska uczestników

Stanowiska spisał koordynator po warsztacie 8 listopada 2026: argument lub propozycja zgłoszona na spotkaniu oraz własne działanie wynikające z decyzji. Każda osoba sprawdza swój wiersz i poprawia go ze swojego konta, jeśli coś zapisano nieściśle.

| Osoba             | Propozycja lub argument                                                                 | Własne działanie po decyzji                                                    |
| ----------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Adrian Zieliński  | Osobna weryfikacja: na tablicy widać, co czeka na odbiór.                               | Sprawdził cały przepływ na KAN-2 i zapisał wynik w komentarzu.                 |
| Piotr Świadek     | Osobna weryfikacja: klient chce wiedzieć, co zostało sprawdzone.                        | Odbiera karty dotyczące zakresu i rezerwacji.                                  |
| Rafał Świętkowski | Trzy statusy: mniej klikania przy małych zmianach interfejsu.                           | Przyjął osobny status; przekazuje karty do weryfikacji z opisem, co sprawdzić. |
| Jesika Proczek    | Osobna weryfikacja: tester potrzebuje jasnego sygnału, kiedy zacząć próbę.              | Zapisuje wynik próby w komentarzu i zwraca kartę przy brakach.                 |
| Wiktoria Sobejko  | Osobna weryfikacja: kryteria akceptacji muszą mieć miejsce, w którym ktoś je porównuje. | Pilnuje, żeby każda historyjka miała kryteria możliwe do sprawdzenia.          |
| Andrii Yaremko    | Trzy statusy: weryfikacja może być komentarzem przy „Gotowe”.                           | Przyjął osobny status; nie zamyka własnych kart bez odbioru.                   |
| Filip Włodarczyk  | Osobna weryfikacja: testy automatyczne są częścią odbioru.                              | Dopisuje wynik testów do komentarza przy odbiorze.                             |

[← Rejestr spotkań](README.md)
