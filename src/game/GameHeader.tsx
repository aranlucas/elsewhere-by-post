import { EnvelopeIcon } from "../icons.tsx";
import { Link } from "react-router";
import { classes } from "../classes.ts";
import { journeyPath } from "./journeyUrl.ts";
import type { Level } from "../types.ts";

const JOURNEY_NAMES = ["Turn", "Swap", "Wander", "Echo", "Detour", "Elsewhere", "Yours"];

export const journeyNumber = (index: number): string => String(index + 1).padStart(2, "0");

export function GameHeader({ onHelp }: { onHelp: () => void }) {
  return (
    <>
      <header className="masthead">
        <div className="edition">
          <span className="logo">
            <EnvelopeIcon />
          </span>
          <span>
            THE ELSEWHERE POSTAL SERVICE
            <br />
            <b>A LITTLE EXPERIMENT IN GETTING THERE</b>
          </span>
        </div>
        <button type="button" className="quiet help-open" aria-label="How to play" onClick={onHelp}>
          How to play <span className="question">?</span>
        </button>
      </header>
      <section className="intro" aria-labelledby="game-title">
        <div>
          <p className="eyebrow">SIX POSTCARDS FROM AN IMPOSSIBLE WORLD</p>
          <h1 id="game-title">
            Elsewhere,
            <br />
            <em>by Post.</em>
          </h1>
        </div>
        <div className="intro-note">
          <span className="hand-drawn-star">✳</span>
          <p>
            <span>Turn a place.</span>
            <br />
            <span>Swap the world.</span>
            <br />
            <b>Deliver a little wonder.</b>
          </p>
        </div>
      </section>
    </>
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
          >
            <span>{journeyNumber(index)}</span>
            <span className="journey-label">{JOURNEY_NAMES[index]}</span>
            <span className="journey-check" aria-hidden="true">
              {done ? "✓" : "·"}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
