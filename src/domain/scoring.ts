import type { Game, Route } from "./model";
function connected(routes: Route[], a: string, b: string) {
  const seen = new Set([a]);
  const queue = [a];
  for (const city of queue) {
    for (const r of routes) {
      const next = r.a === city ? r.b : r.b === city ? r.a : null;
      if (next && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen.has(b);
}
// Longest trail: cities may repeat, edges cannot. Borrowed edges never enter this graph.
export function longestTrail(routes: Route[]): number {
  const byCity = new Map<string, number[]>();
  routes.forEach((r, i) => {
    for (const c of [r.a, r.b]) byCity.set(c, [...(byCity.get(c) ?? []), i]);
  });
  const memo = new Map<string, number>();
  function walk(city: string, used: bigint): number {
    const key = `${city}:${used}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    let best = 0;
    for (const i of byCity.get(city) ?? []) {
      const bit = 1n << BigInt(i);
      if (!(used & bit)) {
        const r = routes[i];
        best = Math.max(
          best,
          r.length + walk(r.a === city ? r.b : r.a, used | bit),
        );
      }
    }
    memo.set(key, best);
    return best;
  }
  return Math.max(0, ...[...byCity.keys()].map((c) => walk(c, 0n)));
}
export function scoreGame(g: Game) {
  const rows = g.players.map((p) => {
    const own = g.data.routes.filter((r) => g.claims[r.id] === p.id);
    // Choose one borrowed edge per station consistently across ALL tickets.
    const choices = p.stations.map((city) => [
      undefined,
      ...g.data.routes.filter(
        (r) =>
          (r.a === city || r.b === city) &&
          g.claims[r.id] &&
          g.claims[r.id] !== p.id,
      ),
    ]);
    let best = -Infinity;
    let completed: string[] = [];
    let borrowed: string[] = [];
    function evaluate(i: number, edges: Route[]) {
      if (i < choices.length) {
        for (const r of choices[i]) evaluate(i + 1, r ? [...edges, r] : edges);
        return;
      }
      const done = p.tickets.filter((t) =>
        connected([...own, ...edges], t.a, t.b),
      );
      const total = p.tickets.reduce(
        (n, t) => n + (done.includes(t) ? t.points : -t.points),
        0,
      );
      if (total > best || (total === best && done.length > completed.length)) {
        best = total;
        completed = done.map((t) => t.id);
        borrowed = edges.map((r) => r.id);
      }
    }
    evaluate(0, []);
    return {
      id: p.id,
      name: p.name,
      routePoints: p.points,
      ticketPoints: best,
      completed,
      borrowed,
      stationPoints: (3 - p.stations.length) * 4,
      longest: longestTrail(own),
      express: 0,
      total: 0,
      rank: 0,
    };
  });
  const max = Math.max(...rows.map((r) => r.longest));
  for (const row of rows) {
    row.express = row.longest === max ? 10 : 0;
    row.total =
      row.routePoints + row.ticketPoints + row.stationPoints + row.express;
  }
  // Official tie breaks: score, completed tickets, fewer stations, then express bonus.
  rows.sort(
    (a, b) =>
      b.total - a.total ||
      b.completed.length - a.completed.length ||
      b.stationPoints - a.stationPoints ||
      b.express - a.express,
  );
  rows.forEach((r, i) => {
    const prev = rows[i - 1];
    r.rank =
      prev &&
      prev.total === r.total &&
      prev.completed.length === r.completed.length &&
      prev.stationPoints === r.stationPoints &&
      prev.express === r.express
        ? prev.rank
        : i + 1;
  });
  return rows;
}
