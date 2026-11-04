# Europa Rail Club — Railway atlas direction

Visual revision dated 2026-11-03, requested by the product owner. The existing tabletop arrangement and all game rules remain in place.

## Reference review

The three supplied publisher PDFs were downloaded to temporary storage and inspected locally using PDFKit. They are reference material, not shipped assets.

- [English classic booklet](https://cdn.svc.asmodee.net/production-daysofwonder/uploads/2024/07/7202-T2RE-Rules-EN.pdf): reviewed cover, components/setup and board conventions. Warm map paper, engraved railway imagery, brass/gold framing and historical serif typography inform the atlas treatment.
- [Chinese refreshed booklet](https://cdn.svc.asmodee.net/production-daysofwonder/uploads/2026/09/722102N_TICKET2RIDE_EUROPE_RULES_CNS_20260512_compressed.pdf): reviewed cover and components/setup pages. Light editorial panels, pale-blue outlines, burgundy titles and strong card-role colors inform the interface.
- [French refreshed booklet](https://cdn.svc.asmodee.net/production-daysofwonder/uploads/2026/09/7222N_TICKET2RIDE_EUROPE_RULES_FR_20260512_compressed.pdf): reviewed cover and components/setup pages; checked its treatment against the Chinese edition. Green long destinations and blue standard destinations support the product owner's already chosen palette.

## Original application treatment

- **Paper and type:** ivory print-like surfaces, fine diagonal CSS grain, burgundy display headings, blue/navy action bands, restrained brass rules. Locally available Georgia for French display text and Songti/STSong/SimSun for Chinese, with system fallbacks. No remote font requests.
- **Board:** pale-blue water, cream lands, translucent regional washes, dashed borders, discreet mountain/wave/compass motifs and the existing live scoring frame. `BoardScenery.tsx` is an original schematic fitted to the application's own city coordinates; it is not traced publisher art or survey-grade geographic data. The training fixture retains a simple schematic background.
- **Train cards:** original SVG rolling stock, varied coaches, a steam locomotive, original border details, rail sleepers and a light landscape engraving. Strong per-card colors and visible translated labels keep identification practical. The rainbow background denotes a locomotive as before; depicting a steam engine on a black card does not change its rules role.
- **Destinations:** green/blue paper, dark city-name bands, gold route strokes, blue endpoints and a point medallion. Miniature endpoint positions derive from that ticket's actual cities in the loaded dataset; the background outline remains illustrative.
- **Decks and award:** navy card backs, fine gold insets and original emblem typography; parchment/blue award treatment. No publisher wordmarks, characters, logos, official card illustrations or board scans are embedded.
- **Continuity:** central desktop board; award on the left; destination/train decks and five market cards on the right. The setup gate, hidden information/handoff, player colors, score markers, card inputs, zoom/pan, reduced motion and mobile layout stay operational.

## Validation

Use `npm test`, `npm run build`, `npm run format:check` and `npm run test:e2e`. The existing browser flows capture desktop/mobile tabletop setup and play screens under `test-results/`. This visual increment introduces no new dependencies or runtime image downloads. No visual-only mirror tests were added.

The full-map candidate verification gates, local-only state, lack of save/reconnect and lack of remote multiplayer remain unchanged.

## Homepage reference revision — 2026-11-04

The product owner supplied a homepage mockup and three matching images in Downloads, and requested their use. The new homepage follows that mockup: wide illustrated hero, dark plum overlay, translucent language selector, box image, title image and three compact facts. The lower section uses pale neutral paper, a stationary vertical directory and a separately scrolling right content pane. Mobile preserves a compact left directory with a larger usable right pane.

Supplied assets copied unchanged into `public/images/`: `railway-hero.webp` (T2Reurope-REFRESH-1920x1239-1.webp), `railway-title-fr.webp` (T2R_EUROPE_REFRESH_FR.webp), and `railway-box-fr.webp` (T2REUROPE-V2-3Dbox-left-FR.webp). These are publisher visuals supplied by the product owner, not newly created original assets. The French wordmark is retained as supplied in all language modes; the surrounding interface is translated. The game board and game cards retain their original artwork.

Remote play is now the default entry. The directory offers remote play, rules, introduction and local play. Create/join tabs call the existing room admission service. Invite links open the join tab with the room code. Rulebooks use the three previously supplied publisher URLs with a language selector, PDF frame and always-available external link; PDF service availability and browser embedding are external dependencies. Browser tests intercept the PDF network request to verify UI behavior without claiming to validate external PDF rendering.

## Independent in-game railway-board direction — 2026-11-04

The product owner clarified that the game must have its own visual identity, separate from the plum homepage, and supplied a vintage board as a style reference. Implemented an original SVG/CSS print treatment rather than a bitmap board or traced publisher layout: warm land gradients, pale blue-gray seas, irregular hand-authored coastlines, river/relief strokes, sailing and station vignettes, brass inlay, oval score cells and amber city medallions. SVG pattern strokes provide the paper grain; no raster image, external texture or publisher board scan is used in the playable map. The geography remains an illustrative schematic aligned to the existing city coordinates, not a claim of geographic accuracy.

Routes retain the existing identifiers, coordinates, parallel-track offsets, piece counts and colors. Segment bevels and color symbols evoke printed track spaces, ferry requirements appear as locomotive stamps, tunnels have dark sleeves, and claimed routes retain their larger player-colored wagon bodies and wheels. Existing transparent city targets, keyboard targets, pointer dragging, touch, zoom/pan, station previews, private endpoint beacons and score-marker logic remain active. No rule or dataset changes.

`src/game-table.css` provides a separate game-only stylesheet loaded by both production entry and the development browser harness. It styles lobby, handoff, dealing, train/destination cards, score panels and gameplay controls in teal, parchment and brass. The homepage retains its approved plum direction. Destination cards retain their green/blue distinction and player/card colors remain semantically unchanged. No new dependencies or animations were added.
