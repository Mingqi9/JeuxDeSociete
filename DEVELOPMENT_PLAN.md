# Europa Rail Club — Development plan

Updated 2026-11-03. **M0 complete; M1 partially implemented.** This is a local pass-and-play build with a full-coverage Europe candidate and a separate training fixture. There is no real multiplayer; publisher/card-level final data verification remains open.

## M0 — Foundation: complete

- [x] Read AGENTS.md, PRODUCT_REQUIREMENTS.md and every original source/configuration file. Original project was a single minified React mockup with wildcard dependencies, no tests and nonfunctional room links. Directory has no Git repository; no commit was created.
- [x] Preserve warm railway visual identity while splitting entry, UI, dictionaries, domain and data.
- [x] Pin dependencies and generate reproducible package-lock.json; strict TypeScript, Vite, Vitest, Playwright and formatting scripts.
- [x] Add .gitignore, .env.example, .nvmrc, setup/build/test instructions. No external font dependency, credentials or official artwork.
- [x] Replace misleading room/invitation flow with explicitly local 2–5 player training.
- [x] Run rules tests, browser tests, typecheck and production build. See evidence below.

## M1 — Rules and local play: partial

### Implemented

- [x] Typed game/player/card/route/ticket/pending-action models; strict Zod action schemas with bounded inputs; dataset structural validation.
- [x] Pure immutable transition function, seeded deterministic shuffle, actor/phase checks and translated error codes. UI action previews use the same validation.
- [x] Standard 110-card train deck, four starting cards; market refill/reset, visible/blind locomotive rules and discard reshuffle.
- [x] Initial ticket offers and choices (all initial rejects leave play); later offers (rejections return to bottom).
- [x] Route payments and points, train pieces, gray routes, wildcards, double-route ownership/player-count restrictions, ferry minimum locomotives.
- [x] Tunnel reveal, matching extra cards, all-wild special case, cancellation consuming turn, exhausted reveal pile, no reuse of base cards for extra costs.
- [x] Stations: exclusive cities, matching costs 1/2/3 and three-station limit.
- [x] Final-round trigger and exact player order including trigger's final turn, tested at 2–5 players.
- [x] Destination connectivity/penalties, globally consistent station borrowing, unused-station points, edge-simple longest trail, express ties and full winner tie breaks.
- [x] Initial per-viewer projection hiding decks, other hands/tickets and other initial offers. This is a function, not a secure remote service.
- [x] Chinese/French local setup, handoff privacy mask, real train draws and claims, stations, tickets, tunnel decision, automatic or explicit early training scoring.
- [x] Responsive controls, map zoom/horizontal pan, keyboard-selectable routes, non-color-only card labels, language preference persistence and reduced-motion styles.
- [x] Original six-city/nine-route training fixture, explicitly incomplete. Limited track may prevent a standard-stock automatic ending; early training finish is clearly labelled.
- [x] Primary rulebook review register in RULES_VERIFICATION.md. Review caught and fixed initial ticket rejection and station-count tie-break details.
- [x] Automated deterministic complete synthetic-map game from standard starting stocks through legal actions to automatic final scoring, conserving all 110 train cards. No intermediate state manipulation in that simulation.

### Full-map increment (2026-11-03)

- [x] Add a 47-city/101-track full Europe candidate, 40 regular and 6 long tickets, separate from the six-city fixture.
- [x] Attribute CC BY 4.0 route data and Apache-2.0 ticket triples; preserve source snapshots, hashes and license; keep publisher images only in temporary reference files.
- [x] Compare route attributes with the publisher setup map, all 90 city-pair lengths with 180 directed independent adjacency entries, and all 46 ticket endpoint/value triples with a separate author's analysis. No mismatches after documented spelling normalization. Full card-background/primary ticket check remains open; `complete` stays false.
- [x] Add runtime parsing before loading JSON and provenance/coverage/connectivity/double-track regression tests.
- [x] Run 12 complete Europe-map games (2–5 players × seeds 7, 124, 2026) from standard initial stocks using only reducer actions. Check per-color 110-card conservation, train consumption, route points, final round, scoring and private projection.
- [x] Add browser full-game replay on desktop/mobile plus ferry, double-track, station occupancy and later-ticket checks. No mid-game state injection, scripted hands, production bots or remote sync.
- [x] Add Europe/training map selector, translated verification warnings and credits, generic distinct parallel tracks and original full-map coordinates. Handoff mode and no-refresh-persistence warning remain.
- [x] Memoize longest-trail states and improve equal-ticket-score station choices by completed-ticket count; add scoring/payment regression tests and a dense 45-train graph benchmark.

