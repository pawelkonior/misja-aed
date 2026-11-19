import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';

import { DEMO_SUMMARY, mountAedMap } from '../../map/index.js';
import type { MapSession, NavigationPayload } from '../../map/index.js';
import { ArGuide } from '../features/rescue/Rescue';
import type { ArProps } from '../features/rescue/ArGuide';
import { App } from './App';

vi.mock('../../map/index.js', () => ({
  DEMO_SUMMARY: {
    target: { id: 'demo', name: 'AED demonstracyjny', lat: 52.23, lon: 21.01 },
    position: { lat: 52.231, lon: 21.012 },
  },
  mountAedMap: vi.fn<typeof mountAedMap>(),
}));

vi.mock('../features/rescue/Rescue', () => ({
  ArGuide: vi.fn<typeof ArGuide>(({ onBack, onArrive }: ArProps) => (
    <section>
      <button onClick={onBack}>Powrót z AR</button>
      <button onClick={onArrive}>Mam urządzenie</button>
    </section>
  )),
  AedInstructions: ({ onBack }: { onBack: () => void }) => (
    <button onClick={onBack}>Powrót z instrukcji</button>
  ),
}));

const selected: NavigationPayload = {
  target: { id: 'selected', name: 'Wybrane AED', description: 'Hol', lat: 51.7, lon: 20.1 },
  position: { lat: 51.701, lon: 20.102 },
  mode: 'live',
  route: {
    coordinates: [
      [20.102, 51.701],
      [20.1, 51.7],
    ],
    distance: 180,
    duration: 125,
    steps: [],
  },
  path: [],
};

const getState = vi.fn<MapSession['getState']>();
const destroy = vi.fn<MapSession['destroy']>();
const mapOptions = () => {
  const options = vi.mocked(mountAedMap).mock.lastCall?.[1];
  if (!options) throw new Error('Expected a mounted map');
  return options;
};
const desktopNav = () => within(screen.getByRole('navigation', { name: 'Nawigacja główna' }));
const heading = (name: string) => screen.findByRole('heading', { level: 1, name });

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.mocked(mountAedMap).mockReturnValue({ destroy, getState });
  getState.mockReturnValue({
    ...selected,
    target: null,
    route: null,
    view: 'list',
    nearest: [],
    usedFallback: false,
    mode: 'demo',
  });
});

