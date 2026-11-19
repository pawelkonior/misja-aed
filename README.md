# Misja AED — dane na ratunek

**[Uruchom demo na telefonie lub komputerze](https://pawelkonior.github.io/misja-aed/)** · **[Oglądaj film, 60 s](https://pawelkonior.github.io/misja-aed/pokaz/)** · **[Prezentacja](https://github.com/pawelkonior/misja-aed/releases/download/hacknation-demo/Misja-AED.pptx)**

Prototyp usługi mObywatel na [wyzwanie HackNation 2026](https://hacknation.pl/zadania) Departamentu Zarządzania Danymi Ministerstwa Cyfryzacji. Łączy istniejące źródła o AED w otwarty zbiór dla Polski. Na telefonie przeprowadza drugiego świadka zdarzenia od wyszukania urządzenia do instrukcji po przyniesieniu go do poszkodowanego.

## Pokaz

1. Z ekranu głównego wybierz **Otwórz mapę AED**. Scenariusz demonstracyjny zaczyna się przy ul. Widok w Warszawie. Na mapie przycisk **Moja lokalizacja** uruchamia rzeczywisty GPS.
2. Wybierz **Dom towarowy Bracia Jabłkowscy**, obejrzyj zdjęcia wejścia, pasażu i urządzenia, następnie wybierz **Wyznacz trasę pieszą**. Od startu demonstracyjnego to 291 m i około 4 minut.
3. **Prowadź w AR** pokazuje następny odcinek trasy. W trybie demonstracyjnym **Symuluj dojście** przesuwa pozycję po trasie. W trybie lokalizacji telefonu przycisk **Włącz kamerę i czujniki** uruchamia obraz i kompas.
4. Po wykryciu bliskości aplikacja prosi o odszukanie urządzenia. Potwierdź jego przejęcie. Instrukcja dla dorosłych zawiera 5 animowanych kroków, polskiego lektora oraz komendę **„dalej”** na zgodnych przeglądarkach. W „O instrukcji i obsłudze głosowej” można wybrać rozpoznawanie w urządzeniu. Pierwsze uruchomienie tego trybu pobiera polski model Vosk (około 50 MB).
5. W widoku **Otwarte dane** pobierz zbiór i metadane.

W sytuacji zagrożenia życia dzwoń na 112 lub 999 i słuchaj dyspozytora. Pojedynczy świadek powinien pozostać przy poszkodowanym. Dokładność AR zależy od GPS, kompasu i ułożenia telefonu; znacznik oznacza przewidywany kierunek, a fizyczne odnalezienie urządzenia potwierdza użytkownik. [Źródła medyczne i research](docs/research.md)

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

Otwórz adres wypisany przez Vite. Kamera, lokalizacja i rozpoznawanie mowy wymagają HTTPS lub localhost i zgód przeglądarki. Link publiczny zapewnia HTTPS na telefonie. Wyznaczanie nowych tras korzysta z profilu pieszego FOSSGIS/OSRM. Podkład online korzysta z OpenStreetMap. Publiczna baza i zdjęcia trasy demonstracyjnej są częścią aplikacji. Dostęp do GPS blisko budynków i wewnątrz może być niedokładny. Prototyp ilustruje propozycję integracji z mObywatelem bez dostępu do systemów tożsamości.

```sh
npm run check
npm run test:e2e -- --project=chromium
VITE_PUBLIC_BASE=/misja-aed/ npm run build
```

## Film i prezentacja

- [Film MP4](deliverables/Misja-AED-60s.mp4), H.264, 1920 × 1080, 30 kl./s, 60 sekund, polski lektor. Rozdziały pokazują interakcje z faktyczną aplikacją oraz oznaczoną symulację dojścia.
- [Edytowalny PowerPoint](deliverables/Misja-AED.pptx) i [projekt do importu w Presentation Studio](deliverables/Misja-AED.studio.json). Dziesięć slajdów w stylu GovTech korzysta z układów oryginalnej prezentacji Risk Engine. Slajd 6 odtwarza film. Źródła znajdują się w notatkach prelegenta. [PDF wyeksportowany ze Studia](deliverables/Misja-AED.pdf) · [Otwórz projekt w lokalnym Studio](http://127.0.0.1:5174/?deck=misja-aed) · [Instalacja w Presentation Studio](studio/README.md).
- [Źródła filmu, ilustracje i odtwarzanie renderu](docs/media.md) · [Research usług AED i interfejsu mObywatela](docs/research.md).

[Wyniki sprawdzeń prototypu](docs/demo-verification.md)

**Azeno Hi** — Paweł Konior, Przemysław Stanisz, Andrzej Grzyb, Piotr Lipiński, Rafał Krupa i Tomasz Tracz.
