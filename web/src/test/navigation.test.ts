import { describe, expect, it, vi } from 'vitest';
import {
  DEMO_POSITION,
  DEMO_TARGET,
  accessLabel,
  distance,
  nearby,
  routePhotos,
  routeProgress,
  walkingRoute,
} from '../../map/core';
describe('Punkty AED i trasa piesza', () => {
  it('zachowuje nieznane godziny i rozdziela publiczne oraz prywatne urządzenia', () => {
    const nearbyPrivate = { ...DEMO_TARGET, id: 'private', access: 'private', hours: '24/7' };
    const publicAlways = { ...DEMO_TARGET, id: 'public', hours: '24/7' };
    const points = [DEMO_TARGET, nearbyPrivate, publicAlways];
    expect(nearby(points, DEMO_POSITION, 'all')).toHaveLength(3);
    expect(nearby(points, DEMO_POSITION, 'always').map((x) => x.target.id)).toEqual(['public']);
    expect(accessLabel(nearbyPrivate)).toBe('Dostęp prywatny');
  });
  it('oblicza postęp po ścieżkach pieszych i kończy przy rzeczywistym celu', async () => {
    const route = await walkingRoute(DEMO_POSITION, DEMO_TARGET, new AbortController().signal);
    expect(distance(DEMO_POSITION, DEMO_TARGET)).toBeCloseTo(111, -1);
    expect(route.distance).toBeGreaterThan(distance(DEMO_POSITION, DEMO_TARGET) * 2);
    expect(routeProgress(route, DEMO_POSITION).remaining).toBeGreaterThan(285);
    expect(routeProgress(route, DEMO_TARGET).remaining).toBeLessThan(4);
  });
  it('sygnalizuje awarię dostawcy bez wytyczania drogi w linii prostej', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })));
    try {
      await expect(
        walkingRoute({ lat: 52, lon: 21 }, DEMO_TARGET, new AbortController().signal),
      ).rejects.toThrow('Routing');
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it('dobiera fotografię wejścia do miejsca i kierunku marszu', () => {
    const door = routePhotos(DEMO_TARGET, { lat: 52.232361, lon: 21.014575 }, 171);
    expect(door[0]?.label).toBe('Brama od ul. Chmielnej 21');
    const yard = routePhotos(DEMO_TARGET, { lat: 52.2322, lon: 21.014675 }, 161);
    expect(yard[0]?.label).toBe('Pasaż z muralem');
    expect(routePhotos({ id: 'unknown' }, DEMO_POSITION)).toEqual([]);
  });
});
