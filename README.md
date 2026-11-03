# Europa Rail Club

Vercel 部署步骤见 [DEPLOYMENT.md](DEPLOYMENT.md)。线上链接目前提供本地轮流游戏；远程同步房间尚未实现。

**M0 complete; M1 in progress.** A React + TypeScript railway game for 2–5 people taking turns on one device. The Europe full-map candidate now supports complete local games and automatic final scoring. There are no shared rooms, remote players, backend or reconnect yet.

换电脑继续开发请先阅读 [HANDOFF.md](HANDOFF.md)，其中包含克隆、启动命令、当前进度和给新 Codex 会话的交接提示。

## Run locally

With Node.js 22 or newer installed, open a terminal **in the project directory**:

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite (normally `http://127.0.0.1:5173`). Keep the terminal open while playing. Stop with Control+C. No accounts, credentials or paid services are needed.

For the temporary Node runtime used on this machine in the development session:

```sh
cd /Users/mingquiliu/Downloads/rail-europe
export PATH="/tmp/node-v22.16.0-darwin-arm64/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
npm run dev
```

That runtime is temporary and may disappear after cleanup/restart. A permanent Node 22+ installation is recommended for continued development. Use the complete PATH line above if the terminal's system paths were accidentally lost.

## What you can test

The home screen offers two datasets:

- **Europe full-map preview (default):** 47 cities, 101 individual tracks, 40 regular and 6 long destination tickets. Route topology/attributes were compared with the publisher's setup map; independent data sources agree on route distances and all ticket endpoints/values. Final publisher/card-level ticket verification remains pending, so the dataset is explicitly a candidate (`complete: false`). See [data sources and audit evidence](DATA_SOURCES.md).
- **Small original training map:** 6 cities and 9 routes, with intentionally synthetic destinations. It is useful for trying controls but has too little track to guarantee a standard-stock automatic ending. It remains clearly labelled as non-official data.

Enter 2–5 names, one per line (first player starts), and choose a distinct red/green/blue/yellow/black color for each seat. Each seat displays 45 original wagon pieces, three stations and a score marker before dealing. Colors are also validated by the engine.

The desktop table now centers the map inside a 100-space perimeter score track, with the longest-route bonus face up on the left. The right rail holds the destination deck above the train deck, then five face-up train cards vertically and the face-up discard pile. On phones the map pans/zooms and the five public cards become a horizontal scrollable row rather than shrinking the whole desktop.

Dealing is one private setup stage: each player sees their four starting train cards and one long plus three short destinations together. Long destinations have original green faces; short destinations have blue faces, following the requested visual palette (not a claim about every publisher edition). “See on map” highlights endpoints without forcing a keep decision. At least two must be retained; all initial rejects leave play secretly. Turn actions are locked until every player confirms, then a completion/handoff screen opens the first turn. During a handoff, private cards and endpoint highlights are removed from the DOM; the public board stays mounted.

During turns, select payment cards from your hand and a route, build stations, draw train cards or take more destinations from the right-side deck. Claiming a route immediately advances your colored score marker and removes the corresponding number of reserve wagons. Claimed track and built station pieces use your seat color. Markers wrap after 99 while the public player total remains unbounded (e.g. score 101 appears at space 1). Numbered markers and text keep the UI usable without relying on color alone. Motion respects reduced-motion preferences.

Illegal actions show reasons. Tunnels reveal cards and require separate extra payment or cancellation. Base tunnel payment stays reserved in your hand until resolution and cannot also pay the extra cost.

Two or fewer trains after a completed turn triggers a final turn for every player including the trigger. The full map supports that automatic ending. “Finish early” is explicitly a manual testing shortcut; its score screen states that the game was ended early.

Chinese/French switching preserves the current game and stores language preference when storage is available. Map choice resets to Europe on page reload. Zoom and scroll the original schematic; parallel tracks are separated geometrically and can also be selected from the route list.

**All game state is in memory. Refreshing/closing the tab loses it.** Handoff masking is a courtesy on a shared device, not server-grade secrecy. Two tabs are two independent games.

## Checks

```sh
npm test                  # 66 rule/data/validation tests at this stage
npm run test:data         # coverage, provenance snapshots and data consistency
npm run test:games        # 12 full-map games, 2–5 players × 3 seeds
npm run typecheck         # application, tests and test configuration
npm run build             # strict typecheck + production assets in dist/
npm run format:check
```

For browser tests, install Chromium once:

```sh
npx playwright install chromium
npm run test:e2e
```

Or use an installed Chromium-family browser:

```sh
PW_BROWSER_PATH='/Applications/Brave Browser.app/Contents/MacOS/Brave Browser' npm run test:e2e
```

