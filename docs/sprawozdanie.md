# Sprawozdanie — Aurora Hotels, projekt C

## Cel i zakres

Przygotowaliśmy aplikację demonstracyjną jednego hotelu. Klient może przeglądać pokoje i pakiety, sprawdzić dostępność i cenę, a następnie zapisać, zmienić lub anulować swój pobyt. Recepcja prowadzi listę gości, zameldowanie i wymeldowanie oraz planuje usługi innych projektów. Administrator zarządza ofertą, kontami i konfiguracją.

Projekt jest częścią wspólnego scenariusza: A oferuje masaże, B fitness, C noclegi, a D vouchery. C udostępnia własne API i ma adaptery wywołujące A/B/D. Tryb demonstracyjny pozwala przećwiczyć poprawne odpowiedzi, odrzucenia i awarie. Potwierdzenie współpracy z rzeczywistymi wdrożeniami innych grup wymaga jeszcze uzgodnienia danych połączenia i wspólnej próby.

Nie wdrażaliśmy prawdziwych płatności, faktur ani sprzedaży voucherów. Dane gości i operacje podczas pokazu są fikcyjne.

## Rozwiązanie

Interfejs napisano w React i TypeScript, a API w Express i TypeScript. Dane są w SQLite. Dzięki temu lokalne uruchomienie nie wymaga dodatkowego serwera bazy. Instrukcja znajduje się w [README](../README.md), a opis modułów i modelu danych w [architekturze](architektura.md).

W początkowym planie rozważano Prisma. W gotowym kodzie użyto bezpośrednio `node:sqlite`, żeby jawnie rozpocząć transakcję zapisu przed sprawdzeniem wolnego pokoju. To pomaga wyjaśnić, dlaczego dwa równoległe żądania nie mogą zarezerwować tego samego pokoju na nakładające się terminy.

Cena jest liczona na serwerze w groszach. Rezerwacja przechowuje zaakceptowaną cenę, wersję i kopię składników pakietu. Stały klucz tworzenia chroni przed przypadkowym powtórzeniem zapisu, a wersja przed nadpisaniem równoległej zmiany.

## Integracja

Udokumentowano operacje API hotelu: konta, katalog, dostępność, pobyty, plan, konfigurację i historię. Dla innych zespołów przygotowano [krótką instrukcję z przykładami](api.md), [OpenAPI](openapi.yaml) i [kontrakty A/B/D](integracje.md).

Po timeout operacja partnera pozostaje jawnie niepewna. Recepcja odświeża jej wynik zamiast wysyłać nowe zamówienie. Usługi tej samej osoby nie mogą nakładać się w czasie. Przy voucherze C sprawdza swoją część w D i zgłasza jej wykonanie po wymeldowaniu. Awaria D podczas tego zgłoszenia nie cofa lokalnego zakończenia pobytu.

## Sprawdzenie i odbiór

W repozytorium są testy backendu i scenariusze przeglądarkowe, a polecenia ich uruchomienia podano w README. Obejmują reguły rezerwacji, uprawnienia, konflikt terminów, ceny, ponawianie, partnerów oraz podstawowy przepływ interfejsu. Dokładne asercje są opisane w [pokryciu testów](test-coverage.md), a zgodność zakresu w [przeglądzie wymagań](requirements-audit.md). Aktualne liczby wyników należy odczytać z raportu uruchomienia dla konkretnego commita lub z CI. Ta strona nie zastępuje raportu rzeczywiście wykonanego testu.

Do sprawdzenia przez zespół przygotowano [scenariusze manualne](testy-manualne.md) i [plan pokazu](demo.md). Wpisy potwierdzające wykonanie prób pozostają do uzupełnienia przez osoby, które je przeprowadziły. Wspólny test A/B/C/D ma osobny protokół w instrukcji integracji.

## Organizacja pracy

Adrian Zieliński koordynuje całość i wykonuje również zadania poza przypisaną rolą. Role pozostałych osób oraz miejsce na opis ich rzeczywistego wkładu są w [podziale pracy](zespol.md). Historia repozytorium jest podzielona na logiczne zmiany; autorzy, daty i zatwierdzenia mają odpowiadać rzeczywistym działaniom.

Przy implementacji, testach i dokumentacji wykorzystano wsparcie AI. Zakres i sposób sprawdzania zapisano w [dokumencie o wsparciu narzędzi](wsparcie-ai.md). Przed oddaniem każdy członek zespołu powinien samodzielnie uruchomić swoją część, wyjaśnić istotny fragment kodu lub test i zapisać własne poprawki oraz wynik przeglądu.

## Pozostałe kroki zespołu

1. Uzgodnić adresy, klucze i ostateczny kontrakt z A/B/D oraz wykonać wspólny scenariusz.
2. Przeprowadzić i podpisać faktyczne próby manualne oraz przeglądy zmian.
3. Uzupełnić własny wkład i przygotować krótkie omówienie swojej części na zajęcia.
4. Zachować wynik testów dla commita oddawanego do oceny i aktualne ustalenia w Jirze/Confluence.
