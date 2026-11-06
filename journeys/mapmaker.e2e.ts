import { test } from "@e2e-dev/web";
import { expect } from "e2e";

test("author, validate, undo, publish, deliver and resume a custom map", async ({
  app,
  browser,
  screen,
}) => {
  await app.open("/maker");
  await screen.getByLabel("Your map’s title").fill("CI little world");
  await screen.getByLabel("Your map’s title").press("Enter");
  await screen.getByLabel("Echo door", { exact: true }).selectOption("No echo");
  await expect(screen.getByRole("button", "Shuffle & play my map")).toBeDisabled();
  await expect(browser.locator("#validation")).toContainText("exactly two doors");
  await screen.getByRole("button", "Undo edit").click();
  await expect(browser.locator("#validation")).toContainText("A legal journey");
  await browser.reload();
  await expect(screen.getByLabel("Your map’s title")).toHaveValue("CI little world");
  await screen.getByRole("button", "Shuffle & play my map").click();
  await expect(browser).toHaveURL("/journeys/yours");
  await expect(screen.getByRole("heading", "CI little world")).toBeVisible();
  await screen.getByRole("button", "A little nudge").click();

  for (let move = 0; move < 40; move++) {
    await screen.getByRole("button", "Place one card for me").click();

    if ((await screen.getByRole("status").textContent()) === "Your journey is ready.") {
      break;
    }
  }

  await expect(screen.getByRole("status")).toHaveText("Your journey is ready.");
  await screen.getByRole("button", "Send the courier").click();
  await expect(screen.getByRole("status")).toHaveText("Delivered. Beautifully improbable.", {
    timeout: 15000,
  });
  await expect(browser.locator(".stamp-chip:not(.collected)")).toHaveCount(0);
  await expect(screen.getByRole("link", /^Journey 7:.*delivered/u)).toBeVisible();
  await browser.reload();
  await expect(screen.getByRole("heading", "CI little world")).toBeVisible();
  await expect(screen.getByRole("link", /^Journey 7:.*delivered/u)).toBeVisible();
});
