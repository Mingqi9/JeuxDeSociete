import { createHash, randomBytes } from "node:crypto";
import { createGame, transition, actionError } from "../src/domain/engine";
import { scoreGame } from "../src/domain/scoring";
import { europe } from "../src/data/europe";
import {
  RuleError,
  playerColors,
  requireRule,
  type Game,
  type PlayerColor,
  type Action,
} from "../src/domain/model";
import {
  admissionSchema,
  commandSchema,
  type RoomView,
  type Credentials,
} from "../src/multiplayer/protocol";
import type { Database, Sql } from "./database";

interface PrivateSeat {
  id: string;
  name: string;
  color: PlayerColor;
  tokenHash: string;
  lastSeen: number;
}
interface Room {
  id: string;
  version: number;
  host: string;
  seats: PrivateSeat[];
  nextSeat: number;
  game: Game | null;
  scores: ReturnType<typeof scoreGame> | null;
  expiresAt: number;
}
const ttl = 7 * 24 * 60 * 60 * 1000;
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const secureRandom = () => randomBytes(4).readUInt32BE() / 4294967296;
export class Rooms {
  constructor(
    readonly db: Database,
    readonly now = () => Date.now(),
  ) {}
  private async load(sql: Sql, id: string) {
    const { rows } = await sql.query<{ payload: Room }>(
      "SELECT payload FROM erc_rooms WHERE id=$1 FOR UPDATE",
      [id],
    );
    requireRule(
      rows[0] && rows[0].payload.expiresAt > this.now(),
      "ROOM_MISSING",
    );
    return rows[0].payload;
  }
  private seat(room: Room, token: string) {
    const seat = room.seats.find((s) => s.tokenHash === digest(token));
    requireRule(seat, "UNAUTHORIZED");
    return seat;
  }
  private async save(sql: Sql, room: Room) {
    await sql.query(
      "UPDATE erc_rooms SET payload=$2::jsonb, expires_at=$3 WHERE id=$1",
      [room.id, JSON.stringify(room), room.expiresAt],
    );
  }
  private view(room: Room, seat: PrivateSeat): RoomView {
    const g = room.game;
    return {
      id: room.id,
      version: room.version,
      host: room.host,
      viewer: seat.id,
      expiresAt: room.expiresAt,
      seats: room.seats.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        online: this.now() - s.lastSeen < 45000,
      })),
      table: g
        ? {
            data: g.data,
            active: g.active,
            phase: g.phase,
            claims: g.claims,
            turn: g.turn,
            finalTurns: g.finalTurns,
            players: g.players.map((p) => ({
              id: p.id,
              name: p.name,
              color: p.color,
              trains: p.trains,
              stations: p.stations,
              points: p.points,
            })),
            market: g.market,
            deckCount: g.deck.length,
            ticketCount: g.ticketDeck.length,
            discardCount: g.discard.length,
            discardTop: g.discard.at(-1) ?? null,
            pending: g.players[g.active].id === seat.id ? g.pending : null,
          }
        : null,
      self: g?.players.find((p) => p.id === seat.id) ?? null,
      scores: room.scores,
    };
  }
  async admit(input: unknown, create: boolean): Promise<RoomView> {
    const parsed = admissionSchema.safeParse(input);
    requireRule(parsed.success, "INVALID_REQUEST");
    const a = parsed.data;
    return this.db.transaction(async (sql) => {
      if (create) {
        const room: Room = {
          id: a.roomId,
          version: 0,
          host: "p0",
          seats: [
            {
              id: "p0",
              name: a.name,
              color: a.color,
              tokenHash: digest(a.token),
              lastSeen: this.now(),
            },
          ],
          nextSeat: 1,
          game: null,
          scores: null,
          expiresAt: this.now() + ttl,
        };
        await sql.query(
          "INSERT INTO erc_rooms(id,payload,expires_at) VALUES($1,$2::jsonb,$3) ON CONFLICT DO NOTHING",
          [room.id, JSON.stringify(room), room.expiresAt],
        );
      }
      const room = await this.load(sql, a.roomId);
      const existing = room.seats.find((s) => s.tokenHash === digest(a.token));
      if (existing) {
        existing.lastSeen = this.now();
        await this.save(sql, room);
        return this.view(room, existing);
      }
      requireRule(!create, "ROOM_EXISTS");
      requireRule(!room.game, "ROOM_STARTED");
      requireRule(room.seats.length < 5, "ROOM_FULL");
      const color = room.seats.some((s) => s.color === a.color)
        ? playerColors.find((c) => !room.seats.some((s) => s.color === c))!
        : a.color;
      const seat: PrivateSeat = {
        id: `p${room.nextSeat++}`,
        name: a.name,
        color,
        tokenHash: digest(a.token),
        lastSeen: this.now(),
      };
      if (!room.seats.length) room.host = seat.id;
      room.seats.push(seat);
      room.version++;
      room.expiresAt = this.now() + ttl;
      await this.save(sql, room);
      return this.view(room, seat);
    });
  }
  async read(auth: Credentials, touch = false) {
    return this.db.transaction(async (sql) => {
      const room = await this.load(sql, auth.roomId),
        seat = this.seat(room, auth.token);
      if (touch) {
        seat.lastSeen = this.now();
        await this.save(sql, room);
      }
      return this.view(room, seat);
    });
  }
  async command(auth: Credentials, input: unknown): Promise<RoomView | null> {
    const parsed = commandSchema.safeParse(input);
    requireRule(parsed.success, "INVALID_REQUEST");
    const a = parsed.data;
    return this.db.transaction(async (sql) => {
      const room = await this.load(sql, auth.roomId),
        seat = this.seat(room, auth.token);
      const fingerprint = digest(JSON.stringify(a));
      const prior = await sql.query<{ fingerprint: string }>(
        "SELECT fingerprint FROM erc_commands WHERE room_id=$1 AND seat_id=$2 AND id=$3",
        [room.id, seat.id, a.id],
      );
      if (prior.rows.length) {
        requireRule(prior.rows[0].fingerprint === fingerprint, "ID_REUSED");
        return this.view(room, seat);
      }
      requireRule(a.version === room.version, "STALE_VERSION");
      const c = a.command;
      if (c.type === "start") {
        requireRule(room.host === seat.id, "HOST_ONLY");
        requireRule(!room.game, "ROOM_STARTED");
        room.game = createGame(
          room.seats.map((s) => s.name),
          europe,
          0,
          room.seats.map((s) => s.color),
          secureRandom,
        );
        room.game.players.forEach((p, i) => (p.id = room.seats[i].id));
      } else if (c.type === "action") {
        requireRule(room.game, "WRONG_PHASE");
        room.game = transition(room.game, seat.id, c.action, secureRandom);
        if (room.game.phase === "finished") room.scores = scoreGame(room.game);
      } else if (c.type === "color") {
        requireRule(!room.game, "ROOM_STARTED");
        requireRule(
          !room.seats.some((s) => s.id !== seat.id && s.color === c.color),
          "INVALID_COLORS",
        );
        seat.color = c.color;
      } else if (c.type === "claimHost") {
        requireRule(!room.game, "ROOM_STARTED");
        const host = room.seats.find((s) => s.id === room.host)!;
        requireRule(this.now() - host.lastSeen > 120000, "HOST_PRESENT");
        room.host = seat.id;
      } else if (c.type === "leave") {
        requireRule(!room.game, "ROOM_STARTED");
        room.seats = room.seats.filter((s) => s.id !== seat.id);
        if (room.host === seat.id) room.host = room.seats[0]?.id ?? "";
      }
      seat.lastSeen = this.now();
      room.version++;
      room.expiresAt = this.now() + ttl;
      await this.save(sql, room);
      await sql.query(
        "INSERT INTO erc_commands(room_id,seat_id,id,fingerprint,version) VALUES($1,$2,$3,$4,$5)",
        [room.id, seat.id, a.id, fingerprint, room.version],
      );
      return c.type === "leave" ? null : this.view(room, seat);
    });
  }
  async preview(auth: Credentials, action: Action) {
    return this.db.transaction(async (sql) => {
      const room = await this.load(sql, auth.roomId),
        seat = this.seat(room, auth.token);
      return {
        version: room.version,
        code: room.game
          ? actionError(room.game, seat.id, action)
          : "WRONG_PHASE",
      };
    });
  }
  async expire() {
    await this.db.transaction((sql) =>
      sql.query("DELETE FROM erc_rooms WHERE expires_at < $1", [this.now()]),
    );
  }
}
export function errorCode(e: unknown) {
  return e instanceof RuleError ? e.code : "SERVER_ERROR";
}
