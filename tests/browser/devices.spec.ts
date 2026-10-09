import { AxeBuilder } from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";
import { LEVELS } from "../../src/levels.ts";
import { SAVE_KEY } from "../../src/storage.ts";
import { expect, test } from "./fixtures.ts";
import {
  AXE_TAGS,
  DELIVERED,
  openAndSolve,
  openJourney,
  overflowsHorizontally,
  snapshot,
  solveJourney,
  waitForOfflineCache,
} from "./play.ts";

test("touch-sized portrait layout plays all stages, opens accessible help, and respects reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Let’s get pleasantly lost" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();

  await openAndSolve(page, 0);
  expect(await overflowsHorizontally(page)).toBe(false);
  await snapshot(page, "mobile-first-delivery");

  for (const index of [2, 3, 5]) {
    await openAndSolve(page, index);
    expect(await overflowsHorizontally(page)).toBe(false);
  }

  await snapshot(page, "mobile-finale");
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await overflowsHorizontally(page)).toBe(false);
});

test("cached offline reload preserves a playable map and saved progress", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await waitForOfflineCache(page);
  await page.getByRole("button", { name: "Turn Little lighthouse clockwise" }).click();
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("#moves")).toHaveText("1 move");
  await page.getByRole("button", { name: "Turn Little lighthouse clockwise" }).click();
  await page.getByRole("button", { name: "Send the courier" }).click();
  await expect(page.getByRole("status")).toHaveText(DELIVERED);
  await page.reload();
  await expect(page.locator(".journey.complete")).toHaveCount(1);
  await context.setOffline(false);
});

test("corrupted or blocked browser storage still boots and plays", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((key) => {
    localStorage.setItem(key, "{broken");
  }, SAVE_KEY);
  await page.reload();
  await expect(page.locator("#moves")).toHaveText("0 moves");
  await solveJourney(page, LEVELS[0]);
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage unavailable in test");
      },
    }),
  );
  await page.reload();
  await expect(page.locator("#save-status")).toContainText("Saving is unavailable");
  await solveJourney(page, LEVELS[0]);
});

test.describe("touch device", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  test("actual touch taps complete all six maps and large toolbar controls", async ({ page }) => {
    await page.goto("/");
    await page.locator('.tile[data-at="1"] .tile-select').tap();
    await expect(page.locator(".tile.selected")).toHaveCount(1);
    await page.getByRole("button", { name: /^Turn card/u }).tap();
    await page.getByRole("button", { name: /^Turn card/u }).tap();
    await page.getByRole("button", { name: "Send the courier" }).tap();
    await expect(page.getByRole("status")).toHaveText(DELIVERED);

    for (const index of [1, 2, 3, 4, 5]) await openAndSolve(page, index, "tap");
    await expect(page.locator(".journey.complete")).toHaveCount(6);
    await snapshot(page, "mobile-touch-finale");
  });
});

test("WCAG A/AA checks on every map at desktop and mobile sizes, plus the help dialog", async ({
  page,
}) => {
  await page.goto("/");
  const results: object[] = [];

  for (const viewport of [
    { width: 1280, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);

    for (const [index, level] of LEVELS.entries()) {
      await openJourney(page, index);
      const result = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();

      results.push({
        viewport,
        level: level.id,
        violations: result.violations,
        incomplete: result.incomplete.map((rule) => rule.id),
        passes: result.passes.length,
      });
      expect(result.violations).toEqual([]);
    }
  }

  await page.getByRole("button", { name: "How to play" }).click();
  const help = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();

  results.push({
    view: "help",
    violations: help.violations,
    incomplete: help.incomplete.map((rule) => rule.id),
    passes: help.passes.length,
  });
  expect(help.violations).toEqual([]);
  await writeFile("evidence/accessibility-results.json", JSON.stringify(results, null, 2));
});
