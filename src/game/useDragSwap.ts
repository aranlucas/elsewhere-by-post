import { useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";
import { useDocumentEvent } from "../hooks.ts";

const DRAG_THRESHOLD = 14;

export interface DragState {
  from: number;
  over: number | null;
}

interface PendingDrag {
  at: number;
  x: number;
  y: number;
  moved: boolean;
}

export interface DragSwapOptions {
  canMove: (at: number) => boolean;
  onSwap: (at: number, to: number) => void;
}

function tileIndexAt(x: number, y: number): number | null {
  const tile = document.elementFromPoint(x, y)?.closest<HTMLElement>(".tile");

  return tile ? Number(tile.dataset.at) : null;
}

/**
 * Pointer drag supplements tap-to-swap; it never replaces the accessible controls.
 * Returns handlers for the board element and the tile currently being dragged.
 */
export function useDragSwap({ canMove, onSwap }: DragSwapOptions) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const pending = useRef<PendingDrag | null>(null);
  const release = useRef<{ x: number; y: number; time: number } | null>(null);

  useDocumentEvent("pointermove", (event) => {
    const current = pending.current;

    if (!current) return;

    if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > DRAG_THRESHOLD)
      current.moved = true;

    if (!current.moved) return;
    const target = tileIndexAt(event.clientX, event.clientY);

    setDrag({
      from: current.at,
      over: target !== null && target !== current.at && canMove(target) ? target : null,
    });
  });

  useDocumentEvent("pointerup", (event) => {
    const current = pending.current;

    if (!current) return;
    pending.current = null;
    setDrag(null);

    if (!current.moved) return;
    release.current = { x: event.clientX, y: event.clientY, time: event.timeStamp };
    const target = tileIndexAt(event.clientX, event.clientY);

    if (target !== null) onSwap(current.at, target);
  });

  useDocumentEvent("pointercancel", () => {
    pending.current = null;
    setDrag(null);
  });

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    const button =
      event.target instanceof Element ? event.target.closest<HTMLElement>(".tile-select") : null;

    if (!button || event.button !== 0) return;
    const at = Number(button.dataset.at);

    if (canMove(at)) pending.current = { at, x: event.clientX, y: event.clientY, moved: false };
  }

  // A drag ends with a click on the tile under the pointer; that click is not a selection.
  function onClickCapture(event: MouseEvent<HTMLElement>) {
    const last = release.current;
    release.current = null;

    if (
      last &&
      event.timeStamp - last.time < 100 &&
      Math.hypot(event.clientX - last.x, event.clientY - last.y) < 3
    ) {
      event.stopPropagation();
      event.preventDefault();
    }
  }

  return { drag, onPointerDown, onClickCapture };
}
