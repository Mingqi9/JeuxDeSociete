import {
  actionSchema,
  playerColors,
  type PlayerColor,
  colors,
  requireRule,
  routePoints,
  type Card,
  type Dataset,
  type Game,
  type Player,
  type Route,
} from "./model";
import { validateDataset } from "./dataValidation";
// PRNG state is part of the authoritative state: replay never depends on ambient Math.random.
// Online callers inject cryptographic randomness; the source is never serialized.
const randomSources = new WeakMap<object, () => number>();
function random(g: Pick<Game, "rng">) {
  const source = randomSources.get(g);
  if (source) return source();
  g.rng = (Math.imul(1664525, g.rng) + 1013904223) >>> 0;
  return g.rng / 4294967296;
}
function shuffle<T>(g: Pick<Game, "rng">, cards: T[]) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(random(g) * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
function take(g: Game): Card | undefined {
  if (!g.deck.length && g.discard.length)
    g.deck = shuffle(g, g.discard.splice(0));
  return g.deck.shift();
}
function refill(g: Game) {
  // With fewer than three non-wild cards available, a legal five-card market is
  // impossible. Keep that finite market visible rather than looping forever.
  for (let reset = 0; reset < 100; reset++) {
    while (g.market.length < 5) {
      const c = take(g);
      if (!c) break;
      g.market.push(c);
    }
    if (g.market.filter((c) => c === "wild").length < 3) return;
    const pool = [...g.market, ...g.deck, ...g.discard];
    if (pool.filter((c) => c !== "wild").length < 3) return;
    g.discard.push(...g.market.splice(0));
  }
  // Deterministic fallback prevents pathological shuffle loops.
  const pool = shuffle(g, [...g.market, ...g.deck, ...g.discard]);
  g.market = [];
  g.deck = [];
  g.discard = [];
  for (let i = 0; i < 3; i++) {
    const at = pool.findIndex((c) => c !== "wild");
    g.market.push(pool.splice(at, 1)[0]);
  }
  while (g.market.length < 5 && pool.length) g.market.push(pool.shift()!);
  g.deck = pool;
}
export function createGame(
  names: string[],
  data: Dataset,
  seed = 1,
  chosenColors: PlayerColor[] = playerColors.slice(0, names.length),
  randomSource?: () => number,
): Game {
  validateDataset(data);
  requireRule(
    names.length >= 2 &&
      names.length <= 5 &&
      names.every((n) => n.trim().length > 0 && n.trim().length <= 30),
    "INVALID_PLAYERS",
  );
  requireRule(
    chosenColors.length === names.length &&
      new Set(chosenColors).size === names.length &&
      chosenColors.every((c) => playerColors.includes(c)),
    "INVALID_COLORS",
  );
  const g: Game = {
    data: structuredClone(data),
    players: names.map((name, i) => ({
      id: `p${i}`,
      color: chosenColors[i],
      name: name.trim(),
      hand: [],
      tickets: [],
      trains: 45,
      stations: [],
      points: 0,
    })),
    active: 0,
    phase: "setup",
    deck: [],
    discard: [],
    market: [],
    ticketDeck: [],
    initialOffers: [],
    claims: {},
    pending: null,
    finalTurns: null,
    rng: seed >>> 0,
    turn: 1,
  };
  if (randomSource) randomSources.set(g, randomSource);
  g.deck = shuffle(g, [
    ...colors.flatMap((c) => Array<Card>(12).fill(c)),
    ...Array<Card>(14).fill("wild"),
  ]);
  const long = shuffle(
    g,
    data.tickets.filter((t) => t.long).map((t) => ({ ...t })),
  );
  g.ticketDeck = shuffle(
    g,
    data.tickets.filter((t) => !t.long).map((t) => ({ ...t })),
  );
  requireRule(
    long.length >= names.length && g.ticketDeck.length >= names.length * 3,
    "INSUFFICIENT_TICKETS",
  );
  for (const p of g.players) {
    for (let i = 0; i < 4; i++) p.hand.push(take(g)!);
    g.initialOffers.push([long.shift()!, ...g.ticketDeck.splice(0, 3)]);
  }
  refill(g);
  g.pending = {
    kind: "tickets",
    tickets: g.initialOffers[0],
    minimum: 2,
    initial: true,
  };
  return g;
}
function player(g: Game): Player {
  return g.players[g.active];
}
function endTurn(g: Game) {
  g.pending = null;
  if (g.finalTurns !== null) {
    g.finalTurns--;
    if (g.finalTurns === 0) {
      g.phase = "finished";
      return;
    }
  } else if (player(g).trains <= 2) g.finalTurns = g.players.length;
  g.active = (g.active + 1) % g.players.length;
  g.turn++;
}
function pay(p: Player, cards: Card[]) {
  const hand = [...p.hand];
  for (const c of cards) {
    const i = hand.indexOf(c);
    requireRule(i >= 0, "INSUFFICIENT_CARDS");
    hand.splice(i, 1);
  }
  p.hand = hand;
}
function paymentColor(cards: Card[]): Card {
  const distinct = [...new Set(cards.filter((c) => c !== "wild"))];
  requireRule(distinct.length <= 1, "MIXED_PAYMENT");
  return distinct[0] ?? "wild";
}
function checkRoute(g: Game, r: Route, cards: Card[]) {
  const p = player(g);
  requireRule(!g.claims[r.id], "ROUTE_TAKEN");
  requireRule(p.trains >= r.length, "INSUFFICIENT_TRAINS");
  const parallel = g.data.routes.filter(
    (other) =>
      other.id !== r.id &&
      ((other.a === r.a && other.b === r.b) ||
        (other.a === r.b && other.b === r.a)),
  );
  requireRule(
    !parallel.some(
      (other) =>
        g.claims[other.id] &&
        (g.players.length <= 3 || g.claims[other.id] === p.id),
    ),
    "DOUBLE_ROUTE",
  );
  requireRule(cards.length === r.length, "WRONG_PAYMENT");
  const color = paymentColor(cards);
  requireRule(
    r.color === "gray" || color === "wild" || color === r.color,
    "WRONG_COLOR",
  );
  requireRule(
    cards.filter((c) => c === "wild").length >= (r.locomotives ?? 0),
    "FERRY_WILD",
  );
  pay({ ...p, hand: [...p.hand] }, cards);
}
function claim(g: Game, r: Route, cards: Card[]) {
  const p = player(g);
  pay(p, cards);
  g.discard.push(...cards);
  g.claims[r.id] = p.id;
  p.trains -= r.length;
  p.points += routePoints[r.length];
  refill(g);
  endTurn(g);
}
export function transition(
  state: Game,
  actor: string,
  input: unknown,
  randomSource?: () => number,
): Game {
  const parsed = actionSchema.safeParse(input);
  requireRule(parsed.success, "INVALID_ACTION");
  const a = parsed.data;
  requireRule(state.phase !== "finished", "GAME_OVER");
  requireRule(state.players[state.active].id === actor, "NOT_YOUR_TURN");
  const g = structuredClone(state);
  if (randomSource) randomSources.set(g, randomSource);
  const p = player(g);
  if (a.type === "keepTickets") {
    requireRule(g.pending?.kind === "tickets", "WRONG_PHASE");
    const offer = g.pending;
    const ids = new Set(a.ids);
    requireRule(
      ids.size === a.ids.length &&
        ids.size >= offer.minimum &&
        a.ids.every((id) => offer.tickets.some((t) => t.id === id)),
      "INVALID_TICKETS",
    );
    p.tickets.push(...offer.tickets.filter((t) => ids.has(t.id)));
    // Initial rejects (regular AND long) leave the game. Only later rejects
    // return to the bottom of the destination deck.
    if (!offer.initial)
      g.ticketDeck.push(...offer.tickets.filter((t) => !ids.has(t.id)));
    if (offer.initial) {
      g.initialOffers[g.active] = [];
      g.active++;
      if (g.active === g.players.length) {
        g.active = 0;
        g.phase = "playing";
        g.initialOffers = [];
        g.pending = null;
      } else
        g.pending = {
          kind: "tickets",
          tickets: g.initialOffers[g.active],
          minimum: 2,
          initial: true,
        };
    } else endTurn(g);
    return g;
  }
  requireRule(g.phase === "playing", "WRONG_PHASE");
  if (a.type === "resolveTunnel") {
    requireRule(g.pending?.kind === "tunnel", "WRONG_PHASE");
    const pending = g.pending;
    if (a.payment === null) {
      g.discard.push(...pending.revealed);
      refill(g);
      endTurn(g);
      return g;
    }
    requireRule(
      a.payment.length === pending.extra &&
        a.payment.every(
          (c) =>
            c === "wild" || (pending.color !== "wild" && c === pending.color),
        ),
      "TUNNEL_PAYMENT",
    );
    // Base payment remains in hand until the tunnel succeeds; it cannot be reused for extra payment.
    const all = [...pending.payment, ...a.payment];
    pay({ ...p, hand: [...p.hand] }, all);
    g.discard.push(...pending.revealed);
    claim(g, g.data.routes.find((r) => r.id === pending.route)!, all);
    return g;
  }
  requireRule(!g.pending || g.pending.kind === "draw", "WRONG_PHASE");
  if (a.type === "drawCard") {
    const second = g.pending?.kind === "draw";
    let c: Card | undefined;
    if (a.source === "blind") {
      c = take(g);
      requireRule(c, "NO_CARDS");
    } else {
      c = g.market[a.source];
      requireRule(c, "NO_CARDS");
      requireRule(!second || c !== "wild", "SECOND_WILD");
      g.market.splice(a.source, 1);
    }
    p.hand.push(c);
    refill(g);
    if (
      second ||
      (a.source !== "blind" && c === "wild") ||
      (!g.deck.length &&
        !g.discard.length &&
        !g.market.some((card) => card !== "wild"))
    )
      endTurn(g);
    else g.pending = { kind: "draw", count: 1 };
    return g;
  }
  requireRule(!g.pending, "WRONG_PHASE");
  if (a.type === "claim") {
    const r = g.data.routes.find((r) => r.id === a.route);
    requireRule(r, "UNKNOWN_ROUTE");
    checkRoute(g, r, a.payment);
    if (r.tunnel) {
      const revealed: Card[] = [];
      for (let i = 0; i < 3; i++) {
        const c = take(g);
        if (c) revealed.push(c);
      }
      const color = paymentColor(a.payment);
      const extra = revealed.filter(
        (c) => c === "wild" || (color !== "wild" && c === color),
      ).length;
      g.pending = {
        kind: "tunnel",
        route: r.id,
        payment: a.payment,
        color,
        revealed,
        extra,
      };
      return g;
    }
    claim(g, r, a.payment);
    return g;
  }
  if (a.type === "station") {
    requireRule(
      Object.hasOwn(g.data.cities, a.city) &&
        !g.players.some((other) => other.stations.includes(a.city)),
      "CITY_OCCUPIED",
    );
    requireRule(p.stations.length < 3, "NO_STATIONS");
    requireRule(a.payment.length === p.stations.length + 1, "WRONG_PAYMENT");
    paymentColor(a.payment);
    pay(p, a.payment);
    g.discard.push(...a.payment);
    p.stations.push(a.city);
    refill(g);
    endTurn(g);
    return g;
  }
  if (a.type === "drawTickets") {
    requireRule(g.ticketDeck.length, "NO_TICKETS");
    g.pending = {
      kind: "tickets",
      tickets: g.ticketDeck.splice(0, 3),
      minimum: 1,
      initial: false,
    };
    return g;
  }
  throw new Error("INVALID_ACTION");
}
// Public/private projection for future transport; never serialize the full Game to remote clients.
export function projectGame(g: Game, viewer: string) {
  return {
    phase: g.phase,
    active: g.players[g.active].id,
    turn: g.turn,
    finalTurns: g.finalTurns,
    market: [...g.market],
    deckCount: g.deck.length,
    ticketCount: g.ticketDeck.length,
    claims: { ...g.claims },
    players: g.players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      trains: p.trains,
      stations: [...p.stations],
      points: p.points,
      handCount: p.hand.length,
      ticketCount: p.tickets.length,
      ...(p.id === viewer
        ? { hand: [...p.hand], tickets: structuredClone(p.tickets) }
        : {}),
    })),
    pending:
      g.pending?.kind === "tickets"
        ? g.players[g.active].id === viewer
          ? structuredClone(g.pending)
          : { kind: "tickets" }
        : structuredClone(g.pending),
  };
}

// Reuse the exact reducer validation for UI previews; simulation cannot mutate state.
export function actionError(
  state: Game,
  actor: string,
  input: unknown,
): string | null {
  try {
    transition(state, actor, input);
    return null;
  } catch (error) {
    if (error instanceof Error) return error.message;
    return "INVALID_ACTION";
  }
}

// Pure cheap claim planning for clients/tests; the reducer remains the final validator.
export function canClaim(g: Game, route: Route, payment: Card[]): boolean {
  if (g.phase !== "playing" || g.pending) return false;
  try {
    checkRoute(g, route, payment);
    return true;
  } catch {
    return false;
  }
}
