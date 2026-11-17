# Dokumenty i materiały

Przeznaczenie: materiały źródłowe oraz zasady przechowywania, nazywania i wersjonowania plików. Opiekun: Jesika Proczek.

## Materiały źródłowe

| Materiał                                                          | Gdzie jest                                                                               | Uwagi                                                                         |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Notebook „Projekt C — specyfikacja i plan realizacji”, wersja 0.2 | [Projekt_C_specyfikacja_do_rewizji.ipynb](Projekt_C_specyfikacja_do_rewizji.ipynb)       | Plan sprzed implementacji; aktualny stan opisują [wymagania](../wymagania.md) |
| Polecenia i szablony sprawozdań od prowadzącego (zadanie 1 i 2)   | Otrzymane od prowadzącego; kopie z zadania 1 są załącznikami dawnej strony w Confluence  | Nie kopiujemy ich do publicznego repozytorium                                 |
| Prezentacje prowadzącego (prezentacja 1 i 2)                      | Otrzymane od prowadzącego; wspólne miejsce przechowywania jest do ustalenia              | Nie kopiujemy ich do publicznego repozytorium                                 |
| Sprawozdania zespołu                                              | Oddawane prowadzącemu osobno, poza repozytorium                                          | Zasady nazywania poniżej                                                      |
| Kontrakt API                                                      | [openapi.yaml](../openapi.yaml)                                                          | Źródło prawdy dla pól żądań i odpowiedzi                                      |
| Zadania                                                           | [Jira, projekt KAN](https://zielinskiadis.atlassian.net/jira/software/projects/KAN/list) | 2 epiki, 5 historyjek, 7 podzadań, 3 zadania                                  |

Notebook otwiera się bezpośrednio na GitHubie albo w Google Colab. Zawiera wyłącznie dane demonstracyjne. Tabele akceptacji i rejestr uwag w notebooku pozostały puste; ustalenia zespołu zapisujemy teraz w [spotkaniach](../spotkania/README.md).

## Podsumowanie projektu

Aurora Hotels to studencki projekt C: rezerwacje pokoi, obsługa pobytu, pakiety i połączenia z masażami A, fitness B oraz voucherami D. Aplikacja lokalna jest gotowa; testy obejmują tryb demo i lokalne API partnerów. Wspólna integracja z A, B i D, ręczny odbiór i imienne wpisy z warsztatu pozostają do uzupełnienia. Projekt nie obejmuje płatności ani faktur.

| Temat               | Strona                                     |
| ------------------- | ------------------------------------------ |
| Zakres              | [Cel i zakres](../cel-i-zakres.md)         |
| Zakres i reguły     | [Wymagania aplikacji](../wymagania.md)     |
| Projekt rozwiązania | [Budowa aplikacji](../budowa-aplikacji.md) |
| API i partnerzy     | [API hotelu](../api/README.md)             |
| Kolejność i wyceny  | [Plan prac](../plan-prac.md)               |
| Decyzje zespołu     | [Spotkania](../spotkania/README.md)        |
| Wyniki i odbiór     | [Testy i odbiór](../testy-i-odbior.md)     |

## Zasady nazywania i wersjonowania

Strony dokumentacji:

- pliki Markdown w katalogu `docs/`, nazwy małymi literami, bez polskich znaków i spacji, słowa łączone myślnikiem, np. `plan-prac.md`;
- notatka ze spotkania: `RRRR-MM-DD-temat.md` w katalogu `spotkania/`;
- wersją strony jest historia repozytorium: nie tworzymy kopii `v2` ani `final`, tylko zmieniamy plik i opisujemy zmianę w commicie.

Załączniki:

- diagramy rysujemy w Markdownie (Mermaid), żeby dało się je poprawiać i porównywać w historii;
- plik binarny (obraz, PDF, notebook) trafia do katalogu tematu, którego dotyczy, a strona tematu ma do niego odnośnik;
- nazwa pliku zawiera temat, np. `Projekt_C_specyfikacja_do_rewizji.ipynb`; numer wersji dopisujemy tylko w plikach oddawanych poza repozytorium.

Sprawozdania oddawane prowadzącemu nazywamy `Aurora_Hotels_sprawozdanie_zadanieN_vMM.docx`, np. `Aurora_Hotels_sprawozdanie_zadanie2_v01.docx`.

Czego nie zapisujemy nigdzie: haseł, kluczy API, pliku `.env`, ciasteczek sesji i prawdziwych danych osobowych.

## Archiwum Confluence

Do 16 listopada 2026 dokumentację prowadziliśmy w przestrzeni Confluence „Aurora Hotels” (KAN). Jej treść została przeniesiona tutaj i poprawiona; Confluence nie jest już aktualizowane. Mapowanie stron:

| Strona w Confluence                            | Strona w repozytorium                                                                     |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Aurora Hotels — projekt C (strona główna)      | [docs/README.md](../README.md)                                                            |
| Cel i zakres                                   | [cel-i-zakres.md](../cel-i-zakres.md)                                                     |
| Zespół                                         | [zespol.md](../zespol.md)                                                                 |
| Wymagania aplikacji                            | [wymagania.md](../wymagania.md)                                                           |
| Plan prac                                      | [plan-prac.md](../plan-prac.md)                                                           |
| Budowa aplikacji                               | [budowa-aplikacji.md](../budowa-aplikacji.md)                                             |
| Spotkania                                      | [spotkania/README.md](../spotkania/README.md)                                             |
| W1–W7                                          | [spotkania/](../spotkania/README.md#rejestr-decyzji-w1w7)                                 |
| Pytania o pracę zespołu                        | [spotkania/pytania-o-prace-zespolu.md](../spotkania/pytania-o-prace-zespolu.md)           |
| Ćwiczenie: opóźnienie rezerwacji i eksport CSV | [spotkania/cwiczenie-zmiana-zakresu-csv.md](../spotkania/cwiczenie-zmiana-zakresu-csv.md) |
| Testy i odbiór                                 | [testy-i-odbior.md](../testy-i-odbior.md), [testy-manualne.md](../testy-manualne.md)      |
| Materiały i podsumowanie                       | ta strona                                                                                 |
| API i połączenia z grupami                     | [api/README.md](../api/README.md), [api/integracje.md](../api/integracje.md)              |

Nowe strony, których nie było w Confluence: [konfiguracja](../konfiguracja.md), [scenariusz pokazu](../demo.md), [projekt endpointów](../api/projekt-endpointow.md) i [karty endpointów](../api/karty-endpointow.md).
