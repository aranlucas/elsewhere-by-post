import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/levels.js';
import { decodeSave, loadSave, persistSave, freshSave, SAVE_KEY } from '../src/storage.js';

test('valid saved board, history, level, sound and delivery medals round-trip', () => {
  const saved = freshSave();
  saved.levelIndex = 3; saved.sound = true; saved.completed = [LEVELS[0].id];
  saved.levels[LEVELS[0].id] = { board: LEVELS[0].solution, moves: 2, history: [{ board: LEVELS[0].initial, moves: 0 }] };
  const memory = new Map(), storage = { getItem: key => memory.get(key), setItem: (key, value) => memory.set(key, value) };
  assert.equal(persistSave(storage, saved), true);
  assert.ok(memory.has(SAVE_KEY));
  assert.deepEqual(loadSave(storage, LEVELS), saved);
});

test('corrupt, old, unavailable and quota-limited storage is safe', () => {
  for (const raw of [null, '', '{bad', '{}', '{"version":2}', 'null', 'true']) assert.deepEqual(decodeSave(raw, LEVELS), freshSave());
  const blocked = { getItem: () => { throw new Error('Blocked'); }, setItem: () => { throw new Error('Quota'); } };
  assert.deepEqual(loadSave(blocked, LEVELS), freshSave());
  assert.equal(persistSave(blocked, freshSave()), false);
  assert.deepEqual(loadSave(null, LEVELS), freshSave());
});

test('bad slots, levels, completions and history cannot poison a saved desk', () => {
  const data = { version: 1, levelIndex: -5, sound: 'true', completed: [LEVELS[0].id, LEVELS[0].id, 'alien'], levels: {
    [LEVELS[0].id]: { board: LEVELS[0].solution, moves: -1, history: [{ board: LEVELS[0].initial, moves: 0 }, null, { board: [], moves: 1 }] },
    [LEVELS[1].id]: { board: [], moves: 100 },
  } };
  const saved = decodeSave(JSON.stringify(data), LEVELS);
  assert.equal(saved.levelIndex, 0); assert.equal(saved.sound, false);
  assert.deepEqual(saved.completed, [LEVELS[0].id]);
  assert.equal(saved.levels[LEVELS[0].id].moves, 0); assert.equal(saved.levels[LEVELS[0].id].history.length, 1);
  assert.equal(saved.levels[LEVELS[1].id], undefined);
});
