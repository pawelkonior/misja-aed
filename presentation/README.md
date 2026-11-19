# Prezentacja Misja AED

Źródłem układu jest natywny projekt Risk Engine / Azeno Hi w Presentation Studio. Slajdy zachowują siatkę 1280 × 720, kolory HackNation, kroje Bebas Neue, Montserrat i JetBrains Mono oraz przekazane przez zespół fotografie i układ personalny. Licencje fontów znajdują się obok plików TTF w katalogu `fonts`.

## Budowanie plików

Z głównego katalogu repozytorium:

```sh
node presentation/build.mjs
node presentation/powerpoint.mjs
```

Pierwsze polecenie tworzy `deliverables/Misja-AED.studio.json` z lokalnych plików i samodzielnie osadza obrazy jako data URI. Drugie czyta ten sam model i eksportuje edytowalne obiekty PowerPoint. Wymaga pakietu Node.js `@oai/artifact-tool` z biblioteką `skia-canvas` oraz Pythona z `lxml`. Przy korzystaniu z zewnętrznej instalacji można ustawić `NODE_PATH` i `PYTHON`. Flaga `--preview` zapisuje PNG każdego slajdu w prywatnym katalogu roboczym `.tmp/govtech/`.

Slajd 6 w pokazie Studio odtwarza `/media/misja-aed/demo.mp4`. Pod tym adresem Studio udostępnia plik `deliverables/Misja-AED-60s.mp4`. Film trwa minutę i nie ma ścieżki dźwiękowej. Każdą czynność zapowiada krótka plansza, po której widać cały ekran telefonu. W pliku PPTX ten sam film jest dołączony do pakietu razem z plakatem i krojami pisma. Do oglądania filmu w PowerPoint służy jego tryb pokazu.

## Zasoby

- Mapa rozmieszczenia AED powstaje bezpośrednio z punktów w `web/public/data/aed-polska.geojson`. Reprodukcja wymaga Matplotlib i polecenia `python presentation/make-map.py`. Generator oblicza liczności pól opisu, godzin i zdjęć z tego samego pliku. [Katalog zbioru](https://pawelkonior.github.io/misja-aed/data/catalog.json)
- Na okładce widać aktualny pulpit aplikacji z usługą „Defibrylator w pobliżu”. Na slajdzie 3 kadr i powiększenie wskazówki pochodzą z tego samego momentu rzeczywistego filmu z ul. Chmielnej, odtwarzanego z działającym HUD aplikacji. Na slajdzie 4 fioletowa linia prowadzi od AED przy Chmielnej 21 do miejsca, w którym rozpoczęto drogę po urządzenie. Trasę przechwycono w aplikacji z kontrolowanymi współrzędnymi obu końców. Na slajdzie 5 widać aplikację i dwa kolejne kadry animacji instruktażowej. [Autorzy i licencje spaceru](../web/public/media/aed-walk-credits.txt) · [Mapa © OpenStreetMap](https://www.openstreetmap.org/copyright) · [Zdjęcie urządzenia](https://www.openstreetmap.org/node/14154384101) · [Zdjęcie podwórza](https://commons.wikimedia.org/?curid=199080241)
- Trzy sceny z tą samą świadkinią w koralowej kurtce objaśniają sytuację i zostały wygenerowane w ImageGen. Fotografie portretowe w `assets` i układ w `team-layout.json` pochodzą z prezentacji przekazanej przez Azeno Hi. Oryginalny slajd zespołu zachowuje opisane tam role dwóch liderów.
