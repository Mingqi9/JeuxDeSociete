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
