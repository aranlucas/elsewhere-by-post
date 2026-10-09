import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, redirect } from "react-router";
import { RouterProvider } from "react-router/dom";
import { GameLayout, JourneyRoute, lastJourneyRedirect, loadGame } from "./game/routes.tsx";
import { registerOfflineCache } from "./offline.ts";
import "./style.css";

const router = createBrowserRouter([
  { path: "/", loader: lastJourneyRedirect },
  {
    path: "/journeys",
    loader: loadGame,
    // Progress lives in the layout's session while moving between journeys.
    shouldRevalidate: () => false,
    Component: GameLayout,
    children: [
      { index: true, loader: lastJourneyRedirect },
      { path: ":journey", Component: JourneyRoute },
    ],
  },
  {
    path: "/maker",
    lazy: {
      loader: async () => (await import("./maker/Maker.tsx")).loader,
      Component: async () => (await import("./maker/Maker.tsx")).Maker,
    },
  },
  // Links from before the game had routes.
  { path: "/maker.html", loader: () => redirect("/maker") },
  { path: "*", loader: () => redirect("/") },
]);

const root = document.querySelector("#app");

if (!root) throw new Error("Missing #app root");

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

registerOfflineCache();
