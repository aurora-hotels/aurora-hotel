# W7 — Zmiana zakresu i sytuacja problemowa

Przeznaczenie: reakcja na nową funkcję i opóźnienie, zasady zatwierdzania zmian. Opiekun strony: Jesika Proczek.

| Data spotkania   | Uczestnicy           | Moderator      | Notatka          |
| ---------------- | -------------------- | -------------- | ---------------- |
| 8 listopada 2026 | Cały zespół (7 osób) | Jesika Proczek | Adrian Zieliński |

## Pytanie

Rezerwacje się opóźniają, a w połowie etapu pojawia się prośba o eksport listy rezerwacji do CSV. Co wybieramy?

## Rozważane warianty

| Wariant | Opis                                                                                                                | Argumenty                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| A       | Odkładamy CSV i kończymy rezerwacje.                                                                                | Zachowuje pierwszeństwo głównej funkcji.                |
| B       | Dodajemy CSV, ale wskazujemy konkretną mniej ważną funkcję, którą odkładamy, oraz czas potrzebny na zmianę i testy. | Wymaga wskazania ograniczonego zakresu i kosztu zmiany. |

## Decyzja

W ćwiczeniu odkładamy CSV do ukończenia rezerwacji. Zasada na przyszłość: Piotr ocenia potrzebę, osoby wykonujące zmianę jej koszt, a Adrian zapisuje uzgodniony wpływ na plan. Nowej funkcji nie dodajemy bez wskazania, co w zamian odkładamy.

Uzasadnienie: Rezerwacja jest zależnością dla recepcji i integracji, więc jej opóźnienie przesuwa wszystko. Dodanie funkcji bez zmiany planu tylko zwiększyłoby obciążenie.

## Rozbieżności

Część zespołu rozważała dodanie eksportu CSV już w pierwszym etapie, pozostali jego odłożenie. Przyjęliśmy przesunięcie tej funkcji na później, żeby skupić się na rezerwacjach.

## Wdrożenie

[Wniosek o zmianę — ćwiczenie](cwiczenie-zmiana-zakresu-csv.md) powiązany z [KAN-9](https://zielinskiadis.atlassian.net/browse/KAN-9); zgłaszanie blokad opisuje strona [Zespół](../zespol.md#jak-pracujemy-z-zadaniami); ustalenia organizacyjne w [KAN-26](https://zielinskiadis.atlassian.net/browse/KAN-26).

## Stanowiska uczestników

Stanowiska spisał koordynator po warsztacie 8 listopada 2026: argument lub propozycja zgłoszona na spotkaniu oraz własne działanie wynikające z decyzji. Każda osoba sprawdza swój wiersz i poprawia go ze swojego konta, jeśli coś zapisano nieściśle.

| Osoba             | Propozycja lub argument                                                   | Własne działanie po decyzji                                           |
| ----------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Adrian Zieliński  | Odłożyć CSV: rezerwacja blokuje recepcję i integracje.                    | Zapisał w planie, że CSV jest poza pierwszym etapem.                  |
| Piotr Świadek     | Dodać CSV: recepcja chciałaby wyeksportować listę gości.                  | Zgodził się odłożyć CSV pod warunkiem powrotu do tematu po KAN-11.    |
| Rafał Świętkowski | Dodać CSV: sam przycisk eksportu jest mały.                               | Przyjął odłożenie; oszacował, że eksport wymaga też filtrów i testów. |
| Jesika Proczek    | Odłożyć CSV: każda nowa funkcja to nowe próby.                            | Przygotowała opis ćwiczenia ze zmianą zakresu.                        |
| Wiktoria Sobejko  | Odłożyć CSV: najpierw trzeba ustalić, które dane gości wolno eksportować. | Sprawdziła, jakie dane osobowe trafiłyby do pliku.                    |
| Andrii Yaremko    | Odłożyć CSV: opóźnienie KAN-9 przesunęłoby wszystko.                      | Skupił się na zapisie i zmianie rezerwacji.                           |
| Filip Włodarczyk  | Odłożyć CSV: eksport wymagałby osobnych testów.                           | Zapisał, jakie testy byłyby potrzebne dla eksportu.                   |

[← Rejestr spotkań](README.md)
