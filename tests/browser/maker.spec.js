import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { exampleMap } from '../../src/custom-map.js';
import { writeFile } from 'node:fs/promises';

test.beforeEach(async ({ page }) => { page._errors = []; page.on('pageerror', error => page._errors.push(error.message)); });
test.afterEach(async ({ page }) => expect(page._errors).toEqual([]));

test('edit, validate, undo, save, export, import and play a user-authored map', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/maker.html');
  await expect(page.getByRole('heading', { name: 'The Mapmaker’s Desk.' })).toBeVisible();
  await expect(page.locator('#validation')).toContainText('A legal journey');
  await page.getByLabel('Your map’s title').fill('My pocket elsewhere'); await page.getByLabel('Your map’s title').blur();
  await page.getByLabel('Echo door', { exact: true }).selectOption('');
  await expect(page.getByRole('button', { name: 'Shuffle & play my map' })).toBeDisabled();
  await expect(page.locator('#validation')).toContainText('exactly two doors');
  await page.getByRole('button', { name: 'Undo edit' }).click();
  await expect(page.locator('#validation')).toContainText('A legal journey');
  await page.reload(); await expect(page.getByLabel('Your map’s title')).toHaveValue('My pocket elsewhere');
  await page.getByRole('button', { name: 'Check my route' }).click();
  await expect(page.locator('.tile.visited')).toHaveCount(4);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export postcard JSON' }).click();
  const download = await downloadPromise; expect(download.suggestedFilename()).toBe('elsewhere-my-pocket-elsewhere.json');
  const imported = exampleMap(); imported.title = 'An imported little world';
  await page.getByLabel('Import postcard JSON', { exact: false }).setInputFiles({ name: 'my-map.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported)) });
  await expect(page.getByLabel('Your map’s title')).toHaveValue(imported.title);
  await page.screenshot({ path: 'evidence/desktop-mapmaker.png', fullPage: true, animations: 'disabled' });
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await writeFile('evidence/desktop-mapmaker-accessibility.json', JSON.stringify({ violations: accessibility.violations, incomplete: accessibility.incomplete.map(rule => rule.id), passes: accessibility.passes.length }, null, 2));
  await page.getByRole('button', { name: 'Shuffle & play my map' }).click();
  await expect(page.getByRole('heading', { name: imported.title })).toBeVisible();
  await expect(page.locator('.journey')).toHaveCount(7);
  await page.getByRole('button', { name: 'A little nudge' }).click();
  for (let i = 0; i < 40; i++) { await page.getByRole('button', { name: 'Place one card for me' }).click(); if ((await page.getByRole('status').textContent()) === 'Your journey is ready.') break; }
  await page.getByRole('button', { name: 'Send the courier' }).click();
  await expect(page.getByRole('status')).toHaveText('Delivered. Beautifully improbable.');
  await page.getByRole('button', { name: /^Journey 2:/ }).click();
  await page.reload(); await expect(page.getByRole('heading', { name: 'Places trade places' })).toBeVisible();
});

test('malformed and oversized imports keep the current map; imported text cannot create markup', async ({ page }) => {
  await page.goto('/maker.html');
  for (const buffer of [Buffer.from('{broken'), Buffer.alloc(32769, 32)]) {
    await page.getByLabel('Import postcard JSON', { exact: false }).setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer });
    await expect(page.locator('#maker-notice')).toContainText('Import kept your current map');
    await expect(page.getByLabel('Your map’s title')).toHaveValue(exampleMap().title);
  }
  const map = exampleMap(); map.cards[1].name = '<b>literal landmark</b>';
  await page.getByLabel('Import postcard JSON', { exact: false }).setInputFiles({ name: 'text.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(map)) });
  await expect(page.locator('.tile-caption b')).toHaveCount(0);
  await expect(page.locator('.tile[data-at="1"] .tile-caption')).toContainText(map.cards[1].name);
  await page.getByRole('button', { name: 'Shuffle & play my map' }).click();
  await expect(page.locator('.tile-caption b')).toHaveCount(0);
  await expect(page.locator('.stamp-chip b')).toHaveCount(0);
  await expect(page.locator('.stamp-chip').first()).toHaveAttribute('title', map.cards[1].name);
});

test('mapmaker reloads and publishes while offline; inaccessible storage still allows export', async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/maker.html');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true })); });
  await context.setOffline(true); await page.reload();
  await expect(page.getByRole('heading', { name: 'The Mapmaker’s Desk.' })).toBeVisible();
  await page.getByRole('button', { name: 'Shuffle & play my map' }).click();
  await expect(page.getByRole('heading', { name: exampleMap().title })).toBeVisible();
  await context.setOffline(false);
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('Blocked storage test'); } }));
  await page.goto('/maker.html'); await expect(page.locator('#draft-status')).toContainText('Saving is unavailable');
  await page.getByRole('button', { name: 'Shuffle & play my map' }).click();
  await expect(page.locator('#maker-notice')).toContainText('You can export it instead');
  await expect(page.getByRole('button', { name: 'Export postcard JSON' })).toBeEnabled();
});

test.describe('touch mapmaker', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('touch selection and editing remain accessible at phone widths', async ({ page }) => {
    await page.goto('/maker.html');
    await page.getByRole('button', { name: 'Edit postcard 5: Far archway' }).tap();
    await page.getByRole('button', { name: 'Turn this card' }).tap();
    await expect(page.locator('#validation')).not.toContainText('A legal journey');
    await page.getByRole('button', { name: 'Undo edit' }).tap();
    await expect(page.locator('#validation')).toContainText('A legal journey');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: 'evidence/mobile-mapmaker.png', fullPage: true, animations: 'disabled' });
    const result = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(result.violations).toEqual([]);
    await writeFile('evidence/mobile-mapmaker-accessibility.json', JSON.stringify({ violations: result.violations, incomplete: result.incomplete.map(rule => rule.id), passes: result.passes.length }, null, 2));
    await page.setViewportSize({ width: 320, height: 700 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
});
