import { describe, expect, it } from 'vitest';
import { bearing, cameraOrientation, distance, tracedPath } from './geometry';

const a = { lat: 52, lon: 21 },
  b = { lat: 52, lon: 21.001 },
  c = { lat: 52.001, lon: 21.001 };

describe('walking route and camera geometry', () => {
  it('follows each segment of a bent walking route and clips out-of-range progress', () => {
    const route = tracedPath([a, a, b, c]);
    expect(route.length).toBeCloseTo(distance(a, b) + distance(b, c), 6);
    expect(bearing(a, b)).toBeCloseTo(90, 2);
    expect(route.pointAt(-5)).toEqual(a);
    expect(route.pointAt(1e4)).toEqual(c);
    const pos = route.pointAt(distance(a, b) + 12);
    expect(pos.lon).toBeCloseTo(b.lon, 8);
    expect(pos.lat).toBeGreaterThan(b.lat);
    expect(route.nearest(pos).offset).toBeCloseTo(distance(a, b) + 12, 3);
    expect(route.nearest({ lat: 52.0006, lon: 21.002 }).deviation).toBeGreaterThan(50);
    expect(tracedPath([a]).pointAt(0)).toEqual(a);
  });
  it('projects the rear-facing camera onto geographic north and east', () => {
    const event = { type: 'deviceorientation', absolute: true, alpha: 0, beta: 90, gamma: 0 };
    expect(cameraOrientation(event)?.heading).toBeCloseTo(0);
    expect(cameraOrientation({ ...event, alpha: 270 })?.heading).toBeCloseTo(90);
    expect(cameraOrientation({ ...event, beta: 60 })?.tilt).toBeCloseTo(-30);
    expect(cameraOrientation({ ...event, absolute: false })).toBeNull();
    expect(cameraOrientation({ ...event, alpha: null })).toBeNull();
    expect(cameraOrientation({ ...event, gamma: null })).toBeNull();
    expect(cameraOrientation({ ...event, beta: null })).toBeNull();
    expect(cameraOrientation({ ...event, beta: 0 })).toBeNull();
    expect(
      cameraOrientation({ ...event, absolute: false, type: 'deviceorientationabsolute' })?.heading,
    ).toBe(0);
    expect(
      cameraOrientation({ ...event, absolute: false, webkitCompassHeading: 23 })?.heading,
    ).toBe(23);
    expect(
      cameraOrientation({
        ...event,
        absolute: false,
        webkitCompassHeading: 23,
        webkitCompassAccuracy: -1,
      }),
    ).toBeNull();
  });
});
