# Weryfikacja dema HackNation

Weryfikacja z 19 listopada 2026 r. obejmowała produkcyjny build i prawdziwe przeglądarkowe API. Do powtarzalnego sprawdzenia czujników użyliśmy kontrolowanych odczytów oraz testowego strumienia kamery. Dokładność prowadzenia wewnątrz budynków i działanie na fizycznych modelach telefonów pozostają do oceny w pilotażu terenowym.

| Sprawdzenie | Wynik |
| --- | --- |
| TypeScript, Oxlint, Prettier, testy jednostkowe i build | Pełne polecenie `npm run check` przeszło, w tym 61 testów jednostkowych. |
| Interfejs | Wszystkie 28 scenariuszy Playwright przeszły w Chromium, Firefox, WebKit i mobilnym Chromium. Obejmują pulpit portfela, odmowę udostępnienia lokalizacji, trasę z GPS, wskazówki piesze, wejście do AR, powiadomienie z możliwością anulowania, dojście do AED, pieszy powrót do zapisanego punktu startu bez ponownego wezwania, nagranie przejścia i pobranie danych. Mobilny viewport zajmuje cały ekran, a podgląd z myszą ma pomarańczową obudowę telefonu. |
| Odliczanie do połączenia | Zegar testowy i zastępcza obsługa telefonu potwierdzają jedno otwarcie po 10 s. Anulowanie w ostatniej sekundzie lub opuszczenie trasy zatrzymuje wywołanie. W produkcji odbiorcą jest systemowa aplikacja telefoniczna przez `tel:112`. Współrzędne są wyświetlane do przekazania operatorowi. W tym przebiegu testów nie dzwoniono pod prawdziwy numer. |
| Nagranie w aplikacji | Pionowy film 720 × 1280 trwa 25,2 s. Przez 16 s pokazuje rzeczywiste podejście do bramy. W 22. sekundzie pojawiają się zdjęcie szafki i przycisk instrukcji. Licznik w nagraniu wykorzystuje orientacyjne odległości. Kamera na żywo wylicza odległości z GPS i trasy pieszej. |
| Rzeczywiste wejście mikrofonowe | Chromium podało polski plik WAV przez wirtualny mikrofon. Silnik Vosk rozpoznał słowo „dalej”; aplikacja przeszła z kroku o elektrodach do kroku o odsunięciu się. Po wyłączeniu mikrofonu powtórzenie komendy pozostawiło ten sam krok. |
| Zbiór | Jedna wspólna lista 18 272 obiektów; z niej wyprowadzono GeoJSON i CSV. XML porównano z oficjalnym XSD 1.13, a MD5 z treścią pliku XML. |
| Film | MP4 zawiera pojedynczy strumień obrazu H.264, 1920 × 1080, 1800 klatek przy 30 kl./s. Film trwa 60 sekund i odtwarza się bez dźwięku. Kolejne fragmenty napisów podświetlają się w ujęciach świadkini i telefonu. Zbliżenia pokazują dotknięcie kafla AED, anulowanie odliczania i wybór trasy powrotnej. Po dotknięciach widać zmianę stanu aplikacji. |
| Prezentacja | Projekt otwiera się w Presentation Studio przez `?deck=misja-aed`. Na slajdzie 6 działa odtwarzacz MP4. PDF ma 11 stron. W PPTX są edytowalne pola tekstowe, fonty i film. |

Test rozpoznawania można powtórzyć na opublikowanym demie po zainstalowaniu zależności w `web/`. Polecenie uruchamia osobny proces Chrome z wirtualnym mikrofonem. Plik testowy zawiera wyłącznie słowo „dalej”.

```sh
node scripts/verify-voice.mjs https://pawelkonior.github.io/misja-aed/
```

Backend szablonu zweryfikowano oddzielnie. Przeszły 332 testy, a cztery integracje wymagające zewnętrznych baz zostały pominięte. Wersja demonstracyjna Misji AED działa ze statycznej dystrybucji.
