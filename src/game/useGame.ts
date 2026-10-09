import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { definition, nextHint } from "../engine.ts";
import { tone } from "../sound.ts";
import type { Action, Level } from "../types.ts";
import { journeyPath } from "./journeyUrl.ts";
import { NOTES, moveStatus } from "./messages.ts";
import { useDelivery } from "./useDelivery.ts";
import { savedDesk, useDesk } from "./useDesk.ts";
import type { GameSession } from "./useSession.ts";

export interface JourneySetup {
  levels: Level[];
  levelIndex: number;
  session: GameSession;
}

/** One open journey: its desk, the courier, and what the desk says. */
export function useGame({ levels, levelIndex, session }: JourneySetup) {
  const level = levels[levelIndex];
  const navigate = useNavigate();
  const boardRef = useRef<HTMLFieldSetElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const { visit } = session;

  const play = (frequency: number, duration?: number) => {
    if (session.sound) tone(frequency, duration);
  };

  const desk = useDesk(
    level,
    () => savedDesk(session.deskFor(level.id), level),
    boardRef,
    (next) => {
      session.recordDesk(level.id, next);
    },
  );

  const dispatch = useDelivery({
    stageRef,
    levelCount: levels.length,
    markDelivered: session.markDelivered,
    play,
  });

  const { trip, respond, setStatus } = dispatch;
  const { board, selected } = desk;

  useEffect(() => {
    visit(levelIndex);
  }, [visit, levelIndex]);

  function perform(action: Action, announce = true) {
    if (trip.busy) return;
    const next = desk.perform(action);

    if (!next) return;

    respond(announce ? moveStatus(action, next) : dispatch.status);
    play(action.type === "swap" ? 440 : 330, 0.06);
  }

  function selectCard(at: number) {
    if (trip.busy) return;

    if (definition(level, board[at].id).locked) {
      desk.setSelected(null);
      setStatus(NOTES.pinned);
    } else if (selected === at) desk.setSelected(null);
    else if (selected === null) desk.setSelected(at);
    else perform({ type: "swap", at: selected, to: at });
  }

  const actions = {
    perform,
    selectCard,
    nextJourney: () => {
      void navigate(journeyPath(levels, (levelIndex + 1) % levels.length));
    },
    sendCourier: () => {
      if (!trip.busy) desk.setSelected(null);
      dispatch.send(level, board);
    },
    undo: () => {
      if (!trip.busy && desk.undo()) respond(NOTES.undone);
    },
    reset: () => {
      if (trip.busy) return;
      desk.reset();
      respond(NOTES.reset);
    },
    remix: () => {
      desk.remix();
      respond(NOTES.remixed);
    },
    applyHint: () => {
      const action = nextHint(level, board);

      if (action) perform(action, false);
      setStatus(action ? NOTES.hinted : NOTES.hintReady);
    },
    toggleHint: () => {
      setHintOpen((open) => !open);
    },
    clearSelection: () => {
      desk.setSelected(null);
    },
    setSound: (enabled: boolean) => {
      session.setSound(enabled);

      if (enabled) tone(660, 0.15);
    },
  };

  return {
    level,
    board,
    moves: desk.moves,
    selected,
    canUndo: desk.history.length > 0,
    trip,
    status: dispatch.status,
    delivery: dispatch.delivery,
    hintOpen,
    boardRef,
    stageRef,
    actions,
  };
}
