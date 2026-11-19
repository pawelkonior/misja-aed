import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArGuide, AedInstructions } from './Rescue';
import { steps } from './steps';

const target = {
  lat: 52.2321787,
  lon: 21.0146526,
  name: 'Punkt testowy',
  id: 'node/14154384101',
  photo: '/map-assets/bracia-aed.webp',
};
const origin = { lat: 52.23, lon: 21.0146526 };
const actions = { onBack: vi.fn<() => void>(), onArrive: vi.fn<() => void>() };
const gpsDescriptor = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
const mediaDescriptor = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
const contextDescriptor = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  'getContext',
)!;
function property(obj: object, key: string, value: unknown) {
  Object.defineProperty(obj, key, { configurable: true, writable: true, value });
}
function restore(obj: object, key: string, descriptor?: PropertyDescriptor) {
  if (descriptor) Object.defineProperty(obj, key, descriptor);
  else Reflect.deleteProperty(obj, key);
}
function click(name: string) {
  fireEvent.click(screen.getByRole('button', { name }));
}
function event(tag: string, fields: object = {}) {
  return Object.assign(new Event(tag), fields);
}
function tilt(alpha: number, beta = 90, absolute = true) {
  act(() => {
    window.dispatchEvent(event('deviceorientation', { alpha, beta, gamma: 0, absolute }));
  });
}
async function activate() {
  await act(async () => {
    click('Włącz kamerę i czujniki');
    await Promise.resolve();
  });
}

class TestRecognition extends EventTarget {
  static current: TestRecognition;
  constructor() {
    super();
    TestRecognition.current = this;
  }
  start = vi.fn<() => void>();
  abort = vi.fn<() => boolean>(() => this.dispatchEvent(event('end')));
  hear(transcript: string) {
    this.dispatchEvent(event('result', { resultIndex: 0, results: [[{ transcript }]] }));
  }
}
class TestAudio extends EventTarget {
  static current: TestAudio;
  constructor(readonly src: string) {
    super();
    TestAudio.current = this;
  }
  play = vi.fn<() => Promise<void>>(() => Promise.resolve());
  pause = vi.fn<() => void>();
}
class TestUtterance extends EventTarget {
  constructor(readonly text: string) {
    super();
  }
}
function voiceBrowser() {
  vi.stubGlobal('SpeechRecognition', TestRecognition);
  vi.stubGlobal('SpeechSynthesisUtterance', TestUtterance);
  const synth = {
    getVoices: () => [{ lang: 'pl_PL' }],
    speak: vi.fn<(voice: TestUtterance) => void>(),
    cancel: vi.fn<() => void>(),
  };
  vi.stubGlobal('speechSynthesis', synth);
  return synth;
}
function mobileBrowser(facingMode = 'environment') {
  let receive:
    | ((p: {
        coords: { latitude: number; longitude: number; accuracy: number };
        timestamp: number;
      }) => void)
    | undefined;
  let lost: ((e: { code: number }) => void) | undefined;
  const clear = vi.fn<() => void>(),
    stop = vi.fn<() => void>();
  const track = Object.assign(new EventTarget(), { stop, getSettings: () => ({ facingMode }) });
  const fakeMedia = { getTracks: () => [track], getVideoTracks: () => [track] };
  const getMedia = vi.fn<() => Promise<typeof fakeMedia>>(() => Promise.resolve(fakeMedia));
  property(navigator, 'mediaDevices', { getUserMedia: getMedia });
  property(navigator, 'geolocation', {
    watchPosition: (ok: typeof receive, error: typeof lost) => {
      receive = ok;
      lost = error;
      return 22;
    },
    clearWatch: clear,
  });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  const permission = vi.fn<() => Promise<string>>(() => Promise.resolve('granted'));
  vi.stubGlobal('DeviceOrientationEvent', { requestPermission: permission });
  return {
    getMedia,
    stop,
    clear,
    track,
    permission,
    fix: (p = origin, accuracy = 5) =>
      act(() =>
        receive?.({
          coords: { latitude: p.lat, longitude: p.lon, accuracy },
          timestamp: Date.now(),
        }),
      ),
    lose: (code: number) => act(() => lost?.({ code })),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'Path2D',
    class {
      constructor(readonly d: string) {}
    },
  );
  const ctx = Object.fromEntries(
    [
      'clearRect',
      'save',
      'restore',
      'scale',
      'fillRect',
      'beginPath',
      'arc',
      'fill',
      'stroke',
      'roundRect',
      'fillText',
      'ellipse',
      'translate',
      'rotate',
    ].map((k) => [k, vi.fn<() => void>()]),
  );
  property(HTMLCanvasElement.prototype, 'getContext', () => ctx);
  const prefs = Object.assign(new EventTarget(), { matches: true });
  vi.stubGlobal('matchMedia', () => prefs);
  vi.stubGlobal('Audio', TestAudio);
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', vi.fn<() => void>());
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  restore(navigator, 'geolocation', gpsDescriptor);
  restore(navigator, 'mediaDevices', mediaDescriptor);
  restore(HTMLCanvasElement.prototype, 'getContext', contextDescriptor);
});

