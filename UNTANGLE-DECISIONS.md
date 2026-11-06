# Untangle decision log

## Scope and baseline

Exact skill fetched and read before inspection: https://github.com/caldoai/skills/blob/main/skills/untangle-codebase/SKILL.md (2026-11-05). Comments and Tests additions are selected. Follow root AGENTS.md; no additional AGENTS files were found. Work is confined to this thread's isolated worktree. Starting HEAD: 4e44703; starting tracked/untracked status clean.

Inventory covers all source modules, unit and browser tests, styles/art, public assets, build/lint/type/test/deployment configuration, CI, README and roadmap. The existing structure separates engine rules, handcrafted level data, game lifecycle hooks/components, mapmaker editing, and browser boundaries well. Recent history already pruned redundant tests/documentation; preserve that work.

Baseline: `pnpm check` passes formatting, lint, types, all 34 unit tests and production/PWA build. Browser baseline is recorded below separately from post-change verification. No baseline code failures found so far.

## Design and justified changes (recorded before editing)

1. Share grid keyboard navigation through the existing hook, preserving caller-specific suppression.
   - Hidden link: `useGameKeys` and `useGridArrows` duplicate tile lookup, arrow bounds, selector and focus behavior. Fixes to grid navigation currently need both implementations.
   - Game shortcuts retain their own actions; the grid hook accepts an optional ignore predicate for modal help. Text entry and modifier suppression belong to shared navigation.
2. Own custom-map geometry and endpoints in the map domain.
   - Hidden links: schema length, pinned-art map, authored IDs/locked flags, maker settings' 0/5 checks, grid columns/count and board style independently encode six cards, three columns and two pinned endpoints.
   - Export map columns/count and endpoint lookup from `custom-map.ts`; drive validation, authored cards and UI from them. Keep fixed six-card format and messages; this is not a configurable map engine.
3. Move compass vocabulary into a stable domain module.
   - Needless link: tile accessibility, status messages and maker settings import invariant compass labels from volatile `levels.ts`, loading authored puzzles to describe a direction.
4. Give saved game history one retention policy.
   - Hidden link: storage decoding, live desk and session each independently cap history at 100. Export the policy alongside `LevelSave`; remove the redundant session truncation since the desk and decoder establish it. Maker undo remains independent, despite the same current limit.
5. Remove surplus map processing.
   - `copyMap` simply wraps native `structuredClone` (production caller: draft editor). Use the native API directly, with existing immutability coverage at the domain boundary.
   - `validateMap` normalizes then `authoredLevel` normalizes again; introduce private canonical-map conversion, retaining validation on public entry points.
6. Remove implementation-restating comments after structural changes. Keep format conventions, product constraints, external/browser compatibility explanations and lifecycle contracts that cannot be inferred locally.
7. Review tests last. Preserve meaningful engine, storage, import/security, offline, accessibility and interaction coverage. Replace assertions tied to storage schema exports or transform-string formatting with public behavior where justified. New checks must identify their regression and independent expected outcome below.

## Special cases deliberately retained

- Pinned departure/delivery and fixed custom-map geometry are format/product requirements, not exceptions to erase.
- Delivery terminates traversal; echo pairs are single-use; failed routes select a useful partial itinerary. These are game rules.
- Shuffle fallback to the initial arrangement preserves built-in unsolved starts; custom maps promise solvability, not difficulty.
- Storage read/write catches preserve play with unavailable/corrupt/quota-limited storage. Optional audio and service-worker failures do not block play.
- Reduced-motion timing, first-step/echo pacing, animation cleanup, drag threshold/click suppression and delayed download URL revocation serve browser interaction requirements.
- Legacy `/maker.html` redirect preserves existing links. React Router owns navigation and loaders; zod owns untrusted data validation.
- PWA build hook reads Cloudflare's late-resolved assets directory; retain the integration, separate unit-test config, security headers and native tool configuration.
- Small domain helpers (board cloning, class joining, seeded shuffle and route bitmask search) have meaningful semantics or tiny glue scope; no new library is justified. Native structuredClone handles map copies; React hooks and zod cover the shared behavior changed here. No new scripts or dependencies.

## Review and validation record

- Initial independent read-only subagent review agreed on navigation, topology, compass dependency direction and history retention. Final iterative review follows implementation.
- Additional inventory findings before implementation: journey badge labels are a parallel indexed list in `game-header.tsx`; move them into each Level's metadata (including custom Yours). Remove verified unused CSS selectors `.question`, `.intro`, `.intro-note`, `.hand-drawn-star`, `.letter-corner`, `.postmark` and their responsive descendants; preserve all live selectors.
- Implemented shared grid navigation (including help/text-entry exclusions), stable compass module, shared game history policy, custom-map topology, co-located badge names, canonical-map conversion and native map cloning. Removed the inventoried dead CSS and redundant implementation summaries; retained product/browser contracts.
- Test cleanup last: replace the engine test's storage-schema import/null assertion with a public `decodeSave` corrupt-board case. Existing authored-map immutability test will exercise `authoredLevel` output isolation instead of the removed copy wrapper. Credible regressions: malformed saved boards reaching the engine; aliasing authored cards/ports back into the editable map. Expected results follow the documented safe-storage and immutable design contracts. Add browser arrow-edge coverage for both desks: navigation must not wrap rows, and text entry must retain arrow keys.
- Independent final review found no substantive structural issues or regressions. Addressed its two small findings: removed an empty media block and a native-clone-only assertion while retaining authored-port isolation coverage.
- Earlier local `pnpm check` passed (34 unit tests, formatting, lint, types, build). A browser attempt timed out starting preview under machine load; no behavioral result was established. The preview later started. No baseline browser pass is claimed.
- Latest user constraint: all further tests run ONLY IN CI; no local tests/builds are running for this thread. Existing CI includes format, lint, typecheck, unit tests, production build, and Playwright Chromium behavioral/accessibility/offline tests. CI is the final validation gate.
