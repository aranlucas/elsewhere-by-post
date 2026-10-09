import { useRef } from "react";
import { Link } from "react-router";
import { isTextEntry, prefersReducedMotion } from "../browser.ts";
import { definition } from "../engine.ts";
import { DeliveryBanner } from "./DeliveryBanner.tsx";
import { DispatchPanel } from "./DispatchPanel.tsx";
import { GameHeader, JourneyNav } from "./GameHeader.tsx";
import { HelpDialog } from "./HelpDialog.tsx";
import { MapPanel } from "./MapPanel.tsx";
import { useDragSwap } from "./useDragSwap.ts";
import { useGame } from "./useGame.ts";
import type { JourneySetup } from "./useGame.ts";
import { useGameKeys } from "./useGameKeys.ts";
import "../play.css";

export function Journey(setup: JourneySetup) {
  const { levels, levelIndex, session } = setup;
  const game = useGame(setup);
  const { level, board, trip, actions } = game;
  const helpRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const drag = useDragSwap({
    canMove: (at) => !trip.busy && !definition(level, board[at].id).locked,
    onSwap: (at, to) => {
      actions.perform({ type: "swap", at, to });
    },
  });

  useGameKeys({
    columns: level.columns,
    count: board.length,
    selected: game.selected,
    boardRef: game.boardRef,
    ignore: (event) => helpRef.current?.open === true || isTextEntry(event.target),
    onTurn: (at, counterclockwise) => {
      actions.perform({ type: "rotate", at, counterclockwise });
    },
    onUndo: actions.undo,
    onSend: actions.sendCourier,
    onClear: actions.clearSelection,
  });

  function nextPostcard() {
    titleRef.current?.scrollIntoView({
      block: "start",
      behavior: prefersReducedMotion() ? "instant" : "smooth",
    });
    actions.nextJourney();
  }

  return (
    <>
      <main className="desk play">
        <GameHeader onHelp={() => helpRef.current?.showModal()}>
          <JourneyNav levels={levels} current={levelIndex} completed={session.completed} />
        </GameHeader>
        <section className="play-area" aria-labelledby="level-title">
          <MapPanel
            level={level}
            board={board}
            chapter={`JOURNEY ${levelIndex + 1} OF ${levels.length}`}
            moves={game.moves}
            selected={game.selected}
            canUndo={game.canUndo}
            trip={trip}
            drag={drag.drag}
            boardRef={game.boardRef}
            stageRef={game.stageRef}
            titleRef={titleRef}
            onSelect={actions.selectCard}
            onTurn={(at) => {
              actions.perform({ type: "rotate", at });
            }}
            onUndo={actions.undo}
            onReset={actions.reset}
            onPointerDown={drag.onPointerDown}
            onClickCapture={drag.onClickCapture}
            overlay={
              <DeliveryBanner
                delivery={game.delivery}
                isLastLevel={levelIndex === levels.length - 1}
                onNext={nextPostcard}
                onRemix={actions.remix}
              />
            }
          />
          <DispatchPanel
            level={level}
            board={board}
            busy={trip.busy}
            collected={trip.collected}
            status={game.status}
            hintOpen={game.hintOpen}
            onSend={actions.sendCourier}
            onToggleHint={actions.toggleHint}
            onApplyHint={actions.applyHint}
          />
        </section>
        <footer>
          <span id="save-status">{session.message}</span>
          <label className="sound-option">
            <input
              id="sound"
              type="checkbox"
              checked={session.sound}
              onChange={(event) => {
                actions.setSound(event.target.checked);
              }}
            />{" "}
            Soft sounds
          </label>
          <Link className="maker-link" to="/maker">
            Make your own map ↗
          </Link>
        </footer>
      </main>
      <HelpDialog ref={helpRef} />
    </>
  );
}
