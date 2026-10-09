import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { prefersReducedMotion } from "../browser.ts";
import { useWindowEvent } from "../hooks.ts";
import type { Card, Journey } from "../types.ts";
import { pointOf, trailOf } from "./geometry.ts";
import type { Point, Trail } from "./geometry.ts";

/** One courier run: the planned journey and how far the courier has come. */
export interface Trip {
  busy: boolean;
  journey: Journey | null;
  collected: string[];
  activeAt: number | null;
  through: number;
  courier: Point | null;
  courierAt: number | null;
  echoing: boolean;
  trail: Trail | null;
}

export const IDLE_TRIP: Trip = {
  busy: false,
  journey: null,
  collected: [],
  activeAt: null,
  through: -1,
  courier: null,
  courierAt: null,
  echoing: false,
  trail: null,
};

export interface CourierRun {
  journey: Journey;
  cardAt: (index: number) => Card;
  onStamp: (count: number) => void;
  onArrive: (collected: string[]) => void;
}

function pauseAt(step: number, echoing: boolean): number {
  if (prefersReducedMotion()) return 20;

  if (step === 0) return 180;

  return echoing ? 650 : 420;
}

/**
 * Walks the courier along a journey one card at a time. The board cannot change
 * while the courier is out, so positions are measured as each step happens.
 */
export function useCourier(stageRef: RefObject<HTMLElement | null>) {
  const [trip, setTrip] = useState(IDLE_TRIP);
  const timer = useRef(0);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    [],
  );

  useWindowEvent("resize", () => {
    const stage = stageRef.current;

    if (!stage || !trip.journey) return;
    const { journey, through, courierAt } = trip;

    setTrip({
      ...trip,
      trail: trailOf(stage, journey, through),
      courier: courierAt === null ? null : pointOf(stage, courierAt),
    });
  });

  function stop() {
    window.clearTimeout(timer.current);
    setTrip(IDLE_TRIP);
  }

  function start({ journey, cardAt, onStamp, onArrive }: CourierRun) {
    const stage = stageRef.current;

    window.clearTimeout(timer.current);
    setTrip({ ...IDLE_TRIP, busy: true, journey });

    if (!stage) return;

    const visit = (index: number, collected: string[]) => {
      const step = journey.steps.at(index);

      if (!step) {
        setTrip((current) => ({ ...current, busy: false, echoing: false }));
        onArrive(collected);

        return;
      }

      const echoing = step.via?.type === "echo";

      setTrip((current) => ({
        ...current,
        courier: pointOf(stage, step.at),
        courierAt: step.at,
        echoing,
      }));
      timer.current = window.setTimeout(
        () => {
          const card = cardAt(step.at);
          const stamped = card.stamp && !collected.includes(card.id);
          const next = stamped ? [...collected, card.id] : collected;

          if (stamped) onStamp(next.length);
          setTrip((current) => ({
            ...current,
            activeAt: step.at,
            collected: next,
            through: index,
            trail: trailOf(stage, journey, index),
          }));
          visit(index + 1, next);
        },
        pauseAt(index, echoing),
      );
    };

    visit(0, []);
  }

  return { trip, start, stop };
}
