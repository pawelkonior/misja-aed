# Ogólnopolski zbiór AED

W wydaniu z 19 listopada 2026 r. katalog obejmuje **18 272 rekordy**. OpenAEDMap dostarczyła 18 265 punktów z Polski, Straż Miejska w Przemyślu opublikowała 21 rekordów. Po porównaniu adresów, nazw miejsc i współrzędnych połączono 14 par. Każda para ma przypisane dwa identyfikatory źródłowe. Osobne urządzenia w jednym budynku oraz niejednoznaczne pary pozostają osobnymi rekordami.

| Zasób | Zastosowanie |
| --- | --- |
| [GeoJSON](https://pawelkonior.github.io/misja-aed/data/aed-polska.geojson) | Punkty WGS84 w kolejności długość, szerokość geograficzna. |
| [CSV](https://pawelkonior.github.io/misja-aed/data/aed-polska.csv) | Tabela UTF-8 z nagłówkami i oddzielnymi kolumnami współrzędnych. |
| [Katalog źródeł](https://pawelkonior.github.io/misja-aed/data/catalog.json) | Dostawcy, licencje, data pobrania i statystyki eksportu. |
| [Metadane dla dane.gov.pl](https://pawelkonior.github.io/misja-aed/data/harvester.xml) | Jeden zbiór, dwa zasoby, kategoria zdrowie, stabilne identyfikatory i adresy HTTPS. |
| [Suma MD5 pliku XML](https://pawelkonior.github.io/misja-aed/data/harvester.md5) | Umożliwia sprawdzenie zmiany treści metadanych. |

## Pochodzenie

Punkty ogólnopolskie pochodzą z bazy © OpenStreetMap contributors na licencji ODbL 1.0. Pole `source_url` prowadzi do obiektu OSM lub zasobu miejskiego. Identyfikatory mają postać `node/…`, `way/…` albo `przemysl/…`. Pola `upstream_source` i `upstream_note` przechowują dodatkowe informacje wskazane przez autorów. [OpenAEDMap – dane Polski](https://openaedmap.org/api/v1/countries/PL.geojson) · [Warunki OSM](https://www.openstreetmap.org/copyright)

Straż Miejska w Przemyślu udostępnia swój zasób na CC BY 4.0. Do katalogu przeniesiono m.in. nazwę, adres i identyfikator miejski. Rekordy wspólne zachowują geometrię OSM oraz identyfikator i link do źródła miejskiego. Każde odświeżenie ponownie sprawdza odległość dla ręcznie dopasowanych par. Wątpliwe dopasowania pozostają rozdzielone. [Zasób Straży Miejskiej](https://dane.przemysl.eu/zasoby-danych/defibrylatory-aed-na-terenie-miasta-przemysla/) · [Warunki miejskie](https://dane.przemysl.eu/creative-commons-cc-by-4-0/)

Dane o urządzeniu obejmują m.in. opis, dostęp, godziny, kondygnację oraz ostatnią datę weryfikacji zgłoszoną w źródle. Puste wartości oznaczają brak informacji. Czas pobrania jest wspólny dla eksportu. Każde zdjęcie ma własne warunki wykorzystania. [Atrybucje zdjęć i mapy](../web/public/map-assets/credits.txt)

## Zdjęcia ostatnich metrów

Dla wejścia od Chmielnej 21 aplikacja ma wbudowane trzy fotografie z położeniem aparatu i kierunkiem zapisanym w EXIF. Poza tą trasą aplikacja sprawdza otwarty katalog Panoramax w promieniu 50 m od wybranego publicznego punktu. Do Panoramax wysyła obszar urządzenia AED. Wybiera zdjęcia z ograniczonym polem widzenia, znanym autorem i licencją oraz aparatem skierowanym w stronę punktu. Pokazuje je zgodnie z kierunkiem podejścia jako zdjęcia **okolicy punktu**. Zdjęcia samego urządzenia pochodzą z rekordu OpenAEDMap. Dostępność fotografii zależy od miejsca. [Katalog Panoramax](https://docs.panoramax.fr/federated-catalog/overview/) · [Metadane kierunku zdjęć](https://docs.panoramax.fr/web-viewer/05_Compatibility/)

## Odświeżenie i sprawdzenie

Z głównego katalogu repozytorium uruchom poniższe polecenia, korzystając z Pythona 3.10+, `curl` i `xmllint`. Skrypt pobierze strony miejskiego API i pełną polską paczkę OpenAEDMap. Eksport CSV i GeoJSON powstaje na podstawie tej samej listy rekordów. Pliki wynikowe trafiają do `web/public/data/`.

```sh
python3 web/scripts/data/refresh_aed.py
curl -fsSL https://dane.gov.pl/static/xml/xml_import_otwarte_dane_1_13.xsd -o /tmp/misja-aed-1.13.xsd
xmllint --nonet --noout --schema /tmp/misja-aed-1.13.xsd web/public/data/harvester.xml
```

Wersja demonstracyjna wystawia plik XML dla importera 1.13. Użyto własnego opisu warunków ponownego wykorzystania bazy w polu `dbOrCopyrighted`. Wydawca zamierzający włączyć zasoby do portalu przekazuje publiczny adres XML i jego sumy kontrolnej redakcji dane.gov.pl, uzgadnia konfigurację źródła i sprawdza wynik importu. Zmianę hostingu uwzględnia się w `web/scripts/data/harvester.py` przed ponowną generacją. Oficjalną rejestrację prowadzi uprawniony wydawca. [Schematy importu](https://dane.gov.pl/static/xml/) · [Instruktaż Ministerstwa Cyfryzacji](https://www.youtube.com/watch?v=dH3JLcj862M)
