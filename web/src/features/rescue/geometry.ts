import { distance } from '../../../map/core';
export { bearing, distance } from '../../../map/core';
export type Coordinates = { lat: number; lon: number };

const rad = Math.PI / 180;

function between(a: Coordinates, b: Coordinates, fraction: number): Coordinates {
  return { lat: a.lat + (b.lat - a.lat) * fraction, lon: a.lon + (b.lon - a.lon) * fraction };
}

export function tracedPath(points: readonly Coordinates[]) {
  let length = 0;
  const segments = points.slice(1).flatMap((end, i) => {
    const start = points[i]!;
    const size = distance(start, end);
    if (size < 0.1) return [];
    const offset = length;
    length += size;
    return [{ start, end, size, offset }];
  });
  function pointAt(meters: number) {
    const segment = segments.find((s) => s.offset + s.size >= meters);
    return segment
      ? between(segment.start, segment.end, Math.max(0, (meters - segment.offset) / segment.size))
      : points.at(-1)!;
  }
  function nearest(position: Coordinates) {
    let offset = 0,
      deviation = Infinity;
    const cos = Math.cos(position.lat * rad);
    for (const s of segments) {
      const dx = (s.end.lon - s.start.lon) * cos,
        dy = s.end.lat - s.start.lat;
      const fraction = Math.max(
        0,
        Math.min(
          1,
          ((position.lon - s.start.lon) * cos * dx + (position.lat - s.start.lat) * dy) /
            (dx * dx + dy * dy),
        ),
      );
      const error = distance(position, between(s.start, s.end, fraction));
      if (error < deviation) {
        deviation = error;
        offset = s.offset + s.size * fraction;
      }
    }
    return { offset, deviation };
  }
  return { length, pointAt, nearest };
}

export type CompassEvent = Pick<
  DeviceOrientationEvent,
  'type' | 'absolute' | 'alpha' | 'beta' | 'gamma'
> & {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
};

export function cameraOrientation(event: CompassEvent) {
  if (event.beta === null || event.gamma === null) return null;
  const beta = event.beta * rad,
    gamma = event.gamma * rad;
  // Project the rear camera axis (-Z) into the horizontal plane using the W3C Z-X'-Y'' convention.
  const tilt = Math.asin(-Math.cos(beta) * Math.cos(gamma)) / rad;
  if (Math.abs(tilt) > 65) return null;
  if (
    typeof event.webkitCompassHeading === 'number' &&
    event.webkitCompassHeading >= 0 &&
    (event.webkitCompassAccuracy ?? 0) >= 0
  ) {
    return { heading: event.webkitCompassHeading, tilt };
  }
  if (event.alpha === null || (!event.absolute && event.type !== 'deviceorientationabsolute'))
    return null;
  const alpha = event.alpha * rad;
  const east =
    -Math.cos(alpha) * Math.sin(gamma) - Math.sin(alpha) * Math.sin(beta) * Math.cos(gamma);
  const north =
    -Math.sin(alpha) * Math.sin(gamma) + Math.cos(alpha) * Math.sin(beta) * Math.cos(gamma);
  return { heading: (Math.atan2(east, north) / rad + 360) % 360, tilt };
}
