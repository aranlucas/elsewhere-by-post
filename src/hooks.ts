import { useEffect, useEffectEvent } from "react";
import type { RefObject } from "react";
import { arrowNeighbor, isTextEntry } from "./browser.ts";

/** Listens on `document` for the component's lifetime, always calling the latest handler. */
export function useDocumentEvent<K extends keyof DocumentEventMap>(
  type: K,
  handler: (event: DocumentEventMap[K]) => void,
): void {
  const onEvent = useEffectEvent(handler);

  useEffect(() => {
    const listener = (event: DocumentEventMap[K]) => {
      onEvent(event);
    };

    document.addEventListener(type, listener);

    return () => {
      document.removeEventListener(type, listener);
    };
  }, [type]);
}

/** Listens on `window` for the component's lifetime, always calling the latest handler. */
export function useWindowEvent<K extends keyof WindowEventMap>(
  type: K,
  handler: (event: WindowEventMap[K]) => void,
): void {
  const onEvent = useEffectEvent(handler);

  useEffect(() => {
    const listener = (event: WindowEventMap[K]) => {
      onEvent(event);
    };

    window.addEventListener(type, listener);

    return () => {
      window.removeEventListener(type, listener);
    };
  }, [type]);
}

/** Arrow keys move focus between the postcards of a grid board. */
export function useGridArrows(
  boardRef: RefObject<HTMLElement | null>,
  columns: number,
  count: number,
): void {
  useDocumentEvent("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || isTextEntry(event.target)) return;

    const tile =
      event.target instanceof Element ? event.target.closest<HTMLElement>(".tile") : null;

    if (!tile || !event.key.startsWith("Arrow")) return;
    event.preventDefault();
    const next = arrowNeighbor(event.key, Number(tile.dataset.at), columns, count);

    if (next !== null)
      boardRef.current
        ?.querySelector<HTMLElement>(`.tile[data-at="${next}"] .tile-select`)
        ?.focus();
  });
}
