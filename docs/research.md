# Research do Misji AED

Stan rozpoznania i decyzje projektowe z 19 listopada 2026 r.

| Rozwiązanie | Co można wykorzystać w projekcie |
| --- | --- |
| OpenAEDMap / OSM Polska | Istnieją otwarta mapa oraz maszynowy eksport lokalizacji. Użyliśmy ogólnopolskich punktów i zachowaliśmy identyfikatory źródłowe, daty kontroli, informacje o dostępie oraz źródła zdjęć. [Eksport OpenAEDMap](https://openaedmap.org/api/v1/countries/PL.geojson) · [repozytorium OSM Polska](https://github.com/openstreetmap-polska/aed-mapa) |
| Mapa AED | Pokazuje najbliższy AED, trasę pieszą, dostęp i zdjęcia. Autor opisuje też aktualizowanie punktów oraz pracę z pobraną bazą. Te funkcje stanowią punkt odniesienia dla wyboru urządzenia. [Strona aplikacji](https://aedmapa.pl/) |
| Geoportal | Warstwa „Defibrylatory” służy do przeglądania krajowych lokalizacji i korzysta z OSM Polska. Ponowny import tej warstwy powieliłby to samo źródło. [Opis GUGiK](https://www.gov.pl/web/gugik/lokalizacja-defibrylatorow-w-serwisie-wwwgeoportalgovpl) |
| NieboGuard | Mapa w wersji beta przewiduje skanowanie okolicy w AR. W naszym scenariuszu kamera prowadzi po odcinkach wyznaczonej trasy, a przy celu pokazuje orientacyjny kierunek urządzenia. [Mapa AED NieboGuard](https://nieboguard.pl/narzedzia/mapa-aed) |
| mojeIKP | Sekcja pierwszej pomocy tłumaczy użycie AED krok po kroku. W prototypie potwierdzenie dotarcia prowadzi do instrukcji dostępnej również z pulpitu. [Centrum e-Zdrowia](https://pacjent.gov.pl/aplikacja-mojeikp-ratunek-w-trudnych-chwilach) |
| Przemyśl | Miejski katalog stanowi niezależne źródło do połączenia z OSM. Rekord o tej samej lokalizacji zachowuje oba odwołania. [Zasób Straży Miejskiej](https://dane.przemysl.eu/zasoby-danych/defibrylatory-aed-na-terenie-miasta-przemysla/) |

## Interfejs mObywatela

Oficjalna karta aplikacji pokazuje portfel z zachodzącymi na siebie kartami, jasne tło, nagłówek Dokumenty oraz dolne zakładki Dokumenty, Usługi, Kod QR i Więcej. Ministerstwo opisuje grupowanie usług i wybieranie ulubionych. Wykorzystaliśmy te wzorce dla telefonu. Widoczne wejście do Misji AED z ekranu głównego jest proponowaną zmianą na potrzeby wyzwania. Na dużym ekranie aplikacja pokazuje pulpit z boczną nawigacją. [Oficjalne zrzuty w App Store](https://apps.apple.com/pl/app/mobywatel/id1339613469) · [Opis zmian Ministerstwa Cyfryzacji](https://www.gov.pl/web/cyfryzacja/mobywatel--10-milionow-uzytkownikow-nowa-odslona-aplikacji-i-plany-jej-rozwoju)

## Przebieg ratunkowy i granice pomiaru

Jeśli osoba nie reaguje, instrukcja kieruje do kontaktu z dyspozytorem. Osobie obecnej na miejscu przypomina o ocenie oddechu i natychmiastowym rozpoczęciu uciśnięć przy nieprawidłowym oddychaniu. Po AED można wysłać drugą osobę. Instrukcja dla dorosłych prowadzi następnie przez uruchomienie urządzenia, elektrody, odsunięcie się na polecenie urządzenia oraz wznowienie RKO. [Wytyczne ERC 2025 w tłumaczeniu Polskiej Rady Resuscytacji](https://www.prc.krakow.pl/wp-content/uploads/2025/11/WytResusc_netv2.pdf) · [Pierwsza pomoc MSWiA](https://www.gov.pl/web/mswia/pierwsza-pomoc)

Odległość w linii prostej służy do znalezienia kandydatów, a długość dojścia pochodzi z sieci pieszej. Na pokazowej trasie przy budynku Braci Jabłkowskich te dwie wartości to 111 i 291 metrów. Kierunek w AR wynika z położenia, orientacji telefonu i geometrii trasy. GPS przy budynku może wskazać drugą stronę ściany lub inną kondygnację. Dlatego aplikacja pokazuje zdjęcie i opis miejsca oraz prosi o fizyczne potwierdzenie odnalezienia AED. [Rekord urządzenia w OSM](https://www.openstreetmap.org/node/14154384101) · [Usługa routingu FOSSGIS](https://routing.openstreetmap.de/about.html)

## Co mierzyć w pilotażu

Zespół proponuje przejście tej samej trasy od strony ulicy i pasażu z użytkownikami Androida i iOS. Warto osobno zmierzyć czas wyboru urządzenia, czas od dotarcia do budynku do odnalezienia AED, zgodność zdjęcia z kierunkiem wejścia, błąd kompasu i skuteczność komendy „dalej”. Są to proponowane miary, a wyników terenowych jeszcze nie zebraliśmy.
