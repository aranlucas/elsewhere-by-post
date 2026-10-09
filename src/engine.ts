import type { Action, Board, Card, EchoColor, Edge, Journey, Puzzle, Step, Tile } from "./types.ts";

export const copyBoard = (board: Board): Board => board.map((tile) => ({ ...tile }));

export const definition = (level: Puzzle, id: string): Card => {
  const card = level.cards.find((candidate) => candidate.id === id);

  if (!card) throw new Error(`Unknown card ${id}`);

  return card;
};

export const portsFor = (level: Puzzle, tile: Tile): number[] =>
  definition(level, tile.id).ports.map((port) => (port + tile.rotation) % 4);

export const equalBoards = (a: Board, b: Board): boolean =>
  a.length === b.length &&
  a.every((tile, i) => tile.id === b[i].id && tile.rotation === b[i].rotation);

/** Whether a well-formed board is a legal arrangement of this level's cards. */
export function validBoard(level: Puzzle, board: Board): boolean {
  if (board.length !== level.cards.length) return false;
  const ids = new Set<string>();

  return board.every((tile, index) => {
    const card = level.cards.find((candidate) => candidate.id === tile.id);

    if (!card || ids.has(tile.id) || tile.rotation < 0 || tile.rotation > 3) return false;
    ids.add(tile.id);

    return (
      !card.locked ||
      (level.initial[index].id === tile.id && tile.rotation === level.initial[index].rotation)
    );
  });
}

export function changeBoard(level: Puzzle, board: Board, action: Action): Board {
  if (!validBoard(level, board)) throw new Error("Invalid board");
  const next = copyBoard(board);
  const at = action.at;

  if (!Number.isInteger(at) || at < 0 || at >= next.length || definition(level, next[at].id).locked)
    return next;

  if (action.type === "rotate")
    next[at].rotation = (next[at].rotation + (action.counterclockwise === true ? 3 : 1)) % 4;

  if (
    action.type === "swap" &&
    Number.isInteger(action.to) &&
    action.to >= 0 &&
    action.to < next.length &&
    !definition(level, next[action.to].id).locked
  )
    [next[at], next[action.to]] = [next[action.to], next[at]];

  return next;
}

/** Which cards connect: roads between neighbours, and echo doors that currently agree. */
export interface Network {
  graph: Edge[][];
  echoPairs: EchoColor[];
}

export function network(level: Puzzle, board: Board): Network {
  const graph: Edge[][] = board.map(() => []);

  const echoPairs = [...new Set(level.cards.flatMap((card) => (card.echo ? [card.echo] : [])))];

  board.forEach((tile, i) => {
    const row = Math.floor(i / level.columns);
    const col = i % level.columns;

    for (const dir of portsFor(level, tile)) {
      const nr = row + [-1, 0, 1, 0][dir];
      const nc = col + [0, 1, 0, -1][dir];

      if (nc < 0 || nc >= level.columns || nr < 0 || nr >= board.length / level.columns) continue;
      const j = nr * level.columns + nc;

      if (portsFor(level, board[j]).includes((dir + 2) % 4))
        graph[i].push({ to: j, type: "road", direction: dir });
    }

    const echo = definition(level, tile.id).echo;

    if (echo)
      board.forEach((other, j) => {
        if (
          j !== i &&
          definition(level, other.id).echo === echo &&
          other.rotation === tile.rotation
        )
          graph[i].push({
            to: j,
            type: "echo",
            echo,
            bit: 1 << echoPairs.indexOf(echo),
          });
      });
  });

  return { graph, echoPairs };
}

interface SearchState {
  at: number;
  stamps: number;
  echoes: number;
  parent: number;
  via: Edge | null;
}

