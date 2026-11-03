import { describe, it, expect } from "vitest";
import { createGame, transition, projectGame } from "../src/domain/engine";
import { longestTrail, scoreGame } from "../src/domain/scoring";
import { demo } from "../src/data/demo";
import { validateDataset } from "../src/domain/dataValidation";
import { colors, type Game, type Card } from "../src/domain/model";
function ready(n = 2): Game {
  let g = createGame(
    Array.from({ length: n }, (_, i) => `P${i}`),
    demo,
    23,
  );
  for (let i = 0; i < n; i++) {
    if (g.pending?.kind !== "tickets") throw Error();
    g = transition(g, g.players[g.active].id, {
      type: "keepTickets",
      ids: g.pending.tickets.slice(0, 2).map((t) => t.id),
    });
  }
  return g;
}
function act(g: Game, a: unknown) {
  return transition(g, g.players[g.active].id, a);
}
function rich(n = 2) {
  const g = ready(n);
  g.players[0].hand = colors
    .flatMap((c) => Array<Card>(12).fill(c))
    .concat(Array<Card>(14).fill("wild"));
  return g;
}
describe("setup, validation, deterministic transitions", () => {
  it("deals 110 train cards with 12 of each color and 14 wilds", () => {
    const g = createGame(["A", "B", "C", "D", "E"], demo, 4);
    const all = [
      ...g.deck,
      ...g.discard,
      ...g.market,
      ...g.players.flatMap((p) => p.hand),
    ];
    expect(all).toHaveLength(110);
    for (const c of colors) expect(all.filter((x) => x === c)).toHaveLength(12);
    expect(all.filter((x) => x === "wild")).toHaveLength(14);
    expect(g.players.every((p) => p.hand.length === 4 && p.trains === 45)).toBe(
      true,
    );
    expect(
      g.initialOffers.every(
        (t) => t.length === 4 && t.filter((x) => x.long).length === 1,
      ),
    ).toBe(true);
  });
  it("requires 2–5 named players and sufficient tickets", () => {
    expect(() => createGame(["A"], demo)).toThrow("INVALID_PLAYERS");
    expect(() => createGame(["A", " "], demo)).toThrow();
    expect(() => createGame(["A", "B"], { ...demo, tickets: [] })).toThrow(
      "INSUFFICIENT_TICKETS",
    );
  });
  it("is deterministic and immutable; rejects malformed and out-of-turn actions", () => {
    expect(ready()).toEqual(ready());
    const g = ready(),
      before = structuredClone(g);
    act(g, { type: "drawCard", source: "blind" });
    expect(g).toEqual(before);
    expect(() => transition(g, "p1", { type: "drawTickets" })).toThrow(
      "NOT_YOUR_TURN",
    );
    expect(() =>
      act(g, { type: "claim", route: "lp", payment: ["hacked"] }),
    ).toThrow("INVALID_ACTION");
  });
  it("requires unique initial choices, excludes rejected long tickets from later deck", () => {
    let g = createGame(["A", "B"], demo);
    const p = g.pending;
    if (p?.kind !== "tickets") throw Error();
    expect(() =>
      act(g, { type: "keepTickets", ids: [p.tickets[0].id] }),
    ).toThrow();
    expect(() =>
      act(g, { type: "keepTickets", ids: [p.tickets[1].id, p.tickets[1].id] }),
    ).toThrow();
    g = act(g, {
      type: "keepTickets",
      ids: p.tickets.slice(1, 3).map((t) => t.id),
    });
    expect(g.ticketDeck.every((t) => !t.long)).toBe(true);
    expect(g.active).toBe(1);
  });
  it("removes initial rejected regular tickets from play, not just long tickets", () => {
    const g = createGame(["A", "B"], demo, 1);
    if (g.pending?.kind !== "tickets") throw Error();
    const offer = g.pending.tickets,
      deckCount = g.ticketDeck.length;
    const next = act(g, {
      type: "keepTickets",
      ids: offer.slice(0, 2).map((t) => t.id),
    });
    expect(next.ticketDeck).toHaveLength(deckCount);
    expect(
      next.ticketDeck.some((t) =>
        offer.slice(2).some((rejected) => rejected.id === t.id),
      ),
    ).toBe(false);
  });
  it("validates dataset IDs and endpoints", () => {
    expect(validateDataset(demo)).toBe(true);
    expect(() =>
      validateDataset({ ...demo, routes: [...demo.routes, demo.routes[0]] }),
    ).toThrow("INVALID_DATA");
  });
});
describe("card draw and tickets", () => {
  it("face-up wild ends turn; second wild rejected; blind wild is normal", () => {
    const g = ready();
    g.market = ["wild", "red", "blue", "green", "black"];
    expect(act(g, { type: "drawCard", source: 0 }).active).toBe(1);
    g.deck = ["wild", "red"];
    let next = act(g, { type: "drawCard", source: "blind" });
    expect(next.pending?.kind).toBe("draw");
    expect(() => act(next, { type: "drawCard", source: 0 })).toThrow(
      "SECOND_WILD",
    );
    next = act(next, { type: "drawCard", source: "blind" });
    expect(next.active).toBe(1);
  });
  it("refills/reset market, reshuffles discards, preserves all cards", () => {
    const g = ready();
    g.market = ["wild", "wild", "red", "blue", "green"];
    g.deck = ["wild", "orange", "purple", "white", "black", "red", "green"];
    g.discard = ["yellow"];
    const total =
      g.deck.length +
      g.discard.length +
      g.market.length +
      g.players.flatMap((p) => p.hand).length;
    const next = act(g, { type: "drawCard", source: 2 });
    expect(next.market.filter((c) => c === "wild").length).toBeLessThan(3);
    expect(
      next.deck.length +
        next.discard.length +
        next.market.length +
        next.players.flatMap((p) => p.hand).length,
    ).toBe(total);
  });
  it("handles impossible market resets and empty decks without looping", () => {
    const g = ready();
    g.deck = [];
    g.discard = [];
    g.market = ["red", "wild", "wild", "wild"];
    const next = act(g, { type: "drawCard", source: 0 });
    expect(next.active).toBe(1);
    expect(next.market).toHaveLength(3);
    expect(() => act(next, { type: "drawCard", source: "blind" })).toThrow(
      "NO_CARDS",
    );
  });
  it("reshuffles discard for a blind draw", () => {
    const g = ready();
    g.deck = [];
    g.discard = ["red", "blue"];
    g.market = [];
    expect(
      act(g, { type: "drawCard", source: "blind" }).players[0].hand.length,
    ).toBe(5);
  });
  it("later draws require one kept and return rejects to bottom; only available tickets drawn", () => {
    const g = ready();
    g.ticketDeck = g.ticketDeck.slice(0, 2);
    let next = act(g, { type: "drawTickets" });
    expect(next.pending?.kind).toBe("tickets");
    if (next.pending?.kind !== "tickets") throw Error();
    const id = next.pending.tickets[0].id;
    expect(() =>
      act(next, { type: "keepTickets", ids: ["missing"] }),
    ).toThrow();
    next = act(next, { type: "keepTickets", ids: [id] });
    expect(next.ticketDeck).toHaveLength(1);
    expect(next.active).toBe(1);
  });
});
describe("claims, ferries and doubles", () => {
  it("pays cards, trains and claim points exactly once", () => {
    const g = rich();
    const next = act(g, {
      type: "claim",
      route: "pb1",
      payment: ["red", "wild"],
    });
    expect(next.players[0].trains).toBe(43);
    expect(next.players[0].points).toBe(2);
    expect(next.claims.pb1).toBe("p0");
    expect(next.players[0].hand).toHaveLength(g.players[0].hand.length - 2);
    expect(() =>
      act(next, { type: "claim", route: "pb1", payment: ["red", "red"] }),
    ).toThrow("ROUTE_TAKEN");
  });
  it("rejects wrong color, mixed, missing cards, pieces, length and unknown routes", () => {
    const g = rich();
    for (const payment of [["blue", "blue"], ["red", "blue"], ["red"]])
      expect(() => act(g, { type: "claim", route: "pb1", payment })).toThrow();
    g.players[0].hand = [];
    expect(() =>
      act(g, { type: "claim", route: "pb1", payment: ["red", "red"] }),
    ).toThrow("INSUFFICIENT_CARDS");
    g.players[0].trains = 1;
    expect(() =>
      act(g, { type: "claim", route: "pb1", payment: ["red", "red"] }),
    ).toThrow("INSUFFICIENT_TRAINS");
    expect(() =>
      act(g, { type: "claim", route: "invalid", payment: [] }),
    ).toThrow("UNKNOWN_ROUTE");
  });
  it("requires ferry locomotives and permits gray single-color payment", () => {
    const g = rich();
    expect(() =>
      act(g, { type: "claim", route: "lp", payment: ["red", "red"] }),
    ).toThrow("FERRY_WILD");
    expect(
      act(g, { type: "claim", route: "lp", payment: ["blue", "wild"] }).claims
        .lp,
    ).toBe("p0");
  });
  it.each([2, 3])("closes double routes for %i players", (n) => {
    const g = rich(n);
    g.claims.pb2 = "p1";
    expect(() =>
      act(g, { type: "claim", route: "pb1", payment: ["red", "red"] }),
    ).toThrow("DOUBLE_ROUTE");
  });
  it("permits different owners at 4–5 players but never both sides for one player", () => {
    const g = rich(4);
    g.claims.pb2 = "p1";
    expect(
      act(g, { type: "claim", route: "pb1", payment: ["red", "red"] }).claims
        .pb1,
    ).toBe("p0");
    g.claims.pb2 = "p0";
    expect(() =>
      act(g, { type: "claim", route: "pb1", payment: ["red", "red"] }),
    ).toThrow("DOUBLE_ROUTE");
  });
});
describe("tunnels and stations", () => {
  it("reveals three and validates extra payment without reusing base payment", () => {
    let g = rich();
    g.deck = ["red", "wild", "blue"];
    g = act(g, { type: "claim", route: "pz", payment: ["red", "red", "red"] });
    expect(g.pending).toMatchObject({
      kind: "tunnel",
      extra: 2,
      revealed: ["red", "wild", "blue"],
    });
    expect(() => act(g, { type: "drawTickets" })).toThrow("WRONG_PHASE");
    expect(() =>
      act(g, { type: "resolveTunnel", payment: ["blue", "blue"] }),
    ).toThrow("TUNNEL_PAYMENT");
    g.players[0].hand = ["red", "red", "red"];
    expect(() =>
      act(g, { type: "resolveTunnel", payment: ["red", "red"] }),
    ).toThrow("INSUFFICIENT_CARDS");
    g.players[0].hand.push("wild", "red");
    const next = act(g, { type: "resolveTunnel", payment: ["wild", "red"] });
    expect(next.claims.pz).toBe("p0");
    expect(next.players[0].hand).toHaveLength(0);
  });
  it("cancellation keeps base cards and pieces, discards reveals, consumes turn", () => {
    let g = rich();
    g.deck = ["red", "wild", "blue"];
    g = act(g, { type: "claim", route: "pz", payment: ["red", "red", "red"] });
    const before = [...g.players[0].hand];
    const next = act(g, { type: "resolveTunnel", payment: null });
    expect(next.active).toBe(1);
    expect(next.players[0].hand).toEqual(before);
    expect(next.claims.pz).toBeUndefined();
    expect(next.players[0].trains).toBe(45);
  });
  it("all-locomotive tunnel only matches revealed locomotives and pays wild extras", () => {
    let g = rich();
    g.deck = ["red", "wild", "red"];
    g = act(g, {
      type: "claim",
      route: "pz",
      payment: ["wild", "wild", "wild"],
    });
    expect(g.pending).toMatchObject({ extra: 1, color: "wild" });
    expect(() => act(g, { type: "resolveTunnel", payment: ["red"] })).toThrow();
    expect(act(g, { type: "resolveTunnel", payment: ["wild"] }).claims.pz).toBe(
      "p0",
    );
  });
  it("empty-deck tunnel reveals zero and may succeed for no extra", () => {
    let g = rich();
    g.deck = [];
    g.discard = [];
    g = act(g, { type: "claim", route: "pz", payment: ["red", "red", "red"] });
    expect(g.pending).toMatchObject({ revealed: [], extra: 0 });
    expect(act(g, { type: "resolveTunnel", payment: [] }).claims.pz).toBe("p0");
  });
  it("stations cost 1,2,3 matching cards; unique city and maximum three", () => {
    let g = rich();
    for (const [i, city] of ["Paris", "Berlin", "Wien"].entries()) {
      g.active = 0;
      g = act(g, { type: "station", city, payment: Array(i + 1).fill("red") });
    }
    g.active = 0;
    expect(g.players[0].stations).toHaveLength(3);
    expect(() =>
      act(g, {
        type: "station",
        city: "London",
        payment: ["red", "red", "red", "red"],
      }),
    ).toThrow("NO_STATIONS");
    g.active = 1;
    expect(() =>
      act(g, { type: "station", city: "Paris", payment: ["red"] }),
    ).toThrow("CITY_OCCUPIED");
  });
});
describe("endgame, scoring and privacy", () => {
  it.each([2, 3, 4, 5])(
    "each of %i players including trigger gets exactly one final turn",
    (n) => {
      let g = ready(n);
      g.players[0].trains = 2;
      g = act(g, { type: "drawCard", source: "blind" });
      g = act(g, { type: "drawCard", source: "blind" });
      expect(g.finalTurns).toBe(n);
      const order = [];
      for (let i = 0; i < n; i++) {
        order.push(g.active);
        g = act(g, { type: "drawCard", source: "blind" });
        if (g.pending?.kind === "draw")
          g = act(g, { type: "drawCard", source: "blind" });
      }
      expect(order).toEqual([
        ...Array.from({ length: n - 1 }, (_, i) => i + 1),
        0,
      ]);
      expect(g.phase).toBe("finished");
      expect(() => act(g, { type: "drawTickets" })).toThrow("GAME_OVER");
    },
  );
  it("longest trail may revisit a city but never an edge", () => {
    const r = demo.routes;
    expect(longestTrail([r[1], r[5], r[7], r[3]])).toBe(10);
    expect(longestTrail([])).toBe(0);
  });
  it("station borrows a consistent single edge for all tickets, never longest path or route points", () => {
    const g = ready();
    g.players[0].stations = ["Paris"];
    g.players[0].tickets = [
      { id: "a", a: "Paris", b: "Bruxelles", points: 5 },
      { id: "b", a: "Paris", b: "Zürich", points: 6 },
    ];
    g.claims = { pb1: "p1", pz: "p1" };
    const row = scoreGame(g).find((r) => r.id === "p0")!;
    expect(row.ticketPoints).toBe(1);
    expect(row.completed).toEqual(["b"]);
    expect(row.longest).toBe(0);
    expect(row.routePoints).toBe(0);
    expect(row.stationPoints).toBe(8);
  });
  it("awards express ties and subtracts failed tickets", () => {
    const g = ready();
    g.players.forEach((p) => (p.tickets = []));
    const rows = scoreGame(g);
    expect(
      rows.every(
        (r) =>
          r.express === 10 &&
          r.stationPoints === 12 &&
          r.total === 22 &&
          r.rank === 1,
      ),
    ).toBe(true);
    g.players[0].tickets = [{ id: "failed", a: "Paris", b: "Wien", points: 9 }];
    expect(scoreGame(g).find((r) => r.id === "p0")!.ticketPoints).toBe(-9);
  });
  it("breaks score/ticket ties by fewer used stations before express bonus", () => {
    const g = ready();
    g.players.forEach((p) => (p.tickets = []));
    g.players[0].stations = ["Paris"];
    g.players[0].points = 4;
    const rows = scoreGame(g);
    expect(rows[0].total).toBe(rows[1].total);
    expect(rows[0].id).toBe("p1");
    expect(rows.map((r) => r.rank)).toEqual([1, 2]);
  });
  it("projects only own hand and tickets, never decks or other initial offers", () => {
    const g = createGame(["A", "B"], demo);
    const view = projectGame(g, "p1");
    expect(view).not.toHaveProperty("deck");
    expect(view).not.toHaveProperty("initialOffers");
    expect(view.players[0]).not.toHaveProperty("hand");
    expect(view.players[0]).not.toHaveProperty("tickets");
    expect(view.pending).toEqual({ kind: "tickets" });
    expect(view.players[1].hand).toHaveLength(4);
  });
  it("plays a complete synthetic game from 45 trains to automatic final scoring", () => {
    const data = structuredClone(demo);
    // A deliberately synthetic graph with enough track for a full rules simulation.
    // It is test-only and makes no claim to reproduce the official map.
    for (let i = 0; i < 48; i++) {
      data.cities[`Test${i}`] = [i * 10, 0];
      data.cities[`Test${i + 1}`] = [(i + 1) * 10, 0];
      data.routes.push({
        id: `test-${i}`,
        a: `Test${i}`,
        b: `Test${i + 1}`,
        length: ([1, 2, 3, 4, 6, 8] as const)[i % 6],
        color: "gray",
      });
    }
    let g = createGame(["A", "B"], data, 124);
    for (let i = 0; i < 2; i++) {
      if (g.pending?.kind !== "tickets") throw Error();
      g = act(g, {
        type: "keepTickets",
        ids: g.pending.tickets.slice(0, 2).map((t) => t.id),
      });
    }
    const count = (s: Game) =>
      s.deck.length +
      s.discard.length +
      s.market.length +
      s.players.flatMap((p) => p.hand).length +
      (s.pending?.kind === "tunnel" ? s.pending.revealed.length : 0);
    let steps = 0;
    while (g.phase !== "finished" && steps++ < 1000) {
      const p = g.players[g.active];
      let claimed = false;
      for (const r of g.data.routes.filter((r) => !r.tunnel)) {
        for (const color of colors) {
          const plain = p.hand.filter((c) => c === color),
            wild = p.hand.filter((c) => c === "wild");
          const w = Math.max(r.locomotives ?? 0, r.length - plain.length);
          const payment = [
            ...plain.slice(0, r.length - w),
            ...wild.slice(0, w),
          ];
          try {
            g = act(g, { type: "claim", route: r.id, payment });
            claimed = true;
            break;
          } catch {
            /* invalid candidate */
          }
        }
        if (claimed) break;
      }
      if (!claimed) {
        const actor = g.active;
        g = act(g, {
          type: "drawCard",
          source: g.deck.length + g.discard.length ? "blind" : 0,
        });
        if (g.pending?.kind === "draw" && g.active === actor) {
          const source =
            g.deck.length + g.discard.length
              ? "blind"
              : g.market.findIndex((c) => c !== "wild");
          g = act(g, { type: "drawCard", source });
        }
      }
      expect(count(g)).toBe(110);
    }
    expect(g.phase).toBe("finished");
    expect(g.players.some((p) => p.trains <= 2)).toBe(true);
    expect(scoreGame(g)).toHaveLength(2);
    expect(steps).toBeLessThan(1000);
  });
});
