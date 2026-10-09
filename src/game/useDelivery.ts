import { useState } from "react";
import type { RefObject } from "react";
import { definition, traceJourney } from "../engine.ts";
import type { Board, Journey, Level } from "../types.ts";
import { NOTES, READY, deliveredStatus, deliveryNote, retryStatus } from "./messages.ts";
import type { Status } from "./messages.ts";
import { useCourier } from "./useCourier.ts";

export interface DeliverySetup {
  stageRef: RefObject<HTMLElement | null>;
  levelCount: number;
  markDelivered: (levelId: string) => string[];
  play: (frequency: number, duration?: number) => void;
}

/** Sending the courier, what the desk says about it, and which journeys are delivered. */
export function useDelivery({ stageRef, levelCount, markDelivered, play }: DeliverySetup) {
  const { trip, ...courier } = useCourier(stageRef);
  const [status, setStatus] = useState(READY);
  const [delivery, setDelivery] = useState<string | null>(null);

  /** Calls the courier back and clears the last delivery, then says something new. */
  function respond(next: Status) {
    courier.stop();
    setDelivery(null);
    setStatus(next);
  }

  function arrive(level: Level, journey: Journey, collected: string[]) {
    if (!journey.success) {
      setStatus(retryStatus(level, journey));

      return;
    }

    const delivered = markDelivered(level.id);

    setStatus(deliveredStatus(journey, collected.length));
    setDelivery(deliveryNote(level, delivered.length === levelCount));
    play(880, 0.3);
  }

  /** Sends the courier along the board's best journey, or recalls one already out. */
  function send(level: Level, board: Board) {
    if (trip.busy) {
      respond(NOTES.recalled);

      return;
    }

    const journey = traceJourney(level, board);

    respond(NOTES.sending);
    courier.start({
      journey,
      cardAt: (at) => definition(level, board[at].id),
      onStamp: (count) => {
        play(520 + count * 65, 0.16);
      },
      onArrive: (collected) => {
        arrive(level, journey, collected);
      },
    });
  }

  return { trip, status, delivery, setStatus, respond, send };
}
