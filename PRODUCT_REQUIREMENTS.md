# Europa Rail Club — Product Requirements (v1)

## Product goal
Private, browser-based, real-time multiplayer railway board game for 2–5 friends, inspired by Ticket to Ride: Europe base game. Players share a room link, join with nicknames, and play full games on desktop or mobile. Interface languages: Simplified Chinese, French and English, independently switchable. No mandatory accounts, no bots, no monetization. Functional fidelity to base-game rules is the priority; visual assets must be original, not copied from the commercial game.

## User journeys
1. Open website → choose language → enter nickname → create private room → copy invite link.
2. Friend opens link → enter nickname → join lobby → see players and assigned colors → host starts with 2–5 players.
3. Each player privately receives starting train cards and destination tickets; chooses legal starting tickets before play begins.
4. Active player sees available actions, chooses exactly one turn action; others see synced board, score and turn state but not hidden information.
5. Finish round triggered under official rules → automatic scoring with detailed breakdown → final ranking and optional rematch.
6. Refresh/reconnect on phone or desktop → recover seat and private information securely without exposing them to other participants.

## Base-game rules to implement and verify against official rulebook
- 2–5 players, 45 trains and 3 stations per player; starting 4 train cards. Train deck includes 8 colors plus locomotive wildcards.
- Initial tickets: one long-route ticket and three regular tickets per player; keep at least two. Long tickets not reintroduced into later draws. Later ticket draw: draw three if available, keep at least one, return rejected cards according to rules.
- Turn action: draw train cards, claim one route, draw destination tickets, OR build one station.
- Train draw: usually two cards from face-up market or blind deck; taking a face-up locomotive as first draw ends the action; a face-up locomotive cannot be taken as the second draw. Blind-drawn locomotives count as normal single draws. Refill face-up market, including official three-visible-locomotives reset behavior when applicable; handle deck exhaustion and reshuffling discards.
- Claiming routes: match color/length; gray routes may use any one color; locomotives wild; sufficient train pieces. Double-route restrictions: in 2–3 player games only one side can be occupied; one player cannot own both sides in any game.
- Ferries: locomotive requirements; tunnels: reveal three cards, charge extra matching color/locomotives, allow player to cancel without claiming; consumed cards and turn effects follow official rules.
- Stations: up to three per player, built in unoccupied cities; costs 1, 2, 3 matching-color cards respectively (locomotives wild). Each station may borrow one route owned by another player when evaluating tickets; do not award the route's claim points or count borrowed segments toward longest path. Unbuilt stations score four points each.
- Route points by length: 1→1, 2→2, 3→4, 4→7, 6→15, 8→21. Tickets add points if completed and subtract if failed. European Express longest continuous path bonus 10, including ties; longest-path computation may reuse cities but not train edges.
- Final round triggered when a player has 2 or fewer trains after their turn; all players, including triggering player, receive one final turn per official rule interpretation; explicitly test turn order and ending.
- Verify full Europe map topology, city spellings, route colors, lengths, tunnels, ferries, double routes, regular and long tickets against authoritative material. Never label approximate map as complete.

## UX/UI requirements
- Desktop: readable map plus player status, visible card market, current action panel, own hand/tickets; clear turn indicator and action confirmation.
- Mobile: zoom/pan map, generous hit targets, persistent turn status, bottom sheets for route details, cards and tickets; no tiny desktop UI shrink.
- Claim-route preview shows length, color, required locomotives, tunnel risk, train-piece availability and potential points; disable illegal actions with an explanation.
- Ticket inspection highlights origin/destination only on that player's screen. Tunnel reveal is explicit and understandable. Provide actionable, bilingual feedback for errors, reconnection and opponent activity.
- Accessibility: keyboard support where practical, contrast, non-color-only identification, reduced-motion preference. Store language preference.
- Original railway-travel visual identity; do not copy official card illustrations, board layout artwork, icons or logos. Preserve familiar card roles and legibility.

## Architecture and quality
- Current prototype: Vite/React/TypeScript single-page mockup. Inspect before deciding on refactor.
- Prefer React + TypeScript frontend, authoritative Node/TypeScript server with validated game actions, persistent room/game state, secure per-player seat token, WebSocket/realtime updates, and a suitable hosted database. Evaluate Supabase versus a dedicated game server; explain trade-offs before choosing. Vercel alone is not a persistent WebSocket game server.
- State transitions as pure, testable functions; deterministic shuffle via injectable RNG for tests. Shared runtime schemas (e.g. Zod) and action validation. Concurrency protection/idempotency; reconnect and lobby lifecycle; server-only secret deck and hands; public state projection per viewer.
- Tests for every rule edge case, score calculation, turn transitions, tunnel/market, stations and reconnection/security. Add end-to-end tests for room flow and at least one simulated complete game.
- Setup scripts, `.env.example`, README instructions, clear local development and deployment steps; never embed secrets in frontend.

