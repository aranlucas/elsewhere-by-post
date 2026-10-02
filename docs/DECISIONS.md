# Research and decisions

Researched 2026-10-02 using current primary-source pages. The title is a working title, not a trademark clearance or a claim of unprecedented originality.

| Precedent | Primary source and observation | Decision for this prototype |
| --- | --- | --- |
| Gorogoa | [Annapurna's official page](https://annapurnainteractive.com/games/gorogoa) describes rearranging and combining illustrated panels. | Let the illustrated places be the manipulable objects. Keep a transparent edge rule rather than borrowing its nested scene/composition puzzles. |
| Monument Valley | [ustwo's case study](https://ustwo.com/work/monument-valley/) describes impossible geometry, hidden paths, and a complete experience without grind. [The studio's Monument Valley 3 page](https://ustwogames.co.uk/our-games/monument-valley-3/) describes rotating architecture to reveal paths. | Keep the calm invitation and readable consequences. Use flat physical postcards and compass-sensitive doors, with original landmarks, instead of recreating its architecture or characters. |
| Cloudflare Static Assets | [Official documentation](https://developers.cloudflare.com/workers/static-assets/) supports deploying static files without a custom server. | Ship plain modules, native SVG, local saves and a service worker. A Node static server makes local play and Railway packaging straightforward. |

The interaction sentence is: **turn or swap postcards so roads meet; matching echo arrows stitch distant places together**. Collect every stamp before the courier reaches delivery. A send attempt has no cost and offers a partial route if the world does not yet fit.

The second layer is compass alignment, introduced only at journey 04. Rotating a door simultaneously changes its road and its echo direction. This couples a local route decision to a distant place. Two echo pairs in the finale require thinking about an itinerary, rather than only about visually connected edges.

The stack intentionally uses DOM and SVG instead of the Game Studio default Phaser. There are at most nine illustrated cards; no continuous physics, camera or sprite systems are needed. Native focusable controls make touch, keyboard, screen-reader labels, reduced motion and offline caching simpler. Simulation stays in a separate pure module, as recommended by the foundations skill.

Route search includes the current card, collected-stamp bitset, and used-echo bitset. Delivery is a terminus, and each echo is consumable once. Plain connected-component checks would accept some illegal journeys. The search is deterministic and bounded by the tiny authored board sizes. It reports an actual witness path and never relies on a live AI service.

Maps deliberately allow multiple solutions. The authored witnesses prove solvability; they do not prove minimum moves or uniqueness. The one-card nudge moves toward a witness and may take more moves than an expert solution. Shuffles preserve solvability because the fixed witness remains reachable through the reversible rotate/swap verbs.

All landmark SVGs were drawn in code for this project. Fonts are local system serif/sans fonts. Sound is synthesized locally. There are no borrowed characters, generated-image calls, remote assets, personal datasets, external AI calls or paid services.

Next useful experiments:

1. Test whether three new players discover the first solution in 30 seconds and can explain the echo rule after journey 04. Automated playthroughs cannot establish human learnability.
2. **Implemented as the next experiment:** a local postcard editor with exportable JSON and an explicit witness-validation badge. The author creates a solved arrangement; the canonical engine verifies one legal itinerary, then reversible shuffles become playable custom journeys. Imports are bounded data using known original art, with no executable content or remote asset URLs.
3. A constrained “fold” verb that joins opposite edges, then measure whether it adds a distinct spatial insight beyond echo doors.
4. Better courier routing choices: optionally let players draw their own itinerary, retaining automatic route preview for accessibility.
5. A longer island atlas with several small unlockable chapters, only after testing the six-level learning curve.
