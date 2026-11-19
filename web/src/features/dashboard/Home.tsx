import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  BookOpen,
  ChevronRight,
  CarFront,
  IdCard,
  Database,
  FileBadge,
  Footprints,
  HeartPulse,
  Layers3,
  LocateFixed,
  Map,
  MapPin,
  Navigation,
  ScanLine,
} from 'lucide-react';
import route from '../../../map/demo-route.json';
import { catalog, paths, type Page } from '../../shared/navigation';

const media = import.meta.env.BASE_URL;
const mercator = (lat: number) => (Math.asinh(Math.tan((lat * Math.PI) / 180)) * 180) / Math.PI;
const mapScale = 1900 / (21.022 - 21.0055);
function point(coords: number[]) {
  return [(coords[0]! - 21.0055) * mapScale, (mercator(52.236) - mercator(coords[1]!)) * mapScale];
}
const preview = route.coordinates.map(point);
const first = preview[0]!;
const last = preview[preview.length - 1]!;
const center = [(first[0]! + last[0]!) / 2 + 58, (first[1]! + last[1]!) / 2];
export function RoutePreview() {
  return (
    <div className="route-preview">
      <svg
        role="img"
        aria-label="Trasa demonstracyjna z ulicy Widok do AED przy Chmielnej"
        viewBox={`${center[0]! - 500} ${center[1]! - 207} 1000 354`}
        preserveAspectRatio="xMidYMid slice"
      >
        <image href={media + 'map-assets/srodmiescie.svg'} width="1900" height="1598.1" />
        <polyline
          points={preview.map((p) => p.join(',')).join(' ')}
          fill="none"
          stroke="white"
          strokeWidth="12"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <polyline
          points={preview.map((p) => p.join(',')).join(' ')}
          fill="none"
          stroke="#0d7956"
          strokeWidth="7"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <g transform={`translate(${first.join(' ')})`}>
          <circle r="28" fill="#418cef" opacity=".18" />
          <circle r="12" fill="#367ad9" stroke="white" strokeWidth="5" />
        </g>
        <g transform={`translate(${last.join(' ')})`}>
          <path
            d="M0 0 C-6 -11 -34 -27 -34 -50 A34 34 0 1 1 34 -50 C34 -27 6 -11 0 0Z"
            fill="#087451"
            stroke="white"
            strokeWidth="5"
          />
          <path
            d="M0 -38 C-6 -43 -18 -50 -18 -57 C-18 -67 -6 -69 0 -60 C7 -69 19 -66 18 -57 C18 -50 8 -43 0 -38Z"
            fill="white"
          />
          <path d="M2 -64 L-5 -53 H1 L-3 -46 L8 -58 H2Z" fill="#087451" />
        </g>
      </svg>
      <span className="map-credit">© OpenStreetMap</span>
    </div>
  );
}
const shortcuts = [
  { page: 'map', title: 'Mapa AED', copy: 'Znajdź urządzenie w okolicy', Icon: Map, style: 'mint' },
  {
    page: 'ar',
    title: 'Nawigacja AR',
    copy: 'Sprawdź kierunek w kamerze',
    Icon: ScanLine,
    style: 'sky',
  },
  {
    page: 'guide',
    title: 'Instrukcja AED',
    copy: 'Zobacz i usłysz kolejne kroki',
    Icon: AudioLines,
    style: 'lilac',
  },
] as const;
export function FavoriteServices({go}: {go: (page: Page) => void}) {
  return (
      <section className="shortcuts">
        <h2>Ulubione usługi</h2>
        <div className="tiles">
          {shortcuts.map(({ page, title, copy, Icon, style }) => (
            <button key={page} onClick={() => go(page)} className="service-tile">
              <span className={'tile-icon ' + style}>
                <Icon size={24} />
              </span>
              <strong>{title}</strong>
              <span className="tile-caption">{copy}</span>
              <ChevronRight size={17} className="tile-chevron" />
            </button>
          ))}
        </div>
      </section>
  );
}
const wallet = [
  { label: 'mDowód', icon: FileBadge, type: 'identity' },
  { label: 'mPrawo jazdy', icon: IdCard, type: 'licence' },
  { label: 'Moje pojazdy', icon: CarFront, type: 'vehicles' },
] as const;
export function Home({ go, documents }: { go: (p: Page) => void; documents: (title: string) => void }) {
  return (
    <div className="home-grid">
      <section className="aed-hero">
        <div className="hero-visual" role="img" aria-label="Zielony futerał defibrylatora AED" />
        <div className="hero-copy">
          <span className="service-tag">
            <HeartPulse size={16} /> MISJA AED
          </span>
          <h2>
            Defibrylator
            <br />w pobliżu
          </h2>
          <p>
            Znajdź najbliższy AED i skorzystaj
            <br className="wide-only" /> z prowadzenia do urządzenia.
          </p>
          <button type="button" className="primary-cta" onClick={() => go('map')}>
            <MapPin size={18} /> Otwórz mapę AED <ArrowRight size={17} />
          </button>
        </div>
      </section>
      <section className="near-card surface">
        <div className="near-head">
          <span className="small-icon mint">
            <LocateFixed size={18} />
          </span>
          <h2>Najbliższy AED</h2>
          <span className="demo-mini">Demo</span>
        </div>
        <button
          className="preview-btn"
          onClick={() => go('map')}
          aria-label="Pokaż trasę na mapie · © OpenStreetMap"
        >
          <RoutePreview />
        </button>
        <div className="near-info">
          <h3>Dom Towarowy Braci Jabłkowskich</h3>
          <p>
            <MapPin size={14} /> Warszawa, Chmielna 21
          </p>
          <div className="walk-line">
            <span>
              <Footprints size={15} /> 4 min pieszo <i /> 291 m
            </span>
            <button
              className="icon-link"
              aria-label="Otwórz mapę najbliższego AED"
              onClick={() => go('map')}
            >
              <ArrowUpRight size={18} />
            </button>
          </div>
        </div>
      </section>
      <FavoriteServices go={go} />
      <section className="documents">
        <h2>Dokumenty</h2>
        <div className="doc-stack">
          {wallet.map(({label,icon:Icon,type}) => (
            <button key={type} type="button" className={'doc-card wallet-'+type} onClick={()=>documents(label)}>
              <span className="doc-grooves" />
              <span className="doc-top"><Icon size={26}/><span>Wzór</span></span>
              <span className="doc-bottom"><strong>{label}</strong><ChevronRight size={19}/></span>
            </button>
          ))}
        </div>
      </section>
      <button className="open-strip surface" onClick={() => go('data')}>
        <span className="tile-icon mint">
          <Database size={22} />
        </span>
        <span>
          <strong>Otwarte dane o AED</strong>
          <small>
            {catalog.records.toLocaleString('pl-PL')} lokalizacji w ogólnopolskim zbiorze
          </small>
        </span>
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
export function DataView() {
  return (
    <article className="info-page surface">
      <span className="tile-icon mint">
        <Database />
      </span>
      <h2>Ogólnopolski zbiór AED</h2>
      <p>
        Współrzędne, opis miejsca, informacje o dostępie i źródła pochodzenia w dwóch otwartych
        formatach.
      </p>
      <div className="data-counts">
        <div>
          <strong>{catalog.records.toLocaleString('pl-PL')}</strong>
          <span>lokalizacji</span>
        </div>
        <div>
          <strong>{catalog.sources.length}</strong>
          <span>źródła danych</span>
        </div>
        <div>
          <strong>{catalog.matched}</strong>
          <span>scalonych par</span>
        </div>
      </div>
      <h3>Pobierz dane</h3>
      <div className="download-list">
        {[
          ...catalog.resources,
          { format: 'Metadane JSON', path: 'catalog.json' },
          { format: 'Import do dane.gov.pl (XML)', path: 'harvester.xml' },
        ].map((r) => (
          <a key={r.path} href={media + 'data/' + r.path} download>
            <Layers3 size={17} />
            {r.format}
            <ArrowUpRight size={16} />
          </a>
        ))}
      </div>
      <h3>Pochodzenie i aktualność</h3>
      <p>
        Import z {catalog.imported}. Data importu opisuje wersję zbioru. Stan urządzenia i godziny
        dostępu mogą się zmieniać.
      </p>
      <ul>
        {catalog.sources.map((s) => (
          <li key={s.id}>
            <a href={s.url}>{s.publisher}</a> · <a href={s.license}>Licencja źródła</a>
          </li>
        ))}
      </ul>
      <p>
        Eksport do przekazania wydawcy portalu dane.gov.pl. Baza pochodna jest dostępna na licencji
        ODbL 1.0.
      </p>
    </article>
  );
}
export function AboutView() {
  return (
    <article className="info-page surface">
      <span className="tile-icon lilac">
        <BookOpen />
      </span>
      <h2>Misja AED · Azeno Hi</h2>
      <p>
        Prototyp zespołu Azeno Hi na HackNation 2026 dla wyzwania Departamentu Zarządzania Danymi
        Ministerstwa Cyfryzacji. Pulpit pokazuje koncepcję usługi w mObywatelu.
      </p>
      <h3>Zespół</h3>
      <p>
        Paweł Konior, Przemysław Stanisz, Andrzej Grzyb, Piotr Lipiński, Rafał Krupa i Tomasz Tracz.
      </p>
      <h3>Jak działa pokaz</h3>
      <p>
        Warszawska trasa działa w trybie demonstracyjnym. Wybierz swoją lokalizację na mapie, aby
        poszukać AED w pobliżu. Na telefonie możesz udostępnić kamerę, kompas i GPS. Znacznik AR
        pokazuje przewidywany kierunek według czujników telefonu.
      </p>
      <p>
        Nawigacja online przesyła pozycję i cel do serwera tras pieszych. Dostawca kafelków mapy
        otrzymuje żądania dla oglądanego obszaru. Rozpoznawanie komend głosowych zależy od
        przeglądarki.
      </p>
      <a className="project-link data-project-link" href="#dane">Otwórz zbiór danych AED <Database size={16}/></a>
      <a className="project-link" href="https://github.com/pawelkonior/misja-aed">
        Kod, źródła i materiały zespołu <ArrowUpRight size={16} />
      </a>
    </article>
  );
}
export function JourneyAside({ page }: { page: Page }) {
  return (
    <aside className="journey surface">
      <h2>Droga do AED</h2>
      {[
        { key: 'map', label: 'Wybierz defibrylator', Icon: MapPin },
        { key: 'ar', label: 'Dotrzyj do urządzenia', Icon: Navigation },
        { key: 'guide', label: 'Otwórz instrukcję', Icon: HeartPulse },
      ].map((item) => (
        <div className={'journey-step ' + (item.key === page ? 'current' : '')} key={item.key}>
          <span>
            <item.Icon size={19} />
          </span>
          <strong>{item.label}</strong>
        </div>
      ))}
      <div className="journey-note">
        <strong>Gdy ktoś traci przytomność</strong>
        <p>
          Zadzwoń na 112 lub 999 i słuchaj dyspozytora. Jeśli ktoś jest z Tobą, poproś tę osobę o
          przyniesienie AED.
        </p>
      </div>
      <a className="soft-link" href={'#' + paths.data}>
        Dane o lokalizacjach <ChevronRight size={15} />
      </a>
    </aside>
  );
}
