import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/levels.js';
import { portsFor, validBoard, copyBoard, changeBoard, network, traceJourney, nextHint, remixBoard } from '../src/engine.js';

test('authored level data has rectangular boards, unique identities and paired echoes', () => {
  assert.equal(new Set(LEVELS.map(level => level.id)).size, LEVELS.length);
  for (const level of LEVELS) {
    assert.equal(level.cards.length % level.columns, 0);
    assert.equal(new Set(level.cards.map(card => card.id)).size, level.cards.length);
    assert.ok(level.cards.some(card => card.id === level.start && card.locked));
    assert.ok(level.cards.some(card => card.id === level.goal && card.locked));
    assert.ok(level.cards.every(card => new Set(card.ports).size === card.ports.length && card.ports.every(port => Number.isInteger(port) && port >= 0 && port < 4)));
    for (const echo of level.requiredEchoes) assert.equal(level.cards.filter(card => card.echo === echo).length, 2);
    assert.ok(validBoard(level, level.initial));
    assert.ok(validBoard(level, level.solution));
  }
});

for (const level of LEVELS) {
  test(`${level.id}: authored witness delivers every stamp and required echo`, () => {
    assert.ok(validBoard(level, level.solution));
    const route = traceJourney(level, level.solution);
    assert.equal(route.success, true);
    assert.equal(route.steps[0].at, level.solution.findIndex(tile => tile.id === level.start));
    assert.equal(route.steps.at(-1).at, level.solution.findIndex(tile => tile.id === level.goal));
    assert.equal(route.missing.length, 0);
    assert.deepEqual(route.usedEchoes.sort(), [...level.requiredEchoes].sort());
    const echoes = route.steps.filter(step => step.via?.type === 'echo');
    assert.equal(new Set(echoes.map(step => step.via.echo)).size, echoes.length);
    for (let i = 1; i < route.steps.length; i++) assert.ok(route.graph[route.steps[i - 1].at].some(edge => edge.to === route.steps[i].at && edge.type === route.steps[i].via.type));
  });
  test(`${level.id}: initial map needs work and nudges converge`, () => {
    let board = copyBoard(level.initial);
    assert.equal(traceJourney(level, board).success, false);
    let count = 0;
    while (!traceJourney(level, board).success && count++ < 40) board = changeBoard(level, board, nextHint(level, board));
    assert.ok(traceJourney(level, board).success);
    assert.ok(count < 40);
  });
  test(`${level.id}: shuffles remain valid and recoverable`, () => {
    for (let seed = 1; seed <= 60; seed++) {
      let board = remixBoard(level, seed);
      assert.ok(validBoard(level, board));
      assert.deepEqual(board, remixBoard(level, seed));
      assert.equal(traceJourney(level, board).success, false);
      let count = 0;
      while (!traceJourney(level, board).success && count++ < 40) board = changeBoard(level, board, nextHint(level, board));
      assert.ok(traceJourney(level, board).success, `Unsolvable shuffle ${seed}`);
    }
  });
}

test('roads need reciprocal ports, remain undirected, and never wrap rows', () => {
  const level = LEVELS[1];
  for (let rotation = 0; rotation < 4; rotation++) {
    const board = copyBoard(level.solution); board[1].rotation = rotation;
    const { graph } = network(level, board);
    for (let i = 0; i < graph.length; i++) for (const edge of graph[i].filter(edge => edge.type === 'road')) {
      const to = edge.to;
      assert.ok(graph[to].some(back => back.to === i && back.type === 'road'));
      assert.ok(Math.abs(Math.floor(i / level.columns) - Math.floor(to / level.columns)) + Math.abs(i % level.columns - to % level.columns) === 1);
      assert.ok(portsFor(level, board[to]).includes((edge.direction + 2) % 4));
    }
  }
});

test('rotation uses a quarter-turn; four turns are identity; reverse turn works', () => {
  const level = LEVELS[0]; let board = copyBoard(level.initial);
  assert.deepEqual(portsFor(level, board[1]), [0, 1]);
  board = changeBoard(level, board, { type: 'rotate', at: 1 });
  assert.deepEqual(portsFor(level, board[1]), [1, 2]);
  for (let i = 0; i < 3; i++) board = changeBoard(level, board, { type: 'rotate', at: 1 });
  assert.deepEqual(board, level.initial);
  assert.equal(changeBoard(level, board, { type: 'rotate', at: 1, counterclockwise: true })[1].rotation, 3);
});

test('pinned endpoints cannot turn or swap; inputs and source data are immutable', () => {
  const level = LEVELS[0], board = copyBoard(level.initial), original = JSON.stringify(board);
  assert.deepEqual(changeBoard(level, board, { type: 'rotate', at: 0 }), board);
  assert.deepEqual(changeBoard(level, board, { type: 'swap', at: 1, to: 0 }), board);
  assert.deepEqual(changeBoard(level, board, { type: 'rotate', at: -1 }), board);
  assert.deepEqual(changeBoard(level, board, { type: 'swap', at: 1, to: 900 }), board);
  changeBoard(level, board, { type: 'swap', at: 1, to: 2 });
  assert.equal(JSON.stringify(board), original);
});

test('echo doors need the same compass orientation; distance is immaterial', () => {
  const level = LEVELS[3], board = copyBoard(level.solution);
  assert.ok(network(level, board).graph[1].some(edge => edge.to === 4 && edge.type === 'echo'));
  board[4].rotation = 1;
  assert.ok(!network(level, board).graph[1].some(edge => edge.type === 'echo'));
  assert.equal(traceJourney(level, board).success, false);
  board[1].rotation = 1;
  assert.ok(network(level, board).graph[1].some(edge => edge.to === 4 && edge.type === 'echo'));
});

test('all stamps need one legal journey, rather than plain network reachability', () => {
  const level = { id: 'fixture', columns: 2, start: 'start', goal: 'goal', requiredEchoes: [], cards: [
    { id: 'start', ports: [1, 2], locked: true }, { id: 'goal', ports: [3, 2], locked: true },
    { id: 'a', ports: [0], stamp: true }, { id: 'b', ports: [0], stamp: true },
  ], initial: [{ id: 'start', rotation: 0 }, { id: 'goal', rotation: 0 }, { id: 'a', rotation: 0 }, { id: 'b', rotation: 0 }] };
  // Stamp b lies beyond the delivery terminus. All four vertices are connected,
  // but walking through delivery and then returning would be illegal.
  assert.equal(network(level, level.initial).graph.flat().length, 6);
  assert.equal(traceJourney(level, level.initial).success, false);
  level.cards[1].ports = [3]; level.cards[2].ports = [0, 1]; level.cards[3].ports = [3];
  assert.equal(traceJourney(level, level.initial).success, true); // revisits start after collecting a and b
});

test('malformed saves and displaced anchors fail validation', () => {
  const level = LEVELS[0];
  assert.equal(validBoard(level, null), false);
  assert.equal(validBoard(level, []), false);
  const board = copyBoard(level.initial);
  board[1].rotation = 4; assert.equal(validBoard(level, board), false);
  board[1].rotation = 0; board[1].id = 'home'; assert.equal(validBoard(level, board), false);
  board[1].id = 'alien'; assert.equal(validBoard(level, board), false);
  assert.throws(() => traceJourney(level, board), /Invalid board/);
  assert.equal(validBoard(level, [level.initial[1], level.initial[0], ...level.initial.slice(2)]), false);
});
