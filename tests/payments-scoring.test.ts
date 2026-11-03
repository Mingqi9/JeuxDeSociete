import { describe, it, expect } from "vitest";
import { matchingPayment, routePayment } from "../src/domain/payments";
import { longestTrail, scoreGame } from "../src/domain/scoring";
import { createGame } from "../src/domain/engine";
import { europe } from "../src/data/europe";
import type { Route } from "../src/domain/model";
describe("payment planning", () => {
  it("minimizes locomotives, handles all-wild and insufficient matching cards", () => {
    expect(matchingPayment(["red", "red", "wild"], 2, "red")).toEqual([
      "red",
      "red",
    ]);
    expect(matchingPayment(["red", "blue", "wild"], 2, "red")).toEqual([
      "red",
      "wild",
    ]);
    expect(matchingPayment(["red", "blue"], 2, "gray")).toBe(null);
    expect(matchingPayment(["wild", "wild"], 2, "gray")).toEqual([
      "wild",
      "wild",
    ]);
    expect(matchingPayment(["red"], 0, "wild")).toEqual([]);
  });
  it("respects minimum ferry locomotives and never invents cards", () => {
    const r: Route = {
      id: "f",
      a: "A",
      b: "B",
      length: 2,
      color: "gray",
      locomotives: 2,
    };
    expect(routePayment(["red", "red", "wild"], r)).toBe(null);
    expect(routePayment(["red", "red", "wild", "wild"], r)).toEqual([
      "wild",
      "wild",
    ]);
  });
});
describe("scoring at full-map scale", () => {
  it("optimizes completed-ticket count when station choices yield equal ticket points", () => {
    const g = createGame(["A", "B"], europe, 1);
    g.players.forEach((p) => (p.tickets = []));
    g.data.routes = [
      { id: "large", a: "Paris", b: "London", length: 2, color: "gray" },
      { id: "small", a: "Paris", b: "Berlin", length: 2, color: "gray" },
      { id: "link", a: "Berlin", b: "Wien", length: 3, color: "blue" },
    ];
    g.claims = { large: "p1", small: "p1", link: "p0" };
    g.players[0].stations = ["Paris"];
    g.players[0].points = 4;
    g.players[0].tickets = [
      { id: "big", a: "Paris", b: "London", points: 10 },
      { id: "a", a: "Paris", b: "Berlin", points: 5 },
      { id: "b", a: "Paris", b: "Wien", points: 5 },
    ];
    const row = scoreGame(g).find((r) => r.id === "p0")!;
    expect(row.ticketPoints).toBe(0);
    expect(row.completed).toEqual(["a", "b"]);
    expect(row.borrowed).toEqual(["small"]);
    expect(row.longest).toBe(3);
  });
  it("handles disconnected components, branching, loops and parallel edges", () => {
    const routes: Route[] = [
      { id: "1", a: "A", b: "B", length: 2, color: "red" },
      { id: "2", a: "A", b: "B", length: 3, color: "blue" },
      { id: "3", a: "A", b: "C", length: 1, color: "red" },
      { id: "4", a: "A", b: "D", length: 1, color: "red" },
      { id: "5", a: "X", b: "Y", length: 8, color: "gray" },
    ];
    expect(longestTrail(routes)).toBe(8);
    expect(longestTrail(routes.slice(0, 4))).toBe(7);
  });
  it("benchmarks a dense legal 45-train subgraph of the Europe map", () => {
    const seen = new Set<string>();
    let stock = 45;
    const routes: Route[] = [];
    for (const r of [...europe.routes].sort((a, b) => a.length - b.length)) {
      const pair = [r.a, r.b].sort().join("|");
      if (seen.has(pair) || stock < r.length) continue;
      seen.add(pair);
      routes.push(r);
      stock -= r.length;
    }
    const start = performance.now(),
      length = longestTrail(routes),
      elapsed = performance.now() - start;
    expect(length).toBeGreaterThan(0);
    expect(length).toBeLessThanOrEqual(45 - stock);
    console.info(
      `Europe scoring benchmark: ${routes.length} edges, ${45 - stock} trains, longest ${length}, ${elapsed.toFixed(1)}ms`,
    );
    expect(elapsed).toBeLessThan(5000);
  }, 10000);
});
