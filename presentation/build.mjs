import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(dir);
const assets = path.join(dir, 'assets');
const source = 'https://github.com/pawelkonior/misja-aed';
const demo = 'https://pawelkonior.github.io/misja-aed/';
const gov = 'https://hacknation.pl/zadania';
const osm = 'https://openaedmap.org/api/v1/countries/PL.geojson';
const town =
  'https://dane.przemysl.eu/zasoby-danych/defibrylatory-aed-na-terenie-miasta-przemysla/';
const catalog = demo + 'data/catalog.json';
const bracia = 'https://www.openstreetmap.org/node/14154384101';
const merged = 'https://www.openstreetmap.org/node/4024070186';
const photoSource = 'https://commons.wikimedia.org/?curid=';
const erc = 'https://www.prc.krakow.pl/wp-content/uploads/2025/11/WytResusc_netv2.pdf';
const reading = JSON.parse(fs.readFileSync(path.join(root, 'web/public/data/catalog.json')));
const features = JSON.parse(
  fs.readFileSync(path.join(root, 'web/public/data/aed-polska.geojson')),
).features;
const n = features.length;
const pretty = (value) =>
  new Intl.NumberFormat('pl-PL', { useGrouping: 'always' }).format(value).replaceAll('\u00a0', ' ');
const pct = (count) => ((count / n) * 100).toFixed(1).replace('.', ',') + '%';
const record = features.find((f) => f.id === 'node/4024070186');
if (!record || record.properties.municipal_id !== 744 || reading.records !== n)
  throw new Error('Record or snapshot differs.');
const colors = {
  red: '#E6013A',
  slate: '#335966',
  ink: '#0B1F28',
  navy: '#12243B',
  cyan: '#21D3E0',
  paper: '#FFFFFF',
  gray: '#F5F5F7',
  line: '#D6E1E4',
  darkPanel: '#1E3540',
};
const fonts = { title: 'Bebas Neue', body: 'Montserrat', meta: 'JetBrains Mono' };
const slides = [];
let current;
function el(x, y, w, h, e = {}) {
  const index = current.elements.length + 1;
  current.elements.push({
    id: current.id + '-' + index,
    type: 'text',
    x,
    y,
    w,
    h,
    text: '',
    color: colors.ink,
    fontSize: 12,
    bold: false,
    align: 'left',
    preformatted: true,
    ...e,
  });
}
function rect(x, y, w, h, fill, stroke) {
  el(x, y, w, h, { geometry: 'rect', fill, ...(stroke ? { stroke } : {}) });
}
function txt(text, x, y, w, h, size, options = {}) {
  el(x, y, w, h, { text, fontSize: size, fontFamily: fonts.body, ...options });
}
function title(text, x = 72, y = 79, w = 1136, h = 88, size = 60, color = colors.slate) {
  txt(text, x, y, w, h, size, { fontFamily: fonts.title, color, placeholder: 'Dodaj tytuł' });
}
function label(text, x, y, w, h, size = 34, color = colors.slate) {
  txt(text, x, y, w, h, size, { fontFamily: fonts.title, color });
}
function meta(text, x, y, w, h, size = 15, color = colors.slate) {
  txt(text, x, y, w, h, size, { fontFamily: fonts.meta, color });
}
function imageData(asset) {
  const mime = path.extname(asset).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
  return 'data:' + mime + ';base64,' + fs.readFileSync(path.join(assets, asset)).toString('base64');
}
function pic(asset, alt, x, y, w, h, extra = {}) {
  el(x, y, w, h, { type: 'image', src: imageData(asset), text: alt, fit: 'contain', ...extra });
}
function slide(name, notes, links, style = 'standard') {
  const code = String(slides.length + 1).padStart(2, '0');
  current = {
    id: 'misja-aed-' + code,
    code,
    title: name,
    layout: style === 'cover' ? 'cover' : 'standard',
    backup: false,
    duration: 0,
    background: style === 'dark' ? colors.ink : colors.paper,
    notes,
    markdown: '# ' + name,
    sources: links.join('\n'),
    elements: [],
  };
  slides.push(current);
  if (style !== 'cover') {
    rect(72, 54, 48, 5, style === 'dark' ? colors.cyan : colors.red);
    rect(72, 659, 1136, 1, style === 'dark' ? colors.slate : colors.line);
    title(
      name,
      72,
      style === 'dark' ? 70 : 79,
      1136,
      88,
      60,
      style === 'dark' ? colors.paper : colors.slate,
    );
  }
}
function framed(asset, alt, x, y, w, h) {
  rect(x, y, w, h, colors.gray, colors.line);
  pic(asset, alt, x + 4, y + 4, w - 8, h - 8);
}
const mission = 'Misja AED';
slide(
  mission,
  'Azeno Hi proponuje usługę w mObywatelu i wspólny zbiór o AED dla Polski. Prototyp na wyzwanie Departamentu Zarządzania Danymi Ministerstwa Cyfryzacji można uruchomić w przeglądarce. Okładka przedstawia ilustrację torby AED przygotowaną w ImageGen.',
  [gov, demo, source + '/blob/main/docs/media.md'],
  'cover',
);
rect(957, 0, 323, 720, colors.red);
rect(795, 144, 372, 405, colors.paper, colors.ink);
rect(795, 144, 52, 5, colors.ink);
rect(72, 78, 40, 5, colors.red);
meta('Azeno Hi', 127, 61, 270, 34, 21);
title(mission, 69, 218, 690, 158, 132);
txt('Otwarty rejestr defibrylatorów\ni droga do urządzenia w mObywatelu', 74, 386, 701, 125, 32, {
  color: colors.navy,
});
pic('aed-okladka.jpg', 'Ilustracja torby AED przygotowana w ImageGen', 815, 166, 332, 359);
meta('HackNation 2026  /  Misja AED – dane na ratunek', 74, 623, 700, 29, 15);