### Required before M1 can be declared complete

- [ ] Complete the final authorized card-level ticket audit (including long flags) before declaring full data verified. Topology/route attributes and cross-source endpoint/value checks are recorded in DATA_SOURCES.md; numerical coverage is not publisher approval.
- [x] Add full-map candidate simulations and browser games covering claims, stations, tunnel success/cancel and automatic ending. Repeat against any corrected, finally verified dataset.
- [ ] Resolve the unsatisfiable-market edge case (too few non-locomotives to refill legally) against authoritative FAQ. Current finite-market fallback avoids an infinite reset loop and is documented as provisional.
- [ ] Expand longest-trail/station performance profiling beyond the measured legal full-map samples; move scoring to a worker if needed.
- [ ] Add reliable local save/resume, further ticket interaction polish and mobile action sheets. Current refresh resets the game; no saved-session support is implied.
- [ ] Broaden invariant/edge-case coverage and actual mobile/Safari accessibility testing. Browser viewport tests are not real-device certification.

## M2 — Private multiplayer: not started

- [ ] Architecture decision with product owner before selecting a provider: dedicated Node/WebSocket + transactional database versus Supabase transaction/RPC/realtime. Dedicated server simplifies serialized turns but needs operations; Supabase reduces infrastructure but demands careful transactional commands and secret-data boundaries. No paid provider selected.
- [ ] Move reducer execution and full secret state to a trusted server. Validate actor/seat, action schema, version and idempotency, then commit state atomically.
- [ ] Invite entropy, 2–5 player lobby, host lifecycle, secure per-player seat tokens, rate limits, expiry and reconnect.
- [ ] Persist games and command log; emit only per-viewer projections. Never send the full Game object to remote clients.
- [ ] Two-browser join/play/reconnect, concurrent action/idempotency, persistence and private-information tests before advertising multiplayer.

## M3 — UX and deployment: tabletop UX started; deployment not started

- [ ] Desktop/mobile polish, action confirmation, destination highlighting, scoring explanations, connection feedback and full accessibility pass.
- [ ] Production hosting, database migrations/backups, secret management, deployment/operations documentation and regression E2E. Vercel static hosting alone cannot provide a persistent authoritative WebSocket server.

## Verification evidence

Executed with Node 22.16.0 (official macOS arm64 archive extracted to /tmp because no system Node/npm was installed). Temporary runtime is not a permanent machine installation.

- Dependency installation and security review: original selections reported 5 advisories; upgraded Vite/Vitest/Zod, regenerated lockfile and installed missing Node types. Final install audited 58 packages and reported **0 vulnerabilities**.
- `npm test`: **45 passed**, 2 test files, including invalid actions, immutability, setup rejection, deck conservation, locomotive rules, ferries/doubles/tunnels/stations, 2–5 player final turns, scoring ties, privacy projection, translations and complete synthetic game.
- `npm run build`: **passed**, including strict typecheck of source, unit tests, browser tests and their configuration. Output in dist/. Rollup emits two third-party Zod pure-comment annotation warnings; they do not fail the build.
- `PW_BROWSER_PATH='/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' npm run test:e2e`: **4 passed** (desktop 1440×1000 and mobile 390×844). Verified ticket setup, handoff hiding, two-card turn, manual training scoring, French persistence, no page runtime errors and no horizontal page overflow. Screenshots inspected; mobile pending choices moved before the map. Playwright stopped its server after testing.
- `npm ci --offline --cache /tmp/rail-npm-cache`: **passed**, verifying a clean lockfile install with npm 10; 58 packages audited, 0 vulnerabilities.
- `npm run format:check`: **passed**. Tests and production build were also rerun after the clean install.

No remote multiplayer, official-map accuracy, full-game browser E2E, real mobile hardware, backend/security service or production deployment was tested or claimed.

