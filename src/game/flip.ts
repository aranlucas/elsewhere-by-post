import type { Board } from "../types.ts";

/** Tile positions captured before a board change, so tiles can glide to their new places. */
export interface Flip {
  rects: Map<string, DOMRect>;
  oldBoard: Board;
  turnDelta: number | null;
}

const GLIDE = { duration: 320, easing: "cubic-bezier(.2,.7,.3,1)" };

const tilesIn = (container: HTMLElement) => container.querySelectorAll<HTMLElement>(".tile");

export function captureFlip(
  container: HTMLElement | null,
  oldBoard: Board,
  turnDelta: number | null,
): Flip {
  const rects = new Map<string, DOMRect>();

  if (container)
    for (const element of tilesIn(container))
      rects.set(element.dataset.id ?? "", element.getBoundingClientRect());

  return { rects, oldBoard, turnDelta };
}

/** Animates every tile from its captured position and rotation to where it now is. */
export function playFlip(container: HTMLElement, flip: Flip, board: Board): void {
  for (const element of tilesIn(container)) {
    const id = element.dataset.id ?? "";
    const previous = flip.rects.get(id);
    const now = element.getBoundingClientRect();

    if (previous && (previous.x !== now.x || previous.y !== now.y))
      element.animate(
        [
          {
            transform: `translate(${previous.x - now.x}px,${previous.y - now.y}px) rotate(-3deg)`,
            zIndex: 4,
          },
          { transform: "translate(0,0) rotate(0)", zIndex: 4 },
        ],
        GLIDE,
      );

    const oldTile = flip.oldBoard.find((tile) => tile.id === id);
    const newTile = board.find((tile) => tile.id === id);

    if (!oldTile || !newTile || oldTile.rotation === newTile.rotation) continue;

    const difference = (newTile.rotation - oldTile.rotation + 4) % 4;
    const turn = flip.turnDelta ?? (difference === 3 ? -1 : difference);

    element
      .querySelector(".rotating-art")
      ?.animate(
        [
          { transform: `rotate(${oldTile.rotation * 90}deg)` },
          { transform: `rotate(${(oldTile.rotation + turn) * 90}deg)` },
        ],
        GLIDE,
      );
  }
}
