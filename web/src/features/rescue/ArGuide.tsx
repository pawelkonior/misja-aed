import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { bearing, cameraOrientation, distance, tracedPath } from './geometry';
import type { CompassEvent, Coordinates } from './geometry';
import { Symbol } from './Symbol';
import { meters, routePhotos } from '../../../map/core';

type Target = Coordinates & {
  name: string;
  id?: string;
  photo?: string;
  photo_license?: string;
  source_url?: string;
};
export interface ArProps {
  target: Target;
  origin?: Coordinates | null;
  path?: readonly Coordinates[];
  demo: boolean;
  onBack: () => void;
  onArrive: () => void;
}
type Fix = { point: Coordinates; accuracy: number; at: number };
type DeviceHeading = { heading: number; tilt: number };
type OrientationConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: (absolute?: boolean) => Promise<string>;
};
const base = import.meta.env.BASE_URL;
const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
function useArSensors(active: boolean, video: RefObject<HTMLVideoElement | null>) {
  const [fix, setFix] = useState<Fix | null>(null),
    [heading, setHeading] = useState<DeviceHeading | null>(null);
  const [gpsMessage, setGpsMessage] = useState('Ustalanie lokalizacji…');
  const [cameraMessage, setCameraMessage] = useState('Uruchamianie kamery…'),
    [visible, setVisible] = useState(false);
  useEffect((): undefined | (() => void) => {
    if (!active) return undefined;
    let closed = false,
      stream: MediaStream | undefined,
      watch: number | undefined;
    const player = video.current;
    const listen = (event: CompassEvent) => {
      if (
        !event.absolute &&
        event.type !== 'deviceorientationabsolute' &&
        event.webkitCompassHeading === undefined
      )
        return;
      setHeading(cameraOrientation(event));
    };
    window.addEventListener('deviceorientationabsolute', listen);
    window.addEventListener('deviceorientation', listen);
    if (navigator.geolocation) {
      watch = navigator.geolocation.watchPosition(
        (p) => {
          if (closed) return;
          setGpsMessage('');
          setFix({
            point: { lat: p.coords.latitude, lon: p.coords.longitude },
            accuracy: p.coords.accuracy,
            at: p.timestamp,
          });
        },
        (e) => {
          if (!closed) {
            setFix(null);
            setGpsMessage(
              e.code === 1 ? 'Brak zgody na lokalizację.' : 'Brak aktualnego sygnału GPS.',
            );
          }
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 12000 },
      );
    }
    if (typeof navigator.mediaDevices?.getUserMedia === 'function')
      void navigator.mediaDevices
        .getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
        .then(async (media) => {
          if (closed) {
            media.getTracks().forEach((track) => track.stop());
            return;
          }
          stream = media;
          if (!player) return;
          const facing = media.getVideoTracks()[0]?.getSettings?.().facingMode;
          if (facing === 'user') {
            media.getTracks().forEach((t) => t.stop());
            stream = undefined;
            setCameraMessage('Nawigacja AR wymaga tylnej kamery.');
            return;
          }
          player.srcObject = media;
          await player.play();
          if (closed) return;
          setVisible(true);
          setCameraMessage('');
          media.getVideoTracks()[0]?.addEventListener('ended', () => {
            if (!closed) {
              setVisible(false);
              setCameraMessage('Kamera została wyłączona.');
            }
          });
        })
        .catch(() => {
          if (!closed) {
            setVisible(false);
            setCameraMessage('Brak obrazu. Sprawdź dostęp do kamery w przeglądarce.');
          }
        });
    return () => {
      closed = true;
      stream?.getTracks().forEach((t) => t.stop());
      if (player) player.srcObject = null;
      if (watch !== undefined) navigator.geolocation.clearWatch(watch);
      window.removeEventListener('deviceorientationabsolute', listen);
      window.removeEventListener('deviceorientation', listen);
    };
  }, [active, video]);
  return {
    fix,
    heading,
    gpsMessage: navigator.geolocation ? gpsMessage : 'Ta przeglądarka nie udostępnia lokalizacji.',
    cameraMessage:
      typeof navigator.mediaDevices?.getUserMedia === 'function'
        ? cameraMessage
        : 'Kamera wymaga połączenia HTTPS i zgodnej przeglądarki.',
    visible,
  };
}

