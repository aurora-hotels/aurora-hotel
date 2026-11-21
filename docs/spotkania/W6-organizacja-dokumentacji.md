# W6 — Organizacja dokumentacji

Przeznaczenie: układ dokumentacji i podział informacji między narzędzia. Opiekun strony: Filip Włodarczyk.

| Data spotkania   | Uczestnicy           | Moderator        | Notatka        |
| ---------------- | -------------------- | ---------------- | -------------- |
| 8 listopada 2026 | Cały zespół (7 osób) | Filip Włodarczyk | Jesika Proczek |

## Pytanie

Jak szybko znaleźć potrzebny opis i gdzie zapisywać informacje, żeby nie utrzymywać sprzecznych kopii?

## Rozważane warianty

| Wariant | Opis                                                                                    | Argumenty                                                                    |
| ------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| A       | Osobne działy dla hotelu, masaży, fitness i voucherów.                                  | Wygodne dla pojedynczego systemu, ale wspólne informacje trzeba by powielać. |
| B       | Strony według rodzaju informacji: wymagania, plan, budowa aplikacji, testy i materiały. | Wymagania, plan, projekt, testy i materiały mają stałe miejsca.              |

## Decyzja

Podział według rodzaju informacji. W Jirze trzymamy zadania i wyniki odbioru, a opisy, instrukcje i ustalenia w dokumentacji. Poprawiamy istniejącą stronę, jeśli temat już na niej jest; nową tworzymy dla nowego tematu.

Uzasadnienie: Stałe miejsca ułatwiają wyszukiwanie. Tę samą informację zapisujemy raz, a z drugiego miejsca dajemy odnośnik, co zmniejsza ryzyko sprzecznych wersji.

## Rozbieżności

Rozbieżności dotyczyły podziału dokumentacji według aplikacji albo według rodzaju informacji. Przyjęliśmy podział tematyczny, żeby ułatwić wyszukiwanie dokumentów.

## Wdrożenie

[Spis dokumentacji](../README.md#spis-dokumentacji); zasady na stronie [Zespół](../zespol.md#jak-prowadzimy-dokumentację).

## Zmiana z 16 listopada 2026: dokumentacja w repozytorium

Na warsztacie przyjęliśmy, że opisy i instrukcje prowadzimy w Confluence. 16 listopada 2026 zespół zrezygnował z Confluence i przeniósł całą dokumentację do katalogu `docs/` w repozytorium. Podział według rodzaju informacji pozostał bez zmian; zmieniło się tylko narzędzie.

Co z tego wynika:

- dokumentacja i kod mają wspólną historię zmian, a poprawkę opisu można wysłać razem ze zmianą kodu;
- każdą zmianę widać w historii repozytorium razem z autorem i datą;
- prowadzący czyta dokumentację bez osobnego konta, bo repozytorium jest publiczne;
- odnośniki w opisach zadań w Jirze trzeba skierować na strony w `docs/`.

Argumenty poszczególnych osób są w tabeli stanowisk poniżej.

## Próba odnalezienia trzech materiałów

Próbę wykonuje osoba, która nie jest autorem szukanych opisów. Po przeniesieniu dokumentacji wykonaliśmy ją w repozytorium, 18 listopada 2026.

| Materiał do odnalezienia              | Gdzie powinien być                                              | Kto szukał       | Wynik i trudności                                                                                                  |
| ------------------------------------- | --------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| Kryteria akceptacji rezerwacji        | Jira, [KAN-9](https://zielinskiadis.atlassian.net/browse/KAN-9) | Filip Włodarczyk | Znalezione przez spis dokumentacji i odnośnik w [planie prac](../plan-prac.md); bez trudności                      |
| Opis budowy aplikacji i modelu danych | [Budowa aplikacji](../budowa-aplikacji.md)                      | Filip Włodarczyk | Znalezione od razu w spisie dokumentacji; bez trudności                                                            |
| Wynik próby przepływu pracy na KAN-2  | [Testy i odbiór](../testy-i-odbior.md#próba-przepływu-w-jirze)  | Filip Włodarczyk | Znalezione przez tabelę „Gdzie czego szukać”; trzeba było wiedzieć, że wynik jest na stronie testów, a nie w Jirze |

Wynik: wszystkie trzy materiały zostały odnalezione. Jedyną trudnością było miejsce wyniku próby na KAN-2, dlatego w tabeli „Gdzie czego szukać” na [stronie głównej dokumentacji](../README.md) jest osobny wiersz dla wyników prób.

## Stanowiska uczestników

Stanowiska spisał koordynator po warsztacie 8 listopada 2026: argument lub propozycja zgłoszona na spotkaniu oraz własne działanie wynikające z decyzji. Każda osoba sprawdza swój wiersz i poprawia go ze swojego konta, jeśli coś zapisano nieściśle.

| Osoba             | Propozycja lub argument                                                                                  | Własne działanie po decyzji                                                |
| ----------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Adrian Zieliński  | Według rodzaju treści; 16.11 za przeniesieniem do repozytorium, bo opis i kod mają wtedy jedną historię. | Przeniósł dokumentację do `docs/` i ustawił spis stron.                    |
| Piotr Świadek     | Według rodzaju treści: klient szuka zakresu w jednym miejscu.                                            | Opiekuje się stroną celu i zakresu.                                        |
| Rafał Świętkowski | Według rodzaju treści; za repozytorium, bo opis ekranu zmienia się razem z kodem.                        | Aktualizuje opis interfejsu w tym samym commicie co zmianę ekranu.         |
| Jesika Proczek    | Według rodzaju treści: materiały i wyniki prób mają stałe miejsce.                                       | Opiekuje się stroną materiałów i zasadami nazywania plików.                |
| Wiktoria Sobejko  | Według rodzaju treści: wymagania i model danych nie powinny się dublować.                                | Opiekuje się stronami wymagań i budowy aplikacji.                          |
| Andrii Yaremko    | Według aplikacji A/B/C/D: kontrakty z każdą grupą byłyby w jednym miejscu.                               | Przyjął podział tematyczny; kontrakty A/B/D są na jednej stronie w `api/`. |
| Filip Włodarczyk  | Według rodzaju treści; za repozytorium, bo wyniki testów są w tym samym miejscu co testy.                | Opiekuje się stroną testów i odbioru.                                      |

[← Rejestr spotkań](README.md)
