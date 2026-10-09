import type { Journey } from "../types.ts";

export interface Point {
  x: number;
  y: number;
}

export interface TrailPath {
  key: string;
  className: string;
  d: string;
}

export interface Trail {
  viewBox: string;
  paths: TrailPath[];
}

/** The centre of a tile's artwork, relative to the map stage. */
export function pointOf(stage: HTMLElement, index: number): Point {
  const tile = stage
    .querySelector(`.tile[data-at="${index}"] .art-window`)
    ?.getBoundingClientRect();

  const box = stage.getBoundingClientRect();

  return tile
    ? { x: tile.x - box.x + tile.width / 2, y: tile.y - box.y + tile.height / 2 }
    : { x: 0, y: 0 };
}

/** The dotted route drawn behind the courier, up to and including step `through`. */
export function trailOf(stage: HTMLElement, journey: Journey, through: number): Trail | null {
  if (through < 1) return null;

  return {
    viewBox: `0 0 ${stage.clientWidth} ${stage.clientHeight}`,
    paths: journey.steps.slice(1, through + 1).map((step, index) => {
      const a = pointOf(stage, journey.steps[index].at);
      const b = pointOf(stage, step.at);

      return step.via?.type === "echo"
        ? {
            key: `${index}`,
            className: `echo-trail ${step.via.echo}`,
            d: `M${a.x} ${a.y} Q${(a.x + b.x) / 2} ${Math.min(a.y, b.y) - 55} ${b.x} ${b.y}`,
          }
        : { key: `${index}`, className: "road-trail", d: `M${a.x} ${a.y}L${b.x} ${b.y}` };
    }),
  };
}
