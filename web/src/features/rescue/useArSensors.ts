import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import { cameraOrientation } from './geometry';
import type { CompassEvent, Coordinates } from './geometry';

type Fix = { point: Coordinates; accuracy: number; at: number };
type Heading = { heading: number; tilt: number };
type OrientationConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: (absolute?: boolean) => Promise<string>;
};
let compassRequest: Promise<string> | undefined;

export function needsCompassPermission() {
  const motion = window.DeviceOrientationEvent as OrientationConstructor | undefined;
  return typeof motion?.requestPermission === 'function';
}

// Safari requires this call within the gesture that opens the camera.
export function requestArCompass() {
  const motion = window.DeviceOrientationEvent as OrientationConstructor | undefined;
  compassRequest = motion?.requestPermission?.(true).catch(() => 'denied');
  return compassRequest;
}

export function useArSensors(video: RefObject<HTMLVideoElement | null>) {
  const [fix, setFix] = useState<Fix | null>(null);
  const [heading, setHeading] = useState<Heading | null>(null);
  const [gpsMessage, setGpsMessage] = useState('Ustalanie lokalizacji…');
  const [cameraMessage, setCameraMessage] = useState('Uruchamianie aparatu…');
  const [camera, setCamera] = useState<'starting' | 'live' | 'failed'>('starting');
  const [blocked, setBlocked] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const [visible, setVisible] = useState(() => !document.hidden);
  const supportsCamera = typeof navigator.mediaDevices?.getUserMedia === 'function';
  useEffect(() => {
    const update = () => {
      setVisible(!document.hidden);
      if (document.hidden) {
        setFix(null);
        setHeading(null);
        setCamera('starting');
        setGpsMessage('Ustalanie lokalizacji…');
      }
    };
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useEffect((): undefined | (() => void) => {
    if (!visible) return undefined;
    let closed = false;
    let stream: MediaStream | undefined;
    const player = video.current;
    const stopStream = () => {
      stream?.getTracks().forEach((track) => track.stop());
      stream = undefined;
      if (player) player.srcObject = null;
    };
    const listen = (event: CompassEvent) => {
      if (
        !event.absolute &&
        event.type !== 'deviceorientationabsolute' &&
        event.webkitCompassHeading === undefined
      )
        return;
      const result = cameraOrientation(event);
      if (!result) {
        setHeading(null);
        return;
      }
      const rounded = { heading: Math.round(result.heading) % 360, tilt: Math.round(result.tilt) };
      setHeading((old) =>
        old?.heading === rounded.heading && old.tilt === rounded.tilt ? old : rounded,
      );
    };
    void compassRequest?.then((value) => {
      if (!closed) setBlocked(value !== 'granted');
    });
    window.addEventListener('deviceorientationabsolute', listen);
    window.addEventListener('deviceorientation', listen);
    const watch = navigator.geolocation?.watchPosition(
      (position) => {
        if (closed) return;
        setGpsMessage('');
        setFix({
          point: { lat: position.coords.latitude, lon: position.coords.longitude },
          accuracy: position.coords.accuracy,
          at: position.timestamp,
        });
      },
      (error) => {
        if (closed) return;
        setFix(null);
        setGpsMessage(
          error.code === 1 ? 'Brak zgody na lokalizację.' : 'Brak aktualnego sygnału GPS.',
        );
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 12000 },
    );
    async function startCamera() {
      if (closed || !supportsCamera || !player) return;
      setCamera('starting');
      setCameraMessage('Uruchamianie aparatu…');
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (closed) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        const track = media.getVideoTracks()[0];
        if (track?.getSettings().facingMode === 'user') {
          stopStream();
          setCamera('failed');
          setCameraMessage('Nawigacja AR wymaga tylnego aparatu.');
          return;
        }
        player.srcObject = media;
        await player.play();
        if (closed) return;
        setCamera('live');
        track?.addEventListener(
          'ended',
          () => {
            if (!closed) {
              setCamera('failed');
              setCameraMessage('Aparat został wyłączony.');
            }
          },
          { once: true },
        );
      } catch {
        if (closed) return;
        stopStream();
        setCamera('failed');
        setCameraMessage('Sprawdź dostęp do aparatu w ustawieniach przeglądarki.');
      }
    }
    // Let StrictMode cancel its first mount before opening a hardware stream.
    queueMicrotask(() => {
      void startCamera();
    });
    const timer = window.setInterval(() => setClock(Date.now()), 2000);
    return () => {
      closed = true;
      stopStream();
      window.clearInterval(timer);
      if (watch !== undefined) navigator.geolocation.clearWatch(watch);
      window.removeEventListener('deviceorientationabsolute', listen);
      window.removeEventListener('deviceorientation', listen);
    };
  }, [video, visible, supportsCamera]);
  return {
    fix: fix && visible && clock - fix.at < 15000 ? fix : null,
    heading: visible ? heading : null,
    blocked,
    gpsMessage: navigator.geolocation ? gpsMessage : 'Ta przeglądarka nie udostępnia lokalizacji.',
    camera: supportsCamera ? camera : ('failed' as const),
    cameraMessage: supportsCamera
      ? cameraMessage
      : 'Otwórz stronę przez HTTPS lub localhost i zezwól na dostęp do aparatu.',
  };
}
