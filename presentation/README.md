# Prezentacja Misja AED

Źródłem układu jest natywny projekt Risk Engine / Azeno Hi w Presentation Studio. Slajdy zachowują siatkę 1280 × 720, kolory HackNation, kroje Bebas Neue, Montserrat i JetBrains Mono oraz przekazane przez zespół fotografie i układ personalny. Licencje fontów znajdują się obok plików TTF w katalogu `fonts`.

## Budowanie plików

Z głównego katalogu repozytorium:

```sh
node presentation/build.mjs
node presentation/powerpoint.mjs
```

Pierwsze polecenie tworzy `deliverables/Misja-AED.studio.json` z lokalnych plików i samodzielnie osadza obrazy jako data URI. Drugie czyta ten sam model i eksportuje edytowalne obiekty PowerPoint. Wymaga pakietu Node.js `@oai/artifact-tool` z biblioteką `skia-canvas` oraz Pythona z `lxml`. Przy korzystaniu z zewnętrznej instalacji można ustawić `NODE_PATH` i `PYTHON`. Flaga `--preview` zapisuje PNG każdego slajdu w prywatnym katalogu roboczym `.tmp/govtech/`.

Slajd 6 w pokazie Studio odtwarza `/media/misja-aed/demo.mp4`. Pod tym adresem Studio ma udostępniać plik `deliverables/Misja-AED-60s.mp4`. W pliku PPTX ten sam film jest dołączony do pakietu razem z plakatem i krojami pisma. Do oglądania filmu w PowerPoint służy jego tryb pokazu.

## Zasoby

- Mapa rozmieszczenia AED powstaje bezpośrednio z punktów w `web/public/data/aed-polska.geojson`. Reprodukcja wymaga Matplotlib i polecenia `python presentation/make-map.py`. Generator oblicza liczności pól opisu, godzin i zdjęć z tego samego pliku. [Katalog zbioru](https://pawelkonior.github.io/misja-aed/data/catalog.json)
- Mapę trasy, widok AR i animację elektrod przechwycono w działającej aplikacji. Widok kamery pokazuje oznaczoną symulację. Autentyczne zdjęcia wejścia i pasażu wykonał Cybularny, a zdjęcie szafki udostępniono przez OpenAEDMap. Źródła i licencje przypisano do odpowiednich slajdów. [Mapa © OpenStreetMap](https://www.openstreetmap.org/copyright) · [Wejście](https://commons.wikimedia.org/?curid=199081043) · [Podwórze](https://commons.wikimedia.org/?curid=199080241) · [Pasaż](https://commons.wikimedia.org/?curid=199080251) · [Urządzenie](https://www.openstreetmap.org/node/14154384101)
- Na okładce wykorzystano studyjną ilustrację torby AED z ImageGen, przygotowaną dla tego projektu. Portrety w `assets` i layout w `team-layout.json` pochodzą z prezentacji dostarczonej przez Azeno Hi. Oryginalny slajd zespołu zachowuje opisane tam role dwóch liderów.
