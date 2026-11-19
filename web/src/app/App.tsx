import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';

import { mountAedMap } from '../../map/index.js';
import type { MapSession, NavigationPayload } from '../../map/index.js';
import { AboutView, DataView, Home, More, WalletNav } from '../features/dashboard/Home';
import { ArGuide, requestArCompass } from '../features/rescue/ArGuide';
import { EmergencyCall, type CallRequest } from '../features/rescue/EmergencyCall';
import { AedInstructions } from '../features/rescue/Rescue';
import { currentPage, names, paths, type Page } from '../shared/navigation';

function go(page: Page) {
  if (currentPage() !== page) window.location.hash = paths[page];
}

function MapScreen({
  visible,
  onOpenAR,
  onStartGuidance,
  onEndGuidance,
  onOpenRecording,
}: {
  visible: boolean;
  onOpenAR: (trip: NavigationPayload) => void;
  onStartGuidance: (trip: NavigationPayload) => void;
  onEndGuidance: () => void;
  onOpenRecording: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const session = useRef<MapSession | null>(null);
  useEffect(() => {
    if (visible && root.current && !session.current) {
      session.current = mountAedMap(root.current, {
        onBack: () => go('home'),
        onOpenAR,
        onOpenRecording,
        onStartGuidance,
        onEndGuidance,
        onArrive: () => go('guide'),
      });
    }
    session.current?.setActive(visible);
  }, [visible, onOpenAR, onStartGuidance, onEndGuidance, onOpenRecording]);
  useEffect(
    () => () => {
      session.current?.destroy();
      session.current = null;
    },
    [],
  );
  return <div ref={root} hidden={!visible} className="mobile-map" />;
}

export function App() {
  const [route, setRoute] = useState<Page>(currentPage);
  const [trip, setTrip] = useState<NavigationPayload | null>(null);
  const [callRequest, setCallRequest] = useState<CallRequest | null>(null);
  const page = route === 'ar' && !trip ? 'map' : route;
  const inJourney = page === 'map' || page === 'ar' || page === 'recording' || page === 'guide';

  useEffect(() => {
    const change = () => {
      const next = currentPage();
      setRoute(next);
      if (next !== 'map' && next !== 'ar' && next !== 'guide') setCallRequest(null);
      if (next === 'home') setTrip(null);
      const scroller = document.querySelector<HTMLElement>('[data-phone-scroll]');
      if (scroller) scroller.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  const openAR = useCallback((selected: NavigationPayload) => {
    void requestArCompass();
    setTrip(selected);
    go('ar');
  }, []);
  const offerCall = useCallback((selected: NavigationPayload) => {
    setCallRequest({
      deadline: Date.now() + 10000,
      position: selected.mode === 'live' ? selected.position : null,
    });
  }, []);
  const dismissCall = useCallback(() => setCallRequest(null), []);
  const openRecording = useCallback(() => {
    setCallRequest(null);
    go('recording');
  }, []);

  return (
    <main className={'mobile-shell screen-' + page}>
      {(page === 'home' || page === 'services') && (
        <Home servicesOnly={page === 'services'} onOpen={() => go('map')} />
      )}
      {page === 'more' && <More />}
      {!inJourney && <WalletNav key={page} page={page} />}
      {inJourney && (
        <MapScreen
          visible={page === 'map'}
          onOpenAR={openAR}
          onStartGuidance={offerCall}
          onEndGuidance={dismissCall}
          onOpenRecording={openRecording}
        />
      )}
      {page === 'ar' && trip && (
        <ArGuide
          target={trip.target}
          origin={trip.mode === 'live' ? trip.position : null}
          path={trip.path}
          steps={trip.route?.steps ?? []}
          onOpenRecording={openRecording}
          onBack={() => go('map')}
          onArrive={() => go('guide')}
        />
      )}
      {page === 'recording' && (
        <ArGuide
          target={null}
          playRecording
          onBack={() => go('map')}
          onArrive={() => go('guide')}
        />
      )}
      {page === 'guide' && <AedInstructions onBack={() => go('map')} />}
      {(page === 'data' || page === 'about') && (
        <>
          <header className="info-head">
            <a href="#pulpit" aria-label="Wróć na pulpit">
              <ArrowLeft size={21} />
            </a>
            <h1>{names[page]}</h1>
          </header>
          {page === 'data' ? <DataView /> : <AboutView />}
        </>
      )}
      {callRequest && (page === 'ar' || page === 'map' || page === 'guide') && (
        <EmergencyCall key={callRequest.deadline} request={callRequest} onDismiss={dismissCall} />
      )}
    </main>
  );
}
