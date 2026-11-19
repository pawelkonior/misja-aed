import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';

import { catalog, type Page } from '../../shared/navigation';
import { DataView, Home } from './Home';

it('opens the selected service from the dashboard and the nearby-device preview', async () => {
  const user = userEvent.setup();
  const go = vi.fn<(page: Page) => void>();
  const documents = vi.fn<() => void>();
  render(<Home go={go} documents={documents} />);
  expect(screen.getByRole('img', { name: /Trasa demonstracyjna/ })).toBeInTheDocument();
  for (const [name, destination] of [
    [/^Otwórz mapę AED$/, 'map'],
    [/Pokaż trasę na mapie/, 'map'],
    [/Otwórz mapę najbliższego AED/, 'map'],
    [/^Mapa AED/, 'map'],
    [/^Nawigacja AR/, 'ar'],
    [/^Instrukcja AED/, 'guide'],
    [/^Otwarte dane o AED/, 'data'],
  ] as const) {
    await user.click(screen.getByRole('button', { name }));
    expect(go).toHaveBeenLastCalledWith(destination);
  }
  await user.click(screen.getByRole('button', { name: /mDowód/ }));
  expect(documents).toHaveBeenCalledOnce();
});

it('links every advertised download, publisher and license to the matching catalogue entry', () => {
  render(<DataView />);
  expect(
    screen.getByText(catalog.records.toLocaleString('pl-PL'), { normalizer: (value) => value }),
  ).toBeVisible();
  for (const file of [
    ...catalog.resources,
    { path: 'catalog.json', format: 'Metadane JSON' },
    { path: 'harvester.xml', format: 'Import do dane.gov.pl (XML)' },
  ]) {
    const link = screen.getByRole('link', { name: file.format });
    expect(link).toHaveAttribute('href', import.meta.env.BASE_URL + 'data/' + file.path);
    expect(link).toHaveAttribute('download');
  }
  for (const source of catalog.sources) {
    expect(screen.getByRole('link', { name: source.publisher })).toHaveAttribute(
      'href',
      source.url,
    );
    expect(
      screen
        .getAllByRole('link', { name: 'Licencja źródła' })
        .map((link) => link.getAttribute('href')),
    ).toContain(source.license);
  }
});
