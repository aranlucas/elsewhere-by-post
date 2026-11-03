# Elsewhere, by Post

A tiny impossible postcard map. Turn a place, swap the world, deliver a little wonder.

**Play it:** https://elsewhere-by-post.aranlucas.workers.dev

Six handcrafted journeys teach quarter-turn roads, swapping illustrated landmarks, collecting postage stamps, and compass-sensitive **echo doors**. Matching doors connect distant postcards when their arrows agree. Each pair can be crossed once per journey. Departure and delivery stay pinned.

## Play locally

Use the Node.js version in `.node-version` and the pnpm version pinned in `package.json`.

```sh
git clone https://github.com/aranlucas/elsewhere-by-post.git
cd elsewhere-by-post
pnpm install
pnpm dev
```

Open the URL printed by the dev server. `pnpm dev` uses [Portless](https://github.com/vercel-labs/portless); `pnpm exec vite` runs a direct local server if you do not want to configure its proxy.

To try the production build locally:

```sh
pnpm build
pnpm preview
```

`preview` serves the build through the Cloudflare Workers runtime, including its headers and service worker.

Each journey has its own URL: `/journeys/1` to `/journeys/6`, and `/journeys/yours` for a custom map saved on this device. `/` opens the journey you visited last. A custom journey URL does not share its map; use JSON export/import below.

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

The courier follows a legal route that visits every stamp and uses each required echo. Failed attempts show a partial journey and name what is missing. There is no clock or failure penalty. Nudges offer a clue and optional one-card assistance; they remain undoable. After delivery, Shuffle offers another recoverable arrangement of that map.

## Make your own little world

Open `/maker`, or use “Make your own map” in the game footer. Edit the six postcards’ landmarks, roads, orientations, stamps and echoes. Departure and delivery remain pinned. Author a solved arrangement first: play/export require a legal route collecting every stamp and crossing each echo pair once.

Shuffle & play saves a custom journey on this device and adds a “Yours” postcard to the game. A nudge restores one part of the authored solution. Some maps may still be connected after shuffling; validation promises solvability, not difficulty or uniqueness. A new shuffle starts fresh custom progress while preserving the built-in journeys.

The editor saves a local draft and supports undo, including after import. Export downloads the map design as JSON, without game progress. Import accepts at most 32 KiB and exactly six cards with built-in landmarks. Malformed imports preserve the current draft; names remain literal text, unknown fields are stripped, and maps cannot load scripts or external assets. An unsolved layout can remain a local draft, but cannot be played or exported. If storage is blocked, a valid map can still be exported.

## Local saves and offline play

Progress, board state, undo history and mapmaker drafts stay in this origin’s browser storage. There are no accounts, analytics, network APIs or external AI calls. Sound is off initially; reduced-motion preferences are respected.

After the service worker successfully caches the first visit, both game and mapmaker work offline. Clearing site storage removes local progress, drafts, the playable custom map and cached files. Export a custom map first if you want to keep its design. When storage is blocked, the game remains playable for the visit and shows a saving notice.

## Verification

```sh
pnpm check       # formatting, lint, types, unit tests and production build
pnpm test        # engine, storage and custom-map unit tests
pnpm test:e2e    # build, then Playwright against the production preview
```

Browser tests use an installed Chrome by default, in an isolated profile. To use Playwright Chromium instead:

```sh
pnpm exec playwright install chromium
PLAY_BROWSER_CHANNEL=chromium pnpm test:e2e
```

CI runs these checks with Playwright Chromium, including offline and accessibility checks; it does not deploy.

## Deployment

The app uses [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/). `cloudflare.config.ts` sets the Worker name and single-page-app fallback; `public/_headers` supplies the same-origin content security policy.

```sh
pnpm run deploy   # cf deploy builds and deploys; plain pnpm deploy is a pnpm built-in
```

For Workers Builds, the build command is `pnpm run build`, followed by the production deploy command `pnpm exec cf deploy --prebuilt --mode production`. The pull-request preview command is `pnpm exec cf previews deploy`.

See [the roadmap](ROADMAP.md) for planned player and mapmaker improvements.
