import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { mountAedMap } from '../../map/index.js';
import type { MapOptions, MapSession, NavigationPayload } from '../../map/index.js';
import { ArGuide, requestArCompass, type ArProps } from '../features/rescue/ArGuide';
import { App } from './App';

vi.mock('../../map/index.js', () => ({ mountAedMap: vi.fn<typeof mountAedMap>() }));
vi.mock('../features/rescue/ArGuide', () => ({
  requestArCompass: vi.fn<typeof requestArCompass>(),
  ArGuide: vi.fn<typeof ArGuide>(({ onBack, onArrive, playRecording }: ArProps) => (
    <section aria-label={playRecording ? 'Nagranie przejścia' : 'Aparat na żywo'}>
      <button onClick={onBack}>Wróć do mapy</button>
      <button onClick={onArrive}>Instrukcja AED</button>
    </section>
  )),
}));
vi.mock('../features/rescue/Rescue', () => ({
  AedInstructions: ({ onBack }: { onBack: () => void }) => (
    <button onClick={onBack}>Powrót z instrukcji</button>
  ),
}));
const point = { lat: 52, lon: 21 };
const selected: NavigationPayload = {
  target: { ...point, id: 'a', name: 'Biblioteka', description: 'Hol' },
  position: { lat: 52.001, lon: 21 },
  route: null,
  mode: 'live',
  path: [{ lat: 52.001, lon: 21 }, point],
};
const destroy = vi.fn<() => void>();
const startReturn = vi.fn<MapSession['startReturn']>();
const setActive = vi.fn<(visible: boolean) => void>();
function options(): MapOptions {
  const result = vi.mocked(mountAedMap).mock.lastCall?.[1];
  if (!result) throw Error('Map was not mounted');
  return result;
}
beforeEach(() => {
  window.history.replaceState(null, '', '/');
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.mocked(mountAedMap).mockReturnValue({
    destroy,
    setActive,
    startReturn,
    getState: vi.fn<MapSession['getState']>(),
  });
});

it('keeps the home screen free of emergency actions and only starts the map when selected', async () => {
  const user = userEvent.setup();
  render(<App />);
  expect(screen.getByRole('button', { name: 'mDowód' })).toBeVisible();
  expect(screen.queryByRole('link', { name: /Zadzwoń/ })).not.toBeInTheDocument();
  expect(mountAedMap).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Defibrylator w pobliżu Otwórz mapę' }));
  await waitFor(() => expect(mountAedMap).toHaveBeenCalledOnce());
  act(() => options().onBack?.());
  expect(await screen.findByRole('heading', { name: 'mObywatel' })).toBeVisible();
  expect(destroy).toHaveBeenCalledOnce();
});
it('offers an explicit phone handoff with cancellation when guidance starts and preserves the map session', async () => {
  window.history.replaceState(null, '', '/#mapa');
  const user = userEvent.setup();
  render(<App />);
  expect(screen.queryByRole('link', { name: /Zadzwoń/ })).not.toBeInTheDocument();
  act(() => options().onStartGuidance?.(selected));
  expect(screen.getByRole('link', { name: /Zadzwoń/ })).toHaveAttribute('href', 'tel:112');
  await user.click(screen.getByRole('button', { name: 'Anuluj' }));
  expect(screen.queryByRole('link', { name: /Zadzwoń/ })).not.toBeInTheDocument();
  act(() => options().onOpenAR?.(selected));
  expect(await screen.findByRole('region', { name: 'Aparat na żywo' })).toBeVisible();
  expect(requestArCompass).toHaveBeenCalledOnce();
  expect(ArGuide).toHaveBeenLastCalledWith(
    expect.objectContaining({ target: selected.target, path: selected.path }),
    undefined,
  );
  expect(setActive).toHaveBeenLastCalledWith(false);
  await user.click(screen.getByRole('button', { name: 'Instrukcja AED' }));
  await user.click(await screen.findByRole('button', { name: 'Powrót z instrukcji' }));
  await waitFor(() => expect(setActive).toHaveBeenLastCalledWith(true));
  expect(mountAedMap).toHaveBeenCalledOnce();
});
it('opens the return map from live AR only after the map accepts the fix', async () => {
  window.history.replaceState(null, '', '/#mapa');
  render(<App />);
  act(() => options().onOpenAR?.(selected));
  await screen.findByRole('region', { name: 'Aparat na żywo' });
  const fromAr = vi.mocked(ArGuide).mock.lastCall?.[0].onReturn;
  const fix = { lat: 52, lon: 21, accuracy: 5 };
  startReturn.mockReturnValueOnce(false).mockReturnValueOnce(true);
  act(() => fromAr?.(fix));
  expect(window.location.hash).toBe('#ar');
  act(() => fromAr?.(fix));
  await waitFor(() => expect(setActive).toHaveBeenLastCalledWith(true));
  expect(startReturn).toHaveBeenLastCalledWith(fix);
  expect(window.location.hash).toBe('#mapa');
  expect(screen.queryByRole('timer')).toBeNull();
});

it('lets the person access the instruction once the map reports a confirmed arrival', async () => {
  window.history.replaceState(null, '', '/#mapa');
  render(<App />);
  act(() => options().onArrive?.(selected));
  expect(await screen.findByRole('button', { name: 'Powrót z instrukcji' })).toBeVisible();
});
it('opens explicitly chosen footage without an emergency prompt or requesting camera permission', async () => {
  window.history.replaceState(null, '', '/#mapa');
  render(<App />);
  act(() => options().onOpenRecording?.());
  expect(await screen.findByRole('region', { name: 'Nagranie przejścia' })).toBeVisible();
  expect(requestArCompass).not.toHaveBeenCalled();
  expect(screen.queryByRole('link', { name: /Zadzwoń/ })).not.toBeInTheDocument();
});
it('opens data and attribution links directly without running GPS', async () => {
  window.history.replaceState(null, '', '/#projekt');
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('link', { name: 'Otwórz zbiór danych AED' }));
  expect(await screen.findByRole('heading', { name: 'Otwarte dane' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'GeoJSON' })).toHaveAttribute('download');
  expect(mountAedMap).not.toHaveBeenCalled();
});

it('opens the wallet tabs, shares the service by QR and keeps the data accessible', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('link', { name: 'Usługi' }));
  expect(await screen.findByRole('heading', { name: 'Usługi' })).toBeVisible();
  expect(screen.getByRole('link', { name: 'Historia pojazdu' })).toHaveAttribute(
    'href',
    'https://info.mobywatel.gov.pl/uslugi/historia-pojazdu',
  );
  await user.click(screen.getByRole('button', { name: 'Kod QR' }));
  expect(screen.getByRole('img', { name: 'Kod QR usługi AED' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Zamknij okno' }));
  await user.click(screen.getByRole('link', { name: 'Więcej' }));
  await user.click(await screen.findByRole('link', { name: 'Otwarte dane o AED' }));
  expect(await screen.findByRole('heading', { name: 'Otwarte dane' })).toBeVisible();
});
