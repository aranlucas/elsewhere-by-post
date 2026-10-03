import test from "node:test";
import assert from "node:assert/strict";
import {
  exampleMap,
  normalizeMap,
  parseMap,
  validateMap,
  authoredLevel,
  playableLevel,
  readDraft,
  saveDraft,
  publishMap,
  readPublishedLevel,
  copyMap,
  DRAFT_KEY,
  PUBLISHED_KEY,
} from "../src/custom-map.js";
import {
  validBoard,
  traceJourney,
  changeBoard,
  nextHint,
} from "../src/engine.js";

const memory = () => {
  const store = new Map();

  return {
    getItem: (key) => store.get(key),
    setItem: (key, value) => store.set(key, value),
  };
};

test("mapmaker example proves an authored legal itinerary", () => {
  const result = validateMap(exampleMap());
  assert.equal(result.valid, true);
  assert.equal(result.journey.collected.length, 2);
  assert.deepEqual(result.journey.usedEchoes, ["blue"]);
  assert.equal(traceJourney(result.level, result.level.solution).success, true);
});

test("custom data boundary rejects missing, oversized, executable-asset and malformed shapes", () => {
  assert.throws(() => parseMap("{broken"), /not valid postcard JSON/);
  assert.throws(() => parseMap(" ".repeat(32769)), /32 KiB/);

  for (const mutate of [
    (map) => {
      map.cards.pop();
    },
    (map) => {
      map.cards[1].art = "https://attacker.invalid/art.svg";
    },
    (map) => {
      map.cards[1].ports = [0, 0];
    },
    (map) => {
      map.cards[1].ports = ["1"];
    },
    (map) => {
      map.cards[1].rotation = 4;
    },
    (map) => {
      map.cards[1].echo = "unknown";
    },
    (map) => {
      map.title = "x".repeat(61);
    },
    (map) => {
      map.cards[0].stamp = true;
    },
    (map) => {
      map.cards[5].art = "arch";
    },
  ]) {
    const map = exampleMap();
    mutate(map);
    assert.throws(() => normalizeMap(map));
  }

  const map = exampleMap();
  map.unknown = "ignored";
  map.cards[1].url = "https://attacker.invalid";
  assert.equal(normalizeMap(map).unknown, undefined);
  assert.equal(normalizeMap(map).cards[1].url, undefined);
});

test("validation rejects unpaired echoes, no stamps, disconnected roads and mismatched directions", () => {
  const map = exampleMap();
  map.cards[4].echo = null;
  assert.match(validateMap(map).message, /exactly two/);
  map.cards[4].echo = "blue";
  map.cards[4].rotation = 1;
  assert.equal(validateMap(map).valid, false);
  map.cards[4].rotation = 0;
  map.cards[0].ports = [];
  assert.equal(validateMap(map).valid, false);

  for (const card of map.cards) card.stamp = false;
  assert.match(validateMap(map).message, /at least one/);
});

test("120 custom shuffles remain valid and reachable through legal reversible actions", () => {
  for (let seed = 0; seed < 120; seed++) {
    const level = playableLevel(exampleMap(), seed);
    let board = level.initial;
    assert.ok(validBoard(level, board));
    assert.ok(traceJourney(level, level.solution).success);
    let moves = 0;

    while (!traceJourney(level, board).success && moves++ < 40)
      board = changeBoard(level, board, nextHint(level, board));
    assert.ok(traceJourney(level, board).success);
  }

  assert.deepEqual(
    playableLevel(exampleMap(), 20),
    playableLevel(exampleMap(), 20),
  );
  assert.throws(() => playableLevel(exampleMap(), -1), /seed/);
});

test("draft and publication storage recover safely; publishing invalid maps does not replace the last playable map", () => {
  const storage = memory();
  assert.deepEqual(readDraft(storage), exampleMap());
  const draft = exampleMap();
  draft.title = "My own map";
  assert.equal(saveDraft(storage, draft), true);
  assert.deepEqual(readDraft(storage), draft);
  const level = publishMap(storage, draft, 99);
  assert.deepEqual(readPublishedLevel(storage), level);
  const invalid = exampleMap();
  invalid.cards[1].echo = null;
  assert.throws(() => publishMap(storage, invalid, 99));
  assert.deepEqual(readPublishedLevel(storage), level);
  storage.setItem(PUBLISHED_KEY, "{broken");
  assert.equal(readPublishedLevel(storage), null);
  storage.setItem(DRAFT_KEY, "null");
  assert.deepEqual(readDraft(storage), exampleMap());
  assert.equal(readPublishedLevel(null), null);
  assert.equal(saveDraft(null, draft), false);
});

test("map revisions isolate saved-game identity and user text is data rather than a new asset", () => {
  const map = exampleMap(),
    copy = copyMap(map);

  copy.cards[1].name = "<b>hello</b>";
  assert.equal(map.cards[1].name, "Near archway");
  assert.notEqual(playableLevel(map, 10).id, playableLevel(copy, 10).id);
  assert.notEqual(playableLevel(map, 10).id, playableLevel(map, 11).id);
  assert.equal(authoredLevel(copy).cards[1].name, "<b>hello</b>");
});
