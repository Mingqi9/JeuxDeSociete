# Rules verification register

Reviewed on 2026-11-03 against the publisher-hosted [English Europe rulebook](https://cdn.svc.asmodee.net/production-daysofwonder/uploads/2024/07/7202-T2RE-Rules-EN.pdf), linked from [Days of Wonder](https://www.daysofwonder.com/game/ticket-to-ride-europe/). Page numbers below refer to printed pages. Only derived rules are implemented; the PDF, its artwork and its text are not distributed with this project.

| Area               | Reference | Implemented and tested                                                                                                                                                          |
| ------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Setup              | pp. 2–3   | 2–5 players, 45 trains, 3 stations, 4 starting cards; 12 each of 8 colors and 14 locomotives; one long + three regular tickets, minimum two kept                                |
| Initial rejections | p. 3      | ALL initial rejected tickets leave play; undealt long tickets also leave play                                                                                                   |
| Train draws        | pp. 3–4   | Two draws, visible locomotive ends action, second visible locomotive forbidden, blind locomotive normal, immediate market refill/reset and discard reshuffle                    |
| Claims             | p. 4      | One color plus wildcards, gray routes, train stock and points, double-route restrictions for 2–3 vs 4–5 players                                                                 |
| Ferries/tunnels    | pp. 4–5   | Minimum locomotive cost, three-card reveal, matching surcharge, all-wild special case, cancellation consumes turn and returns base payment, reveal exhaustion                   |
| Later tickets      | p. 6      | Draw up to three, keep at least one, rejections go below deck                                                                                                                   |
| Stations           | p. 6      | One station per city, costs 1/2/3 matching cards, maximum three, one consistent borrowed opponent route per station across tickets                                              |
| Final round        | p. 6      | At most two trains after a completed turn triggers one MORE turn for every player including the trigger                                                                         |
| Scoring            | p. 7      | Positive/negative destinations, four per unused station, exact edge-simple longest trail (cities may repeat), ten-point ties, borrowed edges excluded from route/longest points |
| Winner             | p. 7      | Total, completed-ticket count, fewer used stations, then European Express bonus; unresolved equality shares rank                                                                |

## Explicit limits / next verification

- The original six-city fixture is intentionally not official data. A separate full-coverage Europe candidate now has 47 cities, 101 tracks and 46 tickets. See DATA_SOURCES.md for attributed sources, route comparison and independent ticket-table checks. Final authorized card-by-card verification remains pending; `complete` is still false.
- The local player list determines clockwise order and starting player. For the rulebook's starting-player convention, place the player who has visited the most European countries first. No travel-history personal information is collected.
- If too few non-locomotives remain to create a legal five-card market, resets are unsatisfiable. The implementation stops that loop and permits the finite remaining market; the precise late-deck policy still needs an authoritative FAQ ruling and targeted tests before M1 release.
- No pass action is accepted. The rulebook lists four turn actions. In a compact-fixture stalemate, explicitly end training; do not silently treat it as an official final round.
- Longest-trail search is now memoized; tests include a dense legal 45-train Europe subgraph and complete-map game states. It remains exact and potentially exponential. Expand performance profiling and consider off-main-thread scoring before release.
- Browser coverage now includes complete Europe-candidate games through successful/cancelled tunnels, ferries, stations, draws and automatic ending, plus targeted illegal actions on desktop/mobile. Full verified-data status, accessibility on real devices and remote security/reconnect remain incomplete.

Station borrowing optimization also prefers more completed tickets when two choices yield equal ticket points, preserving the official first winner tie-break. Regression coverage was added in this increment.

The tabletop UI uses green long-ticket and blue short-ticket faces per product-owner direction. This is an original visual theme, separate from the rulebook edition's printed card backgrounds. Seat colors are unique and validated; piece counts/score-marker updates derive from the reducer rather than a visual-only mock. The initial setup gate and automatic initial market reset have explicit regression tests.