Playwright starts/stops its own local Vite server on port 4173. It tests desktop (1440×1000) and mobile (390×844) viewports. Real iOS/Safari hardware still needs separate testing.

Browser coverage includes unique seat colors, real piece counts, desktop central-map/side-deck placement, simultaneous initial card/ticket visibility, endpoint preview and privacy clearing, score-marker movement, setup action locks, handoff hiding, draws, later tickets, station occupancy, insufficient ferry locomotives, closed double tracks, distinct parallel-track drawing, French persistence and complete Europe-map games through normal actions to automatic final scoring. The full replay includes successful/cancelled tunnels, ferries and stations. The driver lives only in tests; there are no product bots.

`e2e/harness.html` is a development-only deterministic entry that creates a standard seeded new game. It does not expose state mutation APIs or change starting hands/stocks. The production `index.html` does not import it, and the test harness/driver are absent from `dist/`.

## Structure

- `src/domain/model.ts`: state, runtime action schemas and errors.
- `src/domain/engine.ts`: immutable seeded transitions and viewer projections.
- `src/domain/payments.ts`: pure matching-payment planning, still validated by the reducer.
- `src/domain/scoring.ts`: ticket connectivity, consistent station borrowing, memoized exact longest trails and tie breaks.
- `src/domain/dataValidation.ts`: structural/runtime dataset validation.
- `src/data/europe.json`, `europe.ts`: full-coverage candidate and audit status.
- `src/data/demo.ts`: original compact training fixture.
- `src/ui/`: React, original SVG board and Chinese/French dictionaries.
- `references/`, `licenses/`, `DATA_SOURCES.md`: attributed data snapshots, hashes, licenses and verification limits. No publisher artwork is included.
- `tests/`, `e2e/`: rules, data, full games and browser flows.
- `DEVELOPMENT_PLAN.md`, `RULES_VERIFICATION.md`: progress, evidence and remaining release gates.

## Remaining release gates

All 46 ticket endpoint/value triples match a separate independent table, but this is not the same as checking every authorized original card (including its long-route background flag). Candidate status stays false until that check is documented. The finite-market fallback when too few non-locomotives remain also needs an authoritative FAQ ruling. Exact longest-trail search is memoized and measured on full-map test states but remains exponential in the worst case.

Local save/resume, richer mobile sheets and broader accessibility/device checks remain future work. No production hosting was deployed in this stage.

## Multiplayer boundary

`projectGame` hides decks and opponents' hands, tickets and initial offers. It is a transport helper, **not a multiplayer service**. M2 must execute the reducer on a trusted server, authorize the seat for every action, serialize turns, implement idempotency and transactionally persist the secret state. Never send the full browser-local `Game` to remote clients.

No provider has been selected. Dedicated Node/WebSocket eases authoritative serialization but needs operations; Supabase reduces infrastructure but needs careful transactional commands and private-data permissions. The hosting/provider trade-off remains an M2 decision.

## Art direction

The visual treatment follows the supplied classic English and refreshed Chinese/French booklets: light paper, burgundy headings, pale-blue/navy framing, brass details and original railway engravings. The board now has original schematic coastline/land washes, and train cards have distinct coaches and a steam locomotive. Destination mini-maps position their endpoints from the loaded city coordinates. See [ART_DIRECTION.md](ART_DIRECTION.md) for references and visual decisions. The publisher's graphics are not shipped.

## References and original visuals

[Publisher product/rules](https://www.daysofwonder.com/game/ticket-to-ride-europe/), [data provenance](DATA_SOURCES.md), [rule verification](RULES_VERIFICATION.md). Visuals and coordinates are original schematics. No official card illustrations, board artwork, logos or rulebook text are shipped.

## Map-based building controls

During your turn, drag the colored wagon or station token above the map onto a route or city. You can also tap/click the target directly or focus it and press Enter/Space. Choose payment cards in your hand, then confirm in the left sidebar. Translucent pieces are previews only; canceling does not spend cards or pieces. Station borrowing and costs are explained in the expandable help beside the payment controls. Route/city dropdowns have been removed.

## Single-screen table

The active table now fits the viewport. Scroll inside the card rails, not the page. The map fits its available area, with zoom up to 5x and internal panning. Inspecting a ticket resets the overview and shows both named endpoint markers at readable screen size. Claimed wagons have thicker bodies, dark outlines, wheels and highlights. On mobile the map stays above independently scrolling private/public controls. Results and the home screen retain ordinary page scrolling.

## Trackpad navigation

The map now fills the panel width by default. Pinch on a trackpad (or Ctrl + mouse wheel) to zoom around the pointer; use two-finger scrolling to pan. The fit-width button restores the width view. Ticket inspection temporarily fits the whole map to show both endpoints.