// Breadth-first search includes collected stamps and consumed echo pairs in its
// state. Graph reachability alone cannot prove that one legal journey exists.
export function traceJourney(level: Puzzle, board: Board): Journey {
  if (!validBoard(level, board)) throw new Error("Invalid board");
  const { graph, echoPairs } = network(level, board);

  const stampIds = level.cards.flatMap((card) => (card.stamp ? [card.id] : []));

  const stampBit = (i: number) => {
    const n = stampIds.indexOf(board[i].id);

    return n < 0 ? 0 : 1 << n;
  };

  const allStamps = (1 << stampIds.length) - 1;

  const requiredEchoMask = level.requiredEchoes.reduce(
    (mask, echo) => mask | (1 << echoPairs.indexOf(echo)),
    0,
  );

  const start = board.findIndex((tile) => tile.id === level.start);
  const goal = board.findIndex((tile) => tile.id === level.goal);

  const queue: SearchState[] = [
    { at: start, stamps: stampBit(start), echoes: 0, parent: -1, via: null },
  ];

  const seen = new Set([`${start}:${queue[0].stamps}:0`]);

  let best = 0;
  let success = -1;

  const score = (state: SearchState) =>
    popcount(state.stamps) * 4 + popcount(state.echoes) * 2 + (state.at === goal ? 1 : 0);

  for (let head = 0; head < queue.length; head++) {
    const state = queue[head];

    if (score(state) > score(queue[best])) best = head;

    if (
      state.at === goal &&
      state.stamps === allStamps &&
      (state.echoes & requiredEchoMask) === requiredEchoMask
    ) {
      success = head;
      break;
    }

    // Delivery is a terminus. A courier cannot pass through it to collect stamps.
    if (state.at === goal) continue;

    for (const edge of graph[state.at]) {
      if (edge.type === "echo" && state.echoes & edge.bit) continue;

      const stamps = state.stamps | stampBit(edge.to);
      const echoes = state.echoes | (edge.type === "echo" ? edge.bit : 0);

      const key = `${edge.to}:${stamps}:${echoes}`;

      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ at: edge.to, stamps, echoes, parent: head, via: edge });
    }
  }

  const end = queue[success < 0 ? best : success];
  const steps: Step[] = [];
  let cursor = success < 0 ? best : success;

  while (cursor >= 0) {
    const state = queue[cursor];
    steps.unshift({ at: state.at, via: state.via });
    cursor = state.parent;
  }

  return {
    success: success >= 0,
    steps,
    graph,
    collected: stampIds.filter((_, i) => end.stamps & (1 << i)),
    missing: stampIds.filter((_, i) => !(end.stamps & (1 << i))),
    usedEchoes: echoPairs.filter((_, i) => end.echoes & (1 << i)),
    missingEchoes: level.requiredEchoes.filter(
      (echo) => !(end.echoes & (1 << echoPairs.indexOf(echo))),
    ),
    reachedGoal: end.at === goal,
    exploredStates: seen.size,
  };
}

function popcount(n: number): number {
  let count = 0;

  while (n) {
    count += n & 1;
    n >>>= 1;
  }

  return count;
}

export function nextHint(level: Puzzle, board: Board): Action | null {
  if (traceJourney(level, board).success) return null;

  for (let i = 0; i < board.length; i++) {
    if (definition(level, board[i].id).locked) continue;

    if (board[i].id !== level.solution[i].id)
      return {
        type: "swap",
        at: i,
        to: board.findIndex((tile) => tile.id === level.solution[i].id),
      };

    if (board[i].rotation !== level.solution[i].rotation) return { type: "rotate", at: i };
  }

  return null;
}

export function remixBoard(level: Puzzle, seed: number): Board {
  const board = copyBoard(level.solution);
  let state = seed >>> 0;

  const random = (n: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;

    return state % n;
  };

  const mutable = board.flatMap((tile, i) => (definition(level, tile.id).locked ? [] : [i]));

  for (let i = mutable.length - 1; i > 0; i--) {
    const a = mutable[i];
    const b = mutable[random(i + 1)];

    [board[a], board[b]] = [board[b], board[a]];
  }

  for (const i of mutable) board[i].rotation = random(4);

  // Avoid accidentally serving an already solved shuffle.
  if (traceJourney(level, board).success) return copyBoard(level.initial);

  return board;
}
