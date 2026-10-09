import { PostcardArt } from "../art.tsx";
import { classes } from "../classes.ts";
import { compass } from "../levels.ts";
import type { Card, Edge, Tile } from "../types.ts";

export interface PostcardTileProps {
  tile: Tile;
  card: Card;
  at: number;
  edges: Edge[];
  isStart: boolean;
  selected: boolean;
  busy: boolean;
  visited: boolean;
  active: boolean;
  stamped: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onSelect: (at: number) => void;
  onTurn: (at: number) => void;
}

function describe(card: Card, tile: Tile, ports: number[], echoActive: boolean): string {
  const pinned = card.locked ? "Pinned. " : "";

  const roads =
    ports.length > 0 ? `Roads ${ports.map((port) => compass[port]).join(" and ")}.` : "No roads.";

  const echo =
    card.echo === null
      ? ""
      : ` ${card.echo} echo door facing ${compass[tile.rotation]}. ${echoActive ? "Linked." : "Unlinked."}`;

  return `${card.name}. ${pinned}${roads}${echo}${card.stamp ? " Collect a stamp here." : ""}`;
}

export function PostcardTile(props: PostcardTileProps) {
  const { tile, card, at, edges, selected, busy, stamped } = props;
  const ports = card.ports.map((port) => (port + tile.rotation) % 4);
  const echoActive = edges.some((edge) => edge.type === "echo");

  const connected = edges.flatMap((edge) =>
    edge.type === "road" ? [(edge.direction - tile.rotation + 4) % 4] : [],
  );

  return (
    <div
      className={classes(
        "tile",
        selected && "selected",
        card.locked && "pinned",
        props.visited && "visited",
        props.active && "active",
        props.dragging && "dragging",
        props.dropTarget && "drop-target",
      )}
      data-id={tile.id}
      data-at={at}
    >
      <button
        type="button"
        className="tile-select"
        data-at={at}
        aria-label={describe(card, tile, ports, echoActive)}
        aria-pressed={selected}
        disabled={busy}
        onClick={() => {
          props.onSelect(at);
        }}
      >
        <span className="art-window">
          <span className="rotating-art" style={{ transform: `rotate(${tile.rotation * 90}deg)` }}>
            <PostcardArt card={card} connectedPorts={connected} echoActive={echoActive} />
          </span>
        </span>
        <span className="tile-caption">
          <span>{card.name}</span>
          <span className="card-number">{String(at + 1).padStart(2, "0")}</span>
        </span>
      </button>
      {card.locked ? (
        <span className="pin-label" aria-hidden="true">
          ⌖ {props.isStart ? "START" : "POST"}
        </span>
      ) : (
        <button
          type="button"
          className="tile-turn"
          data-at={at}
          aria-label={`Turn ${card.name} clockwise`}
          disabled={busy}
          onClick={() => {
            props.onTurn(at);
          }}
        >
          ↻
        </button>
      )}
      {card.stamp ? (
        <span className={classes("stamp", stamped && "collected")} aria-hidden="true">
          {stamped ? "✓" : "✳"}
        </span>
      ) : null}
    </div>
  );
}
