# W2 — Zakres pierwszej wersji

Przeznaczenie: zakres pierwszej wersji i lista funkcji odłożonych. Opiekun strony: Piotr Świadek.

| Data spotkania   | Uczestnicy           | Moderator     | Notatka          |
| ---------------- | -------------------- | ------------- | ---------------- |
| 8 listopada 2026 | Cały zespół (7 osób) | Piotr Świadek | Wiktoria Sobejko |

## Pytanie

Od jakich funkcji zaczynamy i z czego rezygnujemy, jeśli zabraknie czasu?

## Rozważane warianty

| Wariant | Opis                                                                                       | Argumenty                                                                      |
| ------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| A       | Najpierw konta, wolne pokoje i rezerwacja. Potem obsługa pobytu i usługi pozostałych grup. | Wcześniej można przejść cały podstawowy przebieg klienta.                      |
| B       | Pracujemy od razu nad wszystkimi funkcjami, także recepcją i integracjami.                 | Większy zakres od początku, lecz więcej zależności podczas pierwszego odbioru. |

## Decyzja

Najpierw pełna rezerwacja ([KAN-1](https://zielinskiadis.atlassian.net/browse/KAN-1), [KAN-7](https://zielinskiadis.atlassian.net/browse/KAN-7), [KAN-9](https://zielinskiadis.atlassian.net/browse/KAN-9)), następnie recepcja i integracje ([KAN-11](https://zielinskiadis.atlassian.net/browse/KAN-11), [KAN-13](https://zielinskiadis.atlassian.net/browse/KAN-13)). Eksport CSV i rozbudowane filtry odkładamy.

Uzasadnienie: Rezerwacja jest podstawą wszystkich pozostałych funkcji: recepcja i integracje pracują na zapisanym pobycie. Integracje należą do projektu; późniejszy etap nie oznacza rezygnacji z nich.

## Rozbieżności

Różnice zdań dotyczyły tego, czy realizować wszystkie funkcje jednocześnie, czy etapami. Przyjęliśmy etapy, zaczynając od kont, dostępności pokoi i rezerwacji.

## Wdrożenie

[Cel i zakres](../cel-i-zakres.md); epiki [KAN-4](https://zielinskiadis.atlassian.net/browse/KAN-4) i [KAN-6](https://zielinskiadis.atlassian.net/browse/KAN-6); etykiety `etap-1` i `pozniej` w Jirze.

## Stanowiska uczestników

Stanowiska spisał koordynator po warsztacie 8 listopada 2026: argument lub propozycja zgłoszona na spotkaniu oraz własne działanie wynikające z decyzji. Każda osoba sprawdza swój wiersz i poprawia go ze swojego konta, jeśli coś zapisano nieściśle.

| Osoba             | Propozycja lub argument                                                                       | Własne działanie po decyzji                                   |
| ----------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Adrian Zieliński  | Etapami: bez zapisanego pobytu nie da się sprawdzić recepcji ani integracji.                  | Ustawił etykiety `etap-1` i `pozniej` w Jirze.                |
| Piotr Świadek     | Etapami: dla klienta najważniejsza jest możliwość zarezerwowania pokoju.                      | Opisał zakres pierwszego etapu na stronie celu i zakresu.     |
| Rafał Świętkowski | Równolegle: ekrany recepcji można projektować, zanim powstanie API.                           | Zaczął od formularzy logowania i rezerwacji (KAN-17, KAN-20). |
| Jesika Proczek    | Etapami: łatwiej przetestować jeden pełny przebieg niż wiele połowicznych.                    | Przygotowała próby ręczne dla rezerwacji (KAN-22).            |
| Wiktoria Sobejko  | Etapami: model danych rezerwacji musi być gotowy przed recepcją.                              | Opisała reguły pobytu i model danych dla KAN-7 i KAN-9.       |
| Andrii Yaremko    | Równolegle: część serwera dla integracji można przygotować wcześniej w trybie demo.           | Zaczął od kont i zapisu rezerwacji (KAN-29, KAN-30).          |
| Filip Włodarczyk  | Etapami: testy automatyczne dla podstawowego przebiegu dają bezpieczną bazę na dalsze zmiany. | Przygotował testy logowania i rezerwacji (KAN-18).            |

[← Rejestr spotkań](README.md)
