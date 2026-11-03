// Test-only legal action driver, never imported by the production app.
import { canClaim, createGame, transition } from "../../src/domain/engine";
import { matchingPayment, routePayment } from "../../src/domain/payments";
import {
  colors,
  type Action,
  type Dataset,
  type Game,
} from "../../src/domain/model";
export interface Step {
  actor: string;
  action: Action;
  turn: number;
}
export function nextTestAction(g: Game): Action {
  const p = g.players[g.active];
  if (g.pending?.kind === "tickets")
    return {
      type: "keepTickets",
      ids: g.pending.tickets.slice(0, g.pending.minimum).map((t) => t.id),
    };
  if (g.pending?.kind === "tunnel")
    return { type: "resolveTunnel", payment: tunnelExtra(g) };
  if (g.pending?.kind === "draw") return draw(g);
  // Exercise one station and one later destination draw per player as well as rails.
  if (p.stations.length === 0 && g.turn > g.players.length * 2) {
    const city = Object.keys(g.data.cities).find(
      (c) => !g.players.some((other) => other.stations.includes(c)),
    );
    if (city && p.hand.length)
      return { type: "station", city, payment: [p.hand[0]] };
  }
  if (
    p.tickets.length === 2 &&
    g.turn > g.players.length * 5 &&
    g.ticketDeck.length
  )
    return { type: "drawTickets" };
  const ordered = [...g.data.routes].sort(
    (a, b) => b.length - a.length || a.id.localeCompare(b.id),
  );
  for (const route of ordered) {
    const payment = routePayment(p.hand, route);
    if (payment && canClaim(g, route, payment))
      return { type: "claim", route: route.id, payment };
  }
  return draw(g);
}
function tunnelExtra(g: Game) {
  if (g.pending?.kind !== "tunnel") throw Error("Expected tunnel");
  const hand = [...g.players[g.active].hand];
  for (const c of g.pending.payment) hand.splice(hand.indexOf(c), 1);
  return matchingPayment(hand, g.pending.extra, g.pending.color);
}
function draw(g: Game): Action {
  const second = g.pending?.kind === "draw";
  // Target plentiful hand colors. Blind draw fallback covers deck reshuffles.
  const hand = g.players[g.active].hand;
  const target = [...colors].sort(
    (a, b) =>
      hand.filter((c) => c === b).length - hand.filter((c) => c === a).length,
  )[0];
  let index = g.market.findIndex((c) => c === target);
  if (index < 0 && !second) index = g.market.indexOf("wild");
  if (index >= 0) return { type: "drawCard", source: index };
  if (g.deck.length || g.discard.length)
    return { type: "drawCard", source: "blind" };
  index = g.market.findIndex((c) => !second || c !== "wild");
  if (index >= 0) return { type: "drawCard", source: index };
  throw Error(`No legal draw at turn ${g.turn}`);
}
export function playGame(
  data: Dataset,
  players: number,
  seed: number,
  maxActions = 1600,
) {
  let game = createGame(
    Array.from({ length: players }, (_, i) => `Player ${i + 1}`),
    data,
    seed,
  );
  const initial = structuredClone(game),
    steps: Step[] = [];
  while (game.phase !== "finished" && steps.length < maxActions) {
    const actor = game.players[game.active].id,
      action = nextTestAction(game);
    steps.push({ actor, action, turn: game.turn });
    game = transition(game, actor, action);
  }
  if (game.phase !== "finished")
    throw Error(
      `Did not finish seed ${seed}, players ${players}, turn ${game.turn}`,
    );
  return { initial, game, steps };
}
