# Podział pracy i odbiór

Ten podział pochodzi z aktualnej tabeli zespołu. Adrian prowadzi projekt i wykonuje także prace programistyczne, konfiguracyjne oraz integracyjne poza rolą koordynatora. Poniższa tabela opisuje odpowiedzialność za obszar i jego odbiór; nie zastępuje historii rzeczywiście wykonanych zmian.

| Osoba             | Rola wiodąca                                               | Co powinna umieć pokazać i sprawdzić                                                                                       |
| ----------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Adrian Zieliński  | Koordynator projektu; dodatkowo implementacja i integracja | Uruchomienie całości, kolejność prac, konfiguracja, przepływ między systemami. Backup: programista interfejsu użytkownika. |
| Piotr Świadek     | Przedstawiciel klienta                                     | Zakres i priorytety, rezerwacja z perspektywy gościa, warunki odbioru                                                      |
| Rafał Świętkowski | Programista interfejsu użytkownika                         | Ekrany, formularze, wywołania API, walidacja i komunikaty                                                                  |
| Jesika Proczek    | Tester manualny                                            | Odtworzenie scenariuszy, wyniki rzeczywistych prób i zgłoszenia błędów                                                     |
| Wiktoria Sobejko  | Analityk                                                   | Reguły rezerwacji, model danych, kontrakty API i ich uzgodnienie                                                           |
| Andrii Yaremko    | Programista backendu                                       | Kontrola uprawnień, transakcja rezerwacji, baza, API i obsługa błędów                                                      |
| Filip Włodarczyk  | Tester automatyczny                                        | Uruchomienie testów, przyczyny błędów, przypadki konfliktów i integracji                                                   |

## Jak zapisujemy własny wkład

Po wykonaniu konkretnej pracy każda osoba dopisuje swój wiersz. Nie wpisujemy kolegom fikcyjnych commitów, zatwierdzeń ani wyników testów. Jeśli kod przygotowano z pomocą narzędzi generujących kod, zapis obejmuje również zakres pomocy i sposób sprawdzenia wyniku, zgodnie z planem przedmiotu.

| Osoba                              | Zadanie i link do zmiany | Co sprawdzono samodzielnie | Pomoc narzędzi i własne poprawki | Data i wynik |
| ---------------------------------- | ------------------------ | -------------------------- | -------------------------------- | ------------ |
| Do uzupełnienia po wykonaniu pracy |                          |                            |                                  |              |

## Krótki przegląd zmiany

1. Przeczytaj zmieniony fragment i uruchom scenariusz, którego dotyczy.
2. Sprawdź co najmniej poprawne dane, błędne dane oraz brak wymaganych uprawnień.
3. Zapisz komendę/test lub kroki wykonane w przeglądarce.
4. Jeśli coś nie działa, podaj dane wejściowe, wynik oczekiwany i wynik faktyczny.
5. Dopiero wtedy potwierdź odbiór swojej części.

Zadania i statusy pozostają w [Jirze](https://zielinskiadis.atlassian.net/jira/software/projects/KAN/list), a wspólne ustalenia w [Confluence](https://zielinskiadis.atlassian.net/wiki/spaces/KAN). Dokumentacja uruchomienia i API znajduje się przy kodzie, żeby aktualizować ją razem ze zmianą aplikacji.

## Aktualizacja strony głównej wiki

2 listopada zaktualizowano wymagania, architekturę, testy, plan, dokumenty i zespół. Odczyt wersji roboczej strony głównej zwracał HTTP 500, dlatego jej treści nie nadpisano. Adrian może zastąpić na [stronie głównej](https://zielinskiadis.atlassian.net/wiki/spaces/KAN/pages/65962) akapit „Na razie mamy plan…” poniższym tekstem:

> Mamy przygotowaną lokalną wersję Aurora Hotels: konta, rezerwację pokoi, panel recepcji, pakiety i administrację. Kod oraz instrukcje uruchomienia i API są w [repozytorium](https://github.com/aurora-hotels/aurora-hotel). Połączenia A/B/D można sprawdzić w trybie demo. Wspólna próba z rzeczywistymi aplikacjami innych grup oraz indywidualny odbiór przez członków zespołu pozostają do potwierdzenia.
