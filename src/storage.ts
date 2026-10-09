import { z } from "zod";
import { validBoard } from "./engine.ts";
import type { HistoryEntry, KeyValueStore, Level, LevelSave, SaveData } from "./types.ts";

export const SAVE_KEY = "elsewhere-by-post-v1";

export const boardSchema = z.array(z.object({ id: z.string(), rotation: z.int().min(0).max(3) }));

// Each part of a save is checked on its own, so one corrupt field resets only
// itself: a bad history entry is dropped, a bad level loses only that level.
const historyEntrySchema = z.object({ board: boardSchema, moves: z.int().min(0) });

const levelSaveSchema = z.object({
  board: boardSchema,
  moves: z.int().min(0).max(99999).catch(0),
  history: z.array(historyEntrySchema.nullable().catch(null)).catch([]),
});

const saveSchema = z.object({
  version: z.literal(1),
  levelIndex: z.int().catch(0),
  completed: z.array(z.string().catch("")).catch([]),
  sound: z.boolean().catch(false),
  levels: z.record(z.string(), levelSaveSchema.nullable().catch(null)).catch({}),
});

type SavedLevel = z.output<typeof levelSaveSchema>;

export function freshSave(): SaveData {
  return { version: 1, levelIndex: 0, completed: [], levels: {}, sound: false };
}

function decodeLevel(level: Level, saved: SavedLevel | null | undefined): LevelSave | null {
  if (!saved || !validBoard(level, saved.board)) return null;

  const history: HistoryEntry[] = saved.history
    .slice(-100)
    .flatMap((entry) => (entry && validBoard(level, entry.board) ? [entry] : []));

  return { board: saved.board, moves: saved.moves, history };
}

export function decodeSave(raw: string | null | undefined, levels: Level[]): SaveData {
  const fresh = freshSave();
  let parsed;

  try {
    // A missing save parses as null and falls through to a fresh desk.
    parsed = saveSchema.safeParse(JSON.parse(raw ?? "null"));
  } catch {
    /* Empty, unavailable, old, or corrupt storage is a fresh desk. */
    return fresh;
  }

  if (!parsed.success) return fresh;
  const data = parsed.data;

  fresh.levelIndex = data.levelIndex >= 0 && data.levelIndex < levels.length ? data.levelIndex : 0;
  fresh.completed = [
    ...new Set(data.completed.filter((id) => levels.some((level) => level.id === id))),
  ];
  fresh.sound = data.sound;

  for (const level of levels) {
    const saved = decodeLevel(level, data.levels[level.id]);

    if (saved) fresh.levels[level.id] = saved;
  }

  return fresh;
}

export function loadSave(storage: KeyValueStore | null, levels: Level[]): SaveData {
  try {
    return storage ? decodeSave(storage.getItem(SAVE_KEY), levels) : freshSave();
  } catch {
    return freshSave();
  }
}

export function persistSave(storage: KeyValueStore | null, save: SaveData): boolean {
  try {
    if (!storage) return false;
    storage.setItem(SAVE_KEY, JSON.stringify(save));

    return true;
  } catch {
    return false;
  }
}
