import { LEVELS } from "../../src/levels.ts";
import { boxOf, expect, test } from "./fixtures.ts";
import {
  DELIVERED,
  journeyLink,
  nudgeUntilReady,
  openAndSolve,
  openJourney,
  snapshot,
} from "./play.ts";

test("first visit teaches through feedback; keyboard turn, retry, undo, reset and reload work", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Elsewhere, by Post." })).toBeVisible();
  await snapshot(page, "desktop-first-map");
  await page.getByRole("button", { name: "Send the courier" }).click();
  await expect(page.getByRole("status")).toHaveText("A road is waiting to meet.");
  await expect(page.locator("#status-detail")).toContainText("Little lighthouse");
  await page.locator('.tile[data-at="1"] .tile-select').focus();
  await page.keyboard.press("r");
  await expect(page.locator("#moves")).toHaveText("1 move");
  await page.keyboard.press("r");
  await expect(page.locator("#moves")).toHaveText("2 moves");
  await page.keyboard.press("p");
  await expect(page.getByRole("status")).toHaveText(DELIVERED);
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

  for (const index of [0, 1, 2, 3]) await openAndSolve(page, index);
  await expect(page.locator(".echo-trail.blue")).toHaveCount(1);
  await snapshot(page, "desktop-echo-map");

  for (const index of [4, 5]) await openAndSolve(page, index);
  await expect(page.locator(".echo-trail")).toHaveCount(2);
  await snapshot(page, "desktop-finale");

  await expect(page.locator(".journey.complete")).toHaveCount(6);
  await page.reload();
  await expect(page.getByRole("heading", { name: LEVELS[5].title })).toBeVisible();
  await expect(page.locator(".journey.complete")).toHaveCount(6);
  await page.getByRole("button", { name: "Send the courier" }).click();
  await expect(page.getByRole("status")).toHaveText(DELIVERED);
  await page.getByRole("button", { name: "Shuffle this map again" }).click();
  await expect(page.locator("#moves")).toHaveText("0 moves");
  await page.getByRole("button", { name: "A little nudge" }).click();
  await nudgeUntilReady(page);
  await page.getByRole("button", { name: "Send the courier" }).click();
  await expect(page.getByRole("status")).toHaveText(DELIVERED);
});

test("drag swaps postcards and pinned cards remain fixed", async ({ page }) => {
  await page.goto("/");
  await openJourney(page, 1);
  const a = await boxOf(page.locator('.tile[data-at="1"] .art-window'));
  const b = await boxOf(page.locator('.tile[data-at="2"] .art-window'));
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator('.tile[data-at="1"]')).toHaveAttribute("data-id", "mill");
  await expect(page.locator('.tile[data-at="2"]')).toHaveAttribute("data-id", "stars");
  await expect(page.locator("#moves")).toHaveText("1 move");
  await page.getByRole("button", { name: /^Departure\. Pinned\./u }).click();
  await expect(page.getByRole("status")).toHaveText("This place is pinned.");
  await expect(page.locator('.tile[data-at="0"]')).toHaveAttribute("data-id", "home");
});

test("courier can be stopped and level switching cancels delayed animation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Turn Little lighthouse clockwise" }).click();
  await page.getByRole("button", { name: "Turn Little lighthouse clockwise" }).click();
  await page.getByRole("button", { name: "Send the courier" }).click();
  await page.getByRole("button", { name: "Stop the courier" }).click();
  await expect(page.getByRole("status")).toHaveText("The courier is back at the desk.");
  await page.getByRole("button", { name: "Send the courier" }).click();
  await journeyLink(page, 3).click();
  await expect(page.getByRole("heading", { name: LEVELS[3].title })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Ready when you are.");
  await expect(page.locator(".courier")).not.toHaveClass(/visible/u);
});

test("keyboard focus navigation, selection, reverse turn and help dismissal", async ({ page }) => {
  await page.goto("/");
  await page.locator('.tile[data-at="0"] .tile-select').focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('.tile[data-at="1"] .tile-select')).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".tile.selected")).toHaveAttribute("data-at", "1");
  await page.keyboard.press("Shift+r");
  await expect(page.locator('.tile[data-at="1"] .rotating-art')).toHaveAttribute(
    "style",
    /transform: ?rotate\(270deg\)/u,
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(".tile.selected")).toHaveCount(0);
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "How to play" })).toBeFocused();
});

test("each journey has a URL, so links, reloads and back/forward work", async ({ page }) => {
  await page.goto("/journeys/4");
  await expect(page.getByRole("heading", { name: LEVELS[3].title })).toBeVisible();
  await expect(journeyLink(page, 3)).toHaveAttribute("aria-current", "page");
  await journeyLink(page, 1).click();
  await expect(page).toHaveURL(/\/journeys\/2$/u);
  await expect(page.getByRole("heading", { name: LEVELS[1].title })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/journeys\/4$/u);
  await expect(page.getByRole("heading", { name: LEVELS[3].title })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole("heading", { name: LEVELS[1].title })).toBeVisible();
  await page.goto("/journeys/99");
  await expect(page).toHaveURL(/\/journeys\/2$/u);
  await page.goto("/");
  await expect(page).toHaveURL(/\/journeys\/2$/u);
  await page.goto("/maker.html");
  await expect(page).toHaveURL(/\/maker$/u);
});
