import { useState } from "react";
import { tone } from "../sound.ts";

/** The soft-sounds preference and a way to play a note when it is on. */
export function useSound(initial: boolean) {
  const [enabled, setEnabled] = useState(initial);

  return {
    enabled,
    play: (frequency: number, duration?: number) => {
      if (enabled) tone(frequency, duration);
    },
    set: (next: boolean) => {
      setEnabled(next);

      if (next) tone(660, 0.15);
    },
  };
}
