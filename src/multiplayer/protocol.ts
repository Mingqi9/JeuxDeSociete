import { z } from "zod";
import {
  actionSchema,
  playerColors,
  type Game,
  type Player,
  type Pending,
  type Card,
} from "../domain/model";
import type { scoreGame } from "../domain/scoring";

export type PublicPlayer = Omit<Player, "hand" | "tickets">;
export interface BoardState
  extends Pick<
    Game,
    "data" | "active" | "phase" | "claims" | "turn" | "finalTurns"
  > {
  players: PublicPlayer[];
}
export interface TableState extends BoardState {
  market: Card[];
  deckCount: number;
  ticketCount: number;
  discardCount: number;
  discardTop: Card | null;
  pending: Pending | null;
}
export function localTable(g: Game): TableState {
  return {
    ...g,
    deckCount: g.deck.length,
    ticketCount: g.ticketDeck.length,
    discardCount: g.discard.length,
    discardTop: g.discard.at(-1) ?? null,
  };
}
export interface Seat {
  id: string;
  name: string;
  color: Player["color"];
  online: boolean;
}
export interface RoomView {
  id: string;
  version: number;
  host: string;
  viewer: string;
  expiresAt: number;
  seats: Seat[];
  table: TableState | null;
  self: Player | null;
  scores: ReturnType<typeof scoreGame> | null;
}
export const roomIdSchema = z.string().uuid();
export const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const admissionSchema = z
  .object({
    roomId: roomIdSchema,
    token: tokenSchema,
    name: z.string().trim().min(1).max(30),
    color: z.enum(playerColors),
  })
  .strict();
export const commandSchema = z
  .object({
    id: z.string().uuid(),
    version: z.number().int().nonnegative(),
    command: z.discriminatedUnion("type", [
      z.object({ type: z.literal("start") }).strict(),
      z.object({ type: z.literal("leave") }).strict(),
      z.object({ type: z.literal("claimHost") }).strict(),
      z
        .object({ type: z.literal("color"), color: z.enum(playerColors) })
        .strict(),
      z.object({ type: z.literal("action"), action: actionSchema }).strict(),
    ]),
  })
  .strict();
export type Command = z.infer<typeof commandSchema>;
export interface Credentials {
  roomId: string;
  token: string;
}
export type ServerMessage =
  | { type: "state"; room: RoomView }
  | { type: "ack"; id: string; room: RoomView | null }
  | { type: "error"; id?: string; code: string }
  | { type: "preview"; id: string; version: number; code: string | null };
