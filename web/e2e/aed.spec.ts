import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { z } from 'zod';

test('offers the AED service and emergency number without contacting the template backend', async ({
  page,
}) => {
  const calls: string[] = [];
  await page.route(/\/(api\/v1\/items|health\/ready)\b/, async (route) => {
    calls.push(route.request().url());
    await route.abort();
  });
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: 'Pulpit' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Otwórz mapę AED' })).toBeVisible();
  await expect(page.getByRole('link', { name: /112/ })).toHaveAttribute('href', 'tel:112');
  const size = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(size.width).toBeLessThanOrEqual(size.viewport);
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    accessibility.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
  expect(calls).toEqual([]);
});

test('opens a walking route, switches to AR and starts the instructions when the user has the AED', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Otwórz mapę AED' }).click();
  await page
    .getByRole('button', { name: /Dom towarowy Bracia Jabłkowscy.*Dostęp publiczny/i })
    .click();
  await page.getByRole('button', { name: 'Wyznacz trasę pieszą' }).click();
  await expect(page.getByText(/291 m.*4 min/)).toBeVisible();
  await page.getByRole('button', { name: 'Prowadź w AR' }).click();
  await expect(page.getByText('Symulacja AR', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mam już AED' }).click();
  await expect(page.getByRole('heading', { name: 'Wezwij pomoc' })).toBeVisible();
  await page.getByRole('button', { name: 'Dalej', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Włącz defibrylator' })).toBeVisible();
});

const catalogueSchema = z.object({
  records: z.number().int().positive(),
  resources: z.array(z.object({ format: z.string(), path: z.string() })),
});

test('serves the downloadable national dataset described by the catalogue', async ({
  page,
  request,
}) => {
  await page.goto('./#dane');
  const metadata = page.getByRole('link', { name: 'Metadane JSON' });
  const catalogURL = await metadata.evaluate((link: HTMLAnchorElement) => link.href);
  const xmlURL = await page
    .getByRole('link', { name: /Import do dane.gov.pl/ })
    .evaluate((link: HTMLAnchorElement) => link.href);
  const xml = await request.get(xmlURL);
  expect(xml.ok()).toBe(true);
  const xmlText = await xml.text();
  expect(xmlText).toContain('urn:otwarte-dane:harvester:');
  const response = await request.get(catalogURL);
  expect(response.ok()).toBe(true);
  const catalog = catalogueSchema.parse(await response.json());
  expect(catalog.resources.map((r) => r.format).toSorted()).toEqual(['CSV', 'GeoJSON']);
  for (const resource of catalog.resources) {
    const link = page.getByRole('link', { name: resource.format });
    await expect(link).toHaveAttribute('download', '');
    const href = await link.evaluate((a: HTMLAnchorElement) => a.href);
    expect(href).toEqual(new URL(resource.path, catalogURL).href);
    expect(xmlText).toContain(resource.path);
    const file = await request.get(href);
    expect(file.ok()).toBe(true);
    if (resource.format === 'GeoJSON') {
      const data = z
        .object({ type: z.literal('FeatureCollection'), features: z.array(z.unknown()) })
        .parse(await file.json());
      expect(data.features).toHaveLength(catalog.records);
    } else {
      const text = await file.text();
      expect(text.split('\n', 1)[0]).toMatch(/source_url/);
    }
  }
});