slide(
  '111 metrów do pinezki. 291 metrów do AED.',
  'Trasa demonstracyjna zaczyna się przy ul. Widok w Warszawie i prowadzi do budynku Braci Jabłkowskich. Odległość geodezyjna to 111 m, a zapisany wynik routingu pieszego FOSSGIS/OSRM to 291 m. Wejście od ul. Chmielnej 21 prowadzi do pasażu. Osoba przy poszkodowanym dzwoni pod 112 i wykonuje polecenia dyspozytora. Po AED idzie drugi świadek. Mapa © OpenStreetMap contributors, ODbL. Fotografia podwórza: Cybularny, CC BY 4.0; zdjęcie wykadrowane.',
  [
    bracia,
    'https://routing.openstreetmap.de/about.html',
    source + '/blob/main/web/map/demo-route.json',
    'https://www.openstreetmap.org/copyright',
    photoSource + '199080241',
    'https://creativecommons.org/licenses/by/4.0/',
    erc,
  ],
);
framed(
  'trasa-widok-chmielna.png',
  'Piesza trasa od niebieskiej pozycji na ul. Widok do zielonego znacznika przy Chmielnej 21',
  72,
  187,
  738,
  342,
);
framed('podworze.jpg', 'Droga przez podwórze budynku Braci Jabłkowskich', 832, 187, 376, 342);
// The two labels are anchored to WGS84 coordinates in the Leaflet screenshot.
// Chmielna is the photographed passage entrance; the green pin is the AED inside.
rect(188, 249, 181, 35, colors.paper, colors.slate);
meta('Chmielna 21', 198, 255, 165, 24, 17, colors.ink);
rect(369, 270, 28, 2, colors.slate);
rect(395, 268, 5, 5, colors.red);
rect(377, 443, 129, 34, colors.paper, colors.slate);
meta('ul. Widok', 386, 449, 110, 24, 17, colors.ink);
rect(359, 456, 18, 2, colors.slate);
meta('Warszawa  /  trasa piesza FOSSGIS · © OpenStreetMap', 72, 541, 738, 32, 15);
meta('Pasaż Braci Jabłkowskich', 832, 541, 375, 32, 16);
rect(72, 598, 36, 4, colors.red);
txt('Po AED idzie drugi świadek. Pierwszy zostaje przy poszkodowanym.', 123, 584, 1070, 53, 24, {
  bold: true,
});

