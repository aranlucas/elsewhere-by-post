import { copyBoard, traceJourney, remixBoard } from './engine.js';

export const DRAFT_KEY = 'elsewhere-mapmaker-draft-v1';
export const PUBLISHED_KEY = 'elsewhere-mapmaker-published-v1';
export const MAX_MAP_BYTES = 32768;
export const LANDMARKS = {
  lighthouse: 'Little lighthouse', windmill: 'Windmill', observatory: 'Observatory',
  garden: 'Quiet garden', orchard: 'Cloud orchard', greenhouse: 'Rainhouse', teahouse: 'Teahouse', arch: 'Archway',
};
const clone = value => JSON.parse(JSON.stringify(value));
const cell = (art, name, ports, stamp = false, echo = null) => ({ art, name, ports, stamp, echo, rotation: 0 });
export function exampleMap() {
  return { version: 1, title: 'A letter through blue', cards: [
    cell('home', 'Departure', [1]), cell('arch', 'Near archway', [3], true, 'blue'), cell('orchard', 'Cloud orchard', []),
    cell('garden', 'Quiet garden', []), cell('arch', 'Far archway', [1], true, 'blue'), cell('mail', 'Delivery', [3]),
  ] };
}

// This boundary accepts data only: six known vector landmarks, four directions,
// two optional echo colors, bounded text, no asset URLs or executable content.
export function normalizeMap(input) {
  if (!input || input.version !== 1 || !Array.isArray(input.cards) || input.cards.length !== 6) throw new Error('A postcard map needs version 1 and exactly six cards.');
  if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 60) throw new Error('Give your map a title of 1–60 characters.');
  const cards = input.cards.map((card, index) => {
    if (!card || typeof card !== 'object') throw new Error(`Card ${index + 1} is missing.`);
    const expected = index === 0 ? 'home' : index === 5 ? 'mail' : null;
    if (expected ? card.art !== expected : !Object.hasOwn(LANDMARKS, card.art)) throw new Error(`Card ${index + 1} needs a known landmark. Departure and delivery stay pinned.`);
    if (typeof card.name !== 'string' || !card.name.trim() || card.name.length > 36) throw new Error(`Card ${index + 1} needs a name of 1–36 characters.`);
    if (!Array.isArray(card.ports) || card.ports.length > 4 || new Set(card.ports).size !== card.ports.length || card.ports.some(port => !Number.isInteger(port) || port < 0 || port > 3)) throw new Error(`Card ${index + 1} has invalid road directions.`);
    if (!Number.isInteger(card.rotation) || card.rotation < 0 || card.rotation > 3 || typeof card.stamp !== 'boolean' || ![null, 'blue', 'coral'].includes(card.echo)) throw new Error(`Card ${index + 1} has invalid rotation, stamp, or echo data.`);
    if (expected && (card.stamp || card.echo)) throw new Error('Pinned endpoints cannot carry stamps or echoes.');
    return { art: card.art, name: card.name.trim(), ports: [...card.ports].sort(), rotation: card.rotation, stamp: card.stamp, echo: card.echo };
  });
  return { version: 1, title: input.title.trim(), cards };
}

export function parseMap(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_MAP_BYTES) throw new Error('Choose a postcard JSON file smaller than 32 KiB.');
  try { return normalizeMap(JSON.parse(text)); } catch (error) { if (error instanceof SyntaxError) throw new Error('That file is not valid postcard JSON.'); throw error; }
}

export function authoredLevel(input) {
  const map = normalizeMap(input);
  const cards = map.cards.map((card, index) => ({ ...card, id: index === 0 ? 'home' : index === 5 ? 'mail' : `place-${index}`, locked: index === 0 || index === 5 }));
  const board = cards.map(card => ({ id: card.id, rotation: card.rotation }));
  const echoes = [...new Set(cards.map(card => card.echo).filter(Boolean))];
  return { id: 'mapmaker', title: map.title, place: map.title, columns: 3, start: 'home', goal: 'mail', cards, requiredEchoes: echoes, initial: board, solution: copyBoard(board) };
}

export function validateMap(input) {
  try {
    const map = normalizeMap(input), level = authoredLevel(map);
    for (const echo of level.requiredEchoes) if (level.cards.filter(card => card.echo === echo).length !== 2) return { valid: false, message: `The ${echo} echo needs exactly two doors.`, map, level, journey: null };
    if (!level.cards.some(card => card.stamp)) return { valid: false, message: 'Give at least one landmark a postage stamp.', map, level, journey: null };
    const journey = traceJourney(level, level.solution);
    const stampCount = journey.collected.length, echoCount = journey.usedEchoes.length;
    const message = journey.success ? `A legal journey visits ${stampCount} ${stampCount === 1 ? 'stamp' : 'stamps'}${echoCount ? ` and ${echoCount} ${echoCount === 1 ? 'echo' : 'echoes'}` : ''}. Ready to shuffle and play.` : journey.missing.length ? `The route still needs ${journey.missing.map(id => level.cards.find(card => card.id === id).name).join(', ')}.` : journey.missingEchoes.length ? 'Align both arrows in each echo pair and connect their roads.' : 'Connect the collected stamps to delivery.';
    return { valid: journey.success, message, map, level, journey };
  } catch (error) { return { valid: false, message: error.message, map: null, level: null, journey: null }; }
}

function fingerprint(value) { let hash = 2166136261; for (const char of JSON.stringify(value)) hash = Math.imul(hash ^ char.codePointAt(0), 16777619); return (hash >>> 0).toString(16); }
export function playableLevel(input, seed) {
  const result = validateMap(input);
  if (!result.valid) throw new Error(result.message);
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Invalid shuffle seed.');
  const level = result.level;
  level.id = `custom-${fingerprint(result.map)}-${seed}`;
  level.initial = remixBoard(level, seed);
  level.letter = 'Dear mapmaker,\nA world of your own. A letter that can find its way.';
  level.lesson = 'Your own little map. Collect every stamp and cross each echo before delivery.';
  level.hint = 'The mapmaker checked an authored route. A nudge restores one part of that arrangement.';
  return level;
}

export function readDraft(storage) { try { const text = storage.getItem(DRAFT_KEY); return text ? parseMap(text) : exampleMap(); } catch { return exampleMap(); } }
export function saveDraft(storage, map) { try { storage.setItem(DRAFT_KEY, JSON.stringify(normalizeMap(map))); return true; } catch { return false; } }
export function publishMap(storage, map, seed) {
  const level = playableLevel(map, seed);
  storage.setItem(PUBLISHED_KEY, JSON.stringify({ version: 1, map: normalizeMap(map), seed }));
  return level;
}
export function readPublishedLevel(storage) {
  try {
    const text = storage.getItem(PUBLISHED_KEY);
    if (!text || new TextEncoder().encode(text).length > MAX_MAP_BYTES) return null;
    const publication = JSON.parse(text);
    if (publication.version !== 1) return null;
    return playableLevel(publication.map, publication.seed);
  } catch { return null; }
}
export function copyMap(map) { return clone(map); }
