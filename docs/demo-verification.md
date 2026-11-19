# Weryfikacja dema HackNation

Weryfikacja z 19 listopada 2026 r. obejmowała produkcyjny build i prawdziwe przeglądarkowe API. Do powtarzalnego sprawdzenia czujników użyliśmy kontrolowanych odczytów oraz testowego strumienia kamery. Dokładność prowadzenia wewnątrz budynków i działanie na fizycznych modelach telefonów pozostają do oceny w pilotażu terenowym.

| Sprawdzenie | Wynik |
| --- | --- |
| TypeScript, Oxlint, Prettier, testy jednostkowe i build | Pełne polecenie `npm run check` przeszło. |
| Interfejs | 16 scenariuszy Playwright przeszło w Chromium, Firefox, WebKit i mobilnym Chromium. Sprawdzono trasę, przejście do instrukcji, zakładki, QR i kontrast pulpitu przez axe. |
| Rzeczywiste wejście mikrofonowe | Chromium podało polski plik WAV przez wirtualny mikrofon. Silnik Vosk rozpoznał słowo „dalej”; aplikacja przeszła z kroku o elektrodach do kroku o odsunięciu się. Po wyłączeniu mikrofonu powtórzenie komendy pozostawiło ten sam krok. |
| Zbiór | Jedna wspólna lista 18 272 obiektów; z niej wyprowadzono GeoJSON i CSV. XML porównano z oficjalnym XSD 1.13, a MD5 z treścią pliku XML. |
| Film | H.264, 1920 × 1080, 1800 klatek przy 30 kl./s; 60 sekund z polską ścieżką AAC, w tym ta sama próbka komendy, którą rozpoznała aplikacja podczas nagrania. |
| Prezentacja | Projekt otwiera się w Presentation Studio przez `?deck=misja-aed`. Na slajdzie 6 działa odtwarzacz MP4. PDF ma 10 stron. W PPTX są edytowalne pola tekstowe, fonty i film. |

Test rozpoznawania można powtórzyć na opublikowanym demie po zainstalowaniu zależności w `web/`. Polecenie uruchamia osobny proces Chrome z wirtualnym mikrofonem. Plik testowy zawiera wyłącznie słowo „dalej”.

```sh
node scripts/verify-voice.mjs https://pawelkonior.github.io/misja-aed/
```

Backend szablonu zweryfikowano oddzielnie. Przeszły 332 testy, a cztery integracje wymagające zewnętrznych baz zostały pominięte. Wersja demonstracyjna Misji AED działa ze statycznej dystrybucji.