it('opens the dashboard for unknown routes and keeps the prototype document dismissible', async () => {
  window.history.replaceState(null, '', '/#unknown');
  const user = userEvent.setup();
  render(<App />);
  expect(await heading('Pulpit')).toBeVisible();
  expect(desktopNav().getByRole('link', { name: 'Pulpit' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(screen.getByRole('link', { name: /Zadzwoń.*112/ })).toHaveAttribute('href', 'tel:112');
  const card = screen.getByRole('button', { name: /mDowód/ });
  await user.click(card);
  const dialog = screen.getByRole('dialog', { name: 'mDowód' });
  fireEvent(dialog, new Event('cancel', { cancelable: true }));
  expect(dialog).not.toBeInTheDocument();
  await user.click(card);
  await user.click(screen.getByRole('button', { name: 'Wróć na pulpit' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(mountAedMap).not.toHaveBeenCalled();
});

it('opens public data and the team page directly and from the dashboard', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: /Otwarte dane o AED/ }));
  expect(await heading('Otwarte dane')).toBeVisible();
  expect(screen.getByRole('link', { name: 'GeoJSON' })).toHaveAttribute('download');
  await user.click(screen.getByRole('link', { name: 'O projekcie' }));
  expect(await heading('O projekcie')).toBeVisible();
  expect(screen.getByRole('link', { name: /Kod, źródła/ })).toHaveAttribute(
    'href',
    'https://github.com/pawelkonior/misja-aed',
  );
  expect(mountAedMap).not.toHaveBeenCalled();
});

it('uses the demo route for the AR shortcut and keeps the selection when returning from instructions', async () => {
  const user = userEvent.setup();
  const view = render(<App />);
  await user.click(screen.getByRole('button', { name: /Nawigacja AR/ }));
  expect(await heading('Nawigacja AR')).toBeVisible();
  expect(vi.mocked(ArGuide).mock.lastCall?.[0]).toMatchObject({
    target: DEMO_SUMMARY.target,
    demo: true,
  });
  await user.click(screen.getByRole('button', { name: 'Mam urządzenie' }));
  expect(await heading('Instrukcja AED')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Powrót z instrukcji' }));
  expect(await heading('Mapa AED')).toBeVisible();
  expect(mountAedMap).toHaveBeenCalledTimes(1);
  act(() => mapOptions().onBack?.());
  expect(await heading('Pulpit')).toBeVisible();
  expect(destroy).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(destroy).toHaveBeenCalledTimes(1);
});

it('hands a selected live route to AR with latitude and longitude in the expected order', async () => {
  window.history.replaceState(null, '', '/#mapa');
  const user = userEvent.setup();
  render(<App />);
  getState.mockReturnValue({
    ...selected,
    route: null,
    view: 'detail',
    nearest: [],
    usedFallback: false,
  });
  await user.click(desktopNav().getByRole('link', { name: 'Nawigacja AR' }));
  expect(await heading('Mapa AED')).toBeVisible();
  expect(ArGuide).not.toHaveBeenCalled();

  getState.mockReturnValue({ ...selected, view: 'route', nearest: [], usedFallback: false });
  await user.click(desktopNav().getByRole('link', { name: 'Nawigacja AR' }));
  expect(await heading('Nawigacja AR')).toBeVisible();
  expect(vi.mocked(ArGuide).mock.lastCall?.[0]).toMatchObject({
    target: selected.target,
    origin: selected.position,
    demo: false,
    path: [selected.position, { lon: 20.1, lat: 51.7 }],
  });

  await user.click(screen.getByRole('button', { name: 'Powrót z AR' }));
  expect(await heading('Mapa AED')).toBeVisible();
  act(() => mapOptions().onOpenAR?.({ ...selected, route: null }));
  expect(await heading('Nawigacja AR')).toBeVisible();
  expect(vi.mocked(ArGuide).mock.lastCall?.[0]).toMatchObject({
    target: selected.target,
    path: [],
    demo: false,
  });
});

it('requires a person to confirm possession of the AED before opening instructions on arrival', async () => {
  window.history.replaceState(null, '', '/#mapa');
  const user = userEvent.setup();
  render(<App />);
  act(() => mapOptions().onArrive?.(selected));
  const dialog = screen.getByRole('dialog', { name: 'Jesteś w pobliżu AED' });
  await user.click(within(dialog).getByRole('button', { name: 'Zamknij okno' }));
  expect(await heading('Mapa AED')).toBeVisible();
  act(() => mapOptions().onArrive?.(selected));
  await user.click(screen.getByRole('button', { name: 'Mam AED przy poszkodowanym' }));
  expect(await heading('Instrukcja AED')).toBeVisible();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('opens mobile wallet cards, services, QR sharing and the dataset under More', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: /mPrawo jazdy/ }));
  expect(screen.getByRole('dialog', { name: 'mPrawo jazdy' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Zamknij okno' }));
  const mobileNav = within(screen.getByRole('navigation', { name: 'Nawigacja mobilna' }));
  await user.click(mobileNav.getByRole('link', { name: 'Usługi' }));
  expect(await heading('Usługi')).toBeVisible();
  await user.click(screen.getByRole('button', { name: /^Mapa AED/ }));
  expect(await heading('Mapa AED')).toBeVisible();
  expect(mobileNav.getByRole('link', { name: 'Usługi' })).toHaveAttribute('aria-current', 'page');
  await user.click(mobileNav.getByRole('button', { name: 'Kod QR' }));
  const qr = within(screen.getByRole('dialog', { name: 'Otwórz demo na telefonie' }));
  expect(qr.getByRole('img')).toHaveAttribute(
    'src',
    import.meta.env.BASE_URL + 'media/demo-qr.png',
  );
  expect(qr.getByRole('link')).toHaveAttribute('href', 'https://pawelkonior.github.io/misja-aed/');
  await user.click(qr.getByRole('button', { name: 'Zamknij okno' }));
  await user.click(mobileNav.getByRole('link', { name: 'Więcej' }));
  expect(await heading('O projekcie')).toBeVisible();
  await user.click(screen.getByRole('link', { name: 'Otwórz zbiór danych AED' }));
  expect(await heading('Otwarte dane')).toBeVisible();
  await user.click(mobileNav.getByRole('link', { name: 'Dokumenty' }));
  expect(await heading('Dokumenty')).toBeVisible();
});
