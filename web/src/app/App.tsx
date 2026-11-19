import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  AudioLines,
  CalendarDays,
  ChevronRight,
  Database,
  HeartPulse,
  House,
  Info,
  LayoutGrid,
  MapPin,
  MapPinned,
  Phone,
  ScanLine,
  WalletCards,
  BriefcaseBusiness,
  ScanQrCode,
  Grip,
} from 'lucide-react';
import {
  AboutView,
  DataView,
  FavoriteServices,
  Home,
  JourneyAside,
} from '../features/dashboard/Home';
import { AedInstructions, ArGuide } from '../features/rescue/Rescue';
import { Modal } from '../shared/ui/Modal';
import { currentPage, names, paths, type Page } from '../shared/navigation';
import { mountAedMap, DEMO_SUMMARY } from '../../map/index.js';
import demoRoute from '../../map/demo-route.json';

const nav = [
  { page: 'home', Icon: LayoutGrid },
  { page: 'map', Icon: MapPinned },
  { page: 'ar', Icon: ScanLine },
  { page: 'guide', Icon: AudioLines },
] as const;
type Location = { lat: number; lon: number };
type Trip = {
  target: Location & { name: string };
  position: Location;
  route: { coordinates: number[][] } | null;
  mode: string;
};
const trial: Trip = {
  target: DEMO_SUMMARY.target,
  position: DEMO_SUMMARY.position,
  route: demoRoute,
  mode: 'demo',
};
const formatDate = new Intl.DateTimeFormat('pl-PL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Warsaw',
});
function go(page: Page) {
  if (currentPage() !== page) window.location.hash = paths[page];
}
function Brand() {
  return (
    <a href="#pulpit" className="brand" aria-label="mObywatel, pulpit">
      <img src={import.meta.env.BASE_URL + 'media/mobywatel.png'} width="33" height="33" alt="" />
      <strong>mObywatel</strong>
    </a>
  );
}

