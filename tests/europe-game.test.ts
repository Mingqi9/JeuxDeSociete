import { describe, it, expect } from "vitest";
import { europe } from "../src/data/europe";
import { transition, projectGame } from "../src/domain/engine";
import { scoreGame } from "../src/domain/scoring";
import { routePoints, colors } from "../src/domain/model";
import { playGame } from "./support/playthrough";
describe("full Europe candidate-map games through legal actions", () => {
  it.each([2, 3, 4, 5])(
    "%i players finish with conserved cards/trains, correct scoring and private projections",
    (players) => {
      for (const seed of [7, 124, 2026]) {
        const run = playGame(europe, players, seed);
        let game = run.initial;
        for (const { actor, action } of run.steps) {
          game = transition(game, actor, action);
          const all = [
            ...game.deck,
            ...game.discard,
            ...game.market,
            ...game.players.flatMap((p) => p.hand),
            ...(game.pending?.kind === "tunnel" ? game.pending.revealed : []),
          ];
          expect(all).toHaveLength(110);
          for (const c of [...colors, "wild"])
            expect(all.filter((x) => x === c)).toHaveLength(
              c === "wild" ? 14 : 12,
            );
          for (const p of game.players) {
            const own = game.data.routes.filter(
              (r) => game.claims[r.id] === p.id,
            );
            expect(p.trains + own.reduce((n, r) => n + r.length, 0)).toBe(45);
            expect(p.points).toBe(
              own.reduce((n, r) => n + routePoints[r.length], 0),
            );
            expect(p.stations.length).toBeLessThanOrEqual(3);
          }
        }
        expect(game).toEqual(run.game);
        expect(game.finalTurns).toBe(0);
        expect(game.players.some((p) => p.trains <= 2)).toBe(true);
        const rows = scoreGame(game);
        expect(rows).toHaveLength(players);
        expect(rows.every((r) => Number.isFinite(r.total))).toBe(true);
        const projection = projectGame(game, "p0");
        expect(
          projection.players
            .slice(1)
            .every((p) => !("hand" in p) && !("tickets" in p)),
        ).toBe(true);
        expect(run.steps.some((s) => s.action.type === "station")).toBe(true);
        expect(run.steps.some((s) => s.action.type === "resolveTunnel")).toBe(
          true,
        );
        expect(run.steps.some((s) => s.action.type === "drawTickets")).toBe(
          true,
        );
      }
    },
    30000,
  );
});