slide(
  'Dwa źródła, ' + pretty(n) + ' lokalizacje',
  'Katalog z 19 listopada 2026 r. obejmuje ogólnopolski eksport OpenAEDMap oraz opublikowane dane Straży Miejskiej w Przemyślu. Wykres jest przestrzennym odczytem wszystkich geometrii punktowych z publicznego zasobu GeoJSON. Widoczna gęstość przedstawia zawartość tej migawki. Liczba rzeczywiście działających urządzeń wymaga weryfikacji terenowej.',
  [catalog, osm, town, demo + 'data/aed-polska.geojson', 'https://www.openstreetmap.org/copyright'],
);
const rows = [
  [pretty(reading.sources[0].records), 'rekordów OpenAEDMap / OSM'],
  ['+ ' + pretty(reading.sources[1].records), 'rekordów Straży Miejskiej w Przemyślu'],
  ['− ' + pretty(reading.matched), 'par opisujących to samo urządzenie'],
];
for (const [i, [value, description]] of rows.entries()) {
  const y = 187 + i * 132;
  rect(72, y, 523, 1, colors.line);
  label(value, 70, y + 9, 490, 72, 60, i === 0 ? colors.slate : colors.red);
  txt(description, 72, y + 79, 518, 44, 21);
}
framed(
  'lokalizacje-polska.png',
  'Rozmieszczenie wszystkich 18 272 rekordów z ogólnopolskiego pliku GeoJSON',
  630,
  178,
  578,
  405,
);
meta('Punkty w zbiorze  /  19.11.2026', 633, 598, 571, 33, 15);

slide(
  'Jeden AED, dwa ślady pochodzenia',
  'W rekordzie przy ul. Juliusza Słowackiego 12 zachowujemy identyfikator i nazwę miejską oraz węzeł OSM. Wspólna geometria pochodzi z OSM, w układzie WGS84. Scalenie jest zapisane w jawnej liście par identyfikatorów, po sprawdzeniu adresu i opisu. Gdy samo zbliżenie współrzędnych nie rozstrzyga o tożsamości urządzenia, wpisy pozostają osobne.',
  [merged, town, source + '/blob/main/docs/open-data.md', demo + 'data/aed-polska.geojson'],
);
txt('Juliusza Słowackiego 12, Przemyśl', 72, 178, 1120, 57, 35, { bold: true, color: colors.navy });
rect(72, 269, 548, 1, colors.line);
rect(72, 269, 42, 4, colors.red);
rect(659, 269, 549, 1, colors.line);
rect(659, 269, 42, 4, colors.red);
label('Straż Miejska w Przemyślu', 72, 295, 532, 56, 35);
meta('Miejski ID 744', 72, 369, 510, 35, 22, colors.ink);
txt('„Defibrylator (AED 9485)\nw ADM Centrum”', 72, 423, 520, 98, 26);
label('OpenStreetMap', 659, 295, 540, 56, 35);
meta('node/4024070186', 659, 369, 540, 35, 22, colors.ink);
txt('„Urząd Miejski w Przemyślu”', 659, 423, 550, 98, 26);
rect(72, 544, 1136, 1, colors.line);
txt('Jedna pozycja i oba odsyłacze źródłowe.', 72, 563, 1120, 47, 26, { bold: true });
meta('Zgodne adresy i opisy  /  WGS84: 49.7812117° N, 22.7751538° E', 72, 610, 1120, 30, 16);

slide(
  'Wejście od Chmielnej',
  'Kolejne fotografie pochodzą z lokalizacji rzeczywistej. Zdjęcia ulicy i pasażu są autorstwa Cybularnego. Pierwsze udostępniono na CC0, drugie na CC BY 4.0. Ostatnie zdjęcie urządzenia pochodzi z OpenAEDMap i ma oznaczenie CC0. W prezentacji wykorzystano kadry z tych fotografii. Aplikacja sortuje materiały referencyjne na podstawie odległości i kierunku dojścia; dostępność zdjęć zależy od rekordu.',
  [
    photoSource + '199081043',
    photoSource + '199080251',
    bracia,
    'https://creativecommons.org/licenses/by/4.0/',
    'https://creativecommons.org/publicdomain/zero/1.0/',
  ],
);
const triptych = [
  [
    'wejscie.jpg',
    'Brama od ul. Chmielnej 21',
    'Brama z numerem 21',
    'Wejdź od strony ul. Chmielnej.',
  ],
  [
    'pasaz.jpg',
    'Pasaż Braci Jabłkowskich z muralem',
    'Pasaż z muralem',
    'Przejdź w głąb podwórza.',
  ],
  [
    'urzadzenie.jpg',
    'Rzeczywista szafka AED w pasażu',
    'Zielona szafka AED',
    'Szukaj jej w tunelu przy tablicach.',
  ],
];
for (const [i, [asset, alt, head, body]] of triptych.entries()) {
  const x = 72 + i * 384;
  pic(asset, alt, x, 200, 368, 301);
  rect(x, 520, 32, 4, colors.red);
  label(head, x, 542, 369, 52, 33);
  txt(body, x, 594, 368, 49, 19);
}

