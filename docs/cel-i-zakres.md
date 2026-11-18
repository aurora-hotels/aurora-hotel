# Cel i zakres

Przeznaczenie: problem, odbiorcy, cele, główne funkcje i wyłączenia z zakresu. Opiekun: Piotr Świadek (przedstawiciel klienta).

## Problem i cel

Hotel potrzebuje jednego miejsca, w którym gość zarezerwuje pokój, a recepcja poprowadzi cały pobyt razem z usługami dodatkowymi. Aurora Hotels to projekt C z przedmiotu Projekt Zespołowy. Budujemy aplikację dla jednego hotelu, która:

- pozwala klientowi samodzielnie zarezerwować, zmienić i anulować pobyt;
- daje recepcji i administratorowi narzędzia do obsługi gości, oferty i kont;
- łączy nocleg z usługami trzech pozostałych projektów: masażami (A), zajęciami fitness (B) i voucherami (D).

Celem odbioru jest samodzielna obsługa klientów hotelu oraz udział C we wspólnym scenariuszu czterech grup: voucher → pobyt → masaż i trening → wykonanie usług → częściowe wykorzystanie vouchera.

## Odbiorcy

| Odbiorca              | Czego potrzebuje                                                                    |
| --------------------- | ----------------------------------------------------------------------------------- |
| Gość bez konta        | Przejrzeć ofertę, sprawdzić wolne terminy i cenę                                    |
| Klient                | Zarezerwować pobyt na swoim koncie, zmienić termin, anulować, zobaczyć plan usług   |
| Recepcjonista         | Prowadzić listę gości, meldować i wymeldowywać, umawiać masaże i treningi           |
| Administrator         | Zarządzać pokojami, pakietami, kontami, ustawieniami i połączeniami z A/B/D         |
| Projekt D (partner)   | Przez API sprawdzić ofertę i zarezerwować pobyt dla posiadacza vouchera             |
| Projekty A i B        | Przyjąć od hotelu rezerwację masażu lub treningu i odesłać jej stan                 |
| Prowadzący przedmiotu | Ocenić działającą aplikację, API, integrację, dokumentację i wkład członków zespołu |

## Co można zrobić w aplikacji

- Klient zakłada konto, wybiera wolny pokój i termin, sprawdza cenę, rezerwuje pobyt oraz może go zmienić lub anulować.
- Recepcja prowadzi listę gości, melduje i wymeldowuje oraz ustala terminy usług z pakietu.
- Administrator zarządza pokojami, pakietami, kontami i ustawieniami.
- Hotel łączy nocleg z masażami grupy A, zajęciami fitness grupy B i voucherami grupy D (grupa D nie powstała; vouchery działają w trybie demo).
- Projekt D tworzy i obsługuje rezerwacje przez API hotelu, w granicach uprawnień swojego klucza.

## Podział w Jirze

| Temat                     | Historyjka                                                  | Epik                                                      |
| ------------------------- | ----------------------------------------------------------- | --------------------------------------------------------- |
| Konta i role              | [KAN-1](https://zielinskiadis.atlassian.net/browse/KAN-1)   | [KAN-4](https://zielinskiadis.atlassian.net/browse/KAN-4) |
| Pokoje i dostępność       | [KAN-7](https://zielinskiadis.atlassian.net/browse/KAN-7)   | KAN-4                                                     |
| Rezerwacje                | [KAN-9](https://zielinskiadis.atlassian.net/browse/KAN-9)   | KAN-4                                                     |
| Obsługa pobytu i pakietów | [KAN-11](https://zielinskiadis.atlassian.net/browse/KAN-11) | [KAN-6](https://zielinskiadis.atlassian.net/browse/KAN-6) |
| API i połączenia A/B/D    | [KAN-13](https://zielinskiadis.atlassian.net/browse/KAN-13) | KAN-6                                                     |

Powiązanie historyjek z wymaganiami F-01–F-13 jest w [wymaganiach](wymagania.md#zadania-w-jirze).

## Zakres pierwszej wersji

Kolejność ustaliliśmy na spotkaniu [W2](spotkania/W2-zakres-pierwszej-wersji.md): najpierw pełna rezerwacja (KAN-1, KAN-7, KAN-9), potem recepcja i integracje (KAN-11, KAN-13). Integracje należą do projektu; późniejszy etap nie oznacza rezygnacji z nich.

## Poza zakresem

- Prawdziwe płatności, faktury i rozliczenia między partnerami.
- Sprzedaż voucherów i zestawienia rozliczeń: to zadanie projektu D.
- Grafiki pracowników i wykonanie masażu lub treningu: to zadania projektów A i B.
- Obsługa wielu hoteli, aplikacja mobilna, wspólne konta między projektami.
- Wysyłka e-maili i samodzielne odzyskiwanie hasła: hasło resetuje administrator.

## Odłożone na później

Eksport listy rezerwacji do CSV i rozbudowane filtry. Sposób postępowania z taką prośbą opisuje [ćwiczenie ze zmiany zakresu](spotkania/cwiczenie-zmiana-zakresu-csv.md).

## Co zostało do zrobienia przed pokazem

- Uzgodnienie adresów, kluczy i kontraktów z grupami A i B oraz wspólna próba na ich aplikacjach. Projektu D w naszej grupie nikt nie podjął: połączenie z D zostaje w trybie demo i można je wyłączyć ([praca bez D](budowa-aplikacji.md#praca-bez-projektu-d)).
- Postawienie aplikacji na serwerze według [instrukcji wdrożenia](wdrozenie-vps.md), żeby pozostałe grupy mogły łączyć się z naszym API.

Szczegóły: [wymagania](wymagania.md), [plan prac](plan-prac.md), [testy i odbiór](testy-i-odbior.md).