## Full-map increment verification (latest run)

- `npm test`: **61 passed**, 5 files, including 12 Europe-map complete simulations, independent-table fingerprint, frozen data-source comparison, exact counts/connectivity, scoring/payment regressions and dense-graph scoring sample.
- `npm run build`: **passed** with strict TypeScript (same harmless third-party Zod pure-comment warnings). Production entry includes Europe data; no test harness/driver is imported.
- `npm run test:e2e` using installed Brave: **8 passed** in 24.1 s across desktop/mobile. Full-map replay executed 166 standard actions per game and reached automatic scores; both successful and cancelled tunnels, ferries, stations and later tickets were exercised. Targeted ferry payment, occupied station and closed double-track checks also passed. Two older French tests were corrected to reselect training after reload because the default is now Europe. Playwright stopped its server after the run.
- `npm run test:data`: **7 passed**; `npm run test:games`: **4 player-count cases passed**, each with 3 seeds (12 complete games).
- Scoring benchmark: a 24-edge, 45-train legal Europe subgraph returned longest trail 26 in **1.5 ms** on this machine. This sample is not a worst-case bound.
- Inspected mobile full-map screenshot and production output listing; `dist/` contains only index.html and the application CSS/JS assets, without the dev harness.
- `npm run format:check`: **passed**; final production build/typecheck after formatting: **passed**.
- No new dependencies, paid services, account permissions, multiplayer infrastructure or production deployment were introduced.

## Tabletop UX increment — 2026-11-03

Implemented from the product owner's reference layout using original SVG/CSS, without copying official card/board artwork:

- [x] Pre-deal seat color selection; engine rejects invalid, duplicate or wrong-count colors. Public projections include seat color, not hidden cards.
- [x] Physical-style reserves: actual remaining wagon/station pieces, matching colored score markers, claimed tracks and built stations.
- [x] Centered desktop map inside a 100-cell perimeter score loop. Markers react to route points immediately, keep numbered identities, and wrap while exact totals stay visible. Reduced motion supported.
- [x] Original face-up longest-route bonus on left; destination deck, train deck and five vertical market cards on right, with a face-up discard area. On phones the market is horizontally scrollable and the map pans/zooms.
- [x] Simultaneous private four-card hand and four-ticket setup offer. Long tickets green, short tickets blue; keep at least two. Endpoint preview is independent from keeping a ticket, and clears on handoff.
- [x] Setup-stage status instead of premature turn actions; all actions locked until every initial offer is confirmed, then explicit dealing-complete notice before first turn. Public map remains mounted through handoffs; private hand/ticket DOM does not.
- [x] Extract Tabletop, GameActions, PlayerPieces, TrainCard, TicketCard and score-track coordinate modules from App. All Chinese/French copy stays in dictionaries.

Executed validation:

- `npm test`: **66 passed**, 6 test files. New checks cover color validation/projection, initial simultaneous deal, action gating, automatic initial three-locomotive reset and perimeter coordinates/wrapping; existing full-map simulations still pass.
- `npm run test:e2e` with installed Brave: **12 passed** in 32.3 s across desktop/mobile. Includes full 166-action replays, all previous rules flows, plus color selection, 45/3 visible piece counts, face-down/face-up deck placement, vertical desktop market, endpoint preview/clearing, all-player setup gate, marker advancement and reserve spending.
- `npm run build`: **passed**, including strict typecheck. Existing third-party Zod pure-comment warnings remain non-fatal.
- Desktop/mobile screenshots inspected in test-results/tabletop-setup-_.png and tabletop-play-_.png. Kept all four initial hand cards on one row and legible even when setup interactions are disabled.
- `npm run format:check`: **passed** after final documentation updates.

Still local-only: no network rooms, server authorization, reconnect or durable saves. Full-map candidate audit gates are unchanged. No official image files, new dependencies, paid services or production deployment were added.

## Art-direction increment — 2026-11-03

