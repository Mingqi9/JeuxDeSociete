import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocket } from "ws";
import { openDatabase, migrate, type Database } from "../server/database";
import { Rooms } from "../server/rooms";
import { createGameServer } from "../server/http";
import type {
  Command,
  Credentials,
  RoomView,
} from "../src/multiplayer/protocol";
import type { Game, PlayerColor } from "../src/domain/model";
import { nextTestAction } from "./support/playthrough";

const token = () => randomBytes(32).toString("base64url");
let db: Database, rooms: Rooms;
beforeAll(async () => {
  db = await openDatabase(undefined, "memory://");
  await migrate(db);
  rooms = new Rooms(db);
}, 30000);
afterAll(async () => {
  await db.close();
});
async function setup(count = 2) {
  const id = randomUUID();
  const auth: Credentials[] = Array.from({ length: count }, () => ({
    roomId: id,
    token: token(),
  }));
  const colors: PlayerColor[] = ["red", "green", "blue", "yellow", "black"];
  for (let i = 0; i < count; i++)
    await rooms.admit(
      { ...auth[i], name: `Seat ${i}`, color: colors[i] },
      i === 0,
    );
  return auth;
}
async function cmd(auth: Credentials, command: Command["command"]) {
  const view = await rooms.read(auth);
  return rooms.command(auth, {
    id: randomUUID(),
    version: view.version,
    command,
  });
}
describe("authoritative multiplayer", () => {
  it("accepts independent simultaneous setup choices and hides other offers", async () => {
    const auth = await setup();
    await cmd(auth[0], { type: "start" });
    const views = await Promise.all(auth.map((a) => rooms.read(a)));
    const commands: Command[] = views.map((view) => {
      const offer = view.table!.pending;
      if (offer?.kind !== "tickets") throw Error("No private offer");
      return {
        id: randomUUID(),
        version: view.version,
        command: {
          type: "action",
          action: {
            type: "keepTickets",
            ids: offer.tickets.slice(0, 2).map((t) => t.id),
          },
        },
      };
    });
    await expect(rooms.command(auth[1], commands[0])).rejects.toThrow(
      "INVALID_TICKETS",
    );
    await Promise.all([
      rooms.command(auth[1], commands[1]),
      rooms.command(auth[0], commands[0]),
    ]);
    const final = await rooms.read(auth[0]);
    expect(final.table!.phase).toBe("playing");
    expect(final.table!.active).toBe(0);
    expect(final.self!.tickets).toHaveLength(2);
  });
  it("supports 2-5 seats, unique colors, host-only start, idempotent admission and private projection", async () => {
    const auth = await setup(5),
      room = await rooms.read(auth[0]);
    await rooms.admit({ ...auth[0], name: "retry", color: "red" }, true);
    expect((await rooms.read(auth[0])).version).toBe(room.version);
    await expect(
      rooms.admit(
        { roomId: room.id, token: token(), name: "extra", color: "red" },
        false,
      ),
    ).rejects.toThrow("ROOM_FULL");
    await expect(cmd(auth[1], { type: "start" })).rejects.toThrow("HOST_ONLY");
    await expect(cmd(auth[1], { type: "color", color: "red" })).rejects.toThrow(
      "INVALID_COLORS",
    );
    await cmd(auth[0], { type: "start" });
    for (let i = 0; i < 5; i++) {
      const view = await rooms.read(auth[i]);
      expect(view.self?.id).toBe(`p${i}`);
      expect(view.self?.hand).toHaveLength(4);
      expect(view.table).not.toHaveProperty("deck");
      expect(view.table).not.toHaveProperty("rng");
      expect(view.table).not.toHaveProperty("initialOffers");
      for (const player of view.table!.players) {
        expect(player).not.toHaveProperty("hand");
        expect(player).not.toHaveProperty("tickets");
      }
      expect(JSON.stringify(view)).not.toContain("tokenHash");
      expect(view.table!.pending?.kind).toBe("tickets");
    }
    await expect(rooms.read({ ...auth[0], token: token() })).rejects.toThrow(
      "UNAUTHORIZED",
    );
    await expect(
      cmd(auth[1], {
        type: "action",
        action: { type: "drawCard", source: "blind" },
      }),
    ).rejects.toThrow("NOT_YOUR_TURN");
  });
  it("commits exactly once, rejects competing versions and altered duplicate IDs", async () => {
    const auth = await setup();
    const room = await rooms.read(auth[0]);
    const start: Command = {
      id: randomUUID(),
      version: room.version,
      command: { type: "start" },
    };
    const results = await Promise.all([
      rooms.command(auth[0], start),
      rooms.command(auth[0], start),
    ]);
    expect(results[0]!.version).toBe(results[1]!.version);
    await expect(
      rooms.command(auth[0], { ...start, command: { type: "leave" } }),
    ).rejects.toThrow("ID_REUSED");
    const a = results[0]!,
      offer = a.table!.pending;
    if (offer?.kind !== "tickets") throw Error("No offer");
    const keep: Command = {
      id: randomUUID(),
      version: a.version,
      command: {
        type: "action",
        action: {
          type: "keepTickets",
          ids: offer.tickets.slice(0, 2).map((t) => t.id),
        },
      },
    };
    const competing = await Promise.allSettled([
      rooms.command(auth[0], keep),
      rooms.command(auth[0], { ...keep, id: randomUUID() }),
    ]);
    expect(competing.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await rooms.read(auth[0])).self!.tickets).toHaveLength(2);
    const retried = await rooms.command(auth[0], keep);
    expect(retried?.version).toBe(a.version + 1);
    // A new service instance reads committed state rather than relying on server memory.
    expect(await new Rooms(db).read(auth[0])).toEqual(retried);
  });
  it("rolls back illegal actions and validates payments without spending cards", async () => {
    const auth = await setup();
    await cmd(auth[0], { type: "start" });
    for (const seat of auth) {
      const view = await rooms.read(seat);
      const p = view.table!.pending;
      if (p?.kind !== "tickets") throw Error();
      await cmd(seat, {
        type: "action",
        action: {
          type: "keepTickets",
          ids: p.tickets.slice(0, 2).map((t) => t.id),
        },
      });
    }
    const before = await rooms.read(auth[0]);
    const action = {
      type: "claim",
      route: "eu-lon-ams-1",
      payment: [],
    } as const;
    const invalid = { ...action, payment: [] };
    expect((await rooms.preview(auth[0], invalid)).code).toBe("WRONG_PAYMENT");
    await expect(
      cmd(auth[0], { type: "action", action: invalid }),
    ).rejects.toThrow("WRONG_PAYMENT");
    expect(await rooms.read(auth[0])).toEqual(before);
  });
  it("transfers an abandoned host, expires rooms, and restores nonempty lobby ownership", async () => {
    let time = 100000;
    const service = new Rooms(db, () => time),
      id = randomUUID(),
      a = { roomId: id, token: token() },
      b = { roomId: id, token: token() };
    await service.admit({ ...a, name: "A", color: "red" }, true);
    await service.admit({ ...b, name: "B", color: "green" }, false);
    let view = await service.read(b);
    await expect(
      service.command(b, {
        id: randomUUID(),
        version: view.version,
        command: { type: "claimHost" },
      }),
    ).rejects.toThrow("HOST_PRESENT");
    time += 120001;
    view = (await service.command(b, {
      id: randomUUID(),
      version: view.version,
      command: { type: "claimHost" },
    }))!;
    expect(view.host).toBe(view.viewer);
    time += 8 * 24 * 60 * 60 * 1000;
    await expect(service.read(a)).rejects.toThrow("ROOM_MISSING");
    await service.expire();
  });
  it("plays a complete persisted game through server commands and computes final scores", async () => {
    const auth = await setup();
    await cmd(auth[0], { type: "start" });
    let view = await rooms.read(auth[0]),
      steps = 0;
    while (view.table!.phase !== "finished" && steps++ < 1600) {
      // Test driver reads server storage, never exposes or mutates it via a client API.
      const state = await db.transaction(
        async (sql) =>
          (
            await sql.query<{ payload: { game: Game } }>(
              "SELECT payload FROM erc_rooms WHERE id=$1",
              [view.id],
            )
          ).rows[0].payload.game,
      );
      const actor = auth[state.active];
      await cmd(actor, { type: "action", action: nextTestAction(state) });
      view = await rooms.read(auth[0]);
    }
    expect(view.table!.phase).toBe("finished");
    expect(view.scores).toHaveLength(2);
    expect(steps).toBeLessThan(1600);
    const records = await db.transaction((sql) =>
      sql.query<{ count: string }>(
        "SELECT count(*) FROM erc_commands WHERE room_id=$1",
        [view.id],
      ),
    );
    expect(Number(records.rows[0].count)).toBe(steps + 1);
  }, 60000);
});

