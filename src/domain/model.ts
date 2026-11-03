import { z } from "zod";
export const colors = [
  "red",
  "blue",
  "green",
  "yellow",
  "black",
  "white",
  "orange",
  "purple",
] as const;
export const cardSchema = z.enum([...colors, "wild"]);
export type Card = z.infer<typeof cardSchema>;
export type Color = (typeof colors)[number];
export interface Route {
  id: string;
  a: string;
  b: string;
  length: 1 | 2 | 3 | 4 | 6 | 8;
  color: Color | "gray";
  locomotives?: number;
  tunnel?: boolean;
}
export interface Ticket {
  id: string;
  a: string;
  b: string;
  points: number;
  long?: boolean;
}
export interface Dataset {
  id: string;
  complete: boolean;
  cities: Record<string, [number, number]>;
  routes: Route[];
  tickets: Ticket[];
}
export const playerColors = [
  "red",
  "green",
  "blue",
  "yellow",
  "black",
] as const;
export type PlayerColor = (typeof playerColors)[number];
export interface Player {
  color: PlayerColor;
  id: string;
  name: string;
  hand: Card[];
  tickets: Ticket[];
  trains: number;
  stations: string[];
  points: number;
}
export type Pending =
  | { kind: "tickets"; tickets: Ticket[]; minimum: number; initial: boolean }
  | { kind: "draw"; count: 1 }
  | {
      kind: "tunnel";
      route: string;
      payment: Card[];
      color: Card;
      revealed: Card[];
      extra: number;
    };
export interface Game {
  data: Dataset;
  players: Player[];
  active: number;
  phase: "setup" | "playing" | "finished";
  deck: Card[];
  discard: Card[];
  market: Card[];
  ticketDeck: Ticket[];
  initialOffers: Ticket[][];
  claims: Record<string, string>;
  pending: Pending | null;
  finalTurns: number | null;
  rng: number;
  turn: number;
}
export const actionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("keepTickets"),
      ids: z.array(z.string().max(64)).min(1).max(4),
    })
    .strict(),
  z
    .object({
      type: z.literal("drawCard"),
      source: z.union([z.literal("blind"), z.number().int().min(0).max(4)]),
    })
    .strict(),
  z
    .object({
      type: z.literal("claim"),
      route: z.string().min(1).max(64),
      payment: z.array(cardSchema).max(11),
    })
    .strict(),
  z
    .object({
      type: z.literal("resolveTunnel"),
      payment: z.array(cardSchema).max(11).nullable(),
    })
    .strict(),
  z.object({ type: z.literal("drawTickets") }).strict(),
  z
    .object({
      type: z.literal("station"),
      city: z.string().min(1).max(64),
      payment: z.array(cardSchema).max(11),
    })
    .strict(),
]);
export type Action = z.infer<typeof actionSchema>;
export class RuleError extends Error {
  constructor(public code: string) {
    super(code);
  }
}
export function requireRule(
  condition: unknown,
  code: string,
): asserts condition {
  if (!condition) throw new RuleError(code);
}
export const routePoints: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  6: 15,
  8: 21,
};
