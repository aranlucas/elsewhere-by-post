import { test as base, expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

import { changeBoard, copyBoard, traceJourney } from "@/engine.ts";
import { journeyPath } from "@/game/journey-url.ts";
import { LEVELS } from "@/levels.ts";
import { decodeSave, freshSave, persistSave, SAVE_KEY } from "@/storage.ts";
import type { LevelSave } from "@/types.ts";
import { hintFor, memoryStorage } from "@test/helpers.ts";

interface PageErrorFixtures {
  completedJourney: Page;
  pageErrors: string[];
}

/** Every browser test fails if the page throws or logs an error. */
export const test = base.extend<PageErrorFixtures>({
  /** An independent six-journey save, with the same moves and history as pointer solving. */
  completedJourney: async ({ page }, provide) => {
    const save = freshSave();

    for (const [index, level] of LEVELS.entries()) {
      const desk: LevelSave = { board: copyBoard(level.initial), moves: 0, history: [] };

      while (!traceJourney(level, desk.board).success && desk.moves < 40) {
        desk.history.push({ board: copyBoard(desk.board), moves: desk.moves });
        desk.board = changeBoard(level, desk.board, hintFor(level, desk.board));
        desk.moves += 1;
      }

      expect(traceJourney(level, desk.board).success).toBe(true);
      expect(desk.moves).toBeLessThan(40);
      save.levels[level.id] = desk;
      save.completed.push(level.id);
      save.levelIndex = index;
    }

    const storage = memoryStorage();

    expect(persistSave(storage, save)).toBe(true);
    const raw = storage.getItem(SAVE_KEY);

    expect(decodeSave(raw, LEVELS)).toEqual(save);

    if (!raw) {
      throw new Error("Expected a persisted six-journey save");
    }

    await page.goto(journeyPath(LEVELS, save.levelIndex));
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: SAVE_KEY,
      value: raw,
    });
    await provide(page);
  },
  pageErrors: [
    async ({ page }, provide) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") {
          errors.push(message.text());
        }
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

  if (!box) {
    throw new Error("Expected a visible element");
  }

  return box;
}
