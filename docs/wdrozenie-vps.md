# Wdrożenie na VPS

Przeznaczenie: uruchomienie aplikacji na publicznym serwerze, także do wspólnych prób z innymi grupami. Opiekun: Adrian Zieliński.

Instrukcja zakłada serwer z Ubuntu 24.04 lub Debianem 12, domenę skierowaną na adres serwera (rekord `A`, np. `hotel.example.pl`) i dostęp przez SSH. Aplikacja działa w jednym kontenerze, a HTTPS zapewnia Caddy. W poleceniach zastąp `hotel.example.pl` własną domeną.

## 1. Przygotowanie serwera

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git ufw debian-keyring debian-archive-keyring apt-transport-https curl
curl -fsSL https://get.docker.com | sudo sh            # Docker Engine i Compose
sudo ufw allow OpenSSH && sudo ufw allow 80,443/tcp && sudo ufw enable
```

Port 3001 zostaje zamknięty dla Internetu: `compose.yaml` wystawia aplikację tylko na `127.0.0.1:3001`, a z zewnątrz ruch przechodzi przez Caddy.

## 2. Kod i ustawienia

```bash
sudo mkdir -p /opt/aurora-hotel && sudo chown "$USER" /opt/aurora-hotel
git clone https://github.com/aurora-hotels/aurora-hotel.git /opt/aurora-hotel
cd /opt/aurora-hotel
cp .env.example .env && chmod 600 .env
```

W `.env` ustaw:

| Zmienna                 | Wartość na serwerze                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `SESSION_SECRET`        | wynik `openssl rand -hex 32`                                                             |
| `CONFIG_ENCRYPTION_KEY` | wynik `openssl rand -hex 32`; przechowuj go razem z kopiami bazy                         |
| `ADMIN_EMAIL`           | adres pierwszego administratora                                                          |
| `ADMIN_PASSWORD`        | długie hasło; po pierwszym logowaniu zmień je w profilu                                  |
| `DOCKER_APP_ORIGIN`     | `https://hotel.example.pl` (dokładnie adres z paska przeglądarki, bez ukośnika na końcu) |
| `COOKIE_SECURE`         | `true`                                                                                   |
| `TRUST_PROXY`           | `1` (jeden serwer pośredniczący: Caddy)                                                  |
| `ALLOWED_PARTNER_HOSTS` | hosty API grup A i B, gdy będą znane, np. `api-a.example.pl,api-b.example.pl`            |

`NODE_ENV=production`, `HOST`, `DATABASE_PATH` i `APP_ORIGIN` ustawia `compose.yaml`. W trybie produkcyjnym serwer nie wystartuje z sekretem krótszym niż 32 znaki.

## 3. Uruchomienie

```bash
docker compose up --build -d
docker compose ps                     # stan „healthy” po kilkunastu sekundach
curl -s http://127.0.0.1:3001/health  # {"status":"ok"}
```

Baza jest w wolumenie `hotel-data`, kopie w `hotel-backups`. Przy starcie serwer tworzy brakujące tabele i dane startowe; istniejących rezerwacji nie zmienia.

## 4. HTTPS i ukrycie API wewnętrznego