## Delivery milestones / definition of done
M0: repository builds locally; basic app and test scripts work; known gaps documented.
M1: complete typed rules engine and tested accurate map/ticket datasets; local pass-and-play game is actually playable.
M2: 2–5 player private real-time rooms with per-player hidden information and reconnect; tests cover two-browser flow.
M3: polished desktop/mobile bilingual UX, scoring breakdown, accessibility and deployment documentation.

At the end of each Codex run, summarize files changed, commands/tests executed, visible result, known issues, and next milestone. Do not claim the game is fully playable before it truly is.


## Tabletop UX refinement — 2026-11-03

Product-owner direction for the current local UI increment:
- Center the board on desktop, encircled by a score track. Each seat selects a unique red/green/blue/yellow/black color before dealing and has 45 wagon pieces, three stations and one numbered score marker. Advance markers immediately when route points change; keep exact totals visible across laps.
- Place the original longest-route bonus card face up on the left. Stack the destination deck above the train deck on the right, followed by five vertically arranged face-up train cards and a face-up discard pile. Keep the existing automatic locomotive market-reset rule.
- In the private dealing phase, show the four starting train cards together with the one long/three short destination offer. Use green long-ticket faces and blue short-ticket faces as the chosen UI palette. Offer endpoint highlighting on the central map while choosing at least two tickets. Initial rejected tickets leave the game secretly.
- Lock normal turn actions until all seats confirm; explicitly show that dealing has finished before opening the first turn. Maintain the local handoff privacy boundary and avoid revealing another seat's cards or previewed endpoints.
- Use original vector/CSS visuals with the supplied images as layout references only. On mobile, retain a pan/zoom map and scrollable card row rather than a miniature desktop.


## Art-direction revision — 2026-11-03

The product owner supplied the classic English and refreshed Chinese/French Europe rulebooks as art-direction references. Retain the approved tabletop arrangement and all rules while replacing the flat sage UI with a light railway-atlas treatment: ivory paper, burgundy display typography, blue framing, brass details, original steam/coach vector art and original schematic geography. Maintain the green long-ticket / blue standard-ticket distinction, translated readable labels, private endpoint preview, mobile usability and reduced-motion support. Reference links and implementation choices are in ART_DIRECTION.md; no official artwork or logos are to be bundled.

## Left sidebar revision - 2026-11-03

The private dealing summary, train hand and destination choices now occupy a vertical sidebar left of the desktop board. Destination cards form a scrollable single column. Longest-route bonus and route points move into a collapsed scoring reference. Mobile retains stacked sections and two-column tickets; handoff privacy remains mandatory.

## Map interaction revision - 2026-11-03

Replace route/city dropdowns with board targets. Players drag a wagon token onto a route or a station token onto a city, or activate the target by touch/keyboard. Show an uncommitted colored preview and validate selected hand cards before confirmation. Cancel without spending pieces. Keep tunnel resolution and all domain validation. Explain station borrowing, costs, city exclusivity and unused-station points in both languages.

## Single-screen table revision - 2026-11-03

The active game fits the dynamic viewport without document scrolling. Use compact player status and independently scrolling private/public card rails; mobile keeps the board above the rails. Fit the complete map initially and on ticket preview, retaining zoom/pan. Highlight ticket endpoints above all map content with constant-screen-size named markers. Claimed routes must visibly differ from unclaimed tracks with thicker player-colored wagon bodies, outlines, wheels and highlights.

## Trackpad and width revision - 2026-11-03

Default map scale fills the available width, allowing vertical pan where needed. Support trackpad pinch (Ctrl-wheel browser events) with pointer-anchored zoom and native two-finger pan. Provide a translated fit-width reset. Ticket inspection still switches to a full-map overview.

## Language expansion — 2026-11-04

Support Chinese, French and English in both local and online screens, with a persisted language selector. Chinese mode displays Chinese city names on the map, ticket cards, endpoint previews and route/station details. Canonical city identifiers and game data remain unchanged.

## Homepage revision — 2026-11-04

Follow the product owner's supplied mockup and three supplied images: purple illustrated hero with box, wordmark, language selector and game facts. The lower desktop/mobile layout has a fixed left vertical directory and an independently scrolling right panel. Sections: remote play (separate create/join tabs), trilingual publisher rulebooks, introduction, and retained local mode. Private invite links open the join form. Keep real admission, errors, keyboard access and independent language preferences. Supplied publisher homepage assets are an explicit exception to the original-art policy for this requested homepage; game board and card art remain original.

## Independent game-board DA — 2026-11-04

Product-owner clarification: the in-game experience must use its own vintage railway-board style rather than the homepage's plum UI. Draw the playable map with original SVG/CSS parchment, pale seas, brass score border, amber city nodes and printed track segments inspired by the supplied reference. Do not replace it with an image or trace the reference. Retain existing city/route identities, rule data and all drag/touch/keyboard, map zoom/pan, station, private task-preview and scoring interactions. Keep green long/blue short tickets and semantic player/train-card colors. Apply matching travel-card chrome to game screens; keep homepage styling independent.
