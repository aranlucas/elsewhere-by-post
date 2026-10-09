import type { MouseEvent, PointerEvent, ReactNode, RefObject } from "react";
import { EnvelopeIcon, ResetIcon, TurnIcon, UndoIcon } from "../icons.tsx";
import { classes } from "../classes.ts";
import { definition, network } from "../engine.ts";
import type { Board, Level } from "../types.ts";
import { PostcardTile } from "./PostcardTile.tsx";
import type { Trip } from "./useCourier.ts";
import type { DragState } from "./useDragSwap.ts";

export interface MapPanelProps {
  level: Level;
  board: Board;
  chapter: string;
  moves: number;
  selected: number | null;
  canUndo: boolean;
  trip: Trip;
  drag: DragState | null;
  boardRef: RefObject<HTMLFieldSetElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  titleRef: RefObject<HTMLHeadingElement | null>;
  onSelect: (at: number) => void;
  onTurn: (at: number) => void;
  onUndo: () => void;
  onReset: () => void;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onClickCapture: (event: MouseEvent<HTMLElement>) => void;
  /** Laid over the table, such as the level-complete banner. */
  overlay: ReactNode;
}

function MapLegend({ echoes }: { echoes: boolean }) {
  return (
    <div className="map-legend">
      <span>
        <i className="legend-road" /> edge to edge
      </span>
      <span id="echo-legend">
        {echoes ? (
          <>
            <i className="legend-echo" /> echo to echo
          </>
        ) : (
          <span>○ collect each stamp</span>
        )}
      </span>
      <span>⌖ pinned in place</span>
    </div>
  );
}

interface MapToolsProps {
  busy: boolean;
  canUndo: boolean;
  canTurn: boolean;
  onUndo: () => void;
  onReset: () => void;
  onTurn: () => void;
}

function MapTools({ busy, canUndo, canTurn, onUndo, onReset, onTurn }: MapToolsProps) {
  return (
    <div className="map-tools">
      <button type="button" id="undo" className="tool" disabled={busy || !canUndo} onClick={onUndo}>
        <UndoIcon /> Undo <kbd>U</kbd>
      </button>
      <button type="button" id="reset" className="tool" disabled={busy} onClick={onReset}>
        <ResetIcon /> Reset
      </button>
      <button
        type="button"
        id="turn"
        className="tool turn-tool"
        disabled={busy || !canTurn}
        onClick={onTurn}
      >
        <TurnIcon /> Turn card <kbd>R</kbd>
      </button>
    </div>
  );
}

export function MapPanel(props: MapPanelProps) {
  const { level, board, selected, trip, boardRef, stageRef, titleRef } = props;
  const { graph } = network(level, board);
  const selectedCard = selected === null ? null : definition(level, board[selected].id);

  return (
    <div className="map-area">
      <div className="map-heading">
        <div>
          <span className="eyebrow" id="chapter">
            {props.chapter}
          </span>
          <h2 id="level-title" ref={titleRef}>
            {level.title}
          </h2>
        </div>
        <span className="move-count" id="moves">
          {props.moves} {props.moves === 1 ? "move" : "moves"}
        </span>
      </div>
      <div className="map-frame">
        <span className="compass" title="North is up and to the right">
          ↗ N
        </span>
        <div className="map-stage" ref={stageRef}>
          <fieldset
            id="board"
            ref={boardRef}
            className="board"
            tabIndex={-1}
            aria-label="Postcard map"
            data-size={board.length}
            style={{
              "--columns": level.columns,
              "--rows": Math.ceil(board.length / level.columns),
            }}
            onPointerDown={trip.busy ? undefined : props.onPointerDown}
            onClickCapture={props.onClickCapture}
          >
            {board.map((tile, at) => {
              const card = definition(level, tile.id);

              return (
                <PostcardTile
                  key={tile.id}
                  tile={tile}
                  card={card}
                  at={at}
                  edges={graph[at]}
                  isStart={tile.id === level.start}
                  selected={selected === at}
                  busy={trip.busy}
                  visited={trip.journey?.steps.some((step) => step.at === at) ?? false}
                  active={trip.activeAt === at}
                  stamped={trip.collected.includes(card.id)}
                  dragging={props.drag?.from === at}
                  dropTarget={props.drag?.over === at}
                  onSelect={props.onSelect}
                  onTurn={props.onTurn}
                />
              );
            })}
          </fieldset>
          <svg className="trip-lines" aria-hidden="true" viewBox={trip.trail?.viewBox}>
            {trip.trail?.paths.map((path) => (
              <path key={path.key} className={path.className} d={path.d} />
            ))}
          </svg>
          <div
            className={classes(
              "courier",
              trip.courier !== null && "visible",
              trip.echoing && "echoing",
            )}
            style={
              trip.courier
                ? { "--courier-x": `${trip.courier.x}px`, "--courier-y": `${trip.courier.y}px` }
                : undefined
            }
            aria-hidden="true"
          >
            <EnvelopeIcon />
          </div>
        </div>
        <MapLegend echoes={level.requiredEchoes.length > 0} />
        {props.overlay}
      </div>
      <MapTools
        busy={trip.busy}
        canUndo={props.canUndo}
        canTurn={selectedCard !== null && !selectedCard.locked}
        onUndo={props.onUndo}
        onReset={props.onReset}
        onTurn={() => {
          if (selected !== null) props.onTurn(selected);
        }}
      />
      <p className="selection-note" id="selection-note">
        {selectedCard
          ? `${selectedCard.name} selected. Turn it, or choose another postcard to swap.`
          : "Select a postcard to turn it, or two to swap them."}
      </p>
    </div>
  );
}
