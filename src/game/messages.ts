import { definition } from "../engine.ts";
import { compass } from "../levels.ts";
import type { Action, Board, Journey, Level } from "../types.ts";

export interface Status {
  text: string;
  detail: string;
  mood: "" | "success" | "retry";
}

export const status = (text: string, detail = "", mood: Status["mood"] = ""): Status => ({
  text,
  detail,
  mood,
});

export const READY = status("Ready when you are.");

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function moveStatus(action: Action, board: Board): Status {
  return action.type === "swap"
    ? status("A change of scenery.", "The roads moved with their postcards.")
    : status("A new perspective.", `Now facing ${compass[board[action.at].rotation]}.`);
}

export function deliveredStatus(journey: Journey, stamps: number): Status {
  const echoes = journey.usedEchoes.length;
  const crossed = echoes > 0 ? ` · ${plural(echoes, "echo crossed", "echoes crossed")}` : "";

  return status(
    "Delivered. Beautifully improbable.",
    `${plural(stamps, "stamp", "stamps")} collected${crossed}.`,
    "success",
  );
}

export function retryStatus(level: Level, journey: Journey): Status {
  const missing = journey.missing.map((id) => definition(level, id).name);
  const text = journey.steps.length === 1 ? "A road is waiting to meet." : "Nearly somewhere.";

  if (missing.length > 0)
    return status(
      text,
      `Still need: ${missing.join(", ")}. Turn or swap a postcard, then try again.`,
      "retry",
    );

  if (journey.missingEchoes.length > 0)
    return status(
      text,
      `Use the ${journey.missingEchoes.join(" and ")} echo on the journey. Align its arrows.`,
      "retry",
    );

  return status(text, "The stamps are collected. Now connect the last road to delivery.", "retry");
}

export function deliveryNote(level: Level, allDelivered: boolean): string {
  return allDelivered
    ? "Every letter found its way. The world is yours to reshuffle."
    : `A small miracle for ${level.place.toLowerCase()}.`;
}

/** Fixed responses to the player's actions. */
export const NOTES = {
  pinned: status(
    "This place is pinned.",
    "Departure and delivery stay put. Move the world around them.",
  ),
  undone: status("One step back.", "A good way to find a new way forward."),
  reset: status("A fresh little world.", "The postcards are back where they began."),
  remixed: status(
    "Same places. A fresh impossibility.",
    "This shuffle has a route. Your nudge still works.",
  ),
  hintReady: status("Your journey is ready.", "Send the courier and watch the world connect."),
  hinted: status(
    "A little help from the map.",
    "One postcard moved toward an authored solution. You can undo it.",
  ),
  recalled: status("The courier is back at the desk.", "Your map is ready to rearrange."),
  sending: status("A little letter, on its way…", "Following the roads and listening for echoes."),
} satisfies Record<string, Status>;
