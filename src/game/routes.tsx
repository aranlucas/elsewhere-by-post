import {
  Navigate,
  Outlet,
  redirect,
  useLoaderData,
  useOutletContext,
  useParams,
} from "react-router";
import { browserStorage } from "../browser.ts";
import { readPublishedLevel } from "../custom-map.ts";
import { LEVELS } from "../levels.ts";
import { loadSave, persistSave } from "../storage.ts";
import type { Level } from "../types.ts";
import { Journey } from "./Journey.tsx";
import { journeyIndex, journeyPath } from "./journeyUrl.ts";
import { useSession } from "./useSession.ts";
import type { GameSession } from "./useSession.ts";

/** Reads everything the game needs from this device: levels (with a published map) and the save. */
export function loadGame() {
  const storage = browserStorage();
  const custom = readPublishedLevel(storage);
  const levels = custom ? [...LEVELS, custom] : LEVELS;
  const save = loadSave(storage, levels);

  return { levels, save, saved: persistSave(storage, save) };
}

/** `/` and `/journeys` open the journey visited last. */
export function lastJourneyRedirect() {
  const { levels, save } = loadGame();

  return redirect(journeyPath(levels, save.levelIndex));
}

interface GameContext {
  levels: Level[];
  session: GameSession;
}

/** Holds progress across journeys, so moving between them never reloads the save. */
export function GameLayout() {
  const { levels, save, saved } = useLoaderData<typeof loadGame>();
  const session = useSession(browserStorage(), save, saved);

  return (
    <>
      <title>Elsewhere, by Post — a tiny impossible map</title>
      <a className="skip-link" href="#board">
        Skip to postcards
      </a>
      <Outlet context={{ levels, session } satisfies GameContext} />
    </>
  );
}

/** Each journey mounts fresh from the save, so switching journeys resets the desk's moment-to-moment state. */
export function JourneyRoute() {
  const { journey } = useParams();
  const { levels, session } = useOutletContext<GameContext>();
  const index = journeyIndex(journey, levels);

  if (index === null) return <Navigate to={journeyPath(levels, session.lastVisited())} replace />;

  return <Journey key={levels[index].id} levels={levels} levelIndex={index} session={session} />;
}
