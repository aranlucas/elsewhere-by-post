import { expect, test } from "vitest";
import { LEVELS } from "../src/levels.ts";
import { decodeSave, loadSave, persistSave, freshSave, SAVE_KEY } from "../src/storage.ts";
import { memoryStorage } from "./helpers.ts";

test("valid saved board, history, level, sound and delivery medals round-trip", () => {
  const saved = freshSave();
  saved.levelIndex = 3;
  saved.sound = true;
  saved.completed = [LEVELS[0].id];
  saved.levels[LEVELS[0].id] = {
    board: LEVELS[0].solution,
    moves: 2,
    history: [{ board: LEVELS[0].initial, moves: 0 }],
  };

  const storage = memoryStorage();
  const memory = storage.store;

  expect(persistSave(storage, saved)).toBe(true);
  expect(memory.has(SAVE_KEY)).toBeTruthy();
  expect(loadSave(storage, LEVELS)).toEqual(saved);
});

test("corrupt, old, unavailable and quota-limited storage is safe", () => {
  for (const raw of [null, "", "{bad", "{}", '{"version":2}', "null", "true"])
    expect(decodeSave(raw, LEVELS)).toEqual(freshSave());

  const blocked = {
    getItem: () => {
      throw new Error("Blocked");
    },
    setItem: () => {
      throw new Error("Quota");
    },
  };

  expect(loadSave(blocked, LEVELS)).toEqual(freshSave());
  expect(persistSave(blocked, freshSave())).toBe(false);
  expect(loadSave(null, LEVELS)).toEqual(freshSave());
});

test("bad slots, levels, completions and history cannot poison a saved desk", () => {
  const data = {
    version: 1,
    levelIndex: -5,
    sound: "true",
    completed: [LEVELS[0].id, LEVELS[0].id, "alien"],
    levels: {
      [LEVELS[0].id]: {
        board: LEVELS[0].solution,
        moves: -1,
        history: [{ board: LEVELS[0].initial, moves: 0 }, null, { board: [], moves: 1 }],
      },
      [LEVELS[1].id]: { board: [], moves: 100 },
    },
  };

  const saved = decodeSave(JSON.stringify(data), LEVELS);
  expect(saved.levelIndex).toBe(0);
  expect(saved.sound).toBe(false);
  expect(saved.completed).toEqual([LEVELS[0].id]);
  expect(saved.levels[LEVELS[0].id].moves).toBe(0);
  expect(saved.levels[LEVELS[0].id].history.length).toBe(1);
  expect(saved.levels[LEVELS[1].id]).toBe(undefined);
});
