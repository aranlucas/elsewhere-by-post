import type { RefObject } from "react";
import { useDocumentEvent, useGridArrows } from "../hooks.ts";

export interface GameKeysOptions {
  columns: number;
  count: number;
  selected: number | null;
  boardRef: RefObject<HTMLElement | null>;
  ignore: (event: KeyboardEvent) => boolean;
  onTurn: (at: number, counterclockwise: boolean) => void;
  onUndo: () => void;
  onSend: () => void;
  onClear: () => void;
}

export function useGameKeys(options: GameKeysOptions): void {
  useGridArrows(options.boardRef, options.columns, options.count, options.ignore);

  useDocumentEvent("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || options.ignore(event)) {
      return;
    }

    const tile =
      event.target instanceof Element ? event.target.closest<HTMLElement>(".tile") : null;

    const tileAt = tile ? Number(tile.dataset.at) : null;

    switch (event.key.toLowerCase()) {
      case "r": {
        event.preventDefault();
        const at = options.selected ?? tileAt;

        if (at !== null) {
          options.onTurn(at, event.shiftKey);
        }

        return;
      }

      case "u":
        event.preventDefault();
        options.onUndo();

        return;
      case "p":
        event.preventDefault();
        options.onSend();

        return;
      case "escape":
        options.onClear();
    }
  });
}
