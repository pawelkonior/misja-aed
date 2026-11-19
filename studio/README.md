# Misja AED w Presentation Studio

Instalator dodaje prezentację do lokalnej aplikacji Presentation Studio zawierającej szablon zespołu Risk Engine. Wymaga Pythona 3.10+, Git, Node.js i zainstalowanych zależności tej aplikacji. Aktualizuje wybór decka w `App.tsx`, ładowanie projektu w `main.tsx` i walidację jednej ścieżki MP4. Instalacja działa również wtedy, gdy katalog Studio jest poza repozytorium Git.

```sh
python3 studio/install_studio.py --studio ../presentation_engine
```

Jeśli Studio ma już uruchomiony serwer na porcie 5174, odśwież stronę. W innym przypadku uruchom je w katalogu aplikacji.

```sh
npm run dev -- --port 5174 --strictPort
```

[Otwórz Misję AED w Studio](http://127.0.0.1:5174/?deck=misja-aed)

## Edycja i film

Prezentacja źródłowa to `deliverables/Misja-AED.studio.json`. Ponowne uruchomienie instalatora synchronizuje jej wersję, film i skróty do lokalnego katalogu Studio. Edycje w przeglądarce są zapisywane osobno dla każdej wersji materiału źródłowego. Edytowalny projekt można pobrać z menu Studio. Załączony film trafia pod lokalny adres `/media/misja-aed/demo.mp4`.

Na slajdzie z filmem element typu `image` przechowuje plakat w `src` i ścieżkę do MP4 w `videoSrc`. W trybie **Prezentuj** Studio wyświetla natywny odtwarzacz z paskiem postępu i dźwiękiem. W edytorze, miniaturach i PDF pozostaje plakat.

## Eksport

Przycisk **Eksportuj PDF** otwiera podgląd liczby slajdów. Wybierz **Pobierz PDF**. Automatyczny eksport korzysta z tego samego polecenia Studio i czystej sesji przeglądarki. Używa Playwright z pakietu `web` w repozytorium AED.

```sh
node studio/export-pdf.mjs /tmp/Misja-AED.pdf
```
