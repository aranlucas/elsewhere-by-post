import { expect, test } from "vitest";
import { LEVELS } from "../src/levels.ts";
import type { Puzzle } from "../src/types.ts";
import { boardSchema } from "../src/storage.ts";
import { echoesCrossed, solveWithHints } from "./helpers.ts";
import {
  portsFor,
  validBoard,
  copyBoard,
  changeBoard,
  network,
  traceJourney,
  remixBoard,
} from "../src/engine.ts";

test("authored level data has rectangular boards, unique identities and paired echoes", () => {
  expect(new Set(LEVELS.map((level) => level.id)).size).toBe(LEVELS.length);

  for (const level of LEVELS) {
    expect(level.cards.length % level.columns).toBe(0);
    expect(new Set(level.cards.map((card) => card.id)).size).toBe(level.cards.length);
    expect(level.cards).toContainEqual(expect.objectContaining({ id: level.start, locked: true }));
    expect(level.cards).toContainEqual(expect.objectContaining({ id: level.goal, locked: true }));

    for (const card of level.cards) {
      expect(new Set(card.ports).size).toBe(card.ports.length);

      for (const port of card.ports) expect([0, 1, 2, 3]).toContain(port);
    }

    for (const echo of level.requiredEchoes)
      expect(level.cards.filter((card) => card.echo === echo).length).toBe(2);
    expect(validBoard(level, level.initial)).toBeTruthy();
    expect(validBoard(level, level.solution)).toBeTruthy();
  }
});

for (const level of LEVELS) {
  test(`${level.id}: authored witness delivers every stamp and required echo`, () => {
    expect(validBoard(level, level.solution)).toBeTruthy();
    const route = traceJourney(level, level.solution);
    expect(route.success).toBe(true);
    expect(route.steps[0].at).toBe(level.solution.findIndex((tile) => tile.id === level.start));
    expect(route.steps.at(-1)?.at).toBe(level.solution.findIndex((tile) => tile.id === level.goal));
    expect(route.missing.length).toBe(0);
    expect(route.usedEchoes.toSorted()).toEqual(level.requiredEchoes.toSorted());
    const echoes = echoesCrossed(route);
    expect(new Set(echoes).size).toBe(echoes.length);

    // Each step follows an edge out of the step before it.
    for (const [previous, step] of route.steps.slice(1).entries())
      expect(route.graph[route.steps[previous].at]).toContainEqual(
        expect.objectContaining({ to: step.at, type: step.via?.type }),
      );
  });
  test(`${level.id}: initial map needs work and nudges converge`, () => {
    expect(traceJourney(level, level.initial).success).toBe(false);
    const { board, moves } = solveWithHints(level, copyBoard(level.initial));
    expect(traceJourney(level, board).success).toBe(true);
    expect(moves).toBeLessThan(40);
  });
  test(`${level.id}: shuffles remain valid and recoverable`, () => {
    for (let seed = 1; seed <= 60; seed++) {
      const shuffled = remixBoard(level, seed);
      expect(validBoard(level, shuffled)).toBe(true);
      expect(shuffled).toEqual(remixBoard(level, seed));
      expect(traceJourney(level, shuffled).success).toBe(false);
      const { board } = solveWithHints(level, shuffled);
      expect(traceJourney(level, board).success, `Unsolvable shuffle ${seed}`).toBe(true);
    }
  });
}

test("roads need reciprocal ports, remain undirected, and never wrap rows", () => {
  const level = LEVELS[1];

  for (let rotation = 0; rotation < 4; rotation++) {
    const board = copyBoard(level.solution);
    board[1].rotation = rotation;
    const { graph } = network(level, board);

    for (let i = 0; i < graph.length; i++)
      for (const edge of graph[i].filter((candidate) => candidate.type === "road")) {
        const to = edge.to;
        expect(graph[to]).toContainEqual(expect.objectContaining({ to: i, type: "road" }));
        expect(
          Math.abs(Math.floor(i / level.columns) - Math.floor(to / level.columns)) +
            Math.abs((i % level.columns) - (to % level.columns)) ===
            1,
        ).toBeTruthy();
        expect(portsFor(level, board[to]).includes((edge.direction + 2) % 4)).toBeTruthy();
      }
  }
});

