import type { KeyValueStore } from "./types.ts";

/** Local storage, or null when the browser blocks it. A blocked visit stays playable. */
export function browserStorage(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The grid cell an arrow key moves focus to, or null for other keys and at an edge. */
export function arrowNeighbor(
  key: string,
  at: number,
  columns: number,
  count: number,
): number | null {
  const delta =
    key === "ArrowUp"
      ? -columns
      : key === "ArrowDown"
        ? columns
        : key === "ArrowLeft"
          ? -1
          : key === "ArrowRight"
            ? 1
            : 0;

  const next = at + delta;

  if (!delta || next < 0 || next >= count) return null;

  if (Math.abs(delta) === 1 && Math.floor(at / columns) !== Math.floor(next / columns)) return null;

  return next;
}

export const isTextEntry = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/u.test(target.tagName);

export const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
