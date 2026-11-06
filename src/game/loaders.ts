import { redirect } from "react-router";
import { browserStorage } from "../browser.ts";
import { readPublishedLevel } from "../custom-map.ts";
import { LEVELS } from "../levels.ts";
import { loadSave, persistSave } from "../storage.ts";
import { journeyPath } from "./journey-url.ts";

export function loadGame() {
  const storage = browserStorage();
  const custom = readPublishedLevel(storage);
  const levels = custom ? [...LEVELS, custom] : LEVELS;
  const save = loadSave(storage, levels);

  return { levels, save, saved: persistSave(storage, save) };
}

export function lastJourneyRedirect() {
  const { levels, save } = loadGame();

  return redirect(journeyPath(levels, save.levelIndex));
}
