import type { ReactNode } from "react";
import { EnvelopeIcon } from "../icons.tsx";
import { Link } from "react-router";
import { classes } from "../classes.ts";
import { journeyPath } from "./journeyUrl.ts";
import type { Level } from "../types.ts";

const JOURNEY_NAMES = ["Turn", "Swap", "Wander", "Echo", "Detour", "Elsewhere", "Yours"];

/** A slim game bar: the title, whatever level picker sits in `children`, and help. */
export function GameHeader({ onHelp, children }: { onHelp: () => void; children: ReactNode }) {
  return (
    <header className="masthead topbar">
      <div className="brand">
        <span className="logo">
          <EnvelopeIcon />
        </span>
        <h1 id="game-title">
          Elsewhere, <em>by Post.</em>
        </h1>
      </div>
      {children}
      <button type="button" className="help-open" aria-label="How to play" onClick={onHelp}>
        ?
      </button>
    </header>
  );
}

export interface JourneyNavProps {
  levels: Level[];
  current: number;
  completed: string[];
}

export function JourneyNav({ levels, current, completed }: JourneyNavProps) {
  return (
    <nav className="journeys" aria-label="Choose a journey">
      {levels.map((level, index) => {
        const done = completed.includes(level.id);

        return (
          <Link
            key={level.id}
            to={journeyPath(levels, index)}
            className={classes("journey", index === current && "current", done && "complete")}
            aria-label={`Journey ${index + 1}: ${level.title}${done ? ", delivered" : ""}`}
            aria-current={index === current ? "page" : undefined}
            title={JOURNEY_NAMES[index]}
          >
            <span className="journey-number">{index + 1}</span>
            <span className="journey-label">{JOURNEY_NAMES[index]}</span>
            {done && (
              <span className="journey-check" aria-hidden="true">
                ✓
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
