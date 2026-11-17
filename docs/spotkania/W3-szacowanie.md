# W3 — Priorytety i szacowanie historyjek

Przeznaczenie: priorytety, skala szacowania i kolejność realizacji. Opiekun strony: Wiktoria Sobejko.

| Data spotkania   | Uczestnicy           | Moderator        | Notatka        |
| ---------------- | -------------------- | ---------------- | -------------- |
| 8 listopada 2026 | Cały zespół (7 osób) | Wiktoria Sobejko | Andrii Yaremko |

## Pytanie

W czym szacujemy historyjki i jak ustalamy ich kolejność?

## Rozważane warianty

| Wariant | Opis                               | Argumenty                                                                                   |
| ------- | ---------------------------------- | ------------------------------------------------------------------------------------------- |
| A       | Szacujemy czas w godzinach.        | Łatwo odnieść wynik do kalendarza, ale trzeba znać dostępność i doświadczenie każdej osoby. |
| B       | Używamy punktów 1, 2, 3, 5, 8, 13. | Porównują wielkość i niepewność zadań, ale nie dają bezpośrednio terminu.                   |

## Decyzja

Punkty. Nie przeliczamy ich wprost na godziny. Szacujemy całą historyjkę, bez ponownego doliczania jej podzadań. Przyjęte wyceny: KAN-1 — 5, KAN-7 — 5, KAN-9 — 8, KAN-11 — 5, KAN-13 — 13. Priorytet High mają historyjki pierwszego etapu, Medium pozostałe.

Uzasadnienie: Punkty lepiej oddają złożoność i niepewność niż godziny. KAN-9 obejmuje zapis, zmianę i anulowanie rezerwacji, walidację oraz testy, a nie tylko formularz. W KAN-13 uwzględniamy uzgodnienie kontraktów i sytuację, w której serwer innej grupy nie odpowiada.

## Rozbieżności

Część zespołu wolała wycenę w godzinach, pozostali w punktach. Przyjęliśmy punkty, ponieważ lepiej uwzględniają złożoność zadań. Rozbieżności w samych wycenach opisuje punkt [Indywidualne wyceny](#indywidualne-wyceny).

## Wdrożenie

Pole „Story point estimate” w pięciu historyjkach w Jirze; zestawienie w [planie prac](../plan-prac.md#wyceny-i-kolejność).

## Indywidualne wyceny

Każda osoba najpierw wyceniła historyjki niezależnie, potem porównaliśmy wyniki. Ostatnia kolumna pokazuje wartości zmienione po rozmowie; po niej wszyscy przyjęli wyceny 5, 5, 8, 5 i 13.

| Osoba             | KAN-1 | KAN-7 | KAN-9 | KAN-11 | KAN-13 | Po rozmowie                               |
| ----------------- | ----- | ----- | ----- | ------ | ------ | ----------------------------------------- |
| Adrian Zieliński  | 5     | 3     | 8     | 5      | 13     | KAN-7: 5                                  |
| Piotr Świadek     | 3     | 3     | 5     | 5      | 5      | KAN-1: 5, KAN-7: 5, KAN-9: 8, KAN-13: 13  |
| Rafał Świętkowski | 3     | 5     | 5     | 3      | 8      | KAN-1: 5, KAN-9: 8, KAN-11: 5, KAN-13: 13 |
| Jesika Proczek    | 5     | 5     | 8     | 8      | 13     | KAN-11: 5                                 |
| Wiktoria Sobejko  | 5     | 5     | 8     | 5      | 8      | KAN-13: 13                                |
| Andrii Yaremko    | 5     | 8     | 13    | 5      | 13     | KAN-7: 5, KAN-9: 8                        |
| Filip Włodarczyk  | 3     | 5     | 8     | 5      | 13     | KAN-1: 5                                  |

Największe rozbieżności:

- **KAN-13** (od 5 do 13). Piotr ocenił 5, bo z punktu widzenia klienta to „tylko” zamówienie masażu i treningu. Adrian i Andrii ocenili 13, bo trzeba uzgodnić kontrakty z trzema grupami i obsłużyć sytuację, w której serwer partnera nie odpowiada. Zespół przyjął 13: niepewność zależy od innych grup, a nie od nas.
- **KAN-9** (od 5 do 13). Rafał i Piotr ocenili 5, licząc głównie formularz. Andrii ocenił 13, bo historyjka obejmuje też zmianę terminu, anulowanie i ochronę przed podwójną rezerwacją. Po rozmowie przyjęliśmy 8: formularz i zapis są proste, ale równoległe rezerwacje i zmiany wymagają testów.

## Stanowiska uczestników

Stanowiska spisał koordynator po warsztacie 8 listopada 2026: argument lub propozycja zgłoszona na spotkaniu oraz własne działanie wynikające z decyzji. Każda osoba sprawdza swój wiersz i poprawia go ze swojego konta, jeśli coś zapisano nieściśle.

| Osoba             | Propozycja lub argument                                                               | Własne działanie po decyzji                                                    |
| ----------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Adrian Zieliński  | Punkty: KAN-13 zależy od innych grup, więc godziny byłyby zgadywaniem.                | Wpisał uzgodnione punkty do pięciu historyjek w Jirze.                         |
| Piotr Świadek     | Godziny: łatwiej je zrozumieć osobie spoza programowania.                             | Przyjął punkty; przy priorytetach ocenia potrzebę klienta, nie liczbę punktów. |
| Rafał Świętkowski | Godziny: przy formularzach łatwo oszacować czas.                                      | Podniósł wycenę KAN-9 po omówieniu walidacji i zmiany terminu.                 |
| Jesika Proczek    | Godziny: łatwiej zaplanować czas na próby.                                            | Przyjęła punkty; do wyceny dolicza czas prób w przeglądarce.                   |
| Wiktoria Sobejko  | Punkty: lepiej oddają niepewność integracji niż godziny.                              | Podniosła wycenę KAN-13 po omówieniu awarii serwera partnera.                  |
| Andrii Yaremko    | Punkty: KAN-9 to nie tylko formularz, ale też równoległe rezerwacje i zmiany terminu. | Przedstawił najwyższą wycenę KAN-9 i jej założenia.                            |
| Filip Włodarczyk  | Punkty: wycena powinna obejmować testy, a nie tylko kod.                              | Podniósł wycenę KAN-1 po doliczeniu testów sesji i haseł.                      |

[← Rejestr spotkań](README.md)
