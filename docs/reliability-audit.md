# Reliability audit — 2026-11-06

## Baseline and scope

Started from clean remote default `093fc9e` (merged untangle pass #31). This is a new behavior audit; public routes, map/save formats and intended puzzle rules stay intact. No local tests, browser runs or builds are authorized. Validation below is CI only.

## Inventory and trust boundaries

- `src/engine.ts`, `levels.ts`: six built-in puzzles, reciprocal roads, one-use echoes, stamp collection, delivery terminus, hints and shuffles. Reviewed against engine tests and README.
- `src/game/*`: route selection, per-journey remount, move/undo/reset, pointer/keyboard input, timer-driven courier and completion; `use-session.ts` persists progress and sound.
- `src/storage.ts`: versioned localStorage with field-level Zod recovery; board/history identity checks and bounded history. Writes catch blocked storage/quota failures.
- `src/custom-map.ts`, `src/maker/*`: bounded JSON import, Zod normalization, pinned endpoints, echo/stamp/route validation, draft/undo, export and published map. Untrusted names render as React text, no external assets or executable map data.
- `src/main.tsx`, `game/journey-url.ts`: public journey/maker/legacy routes and last-visited redirect. No server APIs, authentication, tenants, production transactions or network retries exist. Storage is device/origin scoped; simultaneous browser tabs have last-writer-wins saves, not an account synchronization contract.
- `src/offline.ts`, `sound.ts`, `hooks.ts`, `game/flip.ts`: optional service-worker/audio failures, effect listener/timer cleanup and presentation. Static Workers config, CSP, manifests, CSS/art and package/CI configuration also in scope.
- Existing Vitest covers puzzle rules, data validity, corruption recovery and custom-map contracts. Existing Playwright covers complete deliveries, author/import/export/play, navigation, offline and accessibility. Keep these tests.

## Confirmed findings (before implementation)

### R1 — false durability claim after storage fails (medium, high confidence)

`src/game/use-session.ts`: `visit` ignores `persistSave`'s boolean; `message` selects OFFLINE ahead of `saved`. Realistic trigger: initial save succeeds, browser storage becomes quota-limited, then user navigates to another journey. The last-visited write fails but the footer still claims it is saved. If the offline event fires while saving is unavailable, the footer explicitly says the desk is saved locally. Expected: failure notice whenever the latest save failed, including offline; retain in-memory play and retry on online. Actual: success claim can encourage leaving a visit whose progress is not durable.

Regression contract: browser fixture forces setItem to throw after successful initial load; navigation must show unavailable, offline must preserve that notice, restoring storage and dispatching online must persist the current journey and restore saved status. A separate blocked-from-start case covers offline failure. These assertions must fail against baseline in CI.

### R2 — delayed import overwrites a newer draft (medium, high confidence)

`src/maker/maker.tsx#importMap` awaits File.text and then uses the draft closure from the starting render. If reading is delayed and the user edits or imports again, the old completion replaces the newer map and history; its finally also clears the shared input. Expected: only the still-current import may replace an unchanged draft. Guard completion with a request generation invalidated on draft changes and unmount, and clear the selected input at request start. CI regression defers File.text explicitly, edits the title, then releases the stale read and asserts the edit and undo remain intact; also covers reversed import completion order.

## Rejected hypotheses and limits

- A shuffled custom map can already be solved: explicitly permitted in README and UNTANGLE-DECISIONS, and existing custom-map tests promise recoverability rather than difficulty. No change.
- Malformed save/map can inject executable markup or move pinned endpoints: existing Zod boundaries and React text rendering reject/prevent this; no proven defect.
- Courier callback writes after changing journeys: per-level key remount and useCourier timeout cleanup cancel it. Stop/reset cancels timer. No proven defect.
- Optional audio errors or service-worker registration failure must block play: existing intended graceful degradation, no change.
- Cross-tab merge semantics are not specified; no speculative persistence redesign.

## Requested e2e framework

Current published npm metadata confirms `e2e@0.23.0` and `@e2e-dev/web@0.15.5`, both requiring Node ^22.22.3 or >=24.8. Existing pinned Node 24.22.1 qualifies. Read current quickstart, CI, GitHub Actions and web docs from e2e.com, plus pinned Vite example. Use the real runner and web engine for deterministic map authoring → validation/undo → publish → hint solve → courier delivery → reload durability. No model configuration, subscription or credentials. Existing Playwright journeys remain intact. CI uploads runner reports/traces and existing browser evidence. Package installation suppresses lifecycle scripts locally.

## Validation and independent review

Pending CI and independent static review. No claim of local test/build success.
