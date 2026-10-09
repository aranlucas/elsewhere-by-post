export type EchoColor = "blue" | "coral";

export type ArtKey =
  | "home"
  | "lighthouse"
  | "windmill"
  | "observatory"
  | "garden"
  | "orchard"
  | "greenhouse"
  | "teahouse"
  | "arch"
  | "mail";

/** A road leaves a card through one of its edges, clockwise from north = 0. */
export type Direction = number;

export interface Card {
  id: string;
  name: string;
  art: ArtKey;
  ports: Direction[];
  locked: boolean;
  stamp: boolean;
  echo: EchoColor | null;
}

export interface Tile {
  id: string;
  rotation: number;
}

export type Board = Tile[];

/** The rules of one board: everything the route engine needs. */
export interface Puzzle {
  columns: number;
  start: string;
  goal: string;
  requiredEchoes: EchoColor[];
  cards: Card[];
  initial: Board;
  solution: Board;
}

export interface Level extends Puzzle {
  id: string;
  title: string;
  place: string;
  letter: string;
  lesson: string;
  hint: string;
}

export type Action =
  | { type: "rotate"; at: number; counterclockwise?: boolean }
  | { type: "swap"; at: number; to: number };

export type Edge =
  | { to: number; type: "road"; direction: Direction }
  | { to: number; type: "echo"; echo: EchoColor; bit: number };

export interface Step {
  at: number;
  via: Edge | null;
}

export interface Journey {
  success: boolean;
  steps: Step[];
  graph: Edge[][];
  collected: string[];
  missing: string[];
  usedEchoes: EchoColor[];
  missingEchoes: EchoColor[];
  reachedGoal: boolean;
  exploredStates: number;
}

export interface HistoryEntry {
  board: Board;
  moves: number;
}

export interface LevelSave {
  board: Board;
  moves: number;
  history: HistoryEntry[];
}

export interface SaveData {
  version: 1;
  levelIndex: number;
  completed: string[];
  levels: Record<string, LevelSave>;
  sound: boolean;
}

/** The subset of Web Storage the game uses; tests pass an in-memory version. */
export interface KeyValueStore {
  getItem(key: string): string | null | undefined;
  setItem(key: string, value: string): void;
}
