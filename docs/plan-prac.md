# Plan prac

Przeznaczenie: etapy, kamienie milowe, kolejność i wyceny oraz odnośniki do backlogu. Opiekun: Adrian Zieliński.

Najpierw przygotowujemy działającą wersję hotelu, potem podłączamy projekty A, B i D. Wersja lokalna jest gotowa. Wspólny scenariusz wymaga uzgodnienia połączeń z pozostałymi grupami.

## Etapy

| Etap                       | Zakres                                                                       | Jak sprawdzamy                                                   | Stan na 19.11.2026                            |
| -------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| 1. Uruchomienie projektu   | Konfiguracja, skrypty, baza, serwer i interfejs                              | Instalacja w pustym katalogu                                     | Wykonane, w weryfikacji (KAN-23)              |
| 2. Rezerwacje              | Konta, pokoje, dostępność, ceny i pakiety                                    | Uprawnienia, daty, wycena i równoczesny zapis tego samego pokoju | Wykonane, w weryfikacji (KAN-1, KAN-7, KAN-9) |
| 3. Obsługa hotelu          | Zmiany i anulowanie pobytu, zameldowanie, wymeldowanie, panel administratora | Przejścia stanów i formularze                                    | Wykonane, w weryfikacji (KAN-11)              |
| 4. Połączenia z partnerami | Usługi A/B, vouchery D, klucze i tryb demo                                   | Rezerwacja usługi, odmowa, przekroczenie czasu i ponowienie      | Wykonane w trybie demo (KAN-13)               |
| 5. Interfejs               | Ekrany klienta, recepcji i administratora                                    | Testy w przeglądarce i na wąskim ekranie                         | Wykonane, w weryfikacji                       |
| 6. Dokumentacja i poprawki | API, opis aplikacji, wyniki testów, projekt endpointów, API wewnętrzne       | Build i ponowne testy, obraz Docker                              | Wykonane                                      |
| 7. Wspólna próba           | Uruchomione aplikacje A, B i C; D w trybie demo (brak grupy D)               | Rezerwacja, usługi A/B, przebieg vouchera w trybie demo          | Czeka na adresy i klucze grup A i B           |

„W weryfikacji” oznacza status „W trakcie weryfikacji” w Jirze: praca jest wykonana, ale druga osoba nie zapisała jeszcze wyniku odbioru. Szczegóły wymagań F-01–F-13 są w [wymaganiach](wymagania.md), a wyniki testów w [testach i odbiorze](testy-i-odbior.md).

## Kamienie milowe

Wykonane:

| Data       | Co się stało                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------ |
| 11.10.2026 | Notebook z planem projektu C, wersja 0.2                                                         |
| 25.10.2026 | Konfiguracja Jiry, pierwszy backlog i próba przepływu na [KAN-2]                                 |
| 02.11.2026 | Lokalna wersja aplikacji w repozytorium; 70 testów serwera i 6 testów w przeglądarce zaliczonych |
| 08.11.2026 | Warsztat decyzji zespołowych [W1–W7](spotkania/README.md)                                        |
| 16.11.2026 | Przegląd kodu z poprawkami, przeniesienie dokumentacji do repozytorium, [projekt endpointów API] |
| 19.11.2026 | API wewnętrzne W-01–W-05, praca bez projektu D, obraz Docker sprawdzony, instrukcja wdrożenia    |

Przed nami:

| Kamień milowy                | Warunek                                                      | Odpowiedzialny      |
| ---------------------------- | ------------------------------------------------------------ | ------------------- |
| Uzgodnione kontrakty z A i B | Wypełniona tabela ustaleń w [kontraktach](api/integracje.md) | Adrian, Wiktoria    |
| Aplikacja na serwerze VPS    | Kroki z [instrukcji wdrożenia](wdrozenie-vps.md)             | Adrian              |
| Wspólna próba A/B/C          | Zapisany protokół wspólnego testu                            | Adrian              |
| Pokaz na zajęciach           | Przećwiczony [scenariusz pokazu](demo.md)                    | Adrian, cały zespół |

Daty tych kamieni wpiszemy po ustaleniu terminów z prowadzącym i pozostałymi grupami. Notebook zakładał orientacyjnie sześć tygodniowych iteracji: przygotowanie, rezerwacje, recepcja, połączenia usług, vouchery oraz testy i pokaz.

[KAN-2]: https://zielinskiadis.atlassian.net/browse/KAN-2
[projekt endpointów API]: api/projekt-endpointow.md

## Backlog w Jirze

