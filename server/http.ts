import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { z } from "zod";
import { actionSchema } from "../src/domain/model";
import {
  roomIdSchema,
  tokenSchema,
  commandSchema,
  type Credentials,
  type ServerMessage,
} from "../src/multiplayer/protocol";
import { Rooms, errorCode } from "./rooms";

const hello = z
  .object({
    type: z.literal("hello"),
    roomId: roomIdSchema,
    token: tokenSchema,
  })
  .strict();
const preview = z
  .object({
    type: z.literal("preview"),
    id: z.string().uuid(),
    action: actionSchema,
  })
  .strict();
export function createGameServer(rooms: Rooms, origins: string[]) {
  const clients = new Map<
    WebSocket,
    { auth: Credentials; lastVersion: number; alive: boolean }
  >();
  const rates = new Map<string, { count: number; until: number }>();
  const allowed = (req: IncomingMessage) =>
    !req.headers.origin || origins.includes(req.headers.origin);
  function send(ws: WebSocket, message: ServerMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      if (ws.bufferedAmount > 1024 * 1024) ws.close(1013);
      else ws.send(JSON.stringify(message));
    }
  }
  async function broadcast(roomId: string) {
    await Promise.all(
      [...clients]
        .filter(([, c]) => c.auth.roomId === roomId)
        .map(async ([ws, c]) => {
          try {
            const room = await rooms.read(c.auth);
            c.lastVersion = room.version;
            send(ws, { type: "state", room });
          } catch (e) {
            send(ws, { type: "error", code: errorCode(e) });
            ws.close(4001);
          }
        }),
    );
  }
  function json(res: ServerResponse, status: number, body: unknown) {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(JSON.stringify(body));
  }
  function rate(key: string, max: number) {
    const now = Date.now();
    let r = rates.get(key);
    if (!r || r.until < now) {
      if (rates.size > 10000) return false;
      r = { count: 0, until: now + 60000 };
      rates.set(key, r);
    }
    return ++r.count <= max;
  }
  const server = createServer(async (req, res) => {
    if (!allowed(req)) {
      json(res, 403, { code: "ORIGIN_DENIED" });
      return;
    }
    if (req.headers.origin) {
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
      res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.url === "/health" && req.method === "GET") {
      try {
        await rooms.db.transaction((sql) => sql.query("SELECT 1"));
        json(res, 200, { ok: true });
      } catch {
        json(res, 503, { ok: false });
      }
      return;
    }
    if (
      req.method !== "POST" ||
      !["/rooms/create", "/rooms/join"].includes(req.url ?? "")
    ) {
      json(res, 404, { code: "NOT_FOUND" });
      return;
    }
    if (!rate(`http:${req.socket.remoteAddress}`, 30)) {
      json(res, 429, { code: "RATE_LIMIT" });
      return;
    }
    if (!req.headers["content-type"]?.startsWith("application/json")) {
      json(res, 415, { code: "INVALID_REQUEST" });
      return;
    }
    try {
      let raw = "";
      for await (const chunk of req) {
        raw += chunk.toString();
        if (Buffer.byteLength(raw) > 4096) {
          json(res, 413, { code: "INVALID_REQUEST" });
          return;
        }
      }
      let input: unknown;
      try {
        input = JSON.parse(raw);
      } catch {
        json(res, 400, { code: "INVALID_REQUEST" });
        return;
      }
      const room = await rooms.admit(input, req.url === "/rooms/create");
      json(res, 200, { room });
      await broadcast(room.id);
    } catch (e) {
      json(res, 400, { code: errorCode(e) });
    }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 16384,
    perMessageDeflate: false,
  });
  server.on("upgrade", (req, socket, head) => {
    if (
      req.url !== "/ws" ||
      !allowed(req) ||
      wss.clients.size >= 200 ||
      !rate(`upgrade:${req.socket.remoteAddress}`, 120)
    ) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws));
  });
  wss.on("connection", (ws) => {
    let count = 0,
      windowStart = Date.now();
    const deadline = setTimeout(() => ws.close(4001), 5000);
    let queue = Promise.resolve();
    ws.on("message", (raw, binary) => {
      if (Date.now() - windowStart > 60000) {
        windowStart = Date.now();
        count = 0;
      }
      if (binary || ++count > 180) {
        ws.close(1008);
        return;
      }
      queue = queue
        .then(async () => {
          let request: unknown;
          try {
            request = JSON.parse(raw.toString());
          } catch {
            send(ws, { type: "error", code: "INVALID_REQUEST" });
            return;
          }
          let id: string | undefined;
          try {
            const current = clients.get(ws);
            if (!current) {
              const parsed = hello.safeParse(request);
              if (!parsed.success) {
                ws.close(4001);
                return;
              }
              const auth = {
                roomId: parsed.data.roomId,
                token: parsed.data.token,
              };
              const room = await rooms.read(auth, true);
              if (ws.readyState !== WebSocket.OPEN) return;
              clients.set(ws, { auth, lastVersion: room.version, alive: true });
              clearTimeout(deadline);
              send(ws, { type: "state", room });
              return;
            }
            const p = preview.safeParse(request);
            if (p.success) {
              id = p.data.id;
              const result = await rooms.preview(current.auth, p.data.action);
              send(ws, { type: "preview", id, ...result });
              return;
            }
            const command = commandSchema.safeParse(request);
            if (!command.success) {
              send(ws, { type: "error", code: "INVALID_REQUEST" });
              return;
            }
            id = command.data.id;
            const room = await rooms.command(current.auth, command.data);
            send(ws, { type: "ack", id, room });
            if (!room) {
              clients.delete(ws);
              ws.close(1000);
            }
            await broadcast(current.auth.roomId);
          } catch (e) {
            send(ws, { type: "error", id, code: errorCode(e) });
            const c = clients.get(ws);
            if (c && errorCode(e) === "STALE_VERSION")
              await broadcast(c.auth.roomId);
            if (!c) ws.close(4001);
          }
        })
        .catch(() => ws.close(1011));
    });
    ws.on("pong", () => {
      const c = clients.get(ws);
      if (c) {
        c.alive = true;
        void rooms.read(c.auth, true).catch(() => ws.close(4001));
      }
    });
    ws.on("error", () => ws.close());
    ws.on("close", () => {
      clearTimeout(deadline);
      clients.delete(ws);
    });
  });
  const heartbeat = setInterval(() => {
    for (const [ws, c] of clients) {
      if (!c.alive) {
        ws.terminate();
        continue;
      }
      c.alive = false;
      ws.ping();
    }
  }, 20000);
  // Also delivers changes from another server process after a commit/restart.
  let polling = false;
  const poll = setInterval(() => {
    if (polling) return;
    polling = true;
    Promise.all(
      [...new Set([...clients.values()].map((c) => c.auth.roomId))].map(
        broadcast,
      ),
    ).finally(() => (polling = false));
  }, 2000);
  const cleanup = setInterval(() => {
    for (const [k, v] of rates) if (v.until < Date.now()) rates.delete(k);
    void rooms.expire().catch(() => {});
  }, 60000);
  return {
    server,
    async close() {
      clearInterval(heartbeat);
      clearInterval(poll);
      clearInterval(cleanup);
      for (const ws of wss.clients) ws.terminate();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
    },
  };
}
