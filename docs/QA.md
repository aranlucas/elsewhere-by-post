# Verification

Verified on 2026-10-02 on Lucas's Mac, using Node 26.10.0 and isolated Google Chrome profiles. The prototype never opened the user's personal Chrome profile for tests.

## Results

| Check | Result |
| --- | --- |
| Deterministic engine and storage tests | **28 passed**, zero failures |
| Final browser suite on the built `dist/` site | **10 passed**, zero failures or flaky tests; 51.9 seconds with one worker |
| Handcrafted levels | All six initial maps need work; all six witness maps deliver every stamp and required echo |
| Remix solvability | 60 deterministic seeds per level, **360 shuffles** checked for valid anchors and recoverability through legal actions |
| Desktop inputs | Pointer turns, tap-to-swap, actual drag swap, keyboard focus/arrows/Enter, clockwise and reverse turns, undo, reset, help dismissal |
| Touch inputs | Actual touch events complete all six maps at 390×844; large turn/send controls exercised |
| Responsive layout | Desktop 1280×1000; portrait 390×844 and 320×700; no horizontal page overflow |
| Retry and interruption | Failed route feedback, repeated send, stop courier, and switching levels during travel |
| Saves | Board, move count, undo history and delivered medals survive reload; corrupt and blocked storage still allow play |
| Offline | Service-worker-controlled reload with the browser context offline; a puzzle can be solved and progress survives a second offline reload |
| Accessibility scan | axe WCAG 2 A/AA and 2.1 AA: **zero detected violations** across all six initial maps at desktop and phone widths, plus the help dialog (13 views) |
| Runtime errors | Browser checks asserted no page exceptions or console errors |
| Static build | 11 static files, approximately 100 KiB on disk; no runtime dependency installation needed |

The tests interact with the UI to rearrange and deliver maps. They use the pure engine only to choose legal test actions, and assert the resulting rendered cards. They do not overwrite application state to manufacture success. Keyboard, drag and touch checks independently exercise their input paths.

The route engine verifies reciprocal edge ports, cardinal adjacency without row wrapping, orientation-sensitive echoes, one use per echo pair, collected stamps, and delivery as a terminus. Search carries stamp and echo state; the tests include a connected graph that must fail because one stamp lies beyond delivery.

## Findings repaired during playtesting

1. Direct turn buttons implicitly selected a card, so the next pair of taps could swap the wrong pair. Direct turns now leave selection unarmed; intentional toolbar selection remains available for repeated turns.
2. Drag-release click suppression could swallow a different rapid next click. It now matches the release position and timestamp.
3. The narrow introduction overflowed at 320 pixels. The small-screen tagline now sits below the title.
4. Echo arrows collided with corner turn buttons on small postcards. They now sit away from corners and coral doors have a distinct color.
5. Frame labels, legend text, letter text and the decorative postmark had insufficient contrast. Their colors and postmark opacity were corrected.

## Evidence and limits

- `evidence/unit-results.txt`: complete deterministic run output.
- `evidence/browser-results.json`: structured final Playwright report.
- `evidence/accessibility-results.json`: per-view axe results and incomplete rule identifiers.
- `evidence/desktop-first-map.png`, `desktop-echo-map.png`, `desktop-finale.png`: initial, echo, and final map screenshots.
- `evidence/mobile-first-delivery.png`, `mobile-finale.png`, `mobile-touch-finale.png`: portrait and actual-touch playthrough evidence.

This is tested in Chrome, not physical iOS/Safari/Firefox. Touch input was emulated through genuine browser touch events, not tested on a physical phone. No human study establishes the 30-second learning target yet. The next experiment is three first-time players explaining the road rule and then the echo rule.

The accessibility scanner reports incomplete `aria-prohibited-attr` and `color-contrast` items for manual review; zero detected violations is not a WCAG certification. Keyboard focus and native dialog behavior were verified, and the screenshots were reviewed visually. A screen-reader user session remains useful.

The Docker image and hosted Cloudflare/Railway deployment were not executed. Their configuration is supplied for later use. No paid resources or public deployment were created.
