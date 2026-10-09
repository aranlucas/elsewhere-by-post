import { expect, test } from "vitest";
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
} from "../src/custom-map.ts";
import { validBoard, traceJourney } from "../src/engine.ts";
import type { PostcardMap } from "../src/custom-map.ts";
import { memoryStorage, required, solveWithHints } from "./helpers.ts";

type Loose = string | number | boolean | null | Loose[] | { [key: string]: Loose };

/** A map as an imported file might hold it: JSON whose fields may be anything. */
interface ImportedMap {
  [key: string]: Loose;
  title: Loose;
  cards: { [key: string]: Loose }[];
}

const asImported = (map: PostcardMap): ImportedMap => structuredClone(map);

const importText = (map: ImportedMap) => parseMap(JSON.stringify(map));

test("mapmaker example proves an authored legal itinerary", () => {
  const result = validateMap(exampleMap());
  expect(result.valid).toBe(true);
  expect(result.journey?.collected.length).toBe(2);
  expect(result.journey?.usedEchoes).toEqual(["blue"]);
  const level = required(result.level, "an authored level");
  expect(traceJourney(level, level.solution).success).toBe(true);
});

test("custom data boundary rejects missing, oversized, executable-asset and malformed shapes", () => {
  expect(() => parseMap("{broken")).toThrow(/not valid postcard JSON/u);
  expect(() => parseMap(" ".repeat(32769))).toThrow(/32 KiB/u);

  const mutations: [(map: ImportedMap) => void, RegExp][] = [
    [
      (map) => {
        map.cards.pop();
      },
      /exactly six cards/u,
    ],
    [
      (map) => {
        map.cards[1].art = "https://attacker.invalid/art.svg";
      },
      /Card 2 needs a known landmark/u,
    ],
    [
      (map) => {
        map.cards[1].ports = [0, 0];
      },
      /Card 2 has invalid road directions/u,
    ],
    [
      (map) => {
        map.cards[1].ports = ["1"];
      },
      /Card 2 has invalid road directions/u,
    ],
    [
      (map) => {
        map.cards[1].rotation = 4;
      },
      /Card 2 has invalid rotation, stamp, or echo data/u,
    ],
    [
      (map) => {
        map.cards[1].echo = "unknown";
      },
      /Card 2 has invalid rotation, stamp, or echo data/u,
    ],
    [
      (map) => {
        map.title = "x".repeat(61);
      },
      /title of 1–60 characters/u,
    ],
    [
      (map) => {
        map.cards[0].stamp = true;
      },
      /Pinned endpoints cannot carry stamps or echoes/u,
    ],
    [
      (map) => {
        map.cards[5].art = "arch";
      },
      /Card 6 needs a known landmark/u,
    ],
  ];

  for (const [mutate, message] of mutations) {
    const map = asImported(exampleMap());
    mutate(map);
    expect(() => importText(map)).toThrow(message);
  }

  const map = asImported(exampleMap());
  map.unknown = "ignored";
  map.cards[1].url = "https://attacker.invalid";
  expect(importText(map)).not.toHaveProperty("unknown");
  expect(importText(map).cards[1]).not.toHaveProperty("url");
  expect(normalizeMap(exampleMap())).toEqual(exampleMap());
});

test("validation rejects unpaired echoes, no stamps, disconnected roads and mismatched directions", () => {
  const map = exampleMap();
  map.cards[4].echo = null;
  expect(validateMap(map).message).toMatch(/exactly two/u);
  map.cards[4].echo = "blue";
  map.cards[4].rotation = 1;
  expect(validateMap(map).valid).toBe(false);
  map.cards[4].rotation = 0;
  map.cards[0].ports = [];
  expect(validateMap(map).valid).toBe(false);

  for (const card of map.cards) card.stamp = false;
  expect(validateMap(map).message).toMatch(/at least one/u);
});

test("120 custom shuffles remain valid and reachable through legal reversible actions", () => {
  for (let seed = 0; seed < 120; seed++) {
    const level = playableLevel(exampleMap(), seed);
    expect(validBoard(level, level.initial)).toBe(true);
    expect(traceJourney(level, level.solution).success).toBe(true);
    const { board } = solveWithHints(level, level.initial);
    expect(traceJourney(level, board).success).toBe(true);
  }

  expect(playableLevel(exampleMap(), 20)).toEqual(playableLevel(exampleMap(), 20));
  expect(() => playableLevel(exampleMap(), -1)).toThrow(/seed/u);
});

test("draft and publication storage recover safely; publishing invalid maps does not replace the last playable map", () => {
  const storage = memoryStorage();
  expect(readDraft(storage)).toEqual(exampleMap());
  const draft = exampleMap();
  draft.title = "My own map";
  expect(saveDraft(storage, draft)).toBe(true);
  expect(readDraft(storage)).toEqual(draft);
  const level = publishMap(storage, draft, 99);
  expect(readPublishedLevel(storage)).toEqual(level);
  const invalid = exampleMap();
  invalid.cards[1].echo = null;
  expect(() => publishMap(storage, invalid, 99)).toThrow(/exactly two doors/u);
  expect(readPublishedLevel(storage)).toEqual(level);
  storage.setItem(PUBLISHED_KEY, "{broken");
  expect(readPublishedLevel(storage)).toBe(null);
  storage.setItem(DRAFT_KEY, "null");
  expect(readDraft(storage)).toEqual(exampleMap());
  expect(readPublishedLevel(null)).toBe(null);
  expect(saveDraft(null, draft)).toBe(false);
});

test("map revisions isolate saved-game identity and user text is data rather than a new asset", () => {
  const map = exampleMap();
  const copy = copyMap(map);

  copy.cards[1].name = "<b>hello</b>";
  expect(map.cards[1].name).toBe("Near archway");
  expect(playableLevel(map, 10).id).not.toBe(playableLevel(copy, 10).id);
  expect(playableLevel(map, 10).id).not.toBe(playableLevel(map, 11).id);
  expect(authoredLevel(copy).cards[1].name).toBe("<b>hello</b>");
});
