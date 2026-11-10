# Wielki Quiz — 1 z 10

Przeglądarkowa gra wieloosobowa. Gospodarz tworzy pokój, wysyła link lub sześci znakowy kod, a znajomi dołączają z własnych komputerów. Gra ma 10 wspólnych, losowanych pytań. Każdy ma 35 sekund; poprawne odpowiedzi dają do 1000 punktów, z premią za szybkość.

## Uruchomienie

Wymagany jest Node.js 18 lub nowszy. W katalogu projektu uruchom:

```sh
npm start
```

Otwórz `http://localhost:3000`. Żeby znajomi mogli grać z różnych sieci, uruchom projekt na publicznym hostingu obsługującym aplikacje Node.js i udostępnij im publiczny adres. Nie wymaga instalacji ani konta po stronie graczy. Pokoje są przechowywane w pamięci serwera i znikają po jego restarcie; bez aktywności są usuwane po 30 minutach.

## Wdrożenie

Hosting powinien uruchamiać `npm start` i przekazać aplikacji zmienną środowiskową `PORT`. Serwer obsługuje serwowanie plików aplikacji oraz stan pokoi. Projekt nie korzysta z zewnętrznych bibliotek ani bazy danych.