it("recovers seat and game after closing and reopening a durable database", async () => {
  const path = await mkdtemp(join(tmpdir(), "erc-pg-"));
  let database: Database | undefined;
  try {
    database = await openDatabase(undefined, path);
    await migrate(database);
    const r = new Rooms(database),
      auth = { roomId: randomUUID(), token: token() };
    await r.admit({ ...auth, name: "Persistent", color: "blue" }, true);
    const joined = await r.admit(
      { roomId: auth.roomId, token: token(), name: "Friend", color: "red" },
      false,
    );
    const original = await r.command(auth, {
      id: randomUUID(),
      version: joined.version,
      command: { type: "start" },
    });
    await database.close();
    database = await openDatabase(undefined, path);
    await migrate(database);
    expect(await new Rooms(database).read(auth)).toEqual(original);
  } finally {
    await database?.close();
    expect(path.startsWith(join(tmpdir(), "erc-pg-"))).toBe(true);
    await rm(path, { recursive: true, force: true });
  }
}, 30000);

it("authenticates WebSockets, broadcasts joined seats and rejects foreign origins", async () => {
  const app = createGameServer(rooms, ["http://allowed.test"]);
  await new Promise<void>((r) => app.server.listen(0, "127.0.0.1", r));
  const address = app.server.address();
  if (!address || typeof address === "string") throw Error();
  const base = `http://127.0.0.1:${address.port}`;
  const auth = { roomId: randomUUID(), token: token() };
  let ws: WebSocket | undefined;
  try {
    const denied = await fetch(`${base}/rooms/create`, {
      method: "POST",
      headers: {
        Origin: "http://evil.test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...auth, name: "A", color: "red" }),
    });
    expect(denied.status).toBe(403);
    const created = await fetch(`${base}/rooms/create`, {
      method: "POST",
      headers: {
        Origin: "http://allowed.test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...auth, name: "A", color: "red" }),
    });
    expect(created.ok).toBe(true);
    ws = new WebSocket(base.replace("http:", "ws:") + "/ws", {
      origin: "http://allowed.test",
    });
    const states: RoomView[] = [];
    ws.on("message", (data) => {
      const m = JSON.parse(data.toString());
      if (m.type === "state") states.push(m.room);
    });
    await new Promise<void>((r) => ws!.once("open", r));
    expect(states).toHaveLength(0);
    ws.send(JSON.stringify({ type: "hello", ...auth }));
    await expect.poll(() => states.length).toBe(1);
    await fetch(`${base}/rooms/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: auth.roomId,
        token: token(),
        name: "B",
        color: "green",
      }),
    });
    await expect.poll(() => states.at(-1)?.seats.length).toBe(2);
  } finally {
    ws?.terminate();
    await app.close();
  }
}, 15000);
