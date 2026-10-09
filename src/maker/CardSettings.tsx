import { LANDMARKS, isEcho, isLandmark } from "../custom-map.ts";
import type { MapCard } from "../custom-map.ts";
import { compass } from "../levels.ts";
import type { EchoColor } from "../types.ts";
import { CommitInput } from "./CommitInput.tsx";

const ROAD_OPTIONS = Array.from({ length: 16 }, (_, mask) => {
  const ports = compass.flatMap((_direction, i) => ((mask & (1 << i)) === 0 ? [] : [i]));

  return {
    value: ports.join(","),
    label:
      ports.length > 0
        ? ports.map((i) => compass[i][0].toUpperCase() + compass[i].slice(1)).join(" + ")
        : "No roads",
  };
});

type CardEdit = (change: (card: MapCard) => void) => void;

function RoadsField({ ports, onEdit }: { ports: number[]; onEdit: CardEdit }) {
  return (
    <label className="field" htmlFor="roads">
      <span id="roads-label">Roads before turning</span>
      <select
        id="roads"
        aria-labelledby="roads-label"
        value={ports.join(",")}
        onChange={(event) => {
          const value = event.target.value;

          onEdit((target) => {
            target.ports = value === "" ? [] : value.split(",").map(Number);
          });
        }}
      >
        {ROAD_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function EchoField({
  echo,
  disabled,
  onEdit,
}: {
  echo: EchoColor | null;
  disabled: boolean;
  onEdit: CardEdit;
}) {
  return (
    <label className="field" htmlFor="echo">
      <span id="echo-label">Echo door</span>
      <select
        id="echo"
        aria-labelledby="echo-label"
        value={echo ?? ""}
        disabled={disabled}
        onChange={(event) => {
          const value = event.target.value;

          onEdit((target) => {
            target.echo = isEcho(value) ? value : null;
          });
        }}
      >
        <option value="">No echo</option>
        <option value="blue">Blue echo</option>
        <option value="coral">Coral echo</option>
      </select>
    </label>
  );
}

export interface CardSettingsProps {
  index: number;
  card: MapCard;
  onEdit: CardEdit;
}

export function CardSettings({ index, card, onEdit }: CardSettingsProps) {
  const pinned = index === 0 || index === 5;

  return (
    <>
      <p className="eyebrow" id="selected-label">
        POSTCARD {String(index + 1).padStart(2, "0")}
        {pinned ? " · PINNED" : ""}
      </p>
      <h2 id="selected-name">{card.name}</h2>
      <label className="field" htmlFor="landmark">
        <span id="landmark-label">Landmark</span>
        <select
          id="landmark"
          aria-labelledby="landmark-label"
          value={card.art}
          disabled={pinned}
          onChange={(event) => {
            const art = event.target.value;

            if (isLandmark(art))
              onEdit((target) => {
                target.art = art;
              });
          }}
        >
          {pinned ? (
            <option value={card.art}>{index === 0 ? "Departure house" : "Delivery house"}</option>
          ) : (
            Object.entries(LANDMARKS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))
          )}
        </select>
      </label>
      <label className="field" htmlFor="card-name">
        Postcard name
        <CommitInput
          key={index}
          id="card-name"
          maxLength={36}
          value={card.name}
          onCommit={(name) => {
            onEdit((target) => {
              target.name = name;
            });
          }}
        />
      </label>
      <RoadsField ports={card.ports} onEdit={onEdit} />
      <div className="orientation">
        <span id="orientation-label">Facing {compass[card.rotation]}</span>
        <button
          type="button"
          id="maker-turn"
          className="tool"
          onClick={() => {
            onEdit((target) => {
              target.rotation = (target.rotation + 1) % 4;
            });
          }}
        >
          Turn this card ↻
        </button>
      </div>
      <label className="check-field">
        <input
          id="stamp"
          type="checkbox"
          checked={card.stamp}
          disabled={pinned}
          onChange={(event) => {
            const stamp = event.target.checked;

            onEdit((target) => {
              target.stamp = stamp;
            });
          }}
        />{" "}
        Collect a postage stamp here
      </label>
      <EchoField echo={card.echo} disabled={pinned} onEdit={onEdit} />
      <p className="field-note" id="pinned-note" hidden={!pinned}>
        Departure and delivery are pinned, with no stamps or echoes. Their roads and orientation are
        yours to choose.
      </p>
    </>
  );
}
