# W5 — Podział odpowiedzialności i zastępstwa

Przeznaczenie: podział odpowiedzialności, zastępstwa i kontrola obciążenia. Opiekun strony: Rafał Świętkowski.

| Data spotkania   | Uczestnicy           | Moderator         | Notatka          |
| ---------------- | -------------------- | ----------------- | ---------------- |
| 8 listopada 2026 | Cały zespół (7 osób) | Rafał Świętkowski | Filip Włodarczyk |

## Pytanie

Jak podzielić zadania i nie uzależnić całego projektu od jednej osoby?

## Rozważane warianty

| Wariant | Opis                                                                                     | Argumenty                                                           |
| ------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| A       | Każda osoba prowadzi swój obszar, a gdy potrzebuje pomocy, uzgadnia ją z resztą zespołu. | Jasna odpowiedzialność, lecz potrzebne są zastępstwa.               |
| B       | Wszystkie zadania wykonujemy wspólnie, bez stałych obszarów odpowiedzialności.           | Szersza znajomość projektu, ale trudniejsze rozliczenie obciążenia. |

## Decyzja

Każdy obszar ma osobę odpowiedzialną, ale można pracować poza swoją rolą. Adrian prowadzi koordynację, pomaga także przy aplikacji i jest zastępcą w obszarze interfejsu i serwera. Pozostałe zastępstwa są w tabeli poniżej.

Uzasadnienie: Opiekun daje jasną odpowiedzialność za obszar, a pomoc poza rolą zmniejsza ryzyko, że wiedza zostanie u jednej osoby i zabraknie zastępstwa. Przy trudniejszej części dopuszczamy pracę w parze.

## Rozbieżności

Część zespołu wolała stały podział obowiązków, inni wspólną realizację zadań. Przyjęliśmy osoby odpowiedzialne z możliwością wzajemnego wsparcia.

## Wdrożenie

Role na stronie [Zespół](../zespol.md#skład-i-role); przypisania kart w Jirze według [planu prac](../plan-prac.md#backlog-w-jirze). Koordynator porównuje obciążenie i zależności na cotygodniowym spotkaniu, na podstawie tablicy (jedna aktywna karta na osobę). Przy blokadzie ustalamy, czy zmienić osobę albo kolejność pracy.

## Zastępstwa

| Osoba             | Obszar                    | Zastępstwo       |
| ----------------- | ------------------------- | ---------------- |
| Adrian Zieliński  | Koordynacja               | Piotr Świadek    |
| Piotr Świadek     | Zakres i potrzeby klienta | Wiktoria Sobejko |
| Rafał Świętkowski | Interfejs                 | Adrian Zieliński |
| Jesika Proczek    | Testy ręczne              | Filip Włodarczyk |
| Wiktoria Sobejko  | Wymagania i model danych  | Piotr Świadek    |
| Andrii Yaremko    | Serwer i API              | Adrian Zieliński |
| Filip Włodarczyk  | Testy automatyczne        | Jesika Proczek   |

## Stanowiska uczestników

Stanowiska spisał koordynator po warsztacie 8 listopada 2026: argument lub propozycja zgłoszona na spotkaniu oraz własne działanie wynikające z decyzji. Każda osoba sprawdza swój wiersz i poprawia go ze swojego konta, jeśli coś zapisano nieściśle.

| Osoba             | Propozycja lub argument                                                                    | Własne działanie po decyzji                                                     |
| ----------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Adrian Zieliński  | Opiekunowie obszarów z zastępstwami: ktoś musi odpowiadać za każdą część.                  | Jest zastępcą w interfejsie i backendzie; prowadzi listę zastępstw.             |
| Piotr Świadek     | Wspólna realizacja: każdy powinien znać przebieg rezerwacji.                               | Sprawdza rezerwację z perspektywy klienta; zastępuje Wiktorię przy wymaganiach. |
| Rafał Świętkowski | Stały podział: frontend wymaga ciągłości w jednym stylu ekranów.                           | Odpowiada za ekrany; przy blokadzie przekazuje kartę Adrianowi.                 |
| Jesika Proczek    | Stały podział: próby ręczne wymagają znajomości aplikacji.                                 | Odpowiada za próby ręczne; zastępuje ją Filip.                                  |
| Wiktoria Sobejko  | Wspólna realizacja: wiedza o regułach nie może zostać u jednej osoby.                      | Opisała reguły w dokumentacji; zastępuje ją Piotr.                              |
| Andrii Yaremko    | Stały podział: backend z uprawnieniami i transakcjami wymaga jednej osoby odpowiedzialnej. | Odpowiada za serwer; zastępuje go Adrian.                                       |
| Filip Włodarczyk  | Stały podział z wymianą między testerami.                                                  | Odpowiada za testy automatyczne; zastępuje go Jesika.                           |

[← Rejestr spotkań](README.md)
