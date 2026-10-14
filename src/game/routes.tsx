import type { loadGame } from "./loaders.ts";
import { Navigate, Outlet, useLoaderData, useOutletContext, useParams } from "react-router";
import { browserStorage } from "../browser.ts";
import type { Level } from "../types.ts";
import { Journey } from "./journey.tsx";
import { journeyIndex, journeyPath } from "./journey-url.ts";
import { useSession } from "./use-session.ts";
import type { GameSession } from "./use-session.ts";

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

  if (index === null) {
    return <Navigate to={journeyPath(levels, session.lastVisited())} replace />;
  }

  return <Journey key={levels[index].id} levels={levels} levelIndex={index} session={session} />;
}
