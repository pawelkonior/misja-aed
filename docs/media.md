# Materiały zespołu i odtwarzanie filmu

Film korzysta z technologii poprzedniego projektu „Zbuduj prototyp Risk Red Team”. Deterministyczna scena Canvas 2D, kontrakt `window.__anim.seek(t)`, Chromium i FFmpeg składają 1800 klatek w MP4. Widziane na ekranie telefonu sekwencje pochodzą z rzeczywistych interakcji Playwright z aplikacją. Osobne źródło narracji umożliwia odtworzenie filmu bez dostępu do usługi głosowej.

1. Zbuduj aplikację w `web/` poleceniem `npm ci && npm run build` i udostępnij katalog `dist`, np. przez `python3 -m http.server 5196 --bind 127.0.0.1 --directory dist`.
2. Z katalogu głównego repozytorium uruchom `AED_DEMO_URL=http://127.0.0.1:5196/ ./film/build.sh`. Potrzebne są Chrome, Node, FFmpeg i uv. Skrypt korzysta z zablokowanych zależności i ładuje Pillow dla montażu ujęć.
3. Teksty narracji, czas oraz tytuły znajdują się w [scenariuszu](../film/scenes.json). Po zmianie tekstów można odtworzyć ścieżkę na macOS z polskim głosem Zosia przez `python3 film/voice.py`. W repozytorium jest gotowa ścieżka AAC.
4. Prezentację można edytować w PowerPoint lub otworzyć jej JSON w Presentation Studio. Źródła merytoryczne zapisano również w notatkach do slajdów.

## Pochodzenie materiałów

- Zdjęcie produktowe na okładkę powstało we wbudowanym ImageGen. [Obraz](../web/public/media/hero.webp)
- Drugie ujęcie ImageGen jest ilustracją ulicy na potrzeby symulacji, gdy brak właściwego ujęcia. Warszawska trasa ma własne prawdziwe zdjęcia. [Ilustracja](../web/public/media/approach.webp) · [Atrybucja zdjęć rzeczywistych](open-data.md)
- Znak mObywatel pochodzi z publicznego serwisu informacyjnego. Karty dokumentów mają charakter przykładowy. [Źródło znaku](https://info.mobywatel.gov.pl/apple-touch-icon.png)
- Renderer filmu bazuje na harnessie code-animations na warunkach MIT. [Licencja](../film/harness/LICENSE)

## Prompty ImageGen

Product-mockup. Landscape 3:2, high-end photorealistic studio product photograph used on a public rescue navigation app and civic pitch deck. A single compact professional automated external defibrillator in a vivid emerald green semi rigid rounded rectangular zippered rescue carrying case, upright, photographed in a 3/4 front view, with soft fine woven nylon shell texture, clean bright off-white panel on its face with simple green medical heart and white lightning bolt symbol, below the symbol exact letters 'AED' boldly printed, black webbed top carrying handle, black double seam and edge zipper, high realism. Object sits in right half leaning slightly, on a light mint studio floor, pale turquoise mint seamless studio background and natural soft studio shadows. Left half open pale mint, background edges uniformly pale mint. Clean official industrial design editorial product photography, no people, no other objects, no watermark.

Photorealistic natural editorial photograph for a simulated augmented-reality demo. Wide landscape first-person camera approaching a contemporary Warsaw civic building entrance from a public paved pedestrian sidewalk, front door to the right, 1970s limestone and glass facade, subtle green and white AED emergency defibrillator cabinet mounted on the wall alongside the right entrance, clear green AED heart/lightning pictogram, midday soft cloudy sky, tree-lined street stretching into the distance to the left, late spring city, normal everyday surroundings. Photo taken about 12 metres away from entrance, eye-level smartphone field of view, restrained colors, realistic scale, cabinet small in visual field. No overlays, no HUD, no advertisements or watermarks, no visible people. Do not model on a specific identifiable real building.
