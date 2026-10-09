import { useState } from "react";
import { copyMap, normalizeMap, saveDraft } from "../custom-map.ts";
import type { MapCard, PostcardMap } from "../custom-map.ts";
import type { Journey, KeyValueStore } from "../types.ts";

const HISTORY_LIMIT = 100;

/**
 * The map being authored, its undo history and the desk's messages. Every
 * accepted edit is saved as a local draft straight away.
 */
export function useMapDraft(
  storage: KeyValueStore | null,
  initial: PostcardMap,
  initiallySaved: boolean,
) {
  const [map, setMap] = useState(initial);
  const [history, setHistory] = useState<PostcardMap[]>([]);
  const [preview, setPreview] = useState<Journey | null>(null);
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState(initiallySaved);

  function commit(next: PostcardMap, message: string) {
    setMap(next);
    setPreview(null);
    setNotice(message);
    setSaved(saveDraft(storage, next));
  }

  /** Applies a change if the result is still a well-formed map; otherwise explains why not. */
  function edit(mutate: (candidate: PostcardMap) => void): boolean {
    const candidate = copyMap(map);
    mutate(candidate);
    let next: PostcardMap;

    try {
      next = normalizeMap(candidate);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));

      return false;
    }

    if (JSON.stringify(candidate) === JSON.stringify(map)) return true;
    setHistory([...history, copyMap(map)].slice(-HISTORY_LIMIT));
    commit(next, "");

    return true;
  }

  function editCard(index: number, change: (card: MapCard) => void) {
    edit((candidate) => {
      change(candidate.cards[index]);
    });
  }

  function replace(next: PostcardMap, message: string) {
    const accepted = edit((candidate) => {
      candidate.title = next.title;
      candidate.cards = next.cards;
    });

    if (accepted) setNotice(message);
  }

  function undo() {
    const previous = history.at(-1);

    if (!previous) return;
    setHistory(history.slice(0, -1));
    commit(previous, "One edit back.");
  }

  return {
    map,
    canUndo: history.length > 0,
    preview,
    notice,
    saved,
    edit,
    editCard,
    replace,
    undo,
    setPreview,
    setNotice,
  };
}
