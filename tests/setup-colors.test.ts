import { describe, it, expect } from "vitest";
import { createGame, transition, projectGame } from "../src/domain/engine";
import { demo } from "../src/data/demo";
import { type PlayerColor } from "../src/domain/model";
import { scoreTrackIndex, scoreTrackPosition } from "../src/ui/scoreTrack";
describe("player pieces and setup gate", () => {
  it("assigns unique chosen colors with 45 trains, 3 stations and correct simultaneous private deal", () => {
    const g = createGame(["A", "B"], demo, 7, ["blue", "black"]);
    expect(g.players.map((p) => p.color)).toEqual(["blue", "black"]);
    expect(
      g.players.every(
        (p) =>
          p.trains === 45 &&
          p.stations.length === 0 &&
          p.hand.length === 4 &&
          p.points === 0,
      ),
    ).toBe(true);
    for (const offer of g.initialOffers) {
      expect(offer).toHaveLength(4);
      expect(offer.filter((t) => t.long)).toHaveLength(1);
    }
    const view = projectGame(g, "p0");
    expect(view.players[0].hand).toHaveLength(4);
    expect(view.pending).toMatchObject({ kind: "tickets", initial: true });
    expect(view.players[1]).not.toHaveProperty("hand");
    expect(view.players[1]).not.toHaveProperty("tickets");
    expect(view.players[1].color).toBe("black");
  });
  it("reshuffles the initial open market when at least three rainbows are revealed", () => {
    let resetGame;
    for (let seed = 0; seed < 3000; seed++) {
      const g = createGame(["A", "B"], demo, seed);
      if (g.discard.length >= 5) {
        resetGame = g;
        break;
      }
    }
    expect(resetGame).toBeDefined();
    expect(resetGame!.market).toHaveLength(5);
    expect(resetGame!.market.filter((c) => c === "wild").length).toBeLessThan(
      3,
    );
    expect(resetGame!.discard).toHaveLength(5);
    expect(
      resetGame!.discard.filter((c) => c === "wild").length,
    ).toBeGreaterThanOrEqual(3);
    expect(
      resetGame!.deck.length +
        resetGame!.discard.length +
        resetGame!.market.length +
        resetGame!.players.flatMap((p) => p.hand).length,
    ).toBe(110);
  });
  it("rejects duplicate/unknown colors or a color list of wrong size", () => {
    expect(() => createGame(["A", "B"], demo, 7, ["red", "red"])).toThrow(
      "INVALID_COLORS",
    );
    expect(() => createGame(["A", "B"], demo, 7, ["red"])).toThrow(
      "INVALID_COLORS",
    );
    expect(() =>
      createGame(["A", "B"], demo, 7, ["red", "purple"] as PlayerColor[]),
    ).toThrow("INVALID_COLORS");
  });
  it("does not allow turn actions until every initial ticket offer is confirmed", () => {
    let g = createGame(["A", "B"], demo, 7);
    for (const action of [
      { type: "drawCard", source: "blind" },
      { type: "drawTickets" },
      { type: "station", city: "Paris", payment: [] },
      { type: "claim", route: "lp", payment: [] },
    ])
      expect(() => transition(g, "p0", action)).toThrow("WRONG_PHASE");
    if (g.pending?.kind !== "tickets") throw Error();
    g = transition(g, "p0", {
      type: "keepTickets",
      ids: g.pending.tickets.slice(0, 2).map((t) => t.id),
    });
    expect(g.phase).toBe("setup");
    expect(g.active).toBe(1);
    expect(g.turn).toBe(1);
    expect(() => transition(g, "p1", { type: "drawTickets" })).toThrow(
      "WRONG_PHASE",
    );
    if (g.pending?.kind !== "tickets") throw Error();
    g = transition(g, "p1", {
      type: "keepTickets",
      ids: g.pending.tickets.slice(0, 2).map((t) => t.id),
    });
    expect(g.phase).toBe("playing");
    expect(g.active).toBe(0);
    expect(g.turn).toBe(1);
  });
});
describe("perimeter scoring coordinates", () => {
  it("has 100 distinct cells and wraps totals without losing their actual score", () => {
    const positions = Array.from({ length: 100 }, (_, n) =>
      scoreTrackPosition(n, 1800, 1300),
    );
    expect(new Set(positions.map((p) => `${p.x},${p.y}`)).size).toBe(100);
    expect(scoreTrackPosition(0, 1800, 1300)).toEqual({ x: 30, y: 1270 });
    expect(scoreTrackPosition(30, 1800, 1300)).toEqual({ x: 1770, y: 1270 });
    expect(scoreTrackPosition(50, 1800, 1300)).toEqual({ x: 1770, y: 30 });
    expect(scoreTrackPosition(80, 1800, 1300)).toEqual({ x: 30, y: 30 });
    expect(scoreTrackIndex(101)).toBe(1);
    expect(scoreTrackIndex(-1)).toBe(99);
    expect(scoreTrackPosition(100, 1800, 1300)).toEqual(positions[0]);
  });
});
