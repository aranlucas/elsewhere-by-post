# Feature roadmap

Planning baseline: `cf2463a08a5c` on `origin/main`, 2026-10-26. This local puzzle remains a later portfolio priority.

## Outcome

Let someone make a small postcard world and give another person an enjoyable first attempt. The [current prototype](README.md) already has six journeys, nudges, undo, a mapmaker, validated JSON import/export and offline play.

## 1. Preview an imported postcard before replacing the current one

Build on the existing import contract with a clear preview of the map name, layout and rules. Explain what will change before the player accepts it.

Acceptance:

- Cancelling preserves the current draft and play state.
- An accepted map starts with a clear playable arrangement and the existing solvability checks.
- Unknown or malformed data leaves the previous map available.
- Names remain literal text; maps cannot load scripts or external assets.

Ask a creator to send one exported map to a friend, then observe the handoff. Measure confusion and successful first attempts, not file downloads.

## 2. Help creators tune difficulty

Offer a playtest checklist and limited route feedback that distinguishes solvable from interesting. Preserve the authored witness and undo while a creator experiments.

Acceptance: guidance never claims a unique solution or a particular difficulty unless the engine actually establishes it.

## 3. A small authored postcard collection

Add a few curated maps that teach a distinct use of echo doors or swapping. Require a verified solution and keyboard/touch playthrough before including each one.

## Boundaries

No public upload gallery, account system, leaderboard, analytics or AI calls are needed. Keep export/import as the portable sharing path and preserve offline use. Reuse the current deterministic engine and native test suites. The value signal is a recipient understanding and enjoying a creator's map; more maps alone are not success.
