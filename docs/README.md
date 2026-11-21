# Dokumentacja projektu Aurora Hotels

Aurora Hotels to projekt C z przedmiotu Projekt Zespołowy: aplikacja do rezerwowania pokoi i obsługi pobytu w jednym hotelu, połączona z masażami (projekt A), zajęciami fitness (projekt B) i voucherami (projekt D). Pracujemy wyłącznie na danych fikcyjnych.

Od 16 listopada 2026 cała dokumentacja zespołu jest w tym katalogu. Wcześniej prowadziliśmy ją w Confluence; treść została przeniesiona, poprawiona i uzgodniona z kodem oraz Jirą. Zadania nadal prowadzimy w [Jirze](https://zielinskiadis.atlassian.net/jira/software/projects/KAN/list).

Opiekun strony: Adrian Zieliński.

## Stan projektu

- Aplikacja jest kompletna: konta, rezerwacje, recepcja, pakiety, administracja, API dla innych grup i API usług wewnętrznych (monitoring, harmonogram, kopie zapasowe).
- Działa lokalnie i w kontenerze Docker; instrukcja dla serwera VPS jest gotowa.
- Połączenia z A, B i D są sprawdzone w trybie demo oraz na lokalnych serwerach HTTP. W naszej grupie nie ma projektu D: połączenie z D działa w trybie demo i można je wyłączyć bez wpływu na resztę aplikacji.
- Wspólna próba z rzeczywistymi aplikacjami grup A i B wymaga ich adresów i kluczy.

Szczegóły i wyniki testów: [Testy i odbiór](testy-i-odbior.md).

## Zespół

Adrian Zieliński (koordynator), Piotr Świadek, Wiktoria Sobejko, Andrii Yaremko, Rafał Świętkowski, Filip Włodarczyk i Jesika Proczek. Role i zasady współpracy opisuje strona [Zespół](zespol.md).

## Spis dokumentacji

| Obszar                | Strona                                                                                                                                                                                                                  | Co zawiera                                                          | Opiekun                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------- |
| Cel i zakres          | [Cel i zakres](cel-i-zakres.md)                                                                                                                                                                                         | Problem, odbiorcy, funkcje, wyłączenia z zakresu                    | Piotr Świadek                    |
| Zespół i współpraca   | [Zespół](zespol.md)                                                                                                                                                                                                     | Role, zasady pracy z zadaniami i dokumentacją, dostęp               | Adrian Zieliński                 |
| Wymagania             | [Wymagania aplikacji](wymagania.md)                                                                                                                                                                                     | Wymagania F-01–F-13, reguły pobytu, wymagania pozafunkcjonalne      | Wiktoria Sobejko                 |
| Plan prac             | [Plan prac](plan-prac.md)                                                                                                                                                                                               | Etapy, kamienie milowe, backlog i wyceny                            | Adrian Zieliński                 |
| Projekt rozwiązania   | [Budowa aplikacji](budowa-aplikacji.md), [Konfiguracja](konfiguracja.md), [Wdrożenie na VPS](wdrozenie-vps.md)                                                                                                          | Moduły, model danych, transakcje, uruchomienie, zmienne i wdrożenie | Wiktoria Sobejko                 |
| API                   | [API hotelu](api/README.md), [Kontrakty A/B/D](api/integracje.md), [Projekt endpointów](api/projekt-endpointow.md), [Karty endpointów](api/karty-endpointow.md), [OpenAPI], [OpenAPI wewnętrzne](openapi-internal.yaml) | Instrukcja dla innych grup, role i uprawnienia, katalog operacji    | Adrian Zieliński, Andrii Yaremko |
| Spotkania i decyzje   | [Spotkania](spotkania/README.md)                                                                                                                                                                                        | Rejestr decyzji W1–W7, pytania o pracę zespołu, ćwiczenie ze zmian  | Adrian Zieliński                 |
| Testy i odbiór        | [Testy i odbiór](testy-i-odbior.md), [Testy ręczne](testy-manualne.md), [Scenariusz pokazu](demo.md)                                                                                                                    | Wyniki, pokrycie T-01–T-26, próby ręczne, zgłaszanie błędów         | Filip Włodarczyk, Jesika Proczek |
| Dokumenty i materiały | [Materiały](materialy/README.md)                                                                                                                                                                                        | Materiały źródłowe, zasady nazywania i wersjonowania plików         | Jesika Proczek                   |

[OpenAPI]: openapi.yaml

## Gdzie czego szukać

| Potrzebuję…                                       | Miejsce                                                                      |
| ------------------------------------------------- | ---------------------------------------------------------------------------- |
| Uruchomić aplikację albo zmienić ustawienia       | [README repozytorium](../README.md), [Konfiguracja](konfiguracja.md)         |
| Wywołać API hotelu z innego projektu              | [API hotelu](api/README.md)                                                  |
| Sprawdzić, kto może wykonać daną operację         | [Projekt endpointów](api/projekt-endpointow.md)                              |
| Poznać dokładne pola żądania i odpowiedzi         | [Karty endpointów](api/karty-endpointow.md), [OpenAPI], lokalnie `/api/docs` |
| Uzgodnić połączenie z A, B lub D                  | [Kontrakty A/B/D](api/integracje.md)                                         |
| Zrozumieć kod i bazę danych                       | [Budowa aplikacji](budowa-aplikacji.md)                                      |
| Znaleźć kryteria historyjki                       | Jira, np. [KAN-9](https://zielinskiadis.atlassian.net/browse/KAN-9)          |
| Sprawdzić, co i dlaczego ustalił zespół           | [Spotkania](spotkania/README.md)                                             |
| Zobaczyć wyniki testów albo zgłosić błąd          | [Testy i odbiór](testy-i-odbior.md)                                          |
| Znaleźć wynik próby, np. przepływu na KAN-2       | [Testy i odbiór](testy-i-odbior.md#próba-przepływu-w-jirze)                  |
| Postawić aplikację na serwerze VPS                | [Wdrożenie na VPS](wdrozenie-vps.md)                                         |
| Uruchomić monitoring, harmonogram lub kopie       | [Konfiguracja](konfiguracja.md#usługi-wewnętrzne)                            |
| Przygotować pokaz na zajęcia                      | [Scenariusz pokazu](demo.md)                                                 |
| Znaleźć plan źródłowy albo polecenie prowadzącego | [Materiały](materialy/README.md)                                             |

## Co jest w Jirze, a co tutaj

- **Jira**: zadania, kryteria akceptacji historyjek, osoby odpowiedzialne, statusy, wyniki odbioru i zgłoszenia błędów.
- **Repozytorium, katalog `docs/`**: wszystko, co ma być prawdą dłużej niż jedno zadanie: zakres, wymagania, plan, projekt rozwiązania, API, decyzje i wyniki testów.
- **Repozytorium, kod**: aplikacja, testy i kontrakt [OpenAPI].

Tę samą informację zapisujemy w jednym miejscu, a z drugiego dajemy odnośnik. Zasady aktualizacji opisuje strona [Zespół](zespol.md#jak-prowadzimy-dokumentację).