export function ArGuide({ target, origin, path, demo, onBack, onArrive }: ArProps) {
  const [active, setActive] = useState(false),
    [motionBlocked, setMotionBlocked] = useState(false);
  const [travel, setTravel] = useState(0),
    [walking, setWalking] = useState(false),
    [yaw, setYaw] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const video = useRef<HTMLVideoElement>(null);
  const sensors = useArSensors(active && !demo, video);
  const route = useMemo(() => {
    const supplied = path?.length ? [...path] : origin ? [origin] : [];
    if (!supplied.length || distance(supplied.at(-1)!, target) > 1) supplied.push(target);
    return tracedPath(supplied);
  }, [path, origin, target]);
  const walkComplete = travel >= 1;
  useEffect((): undefined | (() => void) => {
    if (!walking || walkComplete) return undefined;
    const timer = setInterval(() => setTravel((p) => Math.min(1, p + 0.016)), 160);
    return () => clearInterval(timer);
  }, [walking, walkComplete]); // Stop the interval at the end of the walk.
  useEffect((): undefined | (() => void) => {
    if (!active) return undefined;
    const timer = setInterval(() => setClock(Date.now()), 2000);
    return () => clearInterval(timer);
  }, [active]);
  const fix = sensors.fix,
    fresh = Boolean(fix && clock - fix.at < 15000);
  const demoStart = useMemo(
    () => (demo && origin ? route.nearest(origin).offset : 0),
    [demo, origin, route],
  );
  const pos = demo
    ? route.pointAt(demoStart + (route.length - demoStart) * travel)
    : fresh
      ? fix?.point
      : undefined;
  const direct = pos ? distance(pos, target) : null;
  const located = demo || Boolean(fresh && fix && fix.accuracy <= 35);
  const near =
    located && direct !== null && direct <= 18 && (demo || Boolean(fix && fix.accuracy <= 25));
  const progress = useMemo(() => (pos ? route.nearest(pos) : null), [pos, route]);
  const onRoute = Boolean(path && path.length > 1 && progress && progress.deviation < 30);
  const remaining = progress && onRoute ? Math.max(0, route.length - progress.offset) : direct;
  // Look ahead on the pedestrian polyline even while proceeding around street corners.
  const finalLeg =
    direct !== null &&
    direct <= 45 &&
    (!onRoute || (remaining !== null && remaining <= direct + 12));
  const aim =
    onRoute && !finalLeg && progress
      ? route.pointAt(Math.min(route.length, progress.offset + 15))
      : target;
  const desired = pos ? bearing(pos, aim) : null;
  const heading = demo && desired !== null ? (desired + yaw + 360) % 360 : sensors.heading?.heading;
  const delta =
    desired !== null && heading !== undefined ? ((desired - heading + 540) % 360) - 180 : null;
  const tilt = sensors.heading?.tilt ?? 0;
  const inView = delta !== null && Math.abs(delta) < 27 && Math.abs(tilt) <= 25;
  const aligned = inView && Math.abs(delta) <= 9;
  const showOverlay = (demo || sensors.visible) && located && delta !== null;
  const markerX = 50 + (delta ?? 0) * 1.48;
  const markerY = 50 + Math.max(-23, Math.min(23, tilt));
  const photos = demo && pos ? routePhotos(target, pos, heading) : [];
  const reference =
    (near ? photos.find((photo) => photo.src === target.photo) : undefined) ?? photos[0];
  const source = reference?.src ?? base + 'media/approach.webp';
  const hint = demo
    ? 'Użyj podglądu marszu lub obróć widok suwakiem.'
    : !active
      ? 'Trzymaj telefon pionowo. Kamera i kompas pomogą wskazać kierunek kolejnego punktu.'
      : !located
        ? sensors.gpsMessage ||
          (!fresh
            ? 'Oczekiwanie na aktualną pozycję GPS.'
            : 'Dokładność GPS jest za niska, aby pokazać znacznik.')
        : motionBlocked
          ? 'Brak dostępu do kompasu. Sprawdź uprawnienia w przeglądarce.'
          : heading === undefined
            ? 'Skieruj tylną kamerę przed siebie. Oczekiwanie na zgodny kompas.'
            : !sensors.visible
              ? sensors.cameraMessage
              : 'Położenie znacznika jest przybliżone. Obserwuj drogę i oznaczenia AED.';
  function start() {
    const motion = window.DeviceOrientationEvent as OrientationConstructor | undefined;
    if (motion?.requestPermission)
      void motion
        .requestPermission(true)
        .then((v) => setMotionBlocked(v !== 'granted'))
        .catch(() => setMotionBlocked(true));
    setActive(true);
  }
  return (
    <section
      className="rescue-module rescue-ar"
      aria-label="Nawigacja w rzeczywistości rozszerzonej"
    >
      <div className="rescue-shell-head">
        <button type="button" className="rescue-round" onClick={onBack} aria-label="Wróć do mapy">
          <Symbol name="back" />
        </button>
        <span>Nawigacja AR</span>
        <Symbol name="aim" />
      </div>
      <div className={'rescue-view ' + (demo ? 'rescue-view-demo' : '')}>
        {demo && <img src={source} alt="" className="rescue-backdrop" />}
        {!demo && (
          <video
            ref={video}
            autoPlay
            playsInline
            muted
            className="rescue-backdrop"
            aria-label="Obraz z tylnej kamery"
          />
        )}
        <div className="rescue-screen-shade" />
        <div className="rescue-camera-status">
          <span className="rescue-stage">
            <i />
            {demo ? 'Symulacja AR' : sensors.visible ? 'Kamera na żywo' : 'Widok AR'}
          </span>
          {heading !== undefined && (
            <span className="rescue-compass">
              {Math.round(heading) % 360}° {labels[Math.round(heading / 45) % 8]}
            </span>
          )}
        </div>
        {showOverlay && <div className="rescue-cross" aria-hidden="true" />}
        {showOverlay && inView && (
          <div
            className={'rescue-marker ' + (aligned ? 'is-aligned' : '')}
            style={{ left: markerX + '%', top: markerY + '%' }}
          >
            <span className="rescue-marker-icon">
              <Symbol name={finalLeg ? 'heart' : 'direction'} size={29} />
            </span>
            <span>{finalLeg ? 'Strefa AED' : onRoute ? 'Kierunek trasy' : 'Kierunek do AED'}</span>
          </div>
        )}
        {showOverlay && !inView && Math.abs(tilt) <= 25 && (
          <div className={'rescue-rotate ' + (delta < 0 ? 'is-left' : '')}>
            <Symbol name={delta < 0 ? 'back' : 'next'} size={30} />
            <span>Obróć się w {delta < 0 ? 'lewo' : 'prawo'}</span>
          </div>
        )}
        {showOverlay && Math.abs(tilt) > 25 && (
          <div className="rescue-rotate">Skieruj kamerę na wprost</div>
        )}
        {!demo && !sensors.visible && (
          <div className="rescue-camera-empty">
            <Symbol name="camera" size={33} />
            <span>{active ? sensors.cameraMessage : 'Widok z kamery'}</span>
          </div>
        )}
        {demo && (
          <small className="rescue-photo-label">
            {reference
              ? 'Zdjęcie referencyjne · ' + reference.label
              : 'Ilustracja poglądowa · ImageGen'}
          </small>
        )}
      </div>
      <div className="rescue-ar-panel">
        <div className="rescue-route-meta">
          <Symbol name={near ? 'heart' : 'direction'} size={18} />
          {near
            ? 'W pobliżu AED'
            : remaining !== null
              ? meters(remaining) + (onRoute ? ' trasy' : ' w linii prostej')
              : 'Oczekiwanie na pozycję'}
          {!demo && fix && <span>GPS ±{Math.round(fix.accuracy)} m</span>}
        </div>
        <h2>{target.name}</h2>
        <p className="rescue-ar-hint">
          {near
            ? 'Odszukaj urządzenie i zanieś je do poszkodowanego. Gdy AED jest przy nim, otwórz instrukcję.'
            : hint}
        </p>
        {!demo && active && desired !== null && heading === undefined && (
          <small className="rescue-note">
            Azymut do {onRoute ? 'kolejnego punktu' : 'celu'}: {Math.round(desired)}° od północy.
          </small>
        )}
        {demo && !near && (
          <label className="rescue-slider">
            Obrót widoku{' '}
            <input
              type="range"
              min="-95"
              max="95"
              value={yaw}
              onChange={(e) => setYaw(Number(e.target.value))}
              aria-label="Obrót widoku symulacji"
            />
            <span>{yaw}°</span>
          </label>
        )}
        {near ? (
          <button type="button" className="rescue-primary" onClick={onArrive}>
            Mam AED · otwórz instrukcję <Symbol name="next" />
          </button>
        ) : demo ? (
          <button type="button" className="rescue-primary" onClick={() => setWalking((v) => !v)}>
            <Symbol name={walking ? 'pause' : 'play'} size={17} />
            {walking ? 'Zatrzymaj marsz' : 'Symuluj dojście'}
          </button>
        ) : !active ? (
          <button type="button" className="rescue-primary" onClick={start}>
            <Symbol name="camera" />
            Włącz kamerę i czujniki
          </button>
        ) : (
          <button type="button" className="rescue-primary" onClick={onBack}>
            Pokaż mapę <Symbol name="next" />
          </button>
        )}
        {!near && (
          <button type="button" className="rescue-link" onClick={onArrive}>
            Mam już AED
          </button>
        )}
        {reference && (
          <a className="rescue-reference" href={reference.url} target="_blank" rel="noreferrer">
            {reference.credit}
          </a>
        )}
      </div>
    </section>
  );
}
