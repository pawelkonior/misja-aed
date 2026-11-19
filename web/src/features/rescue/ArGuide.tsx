import { useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { asset, meters, stepText } from '../../../map/core';
import { bearing, distance, tracedPath, routeManeuvers } from './geometry';
import type { Coordinates } from './geometry';
import type { GeoPoint, Step } from '../../../map/types';
import { RoadArrows } from './RoadArrows';
import type { Direction } from './RoadArrows';
import { Symbol } from './Symbol';
import { needsCompassPermission, requestArCompass, useArSensors } from './useArSensors';
import './ar-hud.css';

export { requestArCompass } from './useArSensors';

type Target = Coordinates & { name: string; id?: string };
export interface ArProps {
  target: Target | null;
  origin?: Coordinates | null;
  path?: readonly Coordinates[];
  steps?: readonly Step[];
  playRecording?: boolean;
  onOpenRecording?: () => void;
  onReturn?: (fix: GeoPoint) => void;
  onBack: () => void;
  onArrive: () => void;
}
const walkSchema = z.object({
  title: z.string(),
  destination: z.string(),
  attribution: z.string(),
  sourceUrl: z.string(),
  cues: z
    .array(
      z.object({
        start: z.number().nonnegative(),
        direction: z.enum(['straight', 'left', 'right', 'arrived']),
        text: z.string(),
        maneuver: z.string(),
        meters: z.number().nonnegative(),
        nextMeters: z.number().nonnegative(),
        upcomingDirection: z.enum(['straight', 'left', 'right', 'arrived']),
      }),
    )
    .min(1),
});
type Walk = z.infer<typeof walkSchema>;
const cardinal = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function HudHeader({
  onBack,
  mode,
  heading,
}: {
  onBack: () => void;
  mode: string;
  heading?: number;
}) {
  return (
    <header className="ar-hud-header">
      <button type="button" onClick={onBack} aria-label="Wróć do mapy" className="ar-glass ar-back">
        <Symbol name="back" />
      </button>
      <div className="ar-mode">{mode}</div>
      {heading !== undefined && (
        <span className="ar-bearing">
          {heading}° {cardinal[Math.round(heading / 45) % 8]}
        </span>
      )}
    </header>
  );
}
function ManeuverCard({
  direction,
  distanceLabel,
  description,
  approximate = false,
}: {
  direction: Direction;
  distanceLabel: string;
  description: string;
  approximate?: boolean;
}) {
  const paths = {
    left: 'M19 22v-6a7 7 0 0 0-7-7H5m6-6L5 9l6 6',
    right: 'M5 22v-6a7 7 0 0 1 7-7h7m-6-6 6 6-6 6',
    straight: 'M12 22V4m-7 7 7-7 7 7',
    arrived: 'M6 22V3m0 1h13l-3 4 3 4H6',
  };
  return (
    <div className="ar-maneuver">
      <svg
        aria-hidden="true"
        width="28"
        height="28"
        viewBox="0 0 24 26"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={paths[direction]} />
      </svg>
      <div>
        <strong>
          {approximate && <small aria-label="około">≈ </small>}
          {distanceLabel}
        </strong>
        <span>{description}</span>
      </div>
    </div>
  );
}
function stepDirection(step: Step): Direction {
  if (step.maneuver.type === 'arrive') return 'arrived';
  if (step.maneuver.modifier?.includes('right')) return 'right';
  if (step.maneuver.modifier?.includes('left')) return 'left';
  return 'straight';
}
function InstructionButton({ onArrive }: Pick<ArProps, 'onArrive'>) {
  return (
    <button className="ar-instruction" type="button" onClick={onArrive}>
      <Symbol name="heart" /> Instrukcja AED <Symbol name="next" size={16} />
    </button>
  );
}
function LiveAr({
  target,
  path,
  steps,
  onBack,
  onArrive,
  onRecording,
  onReturn,
  onRetry,
}: {
  target: Target;
  path: readonly Coordinates[];
  steps: readonly Step[];
  onRecording: () => void;
  onRetry: () => void;
} & Pick<ArProps, 'onBack' | 'onArrive' | 'onReturn'>) {
  const player = useRef<HTMLVideoElement>(null);
  const sensors = useArSensors(player);
  const route = useMemo(() => {
    const points = [...path];
    if (!points.length || distance(points.at(-1)!, target) > 1) points.push(target);
    return tracedPath(points);
  }, [path, target]);
  const fix = sensors.fix;
  const point = fix?.point;
  const direct = point ? distance(point, target) : null;
  const located = !!fix && fix.accuracy <= 35;
  const progress = useMemo(
    () => (point && path.length > 1 ? route.nearest(point) : null),
    [point, path, route],
  );
  const onRoute = !!progress && progress.deviation <= 30;
  const remaining = onRoute ? route.length - progress.offset : direct;
  const maneuvers = useMemo(() => routeManeuvers(route, steps), [route, steps]);
  const upcoming = onRoute ? maneuvers.find((m) => m.offset > progress.offset + 2) : undefined;
  const maneuverMeters = upcoming && progress ? upcoming.offset - progress.offset : null;
  const near =
    !!fix &&
    direct !== null &&
    direct <= 18 &&
    fix.accuracy <= 25 &&
    (!onRoute || remaining! <= 30);
  const finalLeg = direct !== null && direct <= 45 && (!onRoute || remaining! <= direct + 12);
  const aim = onRoute && !finalLeg ? route.pointAt(progress.offset + 15) : target;
  const heading = sensors.heading?.heading;
  const delta =
    point && heading !== undefined ? ((bearing(point, aim) - heading + 540) % 360) - 180 : null;
  const tilt = sensors.heading?.tilt ?? 0;
  const routeLost = !!progress && !onRoute;
  const overlay =
    sensors.camera === 'live' &&
    located &&
    delta !== null &&
    Math.abs(tilt) <= 25 &&
    !routeLost &&
    !near;
  const direction: Direction =
    delta !== null && Math.abs(delta) > 30 ? (delta < 0 ? 'left' : 'right') : 'straight';
  const label = near
    ? 'AED w pobliżu'
    : routeLost
      ? 'Wróć do trasy'
      : Math.abs(tilt) > 25
        ? 'Skieruj aparat na wprost'
        : direction === 'left'
          ? 'Obróć się w lewo'
          : direction === 'right'
            ? 'Obróć się w prawo'
            : finalLeg
              ? 'Szukaj oznaczenia AED'
              : onRoute
                ? 'Idź prosto'
                : 'Kierunek do AED';
  const help = !fix
    ? sensors.gpsMessage || 'Oczekiwanie na aktualną pozycję GPS.'
    : !located
      ? 'Dokładność GPS jest za niska, aby wskazać kierunek.'
      : sensors.blocked
        ? 'Brak dostępu do kompasu.'
        : heading === undefined
          ? 'Trzymaj telefon pionowo. Oczekiwanie na kompas.'
          : routeLost
            ? 'Otwórz mapę, aby sprawdzić dalszą drogę.'
            : '';
  return (
    <section className="ar-hud" aria-label="Nawigacja w rzeczywistości rozszerzonej">
      <video
        className="ar-camera"
        ref={player}
        autoPlay
        playsInline
        muted
        aria-label="Obraz z tylnego aparatu"
      />
      <HudHeader
        onBack={onBack}
        mode={sensors.camera === 'live' ? 'Aparat na żywo' : 'Tryb AR'}
        {...(heading === undefined ? {} : { heading })}
      />
      {sensors.camera !== 'live' && (
        <div className="ar-no-camera">
          <span className="ar-camera-symbol">
            <Symbol name="camera" size={30} />
          </span>
          <h2>{sensors.camera === 'failed' ? 'Aparat niedostępny' : 'Otwieranie aparatu'}</h2>
          <p>{sensors.cameraMessage}</p>
          {sensors.camera === 'failed' && (
            <button type="button" className="ar-glass ar-pill" onClick={onRetry}>
              Spróbuj ponownie
            </button>
          )}
        </div>
      )}
      {sensors.camera === 'live' && located && !near && remaining !== null && (
        <ManeuverCard
          direction={upcoming ? stepDirection(upcoming.step) : 'arrived'}
          distanceLabel={meters(maneuverMeters ?? remaining)}
          description={
            upcoming
              ? stepText(upcoming.step).split(' · ')[0]!
              : onRoute
                ? 'Do celu'
                : 'Do AED w linii prostej'
          }
        />
      )}
      {overlay && (
        <RoadArrows
          direction={
            direction === 'straight' && upcoming && maneuverMeters !== null && maneuverMeters < 13
              ? stepDirection(upcoming.step)
              : direction
          }
          bend={direction === 'straight' ? Math.max(0, 1 - (maneuverMeters ?? 13) / 13) : 1}
          offset={50 + Math.max(-30, Math.min(30, delta)) * 0.92}
          tilt={tilt}
        />
      )}
      {overlay && finalLeg && Math.abs(delta) < 24 && (
        <div
          className="ar-target-frame"
          aria-label="Przybliżony kierunek AED"
          style={{ left: 50 + delta * 1.45 + '%', top: 50 + tilt + '%' }}
        />
      )}
      <div className="ar-hud-footer">
        <div className="ar-live-caption">
          <div className="ar-caption-line">
            <strong>
              {near || overlay || (sensors.camera === 'live' && located && heading !== undefined)
                ? label
                : 'Dojście do AED'}
            </strong>
          </div>
          <p>
            {near ? 'Odszukaj urządzenie i zabierz je do poszkodowanego.' : help || target.name}
          </p>
        </div>
        {near ? (
          <>
            <InstructionButton onArrive={onArrive} />
            {onReturn && fix && (
              <button
                type="button"
                className="ar-glass ar-return"
                onClick={() => onReturn({ ...fix.point, accuracy: fix.accuracy })}
              >
                <Symbol name="direction" size={17} /> Wróć do punktu startu
              </button>
            )}
          </>
        ) : (
          heading === undefined &&
          needsCompassPermission() && (
            <button type="button" className="ar-glass ar-pill" onClick={onRetry}>
              Włącz kompas
            </button>
          )
        )}
        <button type="button" className="ar-record-link" onClick={onRecording}>
          <Symbol name="play" size={15} /> Nagranie · Chmielna 21
        </button>
      </div>
    </section>
  );
}

function RecordedWalk({ onBack, onArrive }: Pick<ArProps, 'onBack' | 'onArrive'>) {
  const player = useRef<HTMLVideoElement>(null);
  const [walk, setWalk] = useState<Walk | null>(null);
  const [problem, setProblem] = useState(false);
  const [paused, setPaused] = useState(true);
  const [ended, setEnded] = useState(false);
  const [time, setTime] = useState(0);
  useEffect(() => {
    const cancel = new AbortController();
    const element = player.current;
    void fetch(asset('media/aed-walk.json'), { signal: cancel.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = walkSchema.parse(await response.json());
        if (!cancel.signal.aborted) setWalk(data);
      })
      .catch(() => {
        if (!cancel.signal.aborted) setProblem(true);
      });
    return () => {
      cancel.abort();
      element?.pause();
    };
  }, []);
  const cueIndex = walk?.cues.findLastIndex((c) => c.start <= time) ?? -1;
  const cue = walk?.cues[cueIndex];
  const nextCue = walk?.cues[cueIndex + 1];
  const elapsed =
    cue && nextCue ? Math.max(0, Math.min(1, (time - cue.start) / (nextCue.start - cue.start))) : 0;
  const maneuverMeters = cue ? Math.round(cue.meters + (cue.nextMeters - cue.meters) * elapsed) : 0;
  const arrived = !problem && cue?.direction === 'arrived';
  return (
    <section className="ar-hud" aria-label="Nagranie przejścia do AED">
      <video
        ref={player}
        className="ar-camera"
        src={asset('media/aed-walk.mp4')}
        aria-label="Film przejścia do AED"
        playsInline
        autoPlay
        muted
        preload="auto"
        onLoadedData={(e) => {
          void e.currentTarget.play().catch(() => setPaused(true));
        }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onPlay={() => {
          setPaused(false);
          setEnded(false);
        }}
        onPause={() => setPaused(true)}
        onEnded={() => setEnded(true)}
        onError={() => setProblem(true)}
      />
      <HudHeader onBack={onBack} mode="Nagranie przejścia" />
      {cue && !arrived && !problem && (
        <>
          <ManeuverCard
            direction={cue.upcomingDirection}
            approximate
            distanceLabel={meters(maneuverMeters)}
            description={cue.maneuver}
          />
          <RoadArrows
            direction={cue.direction === 'straight' ? cue.upcomingDirection : cue.direction}
            bend={
              cue.direction === 'straight'
                ? Math.min(0.75, Math.max(0, 1 - maneuverMeters / 14))
                : 1
            }
            paused={paused}
          />
        </>
      )}
      <div className="ar-hud-footer">
        <div className="ar-live-caption">
          <div className="ar-caption-line">
            <strong>
              {problem ? 'Nagranie niedostępne' : cue?.text || 'Wczytywanie przejścia…'}
            </strong>
            {walk && !problem && (
              <button
                type="button"
                className="ar-glass ar-playback"
                aria-label={
                  ended ? 'Odtwórz ponownie' : paused ? 'Wznów nagranie' : 'Zatrzymaj nagranie'
                }
                onClick={() => {
                  if (!player.current) return;
                  if (ended) player.current.currentTime = 0;
                  if (paused || ended) void player.current.play().catch(() => setProblem(true));
                  else player.current.pause();
                }}
              >
                <Symbol name={paused || ended ? 'play' : 'pause'} size={16} />
              </button>
            )}
          </div>
          {walk && <p>{walk.destination}</p>}
        </div>
        {arrived && <InstructionButton onArrive={onArrive} />}
        {walk && (
          <a className="ar-source" href={walk.sourceUrl} target="_blank" rel="noreferrer">
            {walk.attribution}
          </a>
        )}
      </div>
    </section>
  );
}
const noPath: readonly Coordinates[] = [];
const noSteps: readonly Step[] = [];
export function ArGuide({
  target,
  path = noPath,
  steps = noSteps,
  onBack,
  onArrive,
  onReturn,
  playRecording = false,
  onOpenRecording,
}: ArProps) {
  const [recording, setRecording] = useState(false);
  const [attempt, setAttempt] = useState(0);
  if (recording || playRecording || !target)
    return <RecordedWalk onBack={onBack} onArrive={onArrive} />;
  return (
    <LiveAr
      key={attempt}
      target={target}
      path={path}
      steps={steps}
      onBack={onBack}
      onArrive={onArrive}
      {...(onReturn ? { onReturn } : {})}
      onRecording={onOpenRecording ?? (() => setRecording(true))}
      onRetry={() => {
        void requestArCompass();
        setAttempt((a) => a + 1);
      }}
    />
  );
}
