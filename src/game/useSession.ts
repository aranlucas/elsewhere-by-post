import { useCallback, useRef, useState } from "react";
import { useWindowEvent } from "../hooks.ts";
import { persistSave } from "../storage.ts";
import type { KeyValueStore, LevelSave, SaveData } from "../types.ts";

const SAVED = "Your desk is saved on this device.";

const UNSAVED = "Saving is unavailable. This desk lasts for this visit.";

const OFFLINE = "Offline, and happily here. Your desk is saved locally.";

const HISTORY_LIMIT = 100;

/**
 * Progress that outlives a single journey: every desk, delivered journeys, the
 * sound preference and the last journey visited. Each change is written to
 * storage as it happens.
 */
export function useSession(
  storage: KeyValueStore | null,
  initial: SaveData,
  initiallySaved: boolean,
) {
  const save = useRef(initial);
  const [completed, setCompleted] = useState(initial.completed);
  const [sound, setSound] = useState(initial.sound);
  const [saved, setSaved] = useState(initiallySaved);
  const [offline, setOffline] = useState(false);

  function write(next: SaveData) {
    save.current = next;
    setSaved(persistSave(storage, next));
  }

  // Stable, so a journey can record its visit from an effect that runs once per journey.
  const visit = useCallback(
    (levelIndex: number) => {
      save.current = { ...save.current, levelIndex };
      persistSave(storage, save.current);
    },
    [storage],
  );

  useWindowEvent("offline", () => {
    setOffline(true);
  });

  useWindowEvent("online", () => {
    setOffline(false);
    write(save.current);
  });

  return {
    completed,
    sound,
    message: offline ? OFFLINE : saved ? SAVED : UNSAVED,
    /** The saved desk for a journey, if it has one. */
    deskFor: (levelId: string): LevelSave | undefined => save.current.levels[levelId],
    /** Remembers the open journey, so `/` returns to it. */
    visit,
    lastVisited: (): number => save.current.levelIndex,
    recordDesk: (levelId: string, desk: LevelSave) => {
      write({
        ...save.current,
        levels: {
          ...save.current.levels,
          [levelId]: { ...desk, history: desk.history.slice(-HISTORY_LIMIT) },
        },
      });
    },
    /** Marks a journey delivered and returns every delivered journey. */
    markDelivered: (levelId: string): string[] => {
      if (completed.includes(levelId)) return completed;
      const next = [...completed, levelId];

      setCompleted(next);
      write({ ...save.current, completed: next });

      return next;
    },
    setSound: (enabled: boolean) => {
      setSound(enabled);
      write({ ...save.current, sound: enabled });
    },
  };
}

export type GameSession = ReturnType<typeof useSession>;