Zainstaluj Caddy według [instrukcji producenta](https://caddyserver.com/docs/install#debian-ubuntu-raspbian), a potem zapisz `/etc/caddy/Caddyfile`:

```caddy
hotel.example.pl {
	encode gzip
	# API usług wewnętrznych jest dostępne tylko z serwera (127.0.0.1:3001).
	@internal path /internal /internal/*
	respond @internal 404
	reverse_proxy 127.0.0.1:3001
}
```

```bash
sudo systemctl reload caddy
curl -sI https://hotel.example.pl/health                 # 200
curl -s -o /dev/null -w '%{http_code}\n' https://hotel.example.pl/internal/v1/health/ready   # 404
```

Caddy sam uzyskuje i odnawia certyfikat. Przy nginx zamiast Caddy potrzebne są: `proxy_pass http://127.0.0.1:3001`, nagłówki `Host` i `X-Forwarded-For`, certyfikat z certbota i blok `location /internal/ { return 404; }`.

## 5. Pierwsze logowanie

Otwórz `https://hotel.example.pl`, zaloguj się danymi z `.env` i zmień hasło. Utwórz konta recepcji w panelu administratora. Połączenia z A, B i D są początkowo w trybie `demo`.

W naszej grupie nie ma projektu D. Jeśli nie chcesz pokazywać voucherów, wyłącz połączenie D w panelu „Integracje”: formularz rezerwacji przestanie pokazywać pola vouchera, a reszta aplikacji działa bez zmian ([szczegóły](budowa-aplikacji.md#praca-bez-projektu-d)).

## Zadania harmonogramu

Utwórz tokeny usług. Każde polecenie wypisuje wartość tokenu tylko raz:

```bash
sudo install -d -m 700 /etc/aurora
docker compose exec hotel node backend/dist/service-tokens.js create monitoring "Monitoring"
docker compose exec hotel node backend/dist/service-tokens.js create scheduler "Harmonogram"
docker compose exec hotel node backend/dist/service-tokens.js create backup "Kopia zapasowa"
```

Zapisz każdy token w osobnym pliku (`/etc/aurora/monitoring.token`, `scheduler.token`, `backup.token`) z prawami `600`. Następnie dodaj wpisy do crona użytkownika root (`sudo crontab -e`):

```cron
*/5 * * * * cd /opt/aurora-hotel && docker compose exec -T -e SCHEDULER_TOKEN="$(cat /etc/aurora/scheduler.token)" hotel node scripts/internal-jobs.mjs reconcile >> /var/log/aurora-jobs.log 2>&1
*/5 * * * * cd /opt/aurora-hotel && docker compose exec -T -e MONITORING_TOKEN="$(cat /etc/aurora/monitoring.token)" hotel node scripts/internal-jobs.mjs ready > /dev/null 2>> /var/log/aurora-jobs.log
15 3 * * * cd /opt/aurora-hotel && docker compose exec -T -e BACKUP_TOKEN="$(cat /etc/aurora/backup.token)" hotel node scripts/internal-jobs.mjs backup >> /var/log/aurora-jobs.log 2>&1
30 3 * * * cd /opt/aurora-hotel && docker compose exec -T hotel find /app/backups -name 'aurora-*.sqlite' -mtime +14 -delete
```

Zadania łączą się z aplikacją wewnątrz kontenera (`http://127.0.0.1:3001`), więc nie wymagają otwierania ścieżki `/internal` na zewnątrz. Porządkowanie bazy serwer wykonuje sam co godzinę; zadanie `cleanup` jest potrzebne tylko do uruchomienia go od razu. Token wyłącza się poleceniem `revoke` z jego identyfikatorem (`list` pokazuje identyfikatory).

## Kopie poza serwerem

Kopia w wolumenie nie chroni przed utratą całego serwera. Raz na dobę skopiuj najnowszy plik na inny komputer:

```bash
docker compose cp hotel:/app/backups ./kopie-aurora
```

Do odtworzenia potrzebny jest ten sam `CONFIG_ENCRYPTION_KEY`. Odtwarzanie: `docker compose down`, podmiana pliku `aurora.sqlite` w wolumenie `hotel-data` na kopię (np. przez kontener pomocniczy z zamontowanym wolumenem), `docker compose up -d`.

## Aktualizacja

```bash
cd /opt/aurora-hotel
docker compose exec -T -e BACKUP_TOKEN="$(sudo cat /etc/aurora/backup.token)" hotel node scripts/internal-jobs.mjs backup
git pull
docker compose up --build -d
docker compose ps
```

Nie używaj `docker compose down -v`: usuwa wolumeny z bazą i kopiami.

## Współpraca z innymi grupami

- **Nasze API dla innych grup:** adres `https://hotel.example.pl/api/v1`, opis pod `https://hotel.example.pl/api/docs`. Klucz dla grupy tworzy administrator w panelu „Integracje”, z najmniejszym potrzebnym zakresem. Klucz przekazujemy bezpiecznym kanałem, nigdy w repozytorium ani na czacie grupy. Zasady i przykłady: [API hotelu](api/README.md).
- **API innych grup:** wpisz ich hosty do `ALLOWED_PARTNER_HOSTS` w `.env`, uruchom ponownie (`docker compose up -d`), a potem w panelu ustaw tryb `real`, adres, nagłówek i sekret. Przed pierwszym zamówieniem wykonaj test połączenia. Wymagane HTTPS; kontrakt i protokół wspólnej próby opisuje [Kontrakty A/B/D](api/integracje.md).
- **Przed przełączeniem z `demo` na `real`** wyjaśnij operacje oczekujące (`npm run jobs -- reconcile` albo przycisk „Odśwież” w planie pobytu).

## Sprawdzenie po wdrożeniu

1. `https://hotel.example.pl/health` zwraca `{"status":"ok"}`, a `/internal/v1/health/ready` z zewnątrz zwraca 404.
2. Rejestracja klienta, rezerwacja, zameldowanie i wymeldowanie działają w przeglądarce.
3. Cookie `aurora_session` ma flagi `Secure`, `HttpOnly` i `SameSite=Lax` (narzędzia programisty → Aplikacja → Cookies).
4. Zadanie `ready` z crona nie dopisuje błędów do `/var/log/aurora-jobs.log`, a w wolumenie kopii po nocy jest nowy plik.
5. Test połączenia z partnerem w panelu „Integracje” kończy się powodzeniem dla każdego połączenia w trybie `real`.

[← Konfiguracja](konfiguracja.md)
