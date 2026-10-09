import type { Page } from "@playwright/test";
import { changeBoard, copyBoard, definition, traceJourney } from "../../src/engine.ts";
import { LEVELS } from "../../src/levels.ts";
import type { Action, Board, Level } from "../../src/types.ts";
import { hintFor } from "../helpers.ts";
import { expect } from "./fixtures.ts";

export const DELIVERED = "Delivered. Beautifully improbable.";

type Gesture = "click" | "tap";

export const journeyLink = (page: Page, index: number) =>
  page.getByRole("link", { name: new RegExp(`^Journey ${index + 1}:`, "u") });

const tileButton = (page: Page, at: number) => page.locator(`.tile[data-at="${at}"] .tile-select`);

/** Performs a nudge's move through the same buttons a player would use. */
async function playAction(
  page: Page,
  level: Level,
  board: Board,
  action: Action,
  gesture: Gesture,
) {
  if (action.type === "rotate") {
    const name = `Turn ${definition(level, board[action.at].id).name} clockwise`;

    await page.getByRole("button", { name, exact: true })[gesture]();

    return;
  }

  await tileButton(page, action.at)[gesture]();
  await tileButton(page, action.to)[gesture]();
}

/** The board as the page shows it: tile ids and quarter turns, read from the DOM. */
const shownBoard = (page: Page) =>
  page.locator(".tile").evaluateAll((tiles) =>
    tiles.map((tile) => ({
      id: tile instanceof HTMLElement ? tile.dataset.id : undefined,
      rotation:
        Number(
          tile
            .querySelector<HTMLElement>(".rotating-art")
            ?.style.transform.match(/rotate\((\d+)/u)?.[1],
        ) / 90,
    })),
  );

/** Follows a journey link and waits until that journey's desk is showing. */
export async function openJourney(page: Page, index: number, gesture: Gesture = "click") {
  await journeyLink(page, index)[gesture]();
  await expect(page.getByRole("heading", { name: LEVELS[index].title })).toBeVisible();
}

/** Solves the open journey by following nudges, then sends the courier and checks delivery. */
export async function solveJourney(page: Page, level: Level, gesture: Gesture = "click") {
  let board = copyBoard(level.initial);
  let attempts = 0;

  while (!traceJourney(level, board).success && attempts < 40) {
    const action = hintFor(level, board);

    await playAction(page, level, board, action, gesture);
    board = changeBoard(level, board, action);
    attempts += 1;

    if (gesture === "click") await expect.poll(() => shownBoard(page)).toEqual(board);
  }

  expect(attempts).toBeLessThan(40);
  await page.getByRole("button", { name: "Send the courier" })[gesture]();
  await expect(page.getByRole("status")).toHaveText(DELIVERED, { timeout: 15000 });
  await expect(page.locator(".stamp-chip:not(.collected)")).toHaveCount(0);
  await expect(page.locator("#delivery")).toBeVisible();
}

/** Opens journey `index` and solves it. */
export async function openAndSolve(page: Page, index: number, gesture: Gesture = "click") {
  await openJourney(page, index, gesture);
  await solveJourney(page, LEVELS[index], gesture);
}

/** Presses “Place one card for me” until the map says the journey is ready. */
export async function nudgeUntilReady(page: Page) {
  for (let i = 0; i < 40; i++) {
    await page.getByRole("button", { name: "Place one card for me" }).click();

    if ((await page.getByRole("status").textContent()) === "Your journey is ready.") return;
  }

  throw new Error("The nudges never finished the journey");
}

/** Waits until the service worker controls the page, so a reload can work offline. */
export async function waitForOfflineCache(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;

    if (navigator.serviceWorker.controller) return;

    await new Promise<void>((resolve) => {
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => {
          resolve();
        },
        { once: true },
      );
    });
  });
}

export const snapshot = (page: Page, name: string) =>
  page.screenshot({ path: `evidence/${name}.png`, fullPage: true, animations: "disabled" });

export const overflowsHorizontally = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > innerWidth);

export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa"];
