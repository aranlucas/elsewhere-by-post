import { useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { prefersReducedMotion } from "../browser.ts";
import { changeBoard, copyBoard, equalBoards, remixBoard } from "../engine.ts";
import type { Action, Board, HistoryEntry, Level, LevelSave } from "../types.ts";
import { captureFlip, playFlip } from "./flip.ts";
import type { Flip } from "./flip.ts";

const HISTORY_LIMIT = 100;

export interface Desk {
  board: Board;
  moves: number;
  history: HistoryEntry[];
}

export function savedDesk(saved: LevelSave | undefined, level: Level): Desk {
  return {
    board: copyBoard(saved?.board ?? level.initial),
    moves: saved?.moves ?? 0,
    history: saved?.history ?? [],
  };
}

/** A shuffle seed. Read only from event handlers, never while rendering. */
const shuffleSeed = () => Date.now();

/**
 * The postcards on the desk: arrangement, move count, undo history and the
 * selected card. Every change glides tiles from where they were.
 */
export function useDesk(
  level: Level,
  initial: () => Desk,
  boardRef: RefObject<HTMLElement | null>,
  onChange: (desk: Desk) => void,
) {
  const [desk, setDesk] = useState(initial);
  const [selected, setSelected] = useState<number | null>(null);
  const flip = useRef<Flip | null>(null);

  useLayoutEffect(() => {
    const pending = flip.current;
    flip.current = null;

    if (pending && boardRef.current && !prefersReducedMotion())
      playFlip(boardRef.current, pending, desk.board);
  }, [boardRef, desk.board]);

  function change(next: Desk, turnDelta: number | null) {
    flip.current = captureFlip(boardRef.current, desk.board, turnDelta);
    setDesk(next);
    onChange(next);
  }

  /** Applies a turn or swap. Returns the new board, or null when nothing changed. */
  function perform(action: Action): Board | null {
    const next = changeBoard(level, desk.board, action);

    if (equalBoards(next, desk.board)) return null;
    change(
      {
        board: next,
        moves: desk.moves + 1,
        history: [...desk.history, { board: copyBoard(desk.board), moves: desk.moves }].slice(
          -HISTORY_LIMIT,
        ),
      },
      action.type === "rotate" && action.counterclockwise === true ? -1 : 1,
    );
    // Direct turn buttons and keyboard turns do not implicitly arm a swap.
    // A deliberately selected card stays selected for repeated toolbar turns.
    setSelected(action.type === "swap" || selected !== action.at ? null : selected);

    return next;
  }

  function undo(): boolean {
    const previous = desk.history.at(-1);

    if (!previous) return false;
    change({ ...previous, history: desk.history.slice(0, -1) }, null);
    setSelected(null);

    return true;
  }

  function reset() {
    change({ board: copyBoard(level.initial), moves: 0, history: [] }, null);
    setSelected(null);
  }

  function remix() {
    change({ board: remixBoard(level, shuffleSeed()), moves: 0, history: [] }, null);
    setSelected(null);
  }

  return { ...desk, selected, setSelected, perform, undo, reset, remix };
}
