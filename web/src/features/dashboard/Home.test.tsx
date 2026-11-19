import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';

import { catalog } from '../../shared/navigation';
import { DataView, Home } from './Home';

it('opens the nearby AED map from the wallet next to documents and services', async () => {
  const user = userEvent.setup();
  const open = vi.fn<() => void>();
  render(<Home onOpen={open} />);
  expect(screen.getByRole('heading', { name: 'mObywatel' })).toBeVisible();
  for (const name of ['mDowód', 'mPrawo jazdy', 'Moje pojazdy']) {
    await user.click(screen.getByRole('button', { name }));
    expect(screen.getByRole('dialog', { name })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Zamknij okno' }));
  }
  await user.click(screen.getByRole('button', { name: 'Defibrylator w pobliżu Otwórz mapę' }));
  expect(open).toHaveBeenCalledOnce();
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
