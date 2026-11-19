import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArGuide, AedInstructions } from './Rescue';
import { requestArCompass } from './ArGuide';
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
async function settle() {
  await act(async () => {
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
    expect(screen.queryByRole('link', { name: '112' })).toBeNull();
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

describe('live mobile AR', () => {
  it('opens the rear camera on entry, tracks live orientation and releases all hardware on exit', async () => {
    const device = mobileBrowser();
    void requestArCompass();
    const onReturn = vi.fn<(fix: { lat: number; lon: number; accuracy?: number }) => void>();
    const ui = render(
      <ArGuide
        target={target}
        origin={target}
        path={[origin, target]}
        {...actions}
        onReturn={onReturn}
      />,
    );
    await settle();
    expect(device.permission).toHaveBeenCalledWith(true);
    expect(device.getMedia).toHaveBeenCalledWith({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    expect(screen.getByText('Aparat na żywo')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Instrukcja AED' })).toBeNull();
    device.fix(origin, 100);
    expect(screen.getByText(/Dokładność GPS jest za niska/)).toBeVisible();
    device.fix();
    tilt(0, 90, false);
    expect(screen.getByText(/Oczekiwanie na kompas/)).toBeVisible();
    tilt(0);
    tilt(0);
    expect(screen.getByText('Idź prosto')).toBeVisible();
    tilt(270);
    expect(screen.getByText('Obróć się w lewo')).toBeVisible();
    tilt(90);
    expect(screen.getByText('Obróć się w prawo')).toBeVisible();
    tilt(0, 58);
    expect(screen.getByText('Skieruj aparat na wprost')).toBeVisible();
    tilt(0, 0);
    expect(screen.getByText(/Oczekiwanie na kompas/)).toBeVisible();
    void act(() => vi.advanceTimersByTime(16000));
    expect(screen.getByText(/Oczekiwanie na aktualną pozycję GPS/)).toBeVisible();
    device.lose(1);
    expect(screen.getByText('Brak zgody na lokalizację.')).toBeVisible();
    device.lose(2);
    expect(screen.getByText('Brak aktualnego sygnału GPS.')).toBeVisible();
    device.fix({ lat: target.lat - 0.00022, lon: target.lon });
    tilt(0);
    expect(screen.getByText('Szukaj oznaczenia AED')).toBeVisible();
    expect(screen.getByLabelText('Przybliżony kierunek AED')).toBeVisible();
    device.fix(target, 50);
    expect(screen.queryByText('AED w pobliżu')).toBeNull();
    device.fix(target, 5);
    expect(screen.getByText('AED w pobliżu')).toBeVisible();
    expect(actions.onArrive).not.toHaveBeenCalled();
    click('Wróć do punktu startu');
    expect(onReturn).toHaveBeenCalledWith({ lat: target.lat, lon: target.lon, accuracy: 5 });
    click('Instrukcja AED');
    expect(actions.onArrive).toHaveBeenCalledOnce();
    void act(() => device.track.dispatchEvent(event('ended')));
    expect(screen.queryByText('Aparat na żywo')).toBeNull();
    ui.unmount();
    expect(device.stop).toHaveBeenCalledOnce();
    expect(device.clear).toHaveBeenCalledWith(22);
  });

  it('points along a walking route and removes directional overlays when off route or GPS expires', async () => {
    const west = { lat: 52, lon: 20.998 },
      turn = { lat: 52, lon: 21 };
    const end = { lat: 52.002, lon: 21, name: 'Koniec' };
    const device = mobileBrowser();
    render(<ArGuide target={end} path={[west, turn, end]} {...actions} />);
    await settle();
    tilt(0);
    device.fix({ lat: 52.001, lon: 21 });
    expect(screen.getByText('111 m')).toBeVisible();
    expect(screen.getByText('Do celu')).toBeVisible();
    expect(screen.getByText('Idź prosto')).toBeVisible();
    device.fix({ lat: 52.001, lon: 21.005 });
    expect(screen.getByText('Wróć do trasy')).toBeVisible();
    expect(document.querySelector('.ar-guideline')).toBeNull();
  });

  it('calculates meters to the next turn from the routing geometry and GPS fix', async () => {
    const start = { lat: 52, lon: 21 },
      turn = { lat: 52.001, lon: 21 };
    const end = { lat: 52.001, lon: 21.003, name: 'Apteka' };
    const device = mobileBrowser();
    render(
      <ArGuide
        target={end}
        path={[start, turn, end]}
        steps={[
          { name: '', distance: 112, maneuver: { type: 'depart', location: [21, 52] } },
          {
            name: 'Chmielna',
            distance: 210,
            maneuver: { type: 'turn', modifier: 'right', location: [21, 52.001] },
          },
          { name: '', distance: 0, maneuver: { type: 'arrive', location: [21.003, 52.001] } },
        ]}
        {...actions}
      />,
    );
    await settle();
    tilt(0);
    device.fix({ lat: 52.0004, lon: 21 });
    expect(screen.getByText('Skręć w prawo')).toBeVisible();
    expect(screen.getByText('67 m')).toBeVisible();
    device.fix({ lat: 52.00093, lon: 21 });
    expect(screen.getByText('8 m')).toBeVisible();
    device.fix({ lat: 52.001, lon: 21.0002 });
    expect(screen.getByText('Poszukaj oznaczenia AED')).toBeVisible();
  });
  it('retries permissions from a gesture and offers a route recording even with camera access denied', async () => {
    const device = mobileBrowser();
    device.permission.mockRejectedValueOnce(new Error('blocked'));
    device.getMedia.mockRejectedValueOnce(new Error('blocked'));
    void requestArCompass();
    render(<ArGuide target={target} {...actions} />);
    await settle();
    device.fix();
    expect(screen.getByText(/Sprawdź dostęp do aparatu/)).toBeVisible();
    expect(screen.getByText(/Brak dostępu do kompasu/)).toBeVisible();
    expect(screen.getByRole('button', { name: /Nagranie/ })).toBeVisible();
    click('Włącz kompas');
    await settle();
    expect(screen.getByText('Aparat na żywo')).toBeVisible();
    device.fix();
    tilt(0);
    expect(screen.getByText('Kierunek do AED')).toBeVisible();
    click('Wróć do mapy');
    expect(actions.onBack).toHaveBeenCalled();
  });

  it('rejects a front camera and can retry a disconnected stream', async () => {
    const device = mobileBrowser('user');
    const view = render(<ArGuide target={target} {...actions} />);
    await settle();
    expect(screen.getByText('Nawigacja AR wymaga tylnego aparatu.')).toBeVisible();
    expect(device.stop).toHaveBeenCalledOnce();
    click('Spróbuj ponownie');
    await settle();
    view.unmount();
    expect(device.stop).toHaveBeenCalledTimes(2);
  });

  it('handles missing APIs and stops late camera permission results after navigation', async () => {
    property(navigator, 'mediaDevices', undefined);
    property(navigator, 'geolocation', undefined);
    void requestArCompass();
    const before = render(<ArGuide target={target} {...actions} />);
    await settle();
    expect(screen.getByText(/Ta przeglądarka nie udostępnia lokalizacji/)).toBeVisible();
    expect(screen.getByText(/HTTPS lub localhost/)).toBeVisible();
    before.unmount();
    let release: (() => void) | undefined;
    const stop = vi.fn<() => void>();
    property(navigator, 'mediaDevices', {
      getUserMedia: () =>
        new Promise((resolve) => {
          release = () => resolve({ getTracks: () => [{ stop }] });
        }),
    });
    const late = render(<ArGuide target={target} {...actions} />);
    await settle();
    late.unmount();
    await act(async () => {
      release?.();
      await Promise.resolve();
    });
    expect(stop).toHaveBeenCalledOnce();
  });
  it('stops the camera while the document is hidden and resumes when the user returns', async () => {
    const device = mobileBrowser();
    const hidden = vi.spyOn(document, 'hidden', 'get');
    render(<ArGuide target={target} {...actions} />);
    await settle();
    hidden.mockReturnValue(true);
    act(() => {
      document.dispatchEvent(event('visibilitychange'));
    });
    expect(device.stop).toHaveBeenCalledOnce();
    hidden.mockReturnValue(false);
    act(() => {
      document.dispatchEvent(event('visibilitychange'));
    });
    await settle();
    expect(device.getMedia).toHaveBeenCalledTimes(2);
  });
});

describe('recorded street walk', () => {
  const walk = {
    title: 'Chmielna',
    destination: 'Chmielna 21',
    attribution: 'Nagranie ulicy',
    sourceUrl: 'https://example.org/walk',
    cues: [
      {
        start: 0,
        direction: 'straight',
        text: 'Idź prosto',
        maneuver: 'Następny skręt',
        meters: 18,
        nextMeters: 9,
        upcomingDirection: 'left',
      },
      {
        start: 3,
        direction: 'left',
        text: 'Skręć w lewo',
        maneuver: 'Następny skręt',
        meters: 9,
        nextMeters: 3,
        upcomingDirection: 'left',
      },
      {
        start: 6,
        direction: 'right',
        text: 'Skręć w prawo',
        maneuver: 'Następny skręt',
        meters: 4,
        nextMeters: 0,
        upcomingDirection: 'right',
      },
      {
        start: 9,
        direction: 'arrived',
        text: 'Odszukaj szafkę AED',
        maneuver: 'Cel',
        meters: 0,
        nextMeters: 0,
        upcomingDirection: 'arrived',
      },
    ],
  };
  it('switches off live camera and links cues and arrival to actual media playback', async () => {
    const device = mobileBrowser();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(walk))),
    );
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const ui = render(<ArGuide target={target} {...actions} />);
    await settle();
    click('Nagranie · Chmielna 21');
    await settle();
    expect(device.stop).toHaveBeenCalledOnce();
    expect(device.clear).toHaveBeenCalled();
    expect(screen.getByText('Idź prosto')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Nagranie ulicy' })).toHaveAttribute(
      'href',
      walk.sourceUrl,
    );
    const video = screen.getByLabelText<HTMLVideoElement>('Film przejścia do AED');
    fireEvent.play(video);
    click('Zatrzymaj nagranie');
    expect(pause).toHaveBeenCalledOnce();
    fireEvent.pause(video);
    click('Wznów nagranie');
    fireEvent.play(video);
    fireEvent.timeUpdate(video, { target: { currentTime: 4 } });
    expect(screen.getByText('Skręć w lewo')).toBeVisible();
    expect(screen.getByText('7 m')).toBeVisible();
    expect(screen.getByText('Następny skręt')).toBeVisible();
    expect(document.querySelectorAll('.ar-road-tile')).toHaveLength(5);
    fireEvent.timeUpdate(video, { target: { currentTime: 8 } });
    expect(screen.getByText('Skręć w prawo')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Instrukcja AED' })).toBeNull();
    fireEvent.timeUpdate(video, { target: { currentTime: 9 } });
    expect(screen.getByText('Odszukaj szafkę AED')).toBeVisible();
    expect(actions.onArrive).not.toHaveBeenCalled();
    click('Instrukcja AED');
    expect(actions.onArrive).toHaveBeenCalledOnce();
    fireEvent.ended(video);
    click('Odtwórz ponownie');
    expect(video.currentTime).toBe(0);
    ui.unmount();
    expect(pause).toHaveBeenCalledTimes(2);
  });
  it('can open the recording without GPS or an AED selection and reports a failed media load', async () => {
    const device = mobileBrowser();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 404 })),
    );
    render(<ArGuide target={null} {...actions} />);
    await settle();
    expect(device.getMedia).not.toHaveBeenCalled();
    expect(screen.getByText('Nagranie niedostępne')).toBeVisible();
    fireEvent.error(screen.getByLabelText('Film przejścia do AED'));
    expect(screen.queryByRole('button', { name: 'Instrukcja AED' })).toBeNull();
  });
});
