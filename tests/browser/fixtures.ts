import { test as base, expect } from "@playwright/test";
import type { Locator } from "@playwright/test";

/** Every browser test fails if the page throws or logs an error. */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, provide) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await provide(errors);
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();

  if (!box) throw new Error("Expected a visible element");

  return box;
}
