# Misja AED — dane na ratunek

**[Uruchom demo na telefonie lub komputerze](https://pawelkonior.github.io/misja-aed/)** · **[Oglądaj film, 60 s](https://pawelkonior.github.io/misja-aed/pokaz/)** · **[Prezentacja](https://github.com/pawelkonior/misja-aed/releases/latest/download/Misja-AED.pptx)**

Prototyp usługi mObywatel na [wyzwanie HackNation 2026](https://hacknation.pl/zadania) Departamentu Zarządzania Danymi Ministerstwa Cyfryzacji. Łączy istniejące źródła o AED w otwarty zbiór dla Polski. Na telefonie przeprowadza drugiego świadka zdarzenia od wyszukania urządzenia do instrukcji po przyniesieniu go do poszkodowanego.

## Aplikacja mobilna

1. Na pulpicie mObywatela, poniżej kart dokumentów, dotknij **Defibrylator w pobliżu**. Pozwól przeglądarce pobrać lokalizację. Mapa oznaczy aktualną pozycję i pokaże najbliższe AED. Jeśli GPS jest niedostępny, wybierz adres lub wskaż punkt startowy na mapie.
2. Dotknij urządzenia, żeby od razu wyznaczyć trasę pieszą. **Wskazówki dojścia** pokazują kolejne odcinki i dostępne zdjęcia. Wybierz **Prowadź i wezwij pomoc** albo od razu **Tryb AR**, aby rozpocząć prowadzenie.
3. Po wybraniu prowadzenia z wezwaniem pomocy aplikacja odlicza 10 sekund i automatycznie otwiera systemowy numer alarmowy. **Anuluj** zatrzymuje odliczanie i pozwala kontynuować trasę. System telefonu może wymagać potwierdzenia. Gdy przeglądarka blokuje otwarcie telefonu, przycisk **Zadzwoń** pozwala wykonać tę czynność ręcznie. Aplikacja wyświetla pozycję GPS do podania operatorowi. Zgłoszenie przyjmuje operator podczas rozmowy.
4. **Tryb AR** korzysta z aparatu telefonu, GPS i kompasu. Po dotarciu w pobliże wybranego urządzenia można otworzyć **Instrukcję AED** albo wrócić z urządzeniem do punktu zapisanego przy rozpoczęciu prowadzenia. Aplikacja wyznacza trasę powrotną pieszo. Dokładność położenia w budynkach zależy od czujników.
5. [Nagranie przejścia ulicą Chmielną](https://pawelkonior.github.io/misja-aed/#nagranie) pozwala prześledzić drogę bez włączania aparatu. Animowane strzałki 3D wskazują kierunek. Licznik pokazuje orientacyjne metry do następnego manewru. Ostatnie ujęcia pokazują wejście, pasaż i szafkę AED.
6. Instrukcja dla osoby dorosłej ma pięć animowanych kroków, polskiego lektora i komendę głosową „dalej”. Rozpoznawanie na urządzeniu wymaga jednorazowego pobrania polskiego modelu Vosk (około 50 MB).

Z usługi szukania AED może skorzystać drugi świadek zdarzenia. Pojedynczy świadek powinien pozostać przy poszkodowanym i wykonywać polecenia dyspozytora. [Źródła medyczne i research](docs/research.md)

## Otwarte dane

Import z 19 listopada 2026 r. scalił 18 265 rekordów OpenStreetMap/OpenAEDMap oraz 21 rekordów Straży Miejskiej w Przemyślu. Po rozpoznaniu 14 par powstały **18 272 rekordy**. Daty weryfikacji, godziny dostępu, kondygnacja i zdjęcie są zachowane tam, gdzie podał je dostawca.

| Zasób | Pobieranie |
| --- | --- |
| Dane przestrzenne WGS84 | [GeoJSON](https://pawelkonior.github.io/misja-aed/data/aed-polska.geojson) |
| Dane tabelaryczne | [CSV](https://pawelkonior.github.io/misja-aed/data/aed-polska.csv) |
| Źródła i licencje | [Katalog JSON](https://pawelkonior.github.io/misja-aed/data/catalog.json) |
| Zasilenie portalu przez wydawcę | [XML dla dane.gov.pl](https://pawelkonior.github.io/misja-aed/data/harvester.xml) · [MD5](https://pawelkonior.github.io/misja-aed/data/harvester.md5) |

Publiczna dystrybucja działa na GitHub Pages. Rejestracja źródła na dane.gov.pl jest krokiem uprawnionego wydawcy. Zasady łączenia, procedurę odświeżania, atrybucję zdjęć i publikację opisuje [dokumentacja zbioru](docs/open-data.md).

## Uruchomienie lokalne

Szkielet to [pawelkonior/risk-engine, commit 14b2ec9](https://github.com/pawelkonior/risk-engine/tree/14b2ec9fdd82ac88ce50edb538efde0126f73a3c). Aplikacja rozszerza frontend React, TypeScript i Vite w `web/`. Usługa pobiera wspólny zbiór z tego samego hosta i może działać bez kluczy API, logowania i backendu. Oryginalny backend FastAPI oraz konfiguracja Compose pozostają dostępne dla dalszych integracji.

```sh
cd web
nvm use
npm ci
npm run dev
```

Otwórz adres wypisany przez Vite. Dodaj do niego `/pokaz/`, żeby obejrzeć minutowy pokaz aplikacji bez dźwięku. Kamera, lokalizacja i rozpoznawanie mowy wymagają HTTPS lub localhost i zgód przeglądarki. Link publiczny zapewnia HTTPS na telefonie. Wyznaczanie nowych tras korzysta z profilu pieszego FOSSGIS/OSRM. Podkład online korzysta z OpenStreetMap. Publiczna baza i zdjęcia trasy demonstracyjnej są częścią aplikacji. Dostęp do GPS blisko budynków i wewnątrz może być niedokładny. Prototyp ilustruje propozycję integracji z mObywatelem bez dostępu do systemów tożsamości.

```sh
npm run check
npm run test:e2e -- --project=chromium
VITE_PUBLIC_BASE=/misja-aed/ npm run build
```

## Film i prezentacja

- [Film MP4](deliverables/Misja-AED-60s.mp4) trwa 60 sekund i działa bez dźwięku. Film opowiada historię świadkini, która rusza po AED, gdy druga osoba pomaga przy ławce. Na Chmielnej wskazówki AR prowadzą ją do właściwej bramy. Z urządzeniem wraca do poszkodowanego. Podświetlane fragmenty napisów prowadzą narrację, a zbliżenia na przyciski i krąg dotyku pozwalają śledzić jej działania w aplikacji.
- [Edytowalny PowerPoint](deliverables/Misja-AED.pptx) i [projekt do importu w Presentation Studio](deliverables/Misja-AED.studio.json). Jedenaście slajdów w stylu GovTech korzysta z układów oryginalnej prezentacji Risk Engine. Slajd 6 odtwarza film. Źródła znajdują się w notatkach prelegenta. [PDF wyeksportowany ze Studia](deliverables/Misja-AED.pdf) · [Otwórz projekt w lokalnym Studio](http://127.0.0.1:5174/?deck=misja-aed) · [Instalacja w Presentation Studio](studio/README.md).
- [Źródła filmu, ilustracje i odtwarzanie renderu](docs/media.md) · [Research usług AED i interfejsu mObywatela](docs/research.md).

[Wyniki sprawdzeń prototypu](docs/demo-verification.md)

**Azeno Hi** — Paweł Konior, Przemysław Stanisz, Andrzej Grzyb, Piotr Lipiński, Rafał Krupa i Tomasz Tracz.