slide(
  'Od ekranu głównego do instrukcji',
  'Film przedstawia działający prototyp mObywatela. Pokazuje mapę, wybór urządzenia, zdjęcia, trasę, demonstrację AR i instrukcję. Ujęcia symulacji są podpisane. Film ma 60 sekund, polską ścieżkę lektorską i format 1920 × 1080. W pokazie slajdów naciśnij obraz, aby rozpocząć odtwarzanie.',
  [
    source + '/releases/download/hacknation-demo/Misja-AED-60s.mp4',
    source + '/tree/main/film',
    demo,
  ],
  'dark',
);
rect(72, 164, 840, 474, colors.darkPanel, colors.slate);
pic('film-poster.jpg', 'Film demonstracyjny Misja AED', 73, 165, 838, 471.375, {
  videoSrc: '/media/misja-aed/demo.mp4',
});
label('60 s', 951, 190, 241, 110, 86, colors.cyan);
txt('Wybór AED, dojście i instrukcja dla świadka.', 953, 312, 249, 175, 25, {
  color: colors.paper,
  bold: true,
});
meta('Polski lektor', 954, 574, 240, 36, 16, '#ACCDD6');

slide(
  'Co widzi świadek przy AED',
  'Lewy kadr przedstawia oznaczony tryb symulacji AR oparty na rzeczywistym zdjęciu trasy. W terenie aplikacja korzysta z obrazu tylnej kamery, pozycji GPS, orientacji telefonu i polilinii trasy. Po dotarciu użytkownik odszukuje AED i potwierdza, że ma je przy poszkodowanym. Prawy kadr to animacja naklejania elektrod z instruktażu dla dorosłych. Wezwij pomoc pod 112 i stosuj się do wskazówek dyspozytora. Po przyniesieniu AED należy włączyć urządzenie i słuchać jego komunikatów. Polski lektor czyta kroki, a zgodne przeglądarki rozpoznają komendę „dalej”.',
  [
    demo + '#ar',
    demo + '#instrukcja',
    erc,
    'https://www.gov.pl/web/mswia/pierwsza-pomoc',
    photoSource + '199080251',
  ],
);
const cols = [
  {
    x: 72,
    w: 547,
    asset: 'ar-kadr.jpg',
    alt: 'Kadr modułu AR w demonstracji, ze znacznikiem na fotografii prawdziwego pasażu',
    head: 'Kierunek w kamerze',
    body: 'GPS i kompas przybliżają kierunek. Świadek potwierdza odnalezienie AED.',
  },
  {
    x: 662,
    w: 546,
    asset: 'elektrody.png',
    alt: 'Kadr animacji. Elektrody na klatce piersiowej dorosłego',
    head: 'Instrukcja z lektorem',
    body: 'Słuchaj AED. Komenda „dalej” zmienia krok instrukcji dla dorosłych.',
  },
];
for (const c of cols) {
  framed(c.asset, c.alt, c.x, 189, c.w, 239);
  label(c.head, c.x, 450, c.w, 54, 36);
  txt(c.body, c.x, 506, c.w, 86, 23);
}
meta('Gdy osoba nie reaguje, zadzwoń pod 112 i słuchaj dyspozytora.', 72, 611, 1136, 31, 16);

slide(
  'Gdzie brakuje danych terenowych',
  'Zliczono rekordy z niepustymi polami description, hours i photo w udostępnionej migawce. Odsetki mają wspólny mianownik 18 272 i są zaokrąglone do jednego miejsca po przecinku. Wpis o godzinach albo dostępna fotografia wymagają okresowej weryfikacji. Fotografia urządzenia nie gwarantuje też zdjęcia właściwego wejścia.',
  [demo + 'data/aed-polska.geojson', catalog, source + '/blob/main/docs/open-data.md'],
);
meta(
  'Uzupełnione pola  /  ' + pretty(n) + ' rekordy w migawce z 19.11.2026',
  72,
  177,
  1136,
  32,
  17,
);
const fields = [
  ['description', 'Opis miejsca'],
  ['hours', 'Godziny dostępu'],
  ['photo', 'Zdjęcie'],
];
for (const [i, [field, caption]] of fields.entries()) {
  const val = features.filter((f) => Boolean(f.properties[field])).length;
  const y = 246 + i * 98;
  label(caption, 72, y - 8, 256, 50, 30);
  rect(347, y + 5, 641, 21, colors.line);
  rect(347, y + 5, (641 * val) / n, 21, i === 2 ? colors.red : colors.slate);
  txt(pct(val), 1011, y - 10, 104, 49, 26, { bold: true });
  meta(pretty(val), 1113, y - 2, 95, 38, 16);
}
rect(72, 557, 36, 4, colors.red);
txt('W pilotażu zbierzmy zdjęcia wejść i potwierdźmy godziny dostępu.', 124, 543, 1060, 72, 27, {
  bold: true,
  color: colors.navy,
});