describe('animated AED guide and speech', () => {
  it('opens all five adult BLS scenes with progress, accessible text and manual controls', () => {
    render(<AedInstructions onBack={actions.onBack} />);
    expect(screen.getByText(/Jeśli jesteś sam/)).toBeVisible();
    for (const [index, step] of steps.entries()) {
      expect(screen.getByRole('heading', { name: step.title })).toBeVisible();
      expect(screen.getByRole('img', { name: step.illustration })).toBeVisible();
      if (index < steps.length - 1) click('Dalej');
    }
    click('Poprzedni krok');
    expect(screen.getByRole('heading', { name: steps[3].title })).toBeVisible();
    click('Krok 5. Wznów uciskanie');
    click('Wróć do mapy');
    expect(actions.onBack).toHaveBeenCalled();
    expect(screen.getByRole('link', { name: '112' })).toHaveAttribute('href', 'tel:112');
    expect(screen.getByRole('button', { name: 'Czytaj kroki' })).toBeEnabled();
  });
  it('reads in Polish, suspends the mic while speaking, advances only on a complete command, and releases it', () => {
    const synth = voiceBrowser(),
      view = render(<AedInstructions onBack={actions.onBack} />);
    click('Mów „dalej”');
    const mic = TestRecognition.current;
    expect(mic.start).toHaveBeenCalledTimes(1);
    click('Czytaj kroki');
    expect(mic.abort).toHaveBeenCalled();
    const utterance = synth.speak.mock.calls[0]![0];
    expect(utterance).toMatchObject({ lang: 'pl-PL', voice: { lang: 'pl_PL' } });
    act(() => mic.hear('dalej'));
    expect(screen.getByRole('heading', { name: steps[0].title })).toBeVisible();
    act(() => {
      utterance.dispatchEvent(event('end'));
      vi.advanceTimersByTime(400);
    });
    expect(mic.start).toHaveBeenCalledTimes(2);
    act(() => mic.hear('to za daleko'));
    expect(screen.getByRole('heading', { name: steps[0].title })).toBeVisible();
    act(() => mic.hear('Dalej!'));
    expect(screen.getByRole('heading', { name: steps[1].title })).toBeVisible();
    expect(synth.speak).toHaveBeenCalledTimes(2);
    void act(() =>
      synth.speak.mock.calls[1]![0].dispatchEvent(event('error', { error: 'synthesis-failed' })),
    );
    expect(TestAudio.current.src).toMatch(/rescue-audio\/krok-2\.mp3$/);
    expect(TestAudio.current.play).toHaveBeenCalledOnce();
    void act(() => TestAudio.current.dispatchEvent(event('error')));
    expect(screen.getByRole('status')).toHaveTextContent('Nie udało się odtworzyć nagrania');
    view.unmount();
    expect(synth.cancel).toHaveBeenCalled();
    expect(mic.abort).toHaveBeenCalled();
  });
  it('uses the bundled Polish narration and pauses playback when native voices are unavailable', () => {
    const view = render(<AedInstructions onBack={actions.onBack} />);
    click('Czytaj kroki');
    const first = TestAudio.current;
    expect(first.src).toMatch(/krok-1\.mp3$/);
    void act(() => first.dispatchEvent(event('ended')));
    click('Dalej');
    expect(first.pause).toHaveBeenCalledOnce();
    expect(TestAudio.current.src).toMatch(/krok-2\.mp3$/);
    click('Wycisz lektora');
    expect(TestAudio.current.pause).toHaveBeenCalledOnce();
    view.unmount();
  });
  it('handles microphone denial, network failures and unsuccessful restarts without advancing the guide', () => {
    voiceBrowser();
    render(<AedInstructions onBack={actions.onBack} />);
    click('Mów „dalej”');
    void act(() => TestRecognition.current.dispatchEvent(event('error', { error: 'not-allowed' })));
    expect(screen.getByRole('status')).toHaveTextContent('Brak dostępu do mikrofonu');
    click('Mów „dalej”');
    const mic = TestRecognition.current;
    void act(() => mic.dispatchEvent(event('error', { error: 'no-speech' })));
    expect(screen.getByRole('button', { name: 'Wyłącz mikrofon' })).toBeVisible();
    void act(() => mic.dispatchEvent(event('error', { error: 'network' })));
    expect(screen.getByRole('status')).toHaveTextContent('Rozpoznawanie mowy jest niedostępne');
    click('Mów „dalej”');
    TestRecognition.current.start.mockImplementationOnce(() => {
      throw Error('blocked');
    });
    act(() => {
      TestRecognition.current.dispatchEvent(event('end'));
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Nie udało się');
    expect(screen.getByRole('heading', { name: steps[0].title })).toBeVisible();
  });
});

describe('AR and proximity', () => {
  it('walks a simulation with no device permission prompt, selects photographs and requires explicit confirmation', () => {
    const device = mobileBrowser();
    render(<ArGuide target={target} origin={origin} path={[origin, target]} demo {...actions} />);
    expect(screen.getByText(/Zdjęcie referencyjne/)).toBeVisible();
    expect(device.getMedia).not.toHaveBeenCalled();
    const yaw = screen.getByRole('slider');
    fireEvent.change(yaw, { target: { value: 80 } });
    expect(screen.getByText('Obróć się w lewo')).toBeVisible();
    fireEvent.change(yaw, { target: { value: -80 } });
    expect(screen.getByText('Obróć się w prawo')).toBeVisible();
    click('Symuluj dojście');
    click('Zatrzymaj marsz');
    click('Symuluj dojście');
    void act(() => vi.advanceTimersByTime(11000));
    expect(screen.getByText('W pobliżu AED')).toBeVisible();
    expect(screen.getByText(/Zdjęcie urządzenia/)).toBeVisible();
    expect(actions.onArrive).not.toHaveBeenCalled();
    click('Mam AED · otwórz instrukcję');
    expect(actions.onArrive).toHaveBeenCalledOnce();
  });
  it('resumes guidance at the current segment when entering AR midway through a route', () => {
    const west = { lat: 52, lon: 20.998 },
      turn = { lat: 52, lon: 21 },
      current = { lat: 52.001, lon: 21 };
    const end = { lat: 52.002, lon: 21, name: 'Koniec' };
    render(<ArGuide target={end} origin={current} path={[west, turn, end]} demo {...actions} />);
    expect(screen.getByText('0° N')).toBeVisible();
    expect(screen.getByText('111 m trasy')).toBeVisible();
    expect(screen.getByText(/Ilustracja poglądowa/)).toBeVisible();
  });
  it('projects live orientation and stops all camera, GPS and compass listeners on exit', async () => {
    const device = mobileBrowser(),
      ui = render(
        <ArGuide
          target={target}
          origin={origin}
          path={[origin, target]}
          demo={false}
          {...actions}
        />,
      );
    await activate();
    expect(device.permission).toHaveBeenCalledWith(true);
    expect(device.getMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false }));
    expect(screen.getByText('Kamera na żywo')).toBeVisible();
    device.fix(origin, 100);
    expect(screen.getByText(/Dokładność GPS jest za niska/)).toBeVisible();
    device.fix();
    tilt(0, 90, false);
    expect(screen.getByText(/Oczekiwanie na zgodny kompas/)).toBeVisible();
    tilt(0);
    expect(screen.getByText('Kierunek trasy')).toBeVisible();
    tilt(90);
    expect(screen.getByText('Obróć się w prawo')).toBeVisible();
    tilt(0, 58);
    expect(screen.getByText('Skieruj kamerę na wprost')).toBeVisible();
    void act(() => vi.advanceTimersByTime(16000));
    expect(screen.getByText(/Oczekiwanie na aktualną pozycję GPS/)).toBeVisible();
    device.lose(1);
    expect(screen.getByText(/Brak zgody na lokalizację/)).toBeVisible();
    device.lose(2);
    expect(screen.getByText(/Brak aktualnego sygnału GPS/)).toBeVisible();
    device.fix(target, 50);
    expect(screen.queryByText('W pobliżu AED')).toBeNull();
    device.fix(target, 5);
    expect(screen.getByText('W pobliżu AED')).toBeVisible();
    expect(actions.onArrive).not.toHaveBeenCalled();
    void act(() => device.track.dispatchEvent(event('ended')));
    expect(screen.queryByText('Kamera na żywo')).toBeNull();
    ui.unmount();
    expect(device.stop).toHaveBeenCalledOnce();
    expect(device.clear).toHaveBeenCalledWith(22);
  });
  it('offers the map and manual guide when camera or orientation permission fails', async () => {
    const device = mobileBrowser();
    device.getMedia.mockRejectedValueOnce(new Error('denied'));
    device.permission.mockRejectedValueOnce(new Error('denied'));
    render(<ArGuide target={target} demo={false} {...actions} />);
    await activate();
    device.fix();
    expect(screen.getByText(/Brak obrazu/)).toBeVisible();
    expect(screen.getByText(/Brak dostępu do kompasu/)).toBeVisible();
    click('Pokaż mapę');
    expect(actions.onBack).toHaveBeenCalled();
    click('Mam już AED');
    expect(actions.onArrive).toHaveBeenCalled();
  });
  it('rejects a selfie camera so that an inverse camera image cannot show a false bearing', async () => {
    const device = mobileBrowser('user');
    const view = render(<ArGuide target={target} demo={false} {...actions} />);
    await activate();
    expect(screen.getByText('Nawigacja AR wymaga tylnej kamery.')).toBeVisible();
    expect(device.stop).toHaveBeenCalledOnce();
    expect(screen.queryByText('Kamera na żywo')).toBeNull();
    view.unmount();
    expect(device.stop).toHaveBeenCalledOnce();
  });
  it('handles missing sensor APIs and cancels a camera permission which resolves after navigation', async () => {
    property(navigator, 'mediaDevices', undefined);
    property(navigator, 'geolocation', undefined);
    const initial = render(<ArGuide target={target} demo={false} {...actions} />);
    await activate();
    expect(screen.getByText(/Ta przeglądarka nie udostępnia lokalizacji/)).toBeVisible();
    expect(screen.getByText(/Kamera wymaga połączenia HTTPS/)).toBeVisible();
    initial.unmount();
    let release: (() => void) | undefined;
    const stop = vi.fn<() => void>();
    property(navigator, 'mediaDevices', {
      getUserMedia: () =>
        new Promise((resolve) => {
          release = () => resolve({ getTracks: () => [{ stop }] });
        }),
    });
    const late = render(<ArGuide target={target} demo={false} {...actions} />);
    await activate();
    late.unmount();
    await act(async () => {
      release?.();
      await Promise.resolve();
    });
    expect(stop).toHaveBeenCalledOnce();
  });
});
