import type { RefObject } from "react";
import type { AuthoredLevel, MapValidation } from "../custom-map.ts";
import type { Journey } from "../types.ts";
import { MakerBoard } from "./MakerBoard.tsx";

export interface RouteColumnProps {
  level: AuthoredLevel;
  validation: MapValidation;
  selected: number;
  preview: Journey | null;
  canUndo: boolean;
  boardRef: RefObject<HTMLFieldSetElement | null>;
  onSelect: (index: number) => void;
  onUndo: () => void;
  onReset: () => void;
  onCheck: () => void;
}

/** The map being authored, its edit tools and the route check. */
export function RouteColumn(props: RouteColumnProps) {
  const { validation } = props;

  return (
    <div>
      <div className="map-frame">
        <div className="frame-note">
          <span>AUTHOR A SOLVED ARRANGEMENT</span>
          <span>↗ N</span>
        </div>
        <MakerBoard
          level={props.level}
          selected={props.selected}
          preview={props.preview}
          boardRef={props.boardRef}
          onSelect={props.onSelect}
        />
        <div className="map-legend">
          <span>⌖ departure and delivery stay pinned</span>
          <span>✳ a required postage stamp</span>
        </div>
      </div>
      <div className="map-tools">
        <button
          type="button"
          id="maker-undo"
          className="tool"
          disabled={!props.canUndo}
          onClick={props.onUndo}
        >
          Undo edit
        </button>
        <button type="button" id="maker-reset" className="tool" onClick={props.onReset}>
          Start with the blue echo
        </button>
      </div>
      <button type="button" id="validate" className="send" onClick={props.onCheck}>
        Check my route <span aria-hidden="true">↗</span>
      </button>
      <div className="validation-card">
        <p className="eyebrow">THE MAP’S LITTLE PROMISE</p>
        <output id="validation" aria-live="polite">
          {validation.valid ? "✓ " : "↗ "}
          {validation.message}
        </output>
        <p className="validation-note">
          A green check proves a legal journey in this arrangement. Every playable shuffle can
          return to it. It does not claim the shortest or only solution.
        </p>
      </div>
    </div>
  );
}
