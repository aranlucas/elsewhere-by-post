import type { Level } from "../types.ts";

// Each journey has its own URL (`/journeys/3`, or `/journeys/yours` for a
// mapmaker map) so links and the back button work. Board progress stays local.

const YOURS = "yours";

const isCustom = (level: Level) => level.id.startsWith("custom-");

/** The journey a route parameter names, or null when it names none that exists. */
export function journeyIndex(param: string | undefined, levels: Level[]): number | null {
  if (param === YOURS) {
    const index = levels.findIndex((level) => isCustom(level));

    return index === -1 ? null : index;
  }

  const number = Number(param);

  return Number.isInteger(number) && number >= 1 && number <= levels.length ? number - 1 : null;
}

export function journeyPath(levels: Level[], index: number): string {
  return `/journeys/${isCustom(levels[index]) ? YOURS : String(index + 1)}`;
}

export const YOUR_MAP_PATH = `/journeys/${YOURS}`;
