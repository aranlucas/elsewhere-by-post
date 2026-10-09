import { z } from "zod";
import { copyBoard, definition, traceJourney, remixBoard } from "./engine.ts";
import type { ArtKey, Card, EchoColor, Journey, KeyValueStore, Level, Puzzle } from "./types.ts";

/** A mapmaker map as a playable board, before it has a letter or a shuffle. */
export interface AuthoredLevel extends Puzzle {
  id: string;
  title: string;
  place: string;
  cards: (Card & MapCard)[];
}

export interface MapValidation {
  valid: boolean;
  message: string;
  map: PostcardMap | null;
  level: AuthoredLevel | null;
  journey: Journey | null;
}

export const DRAFT_KEY = "elsewhere-mapmaker-draft-v1";

export const PUBLISHED_KEY = "elsewhere-mapmaker-published-v1";

export const MAX_MAP_BYTES = 32768;

export const LANDMARKS = {
  lighthouse: "Little lighthouse",
  windmill: "Windmill",
  observatory: "Observatory",
  garden: "Quiet garden",
  orchard: "Cloud orchard",
  greenhouse: "Rainhouse",
  teahouse: "Teahouse",
  arch: "Archway",
} satisfies Partial<Record<ArtKey, string>>;

const ART_KEYS = [
  "home",
  "lighthouse",
  "windmill",
  "observatory",
  "garden",
  "orchard",
  "greenhouse",
  "teahouse",
  "arch",
  "mail",
] as const satisfies readonly ArtKey[];

const ECHO_COLORS = ["blue", "coral"] as const satisfies readonly EchoColor[];

export const isLandmark = (value: string): value is keyof typeof LANDMARKS =>
  Object.hasOwn(LANDMARKS, value);

export const isEcho = (value: string): value is EchoColor =>
  ECHO_COLORS.some((color) => color === value);

const boundedText = (max: number) =>
  z
    .string()
    .refine((text) => text.trim() !== "" && text.length <= max)
    .transform((text) => text.trim());

const mapCardSchema = z.object({
  art: z.enum(ART_KEYS),
  name: boundedText(36),
  ports: z
    .array(z.int().min(0).max(3))
    .max(4)
    .refine((ports) => new Set(ports).size === ports.length)
    .transform((ports) => ports.toSorted((a, b) => a - b)),
  rotation: z.int().min(0).max(3),
  stamp: z.boolean(),
  echo: z.enum(ECHO_COLORS).nullable(),
});

const PINNED_ART = new Map<number, ArtKey>([
  [0, "home"],
  [5, "mail"],
]);

// This boundary accepts data only: six known vector landmarks, four directions,
// two optional echo colors, bounded text, no asset URLs or executable content.
// Unknown keys are stripped.
const mapSchema = z
  .object({
    version: z.literal(1),
    title: boundedText(60),
    cards: z.array(mapCardSchema).length(6),
  })
  .superRefine((map, context) => {
    for (const [index, card] of map.cards.entries()) {
      const pinned = PINNED_ART.get(index);

      if (pinned === undefined ? !isLandmark(card.art) : card.art !== pinned)
        context.addIssue({ code: "custom", path: ["cards", index, "art"] });
      else if (pinned !== undefined && (card.stamp || card.echo !== null))
        context.addIssue({ code: "custom", path: ["cards", index, "pinned"] });
    }
  });

export type PostcardMap = z.output<typeof mapSchema>;

export type MapCard = PostcardMap["cards"][number];

const publicationSchema = z.object({
  version: z.literal(1),
  map: mapSchema,
  seed: z.int(),
});

/** The player-facing explanation for the first problem zod found in a map, by where it is. */
function describeIssue(issue: z.core.$ZodIssue): string {
  const [field, index, property] = issue.path;

  if (field === "title") return "Give your map a title of 1–60 characters.";

  if (field !== "cards" || index === undefined)
    return "A postcard map needs version 1 and exactly six cards.";

  const card = `Card ${Number(index) + 1}`;

  switch (property) {
    case undefined:
      return `${card} is missing.`;
    case "art":
      return `${card} needs a known landmark. Departure and delivery stay pinned.`;
    case "name":
      return `${card} needs a name of 1–36 characters.`;
    case "ports":
      return `${card} has invalid road directions.`;
    case "pinned":
      return "Pinned endpoints cannot carry stamps or echoes.";
    default:
      return `${card} has invalid rotation, stamp, or echo data.`;
  }
}

const cell = (
  art: ArtKey,
  name: string,
  ports: number[],
  stamp = false,
  echo: EchoColor | null = null,
): MapCard => ({ art, name, ports, stamp, echo, rotation: 0 });

export function exampleMap(): PostcardMap {
  return {
    version: 1,
    title: "A letter through blue",
    cards: [
      cell("home", "Departure", [1]),
      cell("arch", "Near archway", [3], true, "blue"),
      cell("orchard", "Cloud orchard", []),
      cell("garden", "Quiet garden", []),
      cell("arch", "Far archway", [1], true, "blue"),
      cell("mail", "Delivery", [3]),
    ],
  };
}

/** The canonical map, or a player-facing Error naming the first problem zod found. */
function mapFrom(result: ReturnType<typeof mapSchema.safeParse>): PostcardMap {
  if (result.success) return result.data;

  const [issue] = result.error.issues;

  throw new Error(issue === undefined ? "That map is not valid." : describeIssue(issue), {
    cause: result.error,
  });
}

