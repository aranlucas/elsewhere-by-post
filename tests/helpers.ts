import { changeBoard, nextHint, traceJourney } from "../src/engine.ts";
import type { Action, Board, EchoColor, Journey, KeyValueStore, Puzzle } from "../src/types.ts";

/** The next nudge for a board the caller knows is still unsolved. */
export function hintFor(level: Puzzle, board: Board): Action {
  const hint = nextHint(level, board);

  if (!hint) throw new Error("Expected a nudge for an unsolved board");

  return hint;
}

export function memoryStorage(): KeyValueStore & { store: Map<string, string> } {
  const store = new Map<string, string>();

  return {
    store,
    getItem: (key: string) => store.get(key),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

export interface Solved {
  board: Board;
  moves: number;
}

/** Follows nudges until the board delivers, up to `limit` moves. */
export function solveWithHints(level: Puzzle, start: Board, limit = 40): Solved {
  let board = start;
  let moves = 0;

  while (!traceJourney(level, board).success && moves < limit) {
    board = changeBoard(level, board, hintFor(level, board));
    moves += 1;
  }

  return { board, moves };
}

/** The echo colours a journey crosses, in order. */
export const echoesCrossed = (journey: Journey): EchoColor[] =>
  journey.steps.flatMap((step) => (step.via?.type === "echo" ? [step.via.echo] : []));

/** Narrows a value the test expects to exist. */
export function required<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`Expected ${what}`);

  return value;
}
