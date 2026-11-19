import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { z } from 'zod';
const widok = { lat: 52.23123, lon: 21.01416 };
const chmielnaAED = { lat: 52.2321787, lon: 21.0146526 };

test('shows the AED service beside mobile wallet documents and tabs', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'mObywatel' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Defibrylator w pobliżu' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'mDowód' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Nawigacja mobilna' })).toBeVisible();
  await expect(page.getByText(/prototyp|demo|112/i)).toHaveCount(0);
  const framed = await page.evaluate(
    () => matchMedia('(hover: hover) and (pointer: fine)').matches,
  );
  const island = page.locator('.phone-island');
  if (framed) {
    await expect(island).toBeVisible();
    const phone = await page.locator('.phone-body').boundingBox();
    const viewport = page.viewportSize()!;
    expect(phone!.x).toBeGreaterThanOrEqual(0);
    expect(phone!.y).toBeGreaterThanOrEqual(0);
    expect(phone!.y + phone!.height).toBeLessThanOrEqual(viewport.height + 1);
    const nav = await page.getByRole('navigation', { name: 'Nawigacja mobilna' }).boundingBox();
    expect(nav!.y + nav!.height).toBeLessThan(phone!.y + phone!.height);
  } else {
    await expect(island).toBeHidden();
  }
  const size = await page.locator('main').boundingBox();
  expect(size!.width).toBeLessThanOrEqual(Math.min(480, page.viewportSize()!.width));
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
});
test('uses GPS, routes when selecting an AED, and offers an optional call on starting guidance', async ({
  page,
  context,
}) => {
  await context.setGeolocation({
    latitude: widok.lat,
    longitude: widok.lon,
    accuracy: 5,
  });
  await context.grantPermissions(['geolocation']);
  await page.goto('./');
  await page.getByRole('button', { name: 'Defibrylator w pobliżu' }).click();
  await page
    .getByRole('button', { name: /Dom towarowy Bracia Jabłkowscy/i })
    .last()
    .click();
  await expect(page.getByText(/291 m/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Wskazówki dojścia' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tryb AR' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Zadzwoń' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tryb AR' }).click();
  await expect(page.getByRole('timer')).toContainText(/(10|9) s/);
  await expect(page.getByRole('link', { name: 'Zadzwoń teraz' })).toHaveAttribute(
    'href',
    'tel:112',
  );
  await page.getByRole('button', { name: 'Anuluj' }).click();
  await expect(page.getByRole('link', { name: 'Zadzwoń' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Instrukcja AED' })).toHaveCount(0);
  await context.setGeolocation({
    latitude: chmielnaAED.lat,
    longitude: chmielnaAED.lon,
    accuracy: 4,
  });
  await page.getByRole('button', { name: 'Instrukcja AED' }).click();
  await expect(page.getByRole('heading', { name: 'Wezwij pomoc' })).toBeVisible();
  await page.getByRole('button', { name: 'Dalej', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Włącz defibrylator' })).toBeVisible();
});

test('walking directions offer the call once per trip and cancellation keeps the walking route', async ({
  page,
  context,
}) => {
  await context.setGeolocation({ latitude: widok.lat, longitude: widok.lon, accuracy: 4 });
  await context.grantPermissions(['geolocation']);
  await page.goto('./#mapa');
  await page
    .getByRole('button', { name: /Dom towarowy Bracia Jabłkowscy/i })
    .last()
    .click();
  await page.getByRole('button', { name: 'Wskazówki dojścia' }).click();
  await expect(page.getByRole('link', { name: 'Zadzwoń' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Prowadź' }).click();
  await expect(page.getByRole('timer')).toContainText(/(10|9) s/);
  await expect(page.getByRole('link', { name: 'Zadzwoń teraz' })).toHaveAttribute(
    'href',
    'tel:112',
  );
  await page.getByRole('button', { name: 'Anuluj' }).click();
  await expect(page.locator('.am-steps li').first()).toBeVisible();
  await page.getByRole('button', { name: 'Tryb AR' }).click();
  await expect(
    page.getByRole('region', { name: 'Nawigacja w rzeczywistości rozszerzonej' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Zadzwoń' })).toHaveCount(0);
});
test('opens the recorded street walk after a location refusal without marking a location', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        watchPosition(_accept: PositionCallback, reject: PositionErrorCallback) {
          queueMicrotask(() =>
            reject({
              code: 1,
              message: 'denied',
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            }),
          );
          return 1;
        },
        clearWatch() {
          return;
        },
      },
    });
  });
  await page.goto('./#mapa');
  await expect(page.getByRole('heading', { name: 'Skąd wyruszasz?' })).toBeVisible();
  await expect(page.locator('[title="Twoja lokalizacja"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Wybierz punkt na mapie/ })).toBeVisible();
  await page.getByRole('button', { name: /Obejrzyj nagranie przejścia/ }).click();
  await expect(page.getByRole('region', { name: 'Nagranie przejścia do AED' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Zadzwoń' })).toHaveCount(0);
});
test('shows recorded directions and unlocks instructions at the AED', async ({ page }) => {
  await page.goto('./#nagranie');
  const film = page.locator('video');
  await expect(film).toBeVisible();
  await expect(page.getByRole('button', { name: 'Instrukcja AED' })).toHaveCount(0);
  await expect
    .poll(() => film.evaluate((v: HTMLVideoElement) => v.readyState))
    .toBeGreaterThanOrEqual(2);
  await expect.poll(() => film.evaluate((v: HTMLVideoElement) => v.duration)).toBeGreaterThan(6);
  await film.evaluate((v: HTMLVideoElement) => {
    v.currentTime = v.duration - 0.3;
  });
  await page.getByRole('button', { name: 'Instrukcja AED' }).click();
  await expect(page.getByRole('heading', { name: 'Instrukcja AED' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Zadzwoń' })).toHaveCount(0);
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
