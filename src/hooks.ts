import { useEffect, useEffectEvent } from "react";
import type { RefObject } from "react";
import { arrowNeighbor, isTextEntry } from "./browser.ts";

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

export function useGridArrows(
  boardRef: RefObject<HTMLElement | null>,
  columns: number,
  count: number,
  ignore?: (event: KeyboardEvent) => boolean,
): void {
  useDocumentEvent("keydown", (event) => {
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      isTextEntry(event.target) ||
      ignore?.(event)
    ) {
      return;
    }

    const tile =
      event.target instanceof Element ? event.target.closest<HTMLElement>(".tile") : null;

    if (!tile || !event.key.startsWith("Arrow")) {
      return;
    }

    event.preventDefault();
    const next = arrowNeighbor(event.key, Number(tile.dataset.at), columns, count);

    if (next !== null) {
      boardRef.current
        ?.querySelector<HTMLElement>(`.tile[data-at="${next}"] .tile-select`)
        ?.focus();
    }
  });
}
