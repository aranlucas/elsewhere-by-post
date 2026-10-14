import type { RefObject } from "react";
import { PostcardArt } from "../art.tsx";
import { classes } from "../classes.ts";
import type { AuthoredLevel } from "../custom-map.ts";
import { network } from "../engine.ts";
import type { Journey } from "../types.ts";

export interface MakerBoardProps {
  level: AuthoredLevel;
  selected: number;
  preview: Journey | null;
  boardRef: RefObject<HTMLFieldSetElement | null>;
  onSelect: (index: number) => void;
}

export function MakerBoard({ level, selected, preview, boardRef, onSelect }: MakerBoardProps) {
  const { graph } = network(level, level.solution);

  return (
    <fieldset
      id="maker-board"
      ref={boardRef}
      className="board"
      aria-label="Select a postcard to edit"
      tabIndex={-1}
      style={{ "--columns": 3 }}
    >
      {level.cards.map((card, index) => {
        const connected = graph[index].flatMap((edge) =>
          edge.type === "road" ? [(edge.direction - card.rotation + 4) % 4] : [],
        );

        const visited = preview?.steps.some((step) => step.at === index) ?? false;

        return (
          // Card ids name the six fixed slots, so a slot keeps its node while its card is edited.
          <div
            key={card.id}
            className={classes("tile", selected === index && "selected", visited && "visited")}
            data-at={index}
          >
            <button
              type="button"
              className="tile-select"
              data-at={index}
              aria-label={`Edit postcard ${index + 1}: ${card.name}`}
              aria-pressed={selected === index}
              onClick={() => {
                onSelect(index);
              }}
            >
              <span className="art-window">
                <span
                  className="rotating-art"
                  style={{ transform: `rotate(${card.rotation * 90}deg)` }}
                >
                  <PostcardArt
                    card={card}
                    connectedPorts={connected}
                    echoActive={graph[index].some((edge) => edge.type === "echo")}
                  />
                </span>
              </span>
              <span className="tile-caption">
                <span>{card.name}</span>
                <span className="card-number">{index + 1}</span>
              </span>
            </button>
            {card.locked ? (
              <span className="pin-label" aria-hidden="true">
                ⌖ PINNED
              </span>
            ) : null}
            {card.stamp ? (
              <span className="stamp" aria-hidden="true">
                ✳
              </span>
            ) : null}
          </div>
        );
      })}
    </fieldset>
  );
}
