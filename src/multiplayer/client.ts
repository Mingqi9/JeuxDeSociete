import { useCallback, useEffect, useRef, useState } from "react";
import type { Action, PlayerColor } from "../domain/model";
import type { Command, Credentials, RoomView, ServerMessage } from "./protocol";
const endpoint =
  (import.meta.env.VITE_GAME_SERVER_URL as string | undefined)?.replace(
    /\/$/,
    "",
  ) ?? "/api";
const seatKey = (id: string) => `erc-seat:${id}`;
const pendingKey = (id: string) => `erc-command:${id}`;
function saved(id: string): Credentials | null {
  try {
    const token = localStorage.getItem(seatKey(id));
    return token ? { roomId: id, token } : null;
  } catch {
    return null;
  }
}
export function invitationRoom() {
  const id = new URL(location.href).searchParams.get("room");
  return id && /^[a-f0-9-]{36}$/i.test(id) ? id : "";
}
function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}
export function useRoom() {
  const [credentials, setCredentials] = useState<Credentials | null>(() =>
    saved(invitationRoom()),
  );
  const [room, setRoom] = useState<RoomView | null>(null),
    [status, setStatus] = useState<"offline" | "connecting" | "connected">(
      "offline",
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const wsRef = useRef<WebSocket | null>(null),
    roomRef = useRef<RoomView | null>(null),
    pending = useRef<Command | null>(null);
  const previewRequests = useRef(
    new Map<
      string,
      {
        resolve: (code: string | null) => void;
        timer: ReturnType<typeof setTimeout>;
      }
    >(),
  );
  const update = useCallback((view: RoomView) => {
    if (!roomRef.current || view.version >= roomRef.current.version) {
      roomRef.current = view;
      setRoom(view);
    }
  }, []);
  useEffect(() => {
    if (!credentials) return;
    let stopped = false,
      retry = 500,
      reconnect: ReturnType<typeof setTimeout> | undefined,
      timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      pending.current = JSON.parse(
        localStorage.getItem(pendingKey(credentials.roomId)) ?? "null",
      );
      setBusy(!!pending.current);
    } catch {
      pending.current = null;
    }
    function connect() {
      if (stopped) return;
      setStatus("connecting");
      if (!navigator.onLine) {
        reconnect = setTimeout(connect, 1000);
        return;
      }
      const url = new URL(`${endpoint}/ws`, location.origin);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(url);
      wsRef.current = ws;
      let sentId = "";
      timeout = setTimeout(() => ws.close(), 12000);
      ws.onopen = () =>
        ws.send(JSON.stringify({ type: "hello", ...credentials }));
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data) as ServerMessage;
        if (message.type === "state") {
          if (!pending.current) clearTimeout(timeout);
          setStatus("connected");
          retry = 500;
          update(message.room);
          if (pending.current && sentId !== pending.current.id) {
            clearTimeout(timeout);
            ws.send(JSON.stringify(pending.current));
            sentId = pending.current.id;
            timeout = setTimeout(() => ws.close(), 12000);
          }
        } else if (message.type === "ack") {
          if (message.id === pending.current?.id) {
            pending.current = null;
            localStorage.removeItem(pendingKey(credentials!.roomId));
            setBusy(false);
            clearTimeout(timeout);
          }
          if (message.room) update(message.room);
          else {
            localStorage.removeItem(seatKey(credentials!.roomId));
            setCredentials(null);
            setRoom(null);
            roomRef.current = null;
            setStatus("offline");
            history.replaceState(null, "", location.pathname);
          }
        } else if (message.type === "error") {
          const preview = message.id
            ? previewRequests.current.get(message.id)
            : undefined;
          if (preview) {
            clearTimeout(preview.timer);
            previewRequests.current.delete(message.id!);
            preview.resolve(message.code);
            return;
          }
          setError(message.code);
          if (message.id === pending.current?.id) {
            pending.current = null;
            localStorage.removeItem(pendingKey(credentials!.roomId));
            setBusy(false);
          }
          if (["UNAUTHORIZED", "ROOM_MISSING"].includes(message.code)) {
            stopped = true;
            setStatus("offline");
          }
        } else if (message.type === "preview") {
          const p = previewRequests.current.get(message.id);
          if (p) {
            clearTimeout(p.timer);
            previewRequests.current.delete(message.id);
            p.resolve(
              message.version === roomRef.current?.version
                ? message.code
                : "STALE_VERSION",
            );
          }
        }
      };
      ws.onclose = () => {
        clearTimeout(timeout);
        if (stopped) return;
        setStatus("connecting");
        reconnect = setTimeout(connect, retry);
        retry = Math.min(retry * 2, 10000);
      };
      ws.onerror = () => ws.close();
    }
    const offline = () => {
      setStatus("connecting");
      wsRef.current?.close();
    };
    const online = () => {
      clearTimeout(reconnect);
      if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED)
        connect();
    };
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    connect();
    return () => {
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
      stopped = true;
      clearTimeout(reconnect);
      clearTimeout(timeout);
      wsRef.current?.close();
      for (const p of previewRequests.current.values()) {
        clearTimeout(p.timer);
        p.resolve("DISCONNECTED");
      }
      previewRequests.current.clear();
    };
  }, [credentials, update]);
  async function admit(
    create: boolean,
    name: string,
    color: PlayerColor,
    roomId: string,
  ) {
    setBusy(true);
    setError("");
    const auth = saved(roomId) ?? { roomId, token: newToken() };
    try {
      try {
        localStorage.setItem(seatKey(roomId), auth.token);
      } catch {
        throw Error("STORAGE_ERROR");
      }
      const response = await fetch(
        `${endpoint}/rooms/${create ? "create" : "join"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...auth, name, color }),
          signal: AbortSignal.timeout(15000),
        },
      );
      const data = await response.json();
      if (!response.ok) throw Error(data.code ?? "SERVER_ERROR");
      history.replaceState(null, "", `${location.pathname}?room=${roomId}`);
      roomRef.current = null;
      update(data.room);
      setCredentials(auth);
    } catch (e) {
      setError(e instanceof Error ? e.message : "DISCONNECTED");
    } finally {
      setBusy(false);
    }
  }
  function command(command: Command["command"]) {
    if (!credentials || !room || busy || status !== "connected") return;
    const packet: Command = {
      id: crypto.randomUUID(),
      version: room.version,
      command,
    };
    try {
      localStorage.setItem(pendingKey(room.id), JSON.stringify(packet));
      pending.current = packet;
      setBusy(true);
      setError("");
      wsRef.current?.send(JSON.stringify(packet));
    } catch {
      setError("STORAGE_ERROR");
      setBusy(false);
    }
  }
  const preview = useCallback(
    (action: Action): Promise<string | null> =>
      new Promise((resolve) => {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          resolve("DISCONNECTED");
          return;
        }
        const id = crypto.randomUUID(),
          timer = setTimeout(() => {
            previewRequests.current.delete(id);
            resolve("DISCONNECTED");
          }, 10000);
        previewRequests.current.set(id, { resolve, timer });
        ws.send(JSON.stringify({ type: "preview", id, action }));
      }),
    [],
  );
  return {
    room,
    status,
    error,
    busy,
    admit,
    command,
    preview,
    clearError: () => setError(""),
    credentials,
  };
}
