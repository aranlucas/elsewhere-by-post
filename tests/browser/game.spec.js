import { test, expect } from "@playwright/test";
import { LEVELS } from "../../src/levels.js";
import {
  changeBoard,
  copyBoard,
  nextHint,
  traceJourney,
} from "../../src/engine.js";
import { SAVE_KEY } from "../../src/storage.js";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page._gameErrors = errors;
});

test.afterEach(async ({ page }) => {
  expect(page._gameErrors).toEqual([]);
});

async function solveThroughButtons(page, level, starting = level.initial) {
  let board = copyBoard(starting),
    attempts = 0;

  while (!traceJourney(level, board).success && attempts++ < 40) {
    const action = nextHint(level, board);

    if (action.type === "rotate")
      await page
        .getByRole("button", {
          name: `Turn ${level.cards.find((card) => card.id === board[action.at].id).name} clockwise`,
          exact: true,
        })
        .click();
    else {
      await page.locator(`.tile[data-at="${action.at}"] .tile-select`).click();
      await page.locator(`.tile[data-at="${action.to}"] .tile-select`).click();
    }

    board = changeBoard(level, board, action);
    await expect
      .poll(() =>
        page.locator(".tile").evaluateAll((tiles) =>
          tiles.map((tile) => ({
            id: tile.dataset.id,
            rotation:
              Number(
                tile
                  .querySelector(".rotating-art")
                  .style.transform.match(/rotate\((\d+)/)[1],
              ) / 90,
          })),
        ),
      )
      .toEqual(board);
  }

  expect(attempts).toBeLessThan(40);
  await page.getByRole("button", { name: "Send the courier" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Delivered. Beautifully improbable.",
    { timeout: 15000 },
  );
  await expect(page.locator(".stamp-chip:not(.collected)")).toHaveCount(0);
  await expect(page.locator("#delivery")).toBeVisible();

  return board;
}

test("first visit teaches through feedback; keyboard turn, retry, undo, reset and reload work", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Elsewhere, by Post." }),
  ).toBeVisible();
  await page.screenshot({
    path: "evidence/desktop-first-map.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Send the courier" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "A road is waiting to meet.",
  );
  await expect(page.locator("#status-detail")).toContainText(
    "Little lighthouse",
  );
  await page.locator('.tile[data-at="1"] .tile-select').focus();
  await page.keyboard.press("r");
  await expect(page.locator("#moves")).toHaveText("1 move");
  await page.keyboard.press("r");
  await expect(page.locator("#moves")).toHaveText("2 moves");
  await page.keyboard.press("p");
  await expect(page.getByRole("status")).toHaveText(
    "Delivered. Beautifully improbable.",
  );
  await page.reload();
  await expect(page.locator("#moves")).toHaveText("2 moves");
  await expect(page.locator(".journey.complete")).toHaveCount(1);
  await page.keyboard.press("u");
  await expect(page.locator("#moves")).toHaveText("1 move");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.locator("#moves")).toHaveText("0 moves");
  await expect(page.getByRole("button", { name: "Undo U" })).toBeDisabled();
});

test("all six maps deliver through pointer controls, echoes render, and progress persists", async ({
  page,
}) => {
  await page.goto("/");

  for (let i = 0; i < LEVELS.length; i++) {
    await page
      .getByRole("button", { name: new RegExp(`^Journey ${i + 1}:`) })
      .click();
    await solveThroughButtons(page, LEVELS[i]);

    if (i === 3) {
      await expect(page.locator(".echo-trail.blue")).toHaveCount(1);
      await page.screenshot({
        path: "evidence/desktop-echo-map.png",
        fullPage: true,
        animations: "disabled",
      });
    }

    if (i === 5) {
      await expect(page.locator(".echo-trail")).toHaveCount(2);
      await page.screenshot({
        path: "evidence/desktop-finale.png",
        fullPage: true,
        animations: "disabled",
      });
    }
  }

  await expect(page.locator(".journey.complete")).toHaveCount(6);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: LEVELS[5].title }),
  ).toBeVisible();
  await expect(page.locator(".journey.complete")).toHaveCount(6);
  await page.getByRole("button", { name: "Send the courier" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Delivered. Beautifully improbable.",
  );
  await page.getByRole("button", { name: "Shuffle this map again" }).click();
  await expect(page.locator("#moves")).toHaveText("0 moves");
  await page.getByRole("button", { name: "A little nudge" }).click();

  for (let i = 0; i < 38; i++) {
    await page.getByRole("button", { name: "Place one card for me" }).click();

    if (
      (await page.getByRole("status").textContent()) ===
      "Your journey is ready."
    )
      break;
  }

  await page.getByRole("button", { name: "Send the courier" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Delivered. Beautifully improbable.",
  );
});

test("drag swaps postcards and pinned cards remain fixed", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^Journey 2:/ }).click();
  const a = await page.locator('.tile[data-at="1"] .art-window').boundingBox();
  const b = await page.locator('.tile[data-at="2"] .art-window').boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator('.tile[data-at="1"]')).toHaveAttribute(
    "data-id",
    "mill",
  );
  await expect(page.locator('.tile[data-at="2"]')).toHaveAttribute(
    "data-id",
    "stars",
  );
  await expect(page.locator("#moves")).toHaveText("1 move");
  await page.getByRole("button", { name: /^Departure\. Pinned\./ }).click();
  await expect(page.getByRole("status")).toHaveText("This place is pinned.");
  await expect(page.locator('.tile[data-at="0"]')).toHaveAttribute(
    "data-id",
    "home",
  );
});

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

  for (const i of [0, 2, 3, 5]) {
    await page
      .getByRole("button", { name: new RegExp(`^Journey ${i + 1}:`) })
      .click();
    await solveThroughButtons(page, LEVELS[i]);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );

    expect(overflow).toBe(false);

    if (i === 0)
      await page.screenshot({
        path: "evidence/mobile-first-delivery.png",
        fullPage: true,
        animations: "disabled",
      });

    if (i === 5)
      await page.screenshot({
        path: "evidence/mobile-finale.png",
        fullPage: true,
        animations: "disabled",
      });
  }

  await page.setViewportSize({ width: 320, height: 700 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});

