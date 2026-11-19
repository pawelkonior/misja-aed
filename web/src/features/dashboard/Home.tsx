import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CarFront,
  ChevronRight,
  Database,
  FileBadge,
  IdCard,
  Layers3,
  ShieldCheck,
  WalletCards,
  FolderClosed,
  ScanQrCode,
  LayoutGrid,
} from 'lucide-react';
import { useState } from 'react';
import { Modal } from '../../shared/ui/Modal';
import { catalog, type Page } from '../../shared/navigation';

const media = import.meta.env.BASE_URL;

const documents = [
  {
    name: 'mDowód',
    Icon: FileBadge,
    style: 'identity',
    href: 'mdowod',
    info: 'Cyfrowy dokument tożsamości. W aplikacji mObywatel znajdziesz swoje dane i potwierdzisz tożsamość.',
  },
  {
    name: 'mPrawo jazdy',
    Icon: IdCard,
    style: 'licence',
    href: 'mprawo-jazdy',
    info: 'Informacje o uprawnieniach do kierowania pojazdami i ich ważności.',
  },
  {
    name: 'Moje pojazdy',
    Icon: CarFront,
    style: 'vehicles',
    href: 'moje-pojazdy',
    info: 'Dane pojazdów, terminy badań technicznych i ważność ubezpieczenia OC.',
  },
] as const;
const services = [
  { name: 'Bezpiecznie w sieci', Icon: ShieldCheck, href: 'bezpiecznie-w-sieci' },
  { name: 'Historia pojazdu', Icon: CarFront, href: 'historia-pojazdu' },
] as const;
function Brand() {
  return (
    <header className="wallet-brand">
      <img src={media + 'media/mobywatel.png'} width="36" height="36" alt="" />
      <h1>mObywatel</h1>
    </header>
  );
}
function NearbyService({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      className="nearby-service"
      aria-label="Defibrylator w pobliżu Otwórz mapę"
      onClick={onOpen}
    >
      <img
        className="nearby-photo"
        src={media + 'media/hero.webp'}
        alt=""
        fetchPriority="high"
        width="1536"
        height="1024"
      />
      <span className="nearby-body">
        <strong>Defibrylator w pobliżu</strong>{' '}
        <span className="nearby-action">
          Otwórz mapę <ArrowRight aria-hidden="true" size={18} />
        </span>
      </span>
    </button>
  );
}
function ServiceList() {
  return (
    <div className="wallet-services">
      {services.map(({ name, Icon, href }) => (
        <a
          key={href}
          href={'https://info.mobywatel.gov.pl/uslugi/' + href}
          target="_blank"
          rel="noreferrer"
        >
          <Icon size={21} aria-hidden="true" />
          <span>{name}</span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}
export function Home({
  onOpen,
  servicesOnly = false,
}: {
  onOpen: () => void;
  servicesOnly?: boolean;
}) {
  const [doc, setDoc] = useState<(typeof documents)[number] | null>(null);
  return (
    <div className="home-screen">
      <Brand />
      {!servicesOnly && (
        <section className="wallet-docs" aria-labelledby="document-title">
          <h2 id="document-title">Dokumenty</h2>
          <div className="document-stack">
            {documents.map((item) => (
              <button
                key={item.name}
                type="button"
                className={'wallet-document doc-' + item.style}
                onClick={() => setDoc(item)}
                aria-label={item.name}
              >
                <span>{item.name}</span>
                <item.Icon aria-hidden="true" size={24} />
              </button>
            ))}
          </div>
        </section>
      )}
      <section className="service-section" aria-labelledby="service-title">
        <h2 id="service-title">{servicesOnly ? 'Usługi' : 'Ulubione usługi'}</h2>
        <NearbyService onOpen={onOpen} />
        <ServiceList />
      </section>
      {doc && (
        <Modal title={doc.name} onClose={() => setDoc(null)}>
          <p>{doc.info}</p>
          <a
            href={'https://info.mobywatel.gov.pl/dokumenty/' + doc.href}
            target="_blank"
            rel="noreferrer"
          >
            O dokumencie w mObywatelu <ArrowUpRight size={16} />
          </a>
        </Modal>
      )}
    </div>
  );
}
export function WalletNav({ page }: { page: Page }) {
  const [qr, setQR] = useState(false);
  return (
    <>
      <nav className="wallet-nav" aria-label="Nawigacja mobilna">
        <a href="#pulpit" aria-current={page === 'home' ? 'page' : undefined}>
          <WalletCards />
          Dokumenty
        </a>
        <a href="#uslugi" aria-current={page === 'services' ? 'page' : undefined}>
          <FolderClosed />
          Usługi
        </a>
        <button type="button" aria-haspopup="dialog" aria-expanded={qr} onClick={() => setQR(true)}>
          <ScanQrCode />
          Kod QR
        </button>
        <a
          href="#wiecej"
          aria-current={page === 'more' || page === 'about' || page === 'data' ? 'page' : undefined}
        >
          <LayoutGrid />
          Więcej
        </a>
      </nav>
      {qr && (
        <Modal title="Otwórz usługę AED na telefonie" onClose={() => setQR(false)}>
          <img
            src={media + 'media/demo-qr.png'}
            width="204"
            height="204"
            alt="Kod QR usługi AED"
            className="wallet-qr"
          />
          <a href="https://pawelkonior.github.io/misja-aed/">
            Otwórz aplikację <ArrowRight size={16} />
          </a>
        </Modal>
      )}
    </>
  );
}
export function More() {
  return (
    <div className="home-screen">
      <Brand />
      <h2>Więcej</h2>
      <div className="wallet-services">
        <a href="#dane">
          <Database size={21} />
          Otwarte dane o AED
          <ChevronRight size={16} />
        </a>
        <a href="#projekt">
          <BookOpen size={21} />O usłudze AED
          <ChevronRight size={16} />
        </a>
      </div>
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
        Usługę zaprojektował zespół Azeno Hi na HackNation 2026 w ramach wyzwania Departamentu
        Zarządzania Danymi Ministerstwa Cyfryzacji.
      </p>
      <h3>Zespół</h3>
      <p>
        Paweł Konior, Przemysław Stanisz, Andrzej Grzyb, Piotr Lipiński, Rafał Krupa i Tomasz Tracz.
      </p>
      <h3>Jak działa prowadzenie</h3>
      <p>
        Mapa wyszukuje AED po udostępnieniu lokalizacji lub wskazaniu miejsca startu. Na telefonie
        możesz udostępnić kamerę, kompas i GPS. Znacznik AR pokazuje przewidywany kierunek według
        czujników telefonu.
      </p>
      <p>
        Nawigacja online przesyła pozycję i cel do serwera tras pieszych. Dostawca kafelków mapy
        otrzymuje żądania dla oglądanego obszaru. Rozpoznawanie komend głosowych zależy od
        przeglądarki.
      </p>
      <a className="project-link data-project-link" href="#dane">
        Otwórz zbiór danych AED <Database size={16} />
      </a>
      <a className="project-link" href="https://github.com/pawelkonior/misja-aed">
        Kod, źródła i materiały zespołu <ArrowUpRight size={16} />
      </a>
    </article>
  );
}