export function App() {
  const [page, setPage] = useState<Page>(currentPage);
  const [date] = useState(() => formatDate.format(new Date()));
  const [doc, setDoc] = useState('');
  const [qr, setQr] = useState(false);
  const [trip, setTrip] = useState<Trip>(trial);
  const [arrival, setArrival] = useState(false);
  const mapRoot = useRef<HTMLDivElement>(null);
  const mapControl = useRef<ReturnType<typeof mountAedMap> | null>(null);
  const keepMap = page === 'map' || page === 'ar' || page === 'guide';
  const openAR = useCallback((v: Trip) => {
    setTrip(v);
    go('ar');
  }, []);
  useEffect(() => {
    const change = () => {
      setPage(currentPage());
      setDoc('');
      setQr(false);
      setArrival(false);
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect((): undefined | (() => void) => {
    if (!keepMap || !mapRoot.current) return undefined;
    const mounted = mountAedMap(mapRoot.current, {
      onBack: () => go('home'),
      onOpenAR: openAR,
      onArrive: () => setArrival(true),
    });
    mapControl.current = mounted;
    return () => {
      mounted.destroy();
      mapControl.current = null;
    };
  }, [keepMap, openAR]);
  function navigate(destination: Page) {
    if (destination === 'ar') {
      const state = mapControl.current?.getState();
      if (state?.position && state.target && state.route)
        setTrip({
          position: state.position,
          target: state.target,
          route: state.route,
          mode: state.mode,
        });
      else if (state?.mode === 'live') {
        go('map');
        return;
      } else setTrip(trial);
    }
    go(destination);
  }
  function navLink(
    key: Page,
    Icon: typeof Database,
    shortName = names[key],
    active = page === key,
  ) {
    return (
      <a
        key={key}
        href={'#' + paths[key]}
        aria-current={active ? 'page' : undefined}
        onClick={(e) => {
          e.preventDefault();
          navigate(key);
        }}
      >
        <Icon size={20} />
        <span>{shortName}</span>
      </a>
    );
  }

  return (
    <div className="portal">
      <aside className="sidebar">
        <div className="brand-holder">
          <Brand />
        </div>
        <div className="nav-label">NAWIGACJA</div>
        <nav aria-label="Nawigacja główna" className="side-nav">
          {nav.map((v) => navLink(v.page, v.Icon))}
        </nav>
        <div className="aside-bottom">
          <nav aria-label="Informacje o usłudze" className="side-nav">
            {navLink('data', Database)}
            {navLink('about', Info)}
          </nav>
          <div className="team-mark">
            <span>AH</span>
            <div>
              <strong>Azeno Hi</strong>
              <small>HackNation 2026</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="desktop-crumb">
            <House size={16} />
            <ChevronRight size={13} /> <span>{names[page]}</span>
          </div>
          <div className="mobile-brand">
            <Brand />
          </div>
          <div className="bar-actions">
            <a className="prototype-pill" href="#projekt">
              <span /> Prototyp
            </a>
            <a className="call-pill" href="tel:112">
              <Phone size={15} /> <span>Zadzwoń</span> 112
            </a>
          </div>
        </header>
        <main className={'app-content view-' + page}>
          <div className="page-heading">
            <div>
              {page === 'home' && (
                <div className="date-line">
                  <CalendarDays size={15} />
                  {date}
                </div>
              )}
              <h1 className={page === 'home' ? 'desktop-dashboard-title' : undefined}>
                {names[page]}
              </h1>
              {page === 'home' && <h1 className="mobile-wallet-title">Dokumenty</h1>}
            </div>
            {page === 'home' && (
              <span className="city-chip">
                <MapPin size={15} /> Warszawa <i /> Demo
              </span>
            )}
          </div>
          {page === 'home' && <Home go={navigate} documents={setDoc} />}
          {page === 'services' && (
            <div className="mobile-services">
              <FavoriteServices go={navigate} />
            </div>
          )}
          {keepMap && (
            <div className="module-grid">
              <div className="active-module">
                <div hidden={page !== 'map'} ref={mapRoot} />
                {page === 'ar' && (
                  <ArGuide
                    target={trip.target}
                    origin={trip.position}
                    path={(trip.route?.coordinates ?? []).map(([lon, lat]) => ({
                      lon: lon!,
                      lat: lat!,
                    }))}
                    demo={trip.mode === 'demo'}
                    onBack={() => go('map')}
                    onArrive={() => go('guide')}
                  />
                )}
                {page === 'guide' && <AedInstructions onBack={() => go('map')} />}
              </div>
              <JourneyAside page={page} />
            </div>
          )}
          {page === 'data' && <DataView />}
          {page === 'about' && <AboutView />}
          <footer className="footline">
            <span>
              <HeartPulse size={15} /> Misja AED
            </span>
            <a href="#projekt">
              Prototyp zespołu Azeno Hi <ArrowUpRight size={13} />
            </a>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Nawigacja mobilna">
        {navLink('home', WalletCards, 'Dokumenty')}
        {navLink('services', BriefcaseBusiness, 'Usługi', page === 'services' || keepMap)}
        <button type="button" aria-haspopup="dialog" aria-expanded={qr} onClick={() => setQr(true)}>
          <ScanQrCode size={20} />
          <span>Kod QR</span>
        </button>
        {navLink('about', Grip, 'Więcej')}
      </nav>
      {doc && (
        <Modal title={doc} onClose={() => setDoc('')}>
          <p>
            Karta wzorcowa pokazuje miejsce dokumentów na pulpicie mObywatela. Usługę Misja AED
            otworzysz z sekcji „Ulubione usługi”.
          </p>
          <button className="primary-cta" onClick={() => setDoc('')}>
            Wróć na pulpit
          </button>
        </Modal>
      )}
      {qr && (
        <Modal title="Otwórz demo na telefonie" onClose={() => setQr(false)}>
          <img
            className="demo-qr"
            src={import.meta.env.BASE_URL + 'media/demo-qr.png'}
            width="204"
            height="204"
            alt="Kod QR prowadzący do dema Misja AED"
          />
          <a className="project-link" href="https://pawelkonior.github.io/misja-aed/">
            pawelkonior.github.io/misja-aed
          </a>
        </Modal>
      )}
      {arrival && page === 'map' && (
        <Modal title="Jesteś w pobliżu AED" onClose={() => setArrival(false)}>
          <p>
            Sprawdź oznaczenie urządzenia i opis miejsca. Gdy masz AED przy poszkodowanym, otwórz
            instrukcję.
          </p>
          <button
            className="primary-cta"
            onClick={() => {
              setArrival(false);
              go('guide');
            }}
          >
            Mam AED przy poszkodowanym
          </button>
        </Modal>
      )}
    </div>
  );
}
