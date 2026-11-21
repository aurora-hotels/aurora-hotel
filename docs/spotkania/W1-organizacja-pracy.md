# W1 — Sposób organizacji pracy

Przeznaczenie: wybór sposobu pracy i rytmu planowania. Opiekun strony: Adrian Zieliński.

| Data spotkania   | Uczestnicy           | Moderator        | Notatka       |
| ---------------- | -------------------- | ---------------- | ------------- |
| 8 listopada 2026 | Cały zespół (7 osób) | Adrian Zieliński | Piotr Świadek |

## Pytanie

Jak dzielimy pracę, żeby pogodzić projekt z zajęciami i z zależnością od innych grup?

## Rozważane warianty

| Wariant | Opis                                                                                            | Argumenty                                                                                                   |
| ------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| A       | Tygodniowe sprinty: na początku wybieramy cały zestaw zadań, a pod koniec sprawdzamy wynik.     | Ułatwiają planowanie wspólnego etapu, ale wymagają przewidywalnej dostępności.                              |
| B       | Kanban z krótkim spotkaniem raz w tygodniu: bierzemy kolejne zadanie, gdy skończymy poprzednie. | Ułatwia zmianę kolejności przy zależności od innych grup, ale wymaga ograniczenia liczby rozpoczętych prac. |

## Decyzja

Kanban. Każda osoba prowadzi jedno zadanie naraz i zgłasza blokadę w komentarzu. Raz w tygodniu na Teams sprawdzamy postęp i wybieramy najbliższe prace.

Uzasadnienie: Kolejność prac zależy od dostępności osób i od tego, kiedy grupy A, B i D udostępnią swoje API. Kanban pozwala ją zmieniać bez przerywania zaplanowanego sprintu.

## Rozbieżności

Część zespołu wolała tygodniowe sprinty, pozostali Kanban ze względu na większą elastyczność. Przyjęliśmy Kanban z cotygodniowym przeglądem postępów, który daje stały rytm bez sztywnego zakresu.

## Wdrożenie

Tablica Kanban w Jirze z pięcioma kolumnami; zasady na stronie [Zespół](../zespol.md#jak-pracujemy-z-zadaniami); kolejność w [planie prac](../plan-prac.md).

## Stanowiska uczestników

Stanowiska spisał koordynator po warsztacie 8 listopada 2026: argument lub propozycja zgłoszona na spotkaniu oraz własne działanie wynikające z decyzji. Każda osoba sprawdza swój wiersz i poprawia go ze swojego konta, jeśli coś zapisano nieściśle.

| Osoba             | Propozycja lub argument                                                                      | Własne działanie po decyzji                                                          |
| ----------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Adrian Zieliński  | Kanban: kolejność prac zależy od terminów grup A, B i D, których nie znamy z góry.           | Ustawił tablicę Kanban i prowadzi cotygodniowy przegląd.                             |
| Piotr Świadek     | Kanban: priorytety klienta mogą się zmieniać w trakcie, a sprint by je zamroził.             | Zgłasza zmianę priorytetu na przeglądzie, a nie w trakcie cudzej pracy.              |
| Rafał Świętkowski | Kanban: ekrany zależą od gotowego API, więc łatwiej brać kolejną kartę, gdy API jest gotowe. | Bierze kolejną kartę interfejsu dopiero po zamknięciu poprzedniej.                   |
| Jesika Proczek    | Sprinty: stały termin odbioru ułatwia zaplanowanie prób ręcznych.                            | Zgłasza, które karty czekają na próbę, na cotygodniowym przeglądzie.                 |
| Wiktoria Sobejko  | Sprinty: wspólny zakres tygodnia ułatwia uzgadnianie wymagań z całym zespołem.               | Przed przeglądem sprawdza, czy karty w „Do zrobienia” mają kryteria.                 |
| Andrii Yaremko    | Kanban, ale z limitem jednej rozpoczętej karty na osobę, żeby nic nie wisiało w połowie.     | Pracuje na jednej karcie naraz i zgłasza blokady w komentarzu.                       |
| Filip Włodarczyk  | Sprinty: testy łatwiej zgrać z końcem sprintu.                                               | Uruchamia testy przy każdym przejściu karty do weryfikacji, a nie na koniec sprintu. |

[← Rejestr spotkań](README.md)
