import rawDemoRoute from './demo-route.json';
import { z } from 'zod';
import type { AedPhoto, AedTarget, GeoPoint, RouteState, Step } from './types';
const coord = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
const field = z.string().default('');
const localCollection = z.object({
  type: z.literal('FeatureCollection'),
  features: z
    .array(
      z.object({
        id: z.string(),
        geometry: z.object({ type: z.literal('Point'), coordinates: coord }),
        properties: z.object({
          name: field,
          address: field,
          description: field,
          photo: field,
          photo_license: field,
          access: field,
          hours: field,
          access_note: field,
          source_url: z.url(),
          source: field,
          level: field,
          indoor: field,
          verified: field,
        }),
      }),
    )
    .min(1),
});
const coords = z.array(coord).min(2);
const steps = z
  .array(
    z.object({
      name: z.string(),
      distance: z.number().nonnegative(),
      maneuver: z.object({ type: z.string(), location: coord, modifier: z.string().optional() }),
    }),
  )
  .min(1);
const nonnegative = z.number().finite().nonnegative();
const routeSchema = z.object({
  code: z.literal('Ok'),
  routes: z
    .array(
      z.object({
        geometry: z.object({ coordinates: coords }),
        distance: nonnegative,
        duration: nonnegative,
        legs: z.array(z.object({ steps })).min(1),
      }),
    )
    .min(1),
});
const demoRoute = z
  .object({ coordinates: coords, distance: nonnegative, duration: nonnegative, steps })
  .parse(rawDemoRoute);