test("rotation uses a quarter-turn; four turns are identity; reverse turn works", () => {
  const level = LEVELS[0];
  let board = copyBoard(level.initial);
  expect(portsFor(level, board[1])).toEqual([0, 1]);
  board = changeBoard(level, board, { type: "rotate", at: 1 });
  expect(portsFor(level, board[1])).toEqual([1, 2]);

  for (let i = 0; i < 3; i++) board = changeBoard(level, board, { type: "rotate", at: 1 });
  expect(board).toEqual(level.initial);
  expect(
    changeBoard(level, board, {
      type: "rotate",
      at: 1,
      counterclockwise: true,
    })[1].rotation,
  ).toBe(3);
});

test("pinned endpoints cannot turn or swap; inputs and source data are immutable", () => {
  const level = LEVELS[0];
  const board = copyBoard(level.initial);
  const original = JSON.stringify(board);

  expect(changeBoard(level, board, { type: "rotate", at: 0 })).toEqual(board);
  expect(changeBoard(level, board, { type: "swap", at: 1, to: 0 })).toEqual(board);
  expect(changeBoard(level, board, { type: "rotate", at: -1 })).toEqual(board);
  expect(changeBoard(level, board, { type: "swap", at: 1, to: 900 })).toEqual(board);
  changeBoard(level, board, { type: "swap", at: 1, to: 2 });
  expect(JSON.stringify(board)).toBe(original);
});

test("echo doors need the same compass orientation; distance is immaterial", () => {
  const level = LEVELS[3];
  const board = copyBoard(level.solution);

  expect(network(level, board).graph[1]).toContainEqual(
    expect.objectContaining({ to: 4, type: "echo" }),
  );
  board[4].rotation = 1;
  expect(network(level, board).graph[1]).not.toContainEqual(
    expect.objectContaining({ type: "echo" }),
  );
  expect(traceJourney(level, board).success).toBe(false);
  board[1].rotation = 1;
  expect(network(level, board).graph[1]).toContainEqual(
    expect.objectContaining({ to: 4, type: "echo" }),
  );
});

test("all stamps need one legal journey, rather than plain network reachability", () => {
  const level: Puzzle = {
    columns: 2,
    start: "start",
    goal: "goal",
    requiredEchoes: [],
    cards: [
      {
        id: "start",
        name: "start",
        art: "garden",
        ports: [1, 2],
        locked: true,
        stamp: false,
        echo: null,
      },
      {
        id: "goal",
        name: "goal",
        art: "garden",
        ports: [3, 2],
        locked: true,
        stamp: false,
        echo: null,
      },
      { id: "a", name: "a", art: "garden", ports: [0], locked: false, stamp: true, echo: null },
      { id: "b", name: "b", art: "garden", ports: [0], locked: false, stamp: true, echo: null },
    ],
    initial: [
      { id: "start", rotation: 0 },
      { id: "goal", rotation: 0 },
      { id: "a", rotation: 0 },
      { id: "b", rotation: 0 },
    ],
    solution: [],
  };

  // Stamp b lies beyond the delivery terminus. All four vertices are connected,
  // but walking through delivery and then returning would be illegal.
  expect(network(level, level.initial).graph.flat().length).toBe(6);
  expect(traceJourney(level, level.initial).success).toBe(false);
  level.cards[1].ports = [3];
  level.cards[2].ports = [0, 1];
  level.cards[3].ports = [3];
  // The courier revisits the start after collecting a and b.
  expect(traceJourney(level, level.initial).success).toBe(true);
});

test("malformed saves and displaced anchors fail validation", () => {
  const level = LEVELS[0];
  // Saved boards come from JSON, so the save schema must reject non-arrays.
  expect(boardSchema.safeParse(null).success).toBe(false);
  expect(validBoard(level, [])).toBe(false);
  const board = copyBoard(level.initial);
  board[1].rotation = 4;
  expect(validBoard(level, board)).toBe(false);
  board[1].rotation = 0;
  board[1].id = "home";
  expect(validBoard(level, board)).toBe(false);
  board[1].id = "alien";
  expect(validBoard(level, board)).toBe(false);
  expect(() => traceJourney(level, board)).toThrow(/Invalid board/u);
  expect(validBoard(level, [level.initial[1], level.initial[0], ...level.initial.slice(2)])).toBe(
    false,
  );
});