test("courier can be stopped and level switching cancels delayed animation", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Turn Little lighthouse clockwise" })
    .click();
  await page
    .getByRole("button", { name: "Turn Little lighthouse clockwise" })
    .click();
  await page.getByRole("button", { name: "Send the courier" }).click();
  await page.getByRole("button", { name: "Stop the courier" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "The courier is back at the desk.",
  );
  await page.getByRole("button", { name: "Send the courier" }).click();
  await page.getByRole("button", { name: /^Journey 4:/ }).click();
  await expect(
    page.getByRole("heading", { name: LEVELS[3].title }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Ready when you are.");
  await expect(page.locator(".courier")).not.toHaveClass(/visible/);
});

test("cached offline reload preserves a playable map and saved progress", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;

    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, {
          once: true,
        }),
      );
  });
  await page
    .getByRole("button", { name: "Turn Little lighthouse clockwise" })
    .click();
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("#moves")).toHaveText("1 move");
  await page
    .getByRole("button", { name: "Turn Little lighthouse clockwise" })
    .click();
  await page.getByRole("button", { name: "Send the courier" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Delivered. Beautifully improbable.",
  );
  await page.reload();
  await expect(page.locator(".journey.complete")).toHaveCount(1);
  await context.setOffline(false);
});

test("corrupted or blocked browser storage still boots and plays", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate((key) => localStorage.setItem(key, "{broken"), SAVE_KEY);
  await page.reload();
  await expect(page.locator("#moves")).toHaveText("0 moves");
  await solveThroughButtons(page, LEVELS[0]);
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage unavailable in test");
      },
    }),
  );
  await page.reload();
  await expect(page.locator("#save-status")).toContainText(
    "Saving is unavailable",
  );
  await solveThroughButtons(page, LEVELS[0]);
});

test.describe("touch device", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  test("actual touch taps complete all six maps and large toolbar controls", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator('.tile[data-at="1"] .tile-select').tap();
    await expect(page.locator(".tile.selected")).toHaveCount(1);
    await page.getByRole("button", { name: /^Turn card/ }).tap();
    await page.getByRole("button", { name: /^Turn card/ }).tap();
    await page.getByRole("button", { name: "Send the courier" }).tap();
    await expect(page.getByRole("status")).toHaveText(
      "Delivered. Beautifully improbable.",
    );

    for (let index = 1; index < LEVELS.length; index++) {
      const level = LEVELS[index];
      await page
        .getByRole("button", { name: new RegExp(`^Journey ${index + 1}:`) })
        .tap();

      let board = copyBoard(level.initial),
        attempts = 0;

      while (!traceJourney(level, board).success && attempts++ < 40) {
        const action = nextHint(level, board);

        if (action.type === "rotate")
          await page
            .getByRole("button", {
              name: `Turn ${level.cards.find((card) => card.id === board[action.at].id).name} clockwise`,
              exact: true,
            })
            .tap();
        else {
          await page
            .locator(`.tile[data-at="${action.at}"] .tile-select`)
            .tap();
          await page
            .locator(`.tile[data-at="${action.to}"] .tile-select`)
            .tap();
        }

        board = changeBoard(level, board, action);
      }

      await page.getByRole("button", { name: "Send the courier" }).tap();
      await expect(page.getByRole("status")).toHaveText(
        "Delivered. Beautifully improbable.",
      );
    }

    await expect(page.locator(".journey.complete")).toHaveCount(6);
    await page.screenshot({
      path: "evidence/mobile-touch-finale.png",
      fullPage: true,
      animations: "disabled",
    });
  });
});

test("keyboard focus navigation, selection, reverse turn and help dismissal", async ({
  page,
}) => {
  await page.goto("/");
  const first = page.locator('.tile[data-at="0"] .tile-select');
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('.tile[data-at="1"] .tile-select')).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".tile.selected")).toHaveAttribute("data-at", "1");
  await page.keyboard.press("Shift+r");
  await expect(
    page.locator('.tile[data-at="1"] .rotating-art'),
  ).toHaveAttribute("style", "transform:rotate(270deg)");
  await page.keyboard.press("Escape");
  await expect(page.locator(".tile.selected")).toHaveCount(0);
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "How to play" })).toBeFocused();
});

test("WCAG A/AA checks on every map at desktop and mobile sizes, plus the help dialog", async ({
  page,
}) => {
  await page.goto("/");
  const results = [];

  for (const viewport of [
    { width: 1280, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);

    for (let index = 0; index < LEVELS.length; index++) {
      await page
        .getByRole("button", { name: new RegExp(`^Journey ${index + 1}:`) })
        .click();

      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();

      results.push({
        viewport,
        level: LEVELS[index].id,
        violations: result.violations,
        incomplete: result.incomplete.map((rule) => rule.id),
        passes: result.passes.length,
      });
      expect(result.violations).toEqual([]);
    }
  }

  await page.getByRole("button", { name: "How to play" }).click();

  const help = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();

  results.push({
    view: "help",
    violations: help.violations,
    incomplete: help.incomplete.map((rule) => rule.id),
    passes: help.passes.length,
  });
  expect(help.violations).toEqual([]);
  await writeFile(
    "evidence/accessibility-results.json",
    JSON.stringify(results, null, 2),
  );
});
