import { ArrowIcon, SparkIcon } from "../icons.tsx";
import { classes } from "../classes.ts";
import { definition } from "../engine.ts";
import { compass } from "../levels.ts";
import type { Board, EchoColor, Level } from "../types.ts";
import type { Status } from "./messages.ts";

export interface DispatchPanelProps {
  level: Level;
  board: Board;
  busy: boolean;
  collected: string[];
  status: Status;
  hintOpen: boolean;
  onSend: () => void;
  onToggleHint: () => void;
  onApplyHint: () => void;
}

const shortName = (name: string) =>
  name
    .replace("Little ", "")
    .replace("Pocket ", "")
    .replace("Upside-down ", "")
    .replace("Floating ", "");

function StampList({ level, collected }: { level: Level; collected: string[] }) {
  return (
    <ul id="stamp-list" className="stamp-list" aria-label="Required postage stamps">
      {level.cards
        .filter((card) => card.stamp)
        .map((card) => {
          const stamped = collected.includes(card.id);

          return (
            <li
              key={card.id}
              className={classes("stamp-chip", stamped && "collected")}
              title={card.name}
              aria-label={`${card.name} stamp${stamped ? ", collected" : ""}`}
            >
              {stamped ? "✓" : "✳"}
              <span>{shortName(card.name)}</span>
            </li>
          );
        })}
    </ul>
  );
}

function EchoChip({ level, board, echo }: { level: Level; board: Board; echo: EchoColor }) {
  const [first, second] = board.filter((tile) => definition(level, tile.id).echo === echo);
  const linked = first !== undefined && first.rotation === second?.rotation;

  return (
    <span className={classes("echo-chip", echo, linked && "linked")}>
      <i />
      {echo === "blue" ? "Blue" : "Coral"} echo:{" "}
      {linked ? `linked ${compass[first.rotation]}` : "arrows disagree"}
    </span>
  );
}

export function DispatchPanel(props: DispatchPanelProps) {
  const { level, board, busy, status } = props;

  return (
    <aside className="dispatch" aria-label="Delivery desk">
      <div className="mission">
        <span className="eyebrow">YOUR GOAL</span>
        <p id="lesson">{level.lesson}</p>
        <StampList level={level} collected={props.collected} />
        <div id="echo-status" className="echo-status">
          {level.requiredEchoes.map((echo) => (
            <EchoChip key={echo} level={level} board={board} echo={echo} />
          ))}
        </div>
      </div>
      <button
        type="button"
        id="send"
        className={classes("send", busy && "busy")}
        onClick={props.onSend}
      >
        {busy ? (
          <>
            Stop the courier <span aria-hidden="true">□</span>
          </>
        ) : (
          <>
            Send the courier <ArrowIcon />
          </>
        )}
      </button>
      <div className="status-wrap">
        <output id="status" aria-live="polite" aria-atomic="true" data-mood={status.mood}>
          {status.text}
        </output>
        <p id="status-detail">{status.detail}</p>
      </div>
      <div className="hint-area">
        <button
          type="button"
          id="hint"
          className="quiet"
          aria-expanded={props.hintOpen}
          aria-controls="hint-content"
          disabled={busy}
          onClick={props.onToggleHint}
        >
          <SparkIcon /> A little nudge
        </button>
        <div id="hint-content" hidden={!props.hintOpen}>
          <p id="hint-copy">{level.hint}</p>
          <button
            type="button"
            id="apply-hint"
            className="hint-apply"
            disabled={busy}
            onClick={props.onApplyHint}
          >
            Place one card for me
          </button>
        </div>
      </div>
      <details className="letter">
        <summary>A note from Elsewhere</summary>
        <p id="letter-text">{level.letter}</p>
        <span className="letter-signature">with love, the map</span>
      </details>
    </aside>
  );
}
