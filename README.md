# Elsewhere, by Post

A tiny impossible postcard map. Turn a place, swap the world, deliver a little wonder.

**Play it:** https://elsewhere-by-post.aranlucas.workers.dev

The prototype includes a local mapmaker for designing, checking and playing your own six-postcard worlds.

Six handcrafted journeys teach quarter-turn roads, swapping illustrated landmarks, collecting postage stamps, and compass-sensitive **echo doors**. Matching doors connect distant postcards when their arrows agree. Each pair can be crossed once per journey. Departure and delivery stay pinned.

![An echo journey](evidence/desktop-echo-map.png)

## Play locally

Requires Node.js 22.18 or later and [pnpm](https://pnpm.io) (the version pinned in `package.json`; `corepack enable` provides it). Built with React, React Router, TypeScript and Vite; no accounts or credentials.

```sh
git clone https://github.com/aranlucas/elsewhere-by-post.git
cd elsewhere-by-post
pnpm install
pnpm dev
```

Open **https://elsewhere-by-post.localhost**. `pnpm dev` runs Vite through [Portless](https://github.com/vercel-labs/portless) (a dev dependency); its first run may ask for `sudo` to bind port 443 and trust a local certificate. Without Portless, `pnpm exec vite` serves the same app on a local port. Closing the server ends the session; the next visit restores your desk.

```sh
pnpm build
pnpm preview
```

`preview` serves the production build from the Cloudflare Workers runtime (workerd) via the [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/), with the same headers, routing and service worker that ship.

Each journey has its own URL: `/journeys/1` to `/journeys/6`, and `/journeys/yours` for a published custom map. `/` opens the journey you visited last.

## Controls

| Action              | Pointer / touch                             | Keyboard                         |
| ------------------- | ------------------------------------------- | -------------------------------- |
| Select              | Tap a postcard                              | Tab / arrow keys, then Enter     |
| Turn                | ↻ on a card, or select and use Turn card    | R; Shift+R turns back            |
| Swap                | Tap two postcards, or drag one onto another | Select two cards with Enter      |
| Undo                | Undo                                        | U                                |
| Send / stop courier | Send / Stop                                 | P                                |
| Clear selection     | Tap selected card                           | Escape                           |
| Reset               | Reset                                       | Focus the Reset button and Enter |

The courier takes a shortest legal journey that visits every stamp and uses each required echo. Failed attempts show a reachable partial journey and name what is missing. There is no clock or failure penalty. Nudges offer an authored clue and optional one-card assistance; they remain undoable. After delivery, Shuffle offers another recoverable arrangement of that map.

## Make your own little world

Open **https://elsewhere-by-post.localhost/maker**, or use “Make your own map” in the game footer. Select one of six postcards and choose its landmark, roads, orientation, stamp and echo. Departure and delivery remain pinned. Author a solved arrangement first; the route check uses the same engine as the game and proves that a legal itinerary collects all stamps and crosses each echo once.

Shuffle & play saves a playable custom journey on this device and adds a “Yours” postcard to the game. Its nudge can always restore the authored witness. Some forgiving maps may still be connected after shuffling; validation promises solvability, not difficulty or uniqueness. Publishing a new shuffle gives that custom journey fresh progress while preserving the six built-in journeys.

The editor saves a local draft and supports undo. Export downloads a compact JSON map; import accepts six known landmarks and at most 32 KiB of data, rejects malformed shapes and preserves the current map on failure. Names render as literal text. No custom scripts, asset URLs, credentials, game progress or other personal data are exported. An invalid current layout can be kept as a local draft, but play/export require a validated route. If browser storage is blocked, a valid map can still be exported.

Both the editor and custom play work offline after the first successful cached visit.

## Verification

```sh
pnpm check            # oxfmt check, strict oxlint (type-aware), tsc, Vitest, production build
pnpm test             # Vitest: deterministic engine, storage and custom-map tests
pnpm test:browser     # Builds, then Playwright playthroughs against `vite preview`
```

Linting is strict: every oxlint correctness, suspicious, pedantic and perf rule, plus the TypeScript (type-aware), React, React hooks, jsx-a11y, import, unicorn, promise and Vitest plugins, and the vendored anti-slop rules. `.oxlintrc.json` records the few rules that are configured or turned off and why. Untrusted saves and imported maps are parsed with [zod](https://zod.dev) schemas before they become game data.

Browser tests use Chrome through Playwright's `channel: 'chrome'`. They never use your personal Chrome profile. Install Chrome from its official vendor if it is absent, or change the config to an installed Playwright Chromium. The suite includes axe WCAG A/AA checks.

GitHub CI installs official Playwright Chromium on an isolated Linux runner and runs the same suite using `PLAY_BROWSER_CHANNEL=chromium`. It checks formatting, lint, types, unit tests, the build, browser playthroughs, offline behavior and accessibility; its workflow does not deploy the game.

## Small, local, portable

- React components over native HTML controls, CSS and original inline SVG art; React Router for journeys and the mapmaker.
- A pure route engine is separate from rendering, storage and sound.
- Optional quiet synthesized sound; off initially. Reduced-motion preference is respected.
- Progress, board state and undo history stay in this origin's `localStorage`. No accounts, analytics, personal data, network APIs or external AI calls.
- A service worker caches all game assets after the first successful visit. Reloads and play then work offline. Clearing site storage removes local progress and cached files. In browsers that block storage, a session remains playable and a notice explains that saving is unavailable.
- Build output is a static site. The Workbox service worker (via `vite-plugin-pwa`) precaches every hashed asset, so new builds replace old caches automatically.

## Deployment

The game is deployed at https://elsewhere-by-post.aranlucas.workers.dev as a static single-page app on [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/); no runtime Worker code runs.

```sh
pnpm run deploy   # cf deploy builds and deploys the project (plain `pnpm deploy` is a built-in pnpm command)
```

`cloudflare.config.ts` configures the Worker and its single-page-app asset fallback. The Cloudflare Vite plugin builds the static assets, and `cf deploy` validates and deploys them to Workers. Unknown paths fall back to `index.html` so React Router can resolve `/journeys/…` and `/maker`. `public/_headers` supplies a same-origin content security policy.

## Source map

| Path                           | Purpose                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| `src/engine.ts`                | Reciprocal edge graph, echo alignment, legal stamp-aware journey search, hints, shuffles    |
| `src/levels.ts`                | Six authored levels with independently checked witness arrangements                         |
| `src/storage.ts`               | Save schema (zod) with per-field recovery from corrupt data                                 |
| `src/custom-map.ts`            | Custom-map schema (zod), witness validation, draft/publication storage and shuffle identity |
| `src/main.tsx`                 | Router: `/journeys/:journey`, lazy `/maker`, redirects                                      |
| `src/game/`                    | Game routes, session, desk/courier/drag/keyboard hooks and view components                  |
| `src/maker/`                   | Mapmaker route: draft editing, route check and JSON import/export                           |
| `src/art.tsx`, `src/icons.tsx` | Original vector landmarks and icons                                                         |
| `tests/`                       | Vitest unit tests and Playwright browser playthroughs                                       |
