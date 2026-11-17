# Pytania o pracę zespołu

Przeznaczenie: stanowisko zespołu w trzynastu pytaniach o współpracę i konfigurację. Opiekun: Adrian Zieliński.

Odpowiedzi wynikają z decyzji przyjętych na warsztacie [W1–W7](README.md) 8 listopada 2026. Tam, gdzie temat rozstrzyga konkretna decyzja, podajemy odnośnik zamiast powtarzać cały opis.

## Współpraca

### 1. Jak szczegółowo opisywać zadania?

Krótki cel, zakres pracy i kryteria, które da się sprawdzić. W historyjce opisujemy efekt dla użytkownika, a w podzadaniu konkretną część pracy. Wspólne szczegóły mają odnośnik do dokumentacji zamiast kopii.

Rozważony kontrargument: zbyt krótki opis wymusza dopytywanie, a opis każdego kroku szybko się dezaktualizuje.

### 2. Kto i na jakiej podstawie ustala priorytety, gdy opinie są różne?

Piotr ocenia potrzebę użytkownika, wykonawcy trudność, a Adrian zależności i termin. Punktem odniesienia są priorytety historyjek w Jirze. Szczegóły: [W3](W3-szacowanie.md).

Rozważony kontrargument: sama pilność zgłoszona przez jedną osobę może pominąć koszt albo blokadę.

### 3. Po czym poznajemy, że zadanie jest zakończone, i jak rozstrzygamy spór?

Zadanie jest gotowe, gdy spełnia kryteria, przejdzie próbę i sprawdzi je druga osoba. Wykryty brak oznacza powrót do statusu W toku z opisem poprawki. Szczegóły: [W4](W4-odbior-zadan.md) i [warunki zakończenia](../zespol.md#kiedy-zadanie-jest-gotowe).

Rozważony kontrargument: samo stanowisko autora nie rozstrzyga sporu; decydują kryteria i próba, którą da się powtórzyć.

### 4. Jak dzielimy pracę przy różnym doświadczeniu, dostępności i tempie?

Każdy prowadzi swój obszar, ale można pomagać poza rolą. Przy trudniejszej części możliwa jest praca w parze. Szczegóły: [W5](W5-podzial-pracy.md).

Rozważony kontrargument: podział wyłącznie według doświadczenia skupia wiedzę u jednej osoby i utrudnia zastępstwo.

### 5. Jak reagujemy na brak aktualizacji zadań i niedotrzymywanie ustaleń?

Stan, przeszkodę i potrzebną pomoc zapisujemy w komentarzu przy zadaniu. Na cotygodniowym spotkaniu koordynator porównuje obciążenie i zależności, a zespół ustala, czy zmienić osobę albo kolejność pracy.

Rozważony kontrargument: brak zmiany statusu nie dowodzi braku pracy; najpierw trzeba poznać przyczynę opóźnienia.

### 6. Co zapisujemy w Jirze, a co w dokumentacji?

Jira: zadania, kryteria, statusy i wyniki odbioru. Repozytorium, katalog `docs/`: wymagania, plan, projekt rozwiązania, ustalenia i wyniki testów. Repozytorium, kod: aplikacja i kontrakt OpenAPI. Aktualizujemy stronę danego tematu, a opiekun strony dba o jej aktualność. Szczegóły: [W6](W6-organizacja-dokumentacji.md).

Rozważony kontrargument: kopiowanie pełnych opisów w kilku miejscach grozi sprzecznymi wersjami; odnośnik zmniejsza to ryzyko.

### 7. Jak decydujemy o dodaniu wartościowej, ale nieplanowanej funkcji?

Najpierw oceniamy potrzebę, koszt i wpływ na termin oraz obciążenie. Możliwe jest odłożenie funkcji albo zastąpienie nią mniej ważnego zakresu; decyzję zapisujemy. Szczegóły: [W7](W7-zmiana-zakresu.md) i [ćwiczenie z eksportem CSV](cwiczenie-zmiana-zakresu-csv.md).

Rozważony kontrargument: dodanie funkcji bez zmiany planu tylko zwiększa obciążenie.

## Konfiguracja

### 1. Jakie typy zadań są potrzebne i kiedy stosujemy każdy z nich?

Epik grupuje większy obszar. Historyjka opisuje funkcję dla użytkownika, zadanie pracę organizacyjną albo przygotowanie środowiska, podzadanie część wykonania historyjki lub zadania, a błąd problem do poprawy. W backlogu używamy dziś czterech pierwszych typów; typ „Błąd” jest skonfigurowany i czeka na pierwsze zgłoszenie.

Przykłady: [KAN-4](https://zielinskiadis.atlassian.net/browse/KAN-4) (epik), [KAN-9](https://zielinskiadis.atlassian.net/browse/KAN-9) (historyjka), [KAN-23](https://zielinskiadis.atlassian.net/browse/KAN-23) (zadanie), [KAN-30](https://zielinskiadis.atlassian.net/browse/KAN-30) (podzadanie).

### 2. Jakie statusy odzwierciedlają naszą pracę? Czy różne typy wymagają różnych przepływów?

Pomysł, Do zrobienia, W toku, W trakcie weryfikacji, Gotowe. Wszystkie typy kart mają jeden wspólny przepływ: pokazuje etap odbioru bez wielu różnych reguł. Szczegóły: [W4](W4-odbior-zadan.md).

### 3. Jakie przejścia wymagają warunku lub decyzji określonej osoby?

Autor przekazuje zadanie do weryfikacji. Druga osoba sprawdza i zamyka albo zwraca przejściem „Zwróć do poprawy”. Jira technicznie dopuszcza też inne przejścia; opisany porządek jest zasadą organizacyjną, a nie blokadą w narzędziu.

### 4. Które pola są obowiązkowe przy tworzeniu zadania, a które później?

Uzupełniamy dane stopniowo. Pomysł może mieć sam tytuł. Przed rozpoczęciem pracy karta ma tytuł, opis, osobę odpowiedzialną, kryteria i priorytet, a historyjka także punkty. Po próbie dopisujemy wynik. Jira nie wymusza tych pól walidatorami; pilnujemy ich przy przejściu do statusu Do zrobienia.

### 5. Jak rozdzielamy uprawnienia do konfiguracji, usuwania zadań i zarządzania dostępem?

Adrian jest administratorem Jiry i repozytorium. Reszta zespołu pracuje na zwykłych uprawnieniach, co ogranicza przypadkowe zmiany ustawień. Zdublowane karty łączymy po sprawdzeniu, czy nie zawierają potrzebnych informacji. Sprawdzenie kont rejestruje [KAN-3](https://zielinskiadis.atlassian.net/browse/KAN-3).

### 6. Jak organizujemy strony dokumentacji i uprawnienia, żeby mogła się rozwijać?

Strony dzielimy według tematu i każda ma opiekuna. Nowy temat dostaje nową stronę dopisaną do spisu, a poprawka istniejącego opisu trafia na jego stronę. Zespół zmienia dokumentację przez commity z własnych kont; prowadzący czyta ją bez konta, bo repozytorium jest publiczne. Szczegóły: [W6](W6-organizacja-dokumentacji.md) i [zasady dokumentacji](../zespol.md#jak-prowadzimy-dokumentację).

[← Rejestr spotkań](README.md)