export const asset = (path: string) => import.meta.env.BASE_URL + path;
export const DEMO_POSITION = { lat: 52.23123, lon: 21.01416 };
const sourceId = 'node/14154384101';
export const DEMO_TARGET: AedTarget = {
  id: sourceId,
  lat: 52.2321787,
  lon: 21.0146526,
  name: 'Dom towarowy Bracia Jabłkowscy',
  description: 'W tunelu, obok tablic informacyjnych i historycznych',
  address: 'Chmielna 21, Warszawa',
  access: 'yes',
  level: '0',
  indoor: 'no',
  source: 'osm',
  source_url: 'https://www.openstreetmap.org/' + sourceId,
  photo: asset('map-assets/bracia-aed.webp'),
  photo_license: 'CC0',
  verified: '2026-09-05',
};
export const DEMO_SUMMARY = {
  name: DEMO_TARGET.name,
  meters: 111,
  walkMeters: Math.round(demoRoute.distance),
  walkMinutes: Math.round(demoRoute.duration / 60),
  position: DEMO_POSITION,
  target: DEMO_TARGET,
};
const radians = Math.PI / 180;
export function distance(a: GeoPoint, b: GeoPoint) {
  const dy = (b.lat - a.lat) * radians,
    dx = (b.lon - a.lon) * radians;
  const h =
    Math.sin(dy / 2) ** 2 +
    Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(dx / 2) ** 2;
  return 12742000 * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function bearing(a: GeoPoint, b: GeoPoint) {
  const dx = (b.lon - a.lon) * radians,
    y1 = a.lat * radians,
    y2 = b.lat * radians;
  return (
    (Math.atan2(
      Math.sin(dx) * Math.cos(y2),
      Math.cos(y1) * Math.sin(y2) - Math.sin(y1) * Math.cos(y2) * Math.cos(dx),
    ) /
      radians +
      360) %
    360
  );
}
export function meters(n: number) {
  return n >= 1000
    ? (n / 1000).toLocaleString('pl-PL', { maximumFractionDigits: 1 }) + ' km'
    : Math.round(n) + ' m';
}

let dataset: Promise<AedTarget[]> | undefined;
export function loadPoints() {
  dataset ??= fetch(asset('data/aed-polska.geojson'))
    .then(async (r) => {
      if (!r.ok) throw new Error('Nie udało się wczytać punktów AED.');
      return localCollection.parse(await r.json());
    })
    .then(({ features }) =>
      features.map(({ id, geometry, properties: p }) => {
        if (id === sourceId) return DEMO_TARGET;
        const [lon, lat] = geometry.coordinates;
        let name = p.name || p.address || 'Defibrylator AED';
        if (id === 'node/10127805917') name = 'Urząd miasta';
        else if (id === 'node/9417626828') name = 'Metro Centrum · Młociny';
        else if (id === 'node/9417717627') name = 'Metro Centrum · Kabaty';
        else if (id === 'node/12438684801') name = 'AED w strefie biletowej';
        return {
          ...p,
          id,
          lat,
          lon,
          name,
          description: p.description || p.address || 'Lokalizacja szczegółowa niepodana.',
        };
      }),
    )
    .catch((error) => {
      dataset = undefined;
      throw error;
    });
  return dataset;
}
export function accessLabel(target: AedTarget) {
  const content: Record<string, string> = {
    yes: 'Dostęp publiczny',
    permissive: 'Dostęp publiczny',
    customers: 'Dla klientów',
    private: 'Dostęp prywatny',
    permit: 'Potrzebna zgoda',
    no: 'Brak dostępu',
    restricted: 'Dostęp ograniczony',
    destination: 'Dla odwiedzających',
  };
  return content[target.access ?? ''] || 'Dostęp nieustalony';
}
export function nearby(points: AedTarget[], position: GeoPoint, filter: string) {
  // Sparse areas keep the five closest points, even beyond the two-kilometre list radius.
  const rows = points
    .filter(
      (target) =>
        filter === 'all' ||
        (['yes', 'permissive'].includes(target.access ?? '') &&
          (filter === 'public' || target.hours === '24/7')),
    )
    .map((target) => ({ target, meters: distance(position, target) }))
    .toSorted((a, b) => a.meters - b.meters);
  return rows.filter((row, i) => i < 5 || row.meters <= 2000);
}

export async function walkingRoute(
  position: GeoPoint,
  target: AedTarget,
  signal: AbortSignal,
): Promise<RouteState> {
  if (target.id === sourceId && distance(position, DEMO_POSITION) < 3) return demoRoute;
  const coordinates = [position, target]
    .map((p) => p.lon.toFixed(6) + ',' + p.lat.toFixed(6))
    .join(';');
  const r = await fetch(
    'https://routing.openstreetmap.de/routed-foot/route/v1/driving/' +
      coordinates +
      '?steps=true&geometries=geojson&overview=full',
    { signal },
  );
  if (!r.ok) throw new Error('Routing niedostępny');
  const body = routeSchema.parse(await r.json());
  const route = body.routes?.[0];
  if (body.code !== 'Ok' || !route || !route.geometry.coordinates.length || !route.legs.length)
    throw new Error('Nie znaleziono trasy');
  return {
    coordinates: route.geometry.coordinates,
    steps: route.legs.flatMap((l) => l.steps),
    distance: route.distance,
    duration: route.duration,
  };
}
export function routeProgress(route: RouteState, position: GeoPoint) {
  const path = route.coordinates.map(([lon, lat]) => ({ lon, lat }));
  const sx = 111195 * Math.cos(position.lat * radians),
    sy = 111195;
  let best = Infinity,
    progress = 0,
    total = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!,
      b = path[i]!,
      dx = (b.lon - a.lon) * sx,
      dy = (b.lat - a.lat) * sy;
    const px = (position.lon - a.lon) * sx,
      py = (position.lat - a.lat) * sy;
    const length = Math.hypot(dx, dy);
    const t = length ? Math.max(0, Math.min(1, (px * dx + py * dy) / (length * length))) : 0;
    const gap = Math.hypot(px - t * dx, py - t * dy);
    if (gap < best) {
      best = gap;
      progress = total + t * length;
    }
    total += length;
  }
  const along = total ? (progress / total) * route.distance : 0;
  let cumulative = 0,
    index = 0;
  for (const s of route.steps.slice(0, -1)) {
    cumulative += s.distance;
    if (along < cumulative - 2) break;
    index++;
  }
  return { index, remaining: Math.max(0, route.distance - along), offRoute: best };
}
export function stepText(step: Step | undefined | null) {
  if (!step) return 'Idź wyznaczoną trasą';
  const m = step.maneuver,
    street = step.name ? ' · ' + step.name : '';
  if (m.type === 'depart') return 'Ruszaj przed siebie' + street;
  if (m.type === 'arrive') return 'Poszukaj oznaczenia AED';
  const turns: Record<string, string> = {
    left: 'Skręć w lewo',
    right: 'Skręć w prawo',
    'slight left': 'Idź lekko w lewo',
    'slight right': 'Idź lekko w prawo',
    'sharp left': 'Skręć ostro w lewo',
    'sharp right': 'Skręć ostro w prawo',
    uturn: 'Zawróć',
  };
  return (turns[m.modifier ?? ''] || 'Idź prosto') + street;
}
const commons = 'https://commons.wikimedia.org/?curid=';
const photos = [
  {
    lat: 52.232361,
    lon: 21.014575,
    heading: 171.3,
    label: 'Brama od ul. Chmielnej 21',
    file: 'chmielna-wejscie.jpg',
    credit: 'Cybularny · CC0',
    url: commons + '199081043',
  },
  {
    lat: 52.232369,
    lon: 21.014536,
    heading: 151.2,
    label: 'Widok w kierunku podwórza',
    file: 'chmielna-brama.jpg',
    credit: 'Cybularny · CC BY 4.0',
    url: commons + '199080241',
  },
  {
    lat: 52.2322,
    lon: 21.014675,
    heading: 160.7,
    label: 'Pasaż z muralem',
    file: 'chmielna-pasaz.jpg',
    credit: 'Cybularny · CC BY 4.0',
    url: commons + '199080251',
  },
];
interface ApproachImage extends AedPhoto, GeoPoint {
  heading: number;
  target: GeoPoint;
}
const publicPhotos = new Map<string, Promise<ApproachImage[]>>();
const loadedPhotos = new Map<string, ApproachImage[]>();
const imageFeature = z.object({
  id: z.uuid(),
  geometry: z.object({ type: z.literal('Point'), coordinates: coord }),
  providers: z.array(z.object({ name: z.string(), roles: z.array(z.string()) })),
  properties: z.object({
    'view:azimuth': z.number(),
    license: z.enum(['CC-BY-SA-4.0', 'CC-BY-4.0', 'CC0-1.0', 'etalab-2.0']),
    'pers:interior_orientation': z.object({ field_of_view: z.number().positive().lt(160) }),
  }),
  assets: z.object({ thumb: z.object({ href: z.url({ protocol: /^https$/ }) }) }),
});
const angleDifference = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
async function fetchApproaches(target: AedTarget): Promise<ApproachImage[]> {
  const radiusLat = 0.00045,
    radiusLon = radiusLat / Math.cos(target.lat * radians);
  const bbox = [
    target.lon - radiusLon,
    target.lat - radiusLat,
    target.lon + radiusLon,
    target.lat + radiusLat,
  ];
  const response = await fetch(
    'https://api.panoramax.xyz/api/search?bbox=' + bbox.join(',') + '&limit=40',
    {
      signal: AbortSignal.timeout(5000),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    },
  );
  if (!response.ok) throw new Error('Zdjęcia niedostępne');
  const data = z.object({ features: z.array(z.unknown()) }).parse(await response.json());
  const result: ApproachImage[] = [];
  for (const feature of data.features) {
    const parsed = imageFeature.safeParse(feature);
    if (!parsed.success) continue;
    const item = parsed.data,
      [lon, lat] = item.geometry.coordinates,
      location = { lat, lon };
    const heading = item.properties['view:azimuth'],
      gap = distance(location, target);
    if (gap < 4 || gap > 50 || angleDifference(heading, bearing(location, target)) > 38) continue;
    const names = item.providers.filter((p) => p.roles.includes('producer')).map((p) => p.name);
    if (!names.length) continue;
    result.push({
      ...location,
      heading,
      target,
      src: item.assets.thumb.href,
      label: 'Okolica punktu · ' + meters(gap) + ' od AED',
      credit: names.join(', ') + ' · ' + item.properties.license,
      url: 'https://panoramax.xyz/#focus=pic&pic=' + item.id,
    });
  }
  return result;
}
export function loadApproachPhotos(target: AedTarget): Promise<ApproachImage[]> {
  if (target.id === sourceId) return Promise.resolve([]);
  const existing = publicPhotos.get(target.id);
  if (existing) return existing;
  const request = fetchApproaches(target)
    .then((result) => {
      loadedPhotos.set(target.id, result);
      return result;
    })
    .catch(() => {
      publicPhotos.delete(target.id);
      return [];
    });
  publicPhotos.set(target.id, request);
  return request;
}
export function routePhotos(
  target: Pick<Partial<AedTarget>, 'id' | 'photo' | 'photo_license' | 'source_url'>,
  position: GeoPoint,
  heading?: number | null,
): AedPhoto[] {
  const result: AedPhoto[] = [];
  if (target.id === sourceId) {
    const score = (photo: (typeof photos)[number]) =>
      Math.abs(((photo.heading - (heading ?? bearing(position, DEMO_TARGET)) + 540) % 360) - 180) *
        0.5 +
      distance(position, photo);
    for (const p of photos.toSorted((a, b) => score(a) - score(b))) {
      result.push({ ...p, src: asset('map-assets/' + p.file) });
    }
  }
  if (target.id && loadedPhotos.has(target.id)) {
    const visible = (loadedPhotos.get(target.id) ?? [])
      .map((p) => ({
        p,
        delta: angleDifference(p.heading, heading ?? bearing(position, p.target)),
        meters: distance(p, position),
      }))
      .filter(({ delta }) => delta <= 60)
      .toSorted((a, b) => a.meters + a.delta / 2 - (b.meters + b.delta / 2));
    result.push(...visible.slice(0, 4).map(({ p }) => p));
  }
  if (
    target.photo &&
    (target.id === sourceId ||
      /^https:\/\/(back\.)?openaedmap\.org\/api\/v1\/photos\/view\//.test(target.photo))
  ) {
    result.push({
      src: target.photo,
      label: 'Zdjęcie urządzenia',
      credit: 'OpenAEDMap' + (target.photo_license ? ' · ' + target.photo_license : ''),
      url: target.source_url,
    });
  }
  return result;
}
