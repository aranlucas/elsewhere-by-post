import { test, expect } from "@e2e/fixtures.ts";
import { exampleMap } from "@/custom-map.ts";
import { LEVELS } from "@/levels.ts";
import { decodeSave, SAVE_KEY } from "@/storage.ts";

test("failed navigation save stays unavailable offline and recovers online", async ({ page }) => {
  await page.goto("/journeys/1");
  await expect(page.locator("#save-status")).toContainText("saved on this device");
  await page.evaluate(() => {
    // Preserve the method receiver when restoring the simulated storage failure.
    // eslint-disable-next-line typescript/unbound-method
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("Quota test");
    };

    window.addEventListener("restore-storage", () => {
      Storage.prototype.setItem = original;
    });
  });
  await page.getByRole("link", { name: /^Journey 2:/u }).click();
  await expect(page.locator("#save-status")).toContainText("Saving is unavailable");
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(page.locator("#save-status")).toContainText("Saving is unavailable");
  await page.evaluate(() => {
    window.dispatchEvent(new Event("restore-storage"));
    window.dispatchEvent(new Event("online"));
  });
  await expect(page.locator("#save-status")).toContainText("saved on this device");
  const raw = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);

  expect(decodeSave(raw, LEVELS).levelIndex).toBe(1);
  await page.goto("/");
  await expect(page).toHaveURL(/\/journeys\/2$/u);
});

test("blocked storage never claims a saved desk after going offline", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Blocked test");
      },
    });
  });
  await page.goto("/journeys/1");
  await expect(page.locator("#save-status")).toContainText("Saving is unavailable");
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(page.locator("#save-status")).toContainText("Saving is unavailable");
});

for (const newer of ["edit", "import"] as const) {
  test(`delayed import cannot replace a newer ${newer}`, async ({ page }) => {
    await page.goto("/maker");
    await page.evaluate(() => {
      // Called with the File receiver below.
      // eslint-disable-next-line typescript/unbound-method
      const original = File.prototype.text;
      File.prototype.text = async function () {
        const text = await original.call(this);

        if (this.name === "slow.json") {
          document.documentElement.dataset.importWaiting = "true";
          await new Promise<void>((resolve) => {
            window.addEventListener("finish-import", () => resolve(), { once: true });
          });
        }

        return text;
      };
    });
    const map = exampleMap();
    map.title = "Stale imported world";
    const upload = page.getByLabel("Import postcard JSON", { exact: false });
    await upload.setInputFiles({
      name: "slow.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(map)),
    });
    await expect(page.locator("html")).toHaveAttribute("data-import-waiting", "true");
    const title = page.getByLabel("Your map’s title");

    if (newer === "edit") {
      await title.fill("My latest world");
      await title.blur();
    } else {
      map.title = "My latest world";
      await upload.setInputFiles({
        name: "new.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(map)),
      });
    }

    await expect(title).toHaveValue("My latest world");
    await page.evaluate(async () => {
      window.dispatchEvent(new Event("finish-import"));
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    });
    // Reload proves the stale completion did not overwrite the durable draft either.
    await expect(title).toHaveValue("My latest world");
    await page.getByRole("button", { name: "Undo edit" }).click();
    await expect(title).toHaveValue(exampleMap().title);
    await page.reload();
    await expect(title).toHaveValue(exampleMap().title);
  });
}