[Tablica i lista zadań](https://zielinskiadis.atlassian.net/jira/software/projects/KAN/list) zawiera 17 kart: 2 epiki, 5 historyjek, 7 podzadań i 3 zadania.

| Karta                                                       | Typ        | Tytuł                                  | Osoba             | Priorytet | Punkty | Etap    |
| ----------------------------------------------------------- | ---------- | -------------------------------------- | ----------------- | --------- | ------ | ------- |
| [KAN-4](https://zielinskiadis.atlassian.net/browse/KAN-4)   | Epik       | Konta i rezerwacja pokoju              | —                 | High      | —      | etap-1  |
| [KAN-1](https://zielinskiadis.atlassian.net/browse/KAN-1)   | Historyjka | Konto klienta                          | Andrii Yaremko    | High      | 5      | etap-1  |
| [KAN-17](https://zielinskiadis.atlassian.net/browse/KAN-17) | Podzadanie | Formularze logowania i rejestracji     | Rafał Świętkowski | High      | —      | etap-1  |
| [KAN-18](https://zielinskiadis.atlassian.net/browse/KAN-18) | Podzadanie | Testy logowania i rezerwacji           | Filip Włodarczyk  | High      | —      | etap-1  |
| [KAN-29](https://zielinskiadis.atlassian.net/browse/KAN-29) | Podzadanie | Obsługa kont na serwerze               | Andrii Yaremko    | High      | —      | etap-1  |
| [KAN-7](https://zielinskiadis.atlassian.net/browse/KAN-7)   | Historyjka | Pokoje, terminy i ceny                 | Wiktoria Sobejko  | High      | 5      | etap-1  |
| [KAN-9](https://zielinskiadis.atlassian.net/browse/KAN-9)   | Historyjka | Rezerwacja, zmiana i anulowanie pobytu | Andrii Yaremko    | High      | 8      | etap-1  |
| [KAN-20](https://zielinskiadis.atlassian.net/browse/KAN-20) | Podzadanie | Formularz rezerwacji pokoju            | Rafał Świętkowski | High      | —      | etap-1  |
| [KAN-22](https://zielinskiadis.atlassian.net/browse/KAN-22) | Podzadanie | Rezerwacje: próby w przeglądarce       | Jesika Proczek    | High      | —      | etap-1  |
| [KAN-30](https://zielinskiadis.atlassian.net/browse/KAN-30) | Podzadanie | Zapis rezerwacji w bazie               | Andrii Yaremko    | High      | —      | etap-1  |
| [KAN-23](https://zielinskiadis.atlassian.net/browse/KAN-23) | Zadanie    | Uruchomienie projektu i testów         | Adrian Zieliński  | High      | —      | etap-1  |
| [KAN-6](https://zielinskiadis.atlassian.net/browse/KAN-6)   | Epik       | Recepcja i połączenia z innymi grupami | —                 | High      | —      | pozniej |
| [KAN-11](https://zielinskiadis.atlassian.net/browse/KAN-11) | Historyjka | Recepcja i pakiety pobytu              | Piotr Świadek     | Medium    | 5      | pozniej |
| [KAN-13](https://zielinskiadis.atlassian.net/browse/KAN-13) | Historyjka | Masaże, treningi i vouchery przez API  | Adrian Zieliński  | Medium    | 13     | pozniej |
| [KAN-26](https://zielinskiadis.atlassian.net/browse/KAN-26) | Zadanie    | Ustalenia zespołu i sprawozdanie       | Adrian Zieliński  | High      | —      | etap-1  |
| [KAN-3](https://zielinskiadis.atlassian.net/browse/KAN-3)   | Podzadanie | Dostęp zespołu do Jiry i repozytorium  | Adrian Zieliński  | —         | —      | etap-1  |
| [KAN-2](https://zielinskiadis.atlassian.net/browse/KAN-2)   | Zadanie    | Próba tablicy Jira                     | Adrian Zieliński  | —         | —      | —       |

KAN-23 jest zadaniem w epiku KAN-4, a KAN-3 podzadaniem KAN-26.

## Wyceny i kolejność

Wyceny przyjęliśmy na spotkaniu [W3](spotkania/W3-szacowanie.md): KAN-1 — 5, KAN-7 — 5, KAN-9 — 8, KAN-11 — 5, KAN-13 — 13 punktów. Punkty dotyczą całej historyjki, nie godzin.

Kolejność: konta i pokoje mogły powstawać równolegle, potem rezerwacja, recepcja i integracje. Zależności:

- KAN-9 (rezerwacja) wymaga konta klienta z KAN-1 i dostępności pokoi z KAN-7.
- KAN-11 (recepcja) i KAN-13 (integracje) korzystają z zapisanego pobytu z KAN-9.
- KAN-13 zależy od grup A, B i D: bez ich adresów i kontraktów kończymy pracę na trybie demo.

## Wspólna integracja

Najbliższy etap obejmuje postawienie aplikacji na serwerze, uzgodnienie adresów, kluczy i kontraktów z grupami A i B oraz próbę na ich aplikacjach. Projektu D w grupie nie ma, więc vouchery pokazujemy w trybie demo. Koordynacja: Adrian. Porównanie struktur danych: Wiktoria. Wynik wspólnego scenariusza i ewentualne różnice w API nie są jeszcze potwierdzone. Kroki przejścia z trybu demo do realnej próby opisują [kontrakty](api/integracje.md#jak-przejść-z-demo-do-realnej-próby).
