# Aurora Hotels

Projekt C z przedmiotu Projekt Zespołowy. Aplikacja do rezerwowania pokoi i obsługi pobytu w hotelu.

Klient wybiera termin, pokój i pakiet. Recepcja obsługuje gości oraz planuje masaże i treningi. Administrator zarządza ofertą, kontami i ustawieniami.

W projekcie są:

- konta klienta, recepcji i administratora;
- dostępność pokoi, wycena, rezerwacje i zmiany pobytu;
- zameldowanie, wymeldowanie i plan usług;
- połączenia z A (masaże), B (fitness) i D (vouchery);
- API hotelu oraz testy serwera i interfejsu.

Interfejs korzysta z Reacta, serwer z Express, a dane są w SQLite. Obie części są napisane w TypeScript.

Lokalny tryb demo pozwala sprawdzić scenariusz bez pozostałych aplikacji. Wspólna próba z rzeczywistymi A/B/D jest jeszcze do wykonania. Projekt używa danych testowych i nie obsługuje płatności.

[Dokumentacja zespołu](https://zielinskiadis.atlassian.net/wiki/spaces/KAN) · [Jira](https://zielinskiadis.atlassian.net/jira/software/projects/KAN/list) · [OpenAPI](docs/openapi.yaml)