- [x] Inspect all three product-owner PDF references locally: English classic (5 PDF pages), refreshed Chinese and French (8 each); cover and components/setup visual review. PDFs/renders remain in /tmp only.
- [x] Rework the UI palette toward ivory paper, burgundy display text, pale blue/navy bands and brass borders; local display-font stacks for Chinese/French and CSS grain, with no external fonts.
- [x] Replace the generic board polygon with original schematic continental/island silhouettes, muted regional washes, mountain/wave/compass motifs. Numerical map topology/city coordinates are unchanged.
- [x] Replace flat coach art with original varied rolling stock and steam-locomotive SVGs, engraved landscape details and color-specific card frames. Keep translated labels and all card roles.
- [x] Rework destination cards with city-name ribbons, green/blue faces, point medallions and mini-map endpoint positions calculated from actual ticket cities.
- [x] Rework deck backs, bonus card and panels to match; preserve approved tabletop layout, unique seat colors, live score markers, setup/handoff gate, mobile overflow handling and reduced motion.
- [x] Document reference scope and originality in ART_DIRECTION.md. No rules changes, official assets, image-generation dependencies, remote service or deployment introduced.

Validation completed:

- `npm test`: **66 passed**, 6 files; `npm run build`: **passed** with strict TypeScript (same harmless third-party Zod annotation warnings).
- `npm run test:e2e` with installed Brave: **12 passed** in 34.9 s across desktop/mobile, including the full game replay and all setup, scoring, handoff and endpoint-preview flows.
- Inspected updated desktop/mobile tabletop setup screenshots. Sea/land contrast, printed-card frames, legible color labels, ticket ribbons and new vector vehicles render correctly; the phone retains map pan and card scrolling.
- `npm run format:check`: **passed**. Playwright stopped its server at completion.
- No additional low-impact implementation-mirroring tests were introduced.

## Left sidebar revision - 2026-11-03

Moved private dealing and card controls into Tabletop through a React sidebar slot; hidden seats still unmount all private content. Added bilingual collapsed scoring help and responsive sidebar styles. Updated existing tabletop browser checks for the new placement and disclosure. Windows build/typecheck passed; four targeted desktop/mobile browser cases passed using installed Edge. Desktop screenshot reviewed. Multiplayer and dataset audit gates remain unchanged.

## Map interaction revision - 2026-11-03

Removed route and city selects. Board now supports pointer-captured piece dragging, direct touch and keyboard target activation, city hit areas and uncommitted colored previews. Payments and tunnel choices are beside the hand in the private sidebar. Shared reducer validation still controls all spending; successful actions clear previews. Added Chinese/French station explanations. No multiplayer claims or rule changes.

Validation: 66 unit/rule tests passed with a 20-second timeout; production build/typecheck passed. All 14 desktop/mobile browser cases reported success using installed Edge and one worker, including complete games, real pointer dragging, touch placement, cancellation, station occupancy, ferry/double-track errors, privacy and scoring. Initial parallel browser run exhausted local memory; final run used one worker. Windows browser runner required manual interruption after all cases finished while waiting for server cleanup. Desktop/mobile placement screenshots reviewed. Real-device testing remains open.

## Single-screen table revision - 2026-11-03

Updated App, Board and responsive CSS: bounded dynamic viewport, compact player status, independently scrolling rails, sidebar early-finish control, resize-aware SVG sizing, automatic ticket overview and readable endpoint overlays. Claimed wagon bodies now use thicker outlines, wheel details and white highlights. No rules or datasets changed.

Validation: production build/typecheck and formatting passed. All 16 desktop/mobile browser cases reported success, including full games and new five-player 1366x768 / 390x667 viewport bounds and endpoint visibility checks. Inspected desktop/mobile screenshots. A final endpoint label layering adjustment was followed by the eight tabletop cases. Windows runner server cleanup still requires interruption after cases finish. Real-device verification remains open.

## Trackpad and width revision - 2026-11-03

Board defaults to width-fit, supports non-passive Ctrl-wheel pinch with pointer anchoring and 0.2x-5x limits, and preserves ordinary wheel panning. Added bilingual fit-width control and gesture hints. Ticket overview remains available. Ten targeted desktop/mobile browser cases reported success, including zoom in/out, anchoring, pan, width reset, viewport bounds, placement and privacy. Build/typecheck passed; physical trackpad hardware still needs user confirmation. Windows test runner manually stopped after cases completed during server cleanup.