slide(
  'Pilotaż z wydawcą danych',
  'Propozycja pilotażu: wskazać osobę odpowiedzialną za dane w jednej jednostce samorządu terytorialnego, wybrać obiekty i razem z administratorami sprawdzić wejścia, godziny oraz położenie urządzeń. Jedna grupa szuka AED z mapą, druga z mapą, zdjęciami i AR; porównujemy czas dotarcia od wejścia do odnalezienia urządzenia. Gotowe zasoby to GeoJSON, CSV i XML zgodny ze schematem harwestera 1.13. Publiczna dystrybucja działa na GitHub Pages. Rejestracja źródła w dane.gov.pl wymaga uprawnionego wydawcy.',
  [
    demo + 'data/aed-polska.geojson',
    demo + 'data/aed-polska.csv',
    demo + 'data/harvester.xml',
    source + '/blob/main/docs/open-data.md',
    'https://www.dane.gov.pl/pl',
  ],
);
txt('Wyznaczmy wydawcę w samorządzie i wybierzmy obiekty do testu.', 72, 183, 1115, 101, 35, {
  bold: true,
  color: colors.navy,
});
const pilot = [
  ['Wydawca', 'Samorząd wskazuje opiekuna danych i osoby odpowiedzialne za AED w obiektach.'],
  ['Weryfikacja', 'W terenie potwierdzamy pozycję szafki, godziny dostępu i zdjęcia wejścia.'],
  ['Pomiar', 'Porównujemy czas odnalezienia AED z samą mapą oraz z mapą, zdjęciami i AR.'],
];
for (const [i, [h, body]] of pilot.entries()) {
  const x = 72 + i * 385;
  rect(x, 323, 352, 1, colors.line);
  rect(x, 323, 36, 4, colors.red);
  label(h, x, 346, 352, 63, 37);
  txt(body, x, 409, 354, 142, 23);
}
rect(72, 567, 1136, 1, colors.line);
meta('GeoJSON  /  CSV  /  XML harwestera 1.13', 72, 590, 558, 44, 18);
txt('Import na dane.gov.pl uruchamia uprawniony wydawca.', 646, 582, 560, 60, 20, { bold: true });

const team = JSON.parse(fs.readFileSync(path.join(dir, 'team-layout.json')));
team.code = '10';
team.notes =
  'Zespół Azeno Hi prowadzą Paweł Konior (AI Applied) i Przemysław Stanisz (ML Applied). W zespole są również Andrzej Grzyb, Piotr Lipiński, Rafał Krupa i Tomasz Tracz. Portrety i układ zespołu pochodzą z prezentacji przekazanej przez Azeno Hi.';
team.sources =
  'Azeno Hi · autorskie zdjęcia zespołu i role liderów w prezentacji Risk Engine / Azeno Hi.\n' +
  source;
for (const e of team.elements)
  if (e.asset) {
    e.src = imageData(e.asset);
    delete e.asset;
  }
slides.push(team);
const deck = {
  version: 1,
  brand: 'azeno-hi-risk-engine',
  title: 'Misja AED / Azeno Hi',
  timingMode: 'free',
  showBrandLogo: false,
  footer: '',
  theme: {
    showBranding: false,
    showFooter: false,
    fontFamily: fonts.body,
    accent: colors.red,
    foreground: colors.ink,
    muted: colors.slate,
    brandName: 'Azeno Hi',
    byline: '',
  },
  source: [gov, source, catalog].join('\n'),
  riskEngineContentVersion: 1,
  riskEngineTeamSlideAdded: true,
  riskEngineTeamLayoutVersion: 4,
  slides,
};
fs.writeFileSync(
  path.join(root, 'deliverables/Misja-AED.studio.json'),
  JSON.stringify(deck, null, 2) + '\n',
);
console.log('Zapisano ' + slides.length + ' slajdów Presentation Studio.');