/** Validates a map and returns its canonical form, or throws a player-facing Error. */
export function normalizeMap(input: PostcardMap): PostcardMap {
  return mapFrom(mapSchema.safeParse(input));
}

export function parseMap(text: string): PostcardMap {
  if (new TextEncoder().encode(text).length > MAX_MAP_BYTES)
    throw new Error("Choose a postcard JSON file smaller than 32 KiB.");

  try {
    return mapFrom(mapSchema.safeParse(JSON.parse(text)));
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new Error("That file is not valid postcard JSON.", { cause: error });
    throw error;
  }
}

export function authoredLevel(input: PostcardMap): AuthoredLevel {
  const map = normalizeMap(input);

  const cards = map.cards.map((card, index) => ({
    ...card,
    id: index === 0 ? "home" : index === 5 ? "mail" : `place-${index}`,
    locked: index === 0 || index === 5,
  }));

  const board = cards.map((card) => ({ id: card.id, rotation: card.rotation }));
  const echoes = [...new Set(cards.flatMap((card) => (card.echo ? [card.echo] : [])))];

  return {
    id: "mapmaker",
    title: map.title,
    place: map.title,
    columns: 3,
    start: "home",
    goal: "mail",
    cards,
    requiredEchoes: echoes,
    initial: board,
    solution: copyBoard(board),
  };
}

export function validateMap(input: PostcardMap): MapValidation {
  try {
    const map = normalizeMap(input);
    const level = authoredLevel(map);

    for (const echo of level.requiredEchoes)
      if (level.cards.filter((card) => card.echo === echo).length !== 2)
        return {
          valid: false,
          message: `The ${echo} echo needs exactly two doors.`,
          map,
          level,
          journey: null,
        };

    if (!level.cards.some((card) => card.stamp))
      return {
        valid: false,
        message: "Give at least one landmark a postage stamp.",
        map,
        level,
        journey: null,
      };
    const journey = traceJourney(level, level.solution);

    const stampCount = journey.collected.length;
    const echoCount = journey.usedEchoes.length;

    const message = journey.success
      ? `A legal journey visits ${stampCount} ${stampCount === 1 ? "stamp" : "stamps"}${echoCount ? ` and ${echoCount} ${echoCount === 1 ? "echo" : "echoes"}` : ""}. Ready to shuffle and play.`
      : journey.missing.length > 0
        ? `The route still needs ${journey.missing.map((id) => definition(level, id).name).join(", ")}.`
        : journey.missingEchoes.length > 0
          ? "Align both arrows in each echo pair and connect their roads."
          : "Connect the collected stamps to delivery.";

    return { valid: journey.success, message, map, level, journey };
  } catch (error) {
    return {
      valid: false,
      message: error instanceof Error ? error.message : String(error),
      map: null,
      level: null,
      journey: null,
    };
  }
}

function fingerprint(value: PostcardMap): string {
  let hash = 2166136261;

  for (const char of JSON.stringify(value))
    hash = Math.imul(hash ^ (char.codePointAt(0) ?? 0), 16777619);

  return (hash >>> 0).toString(16);
}

export function playableLevel(input: PostcardMap, seed: number): Level {
  const { valid, message, map, level } = validateMap(input);

  if (!valid || !map || !level) throw new Error(message);

  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new Error("Invalid shuffle seed.");

  return {
    ...level,
    id: `custom-${fingerprint(map)}-${seed}`,
    initial: remixBoard(level, seed),
    letter: "Dear mapmaker,\nA world of your own. A letter that can find its way.",
    lesson: "Your own little map. Collect every stamp and cross each echo before delivery.",
    hint: "The mapmaker checked an authored route. A nudge restores one part of that arrangement.",
  };
}

export function readDraft(storage: KeyValueStore | null): PostcardMap {
  try {
    const text = storage?.getItem(DRAFT_KEY) ?? "";

    return text === "" ? exampleMap() : parseMap(text);
  } catch {
    return exampleMap();
  }
}

export function saveDraft(storage: KeyValueStore | null, map: PostcardMap): boolean {
  try {
    if (!storage) return false;
    storage.setItem(DRAFT_KEY, JSON.stringify(normalizeMap(map)));

    return true;
  } catch {
    return false;
  }
}

export function publishMap(storage: KeyValueStore | null, map: PostcardMap, seed: number): Level {
  const level = playableLevel(map, seed);

  if (!storage) throw new Error("Storage is unavailable.");
  storage.setItem(PUBLISHED_KEY, JSON.stringify({ version: 1, map: normalizeMap(map), seed }));

  return level;
}

export function readPublishedLevel(storage: KeyValueStore | null): Level | null {
  try {
    const text = storage?.getItem(PUBLISHED_KEY) ?? "";

    if (text === "" || new TextEncoder().encode(text).length > MAX_MAP_BYTES) return null;
    const publication = publicationSchema.safeParse(JSON.parse(text));

    return publication.success ? playableLevel(publication.data.map, publication.data.seed) : null;
  } catch {
    return null;
  }
}

export function copyMap(map: PostcardMap): PostcardMap {
  return structuredClone(map);
}
