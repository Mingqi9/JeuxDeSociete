import { useEffect, useState } from "react";
import {
  type Action,
  type Card,
  type PlayerColor,
  type Ticket,
  playerColors,
} from "../domain/model";
import { useRoom, invitationRoom } from "../multiplayer/client";
import type { RoomView } from "../multiplayer/protocol";
import { dictionaries, type Lang, type Words } from "./i18n";
import { onlineWords } from "./onlineWords";
import { Tabletop } from "./Tabletop";
import { PlayerPieces } from "./PlayerPieces";
import { OrderedHand, usePreference, useGameSound } from "./personal";
import { TicketCard } from "./TicketCard";
import { GameActions } from "./GameActions";

function OnlineActions({
  room,
  payment,
  selected,
  city,
  t,
  dispatch,
  preview,
  cancel,
}: {
  room: RoomView;
  payment: Card[];
  selected: string;
  city: string;
  t: Words;
  dispatch: (a: Action) => void;
  preview: (a: Action) => Promise<string | null>;
  cancel: () => void;
}) {
  const table = room.table!;
  const action: Action =
    table.pending?.kind === "tunnel"
      ? { type: "resolveTunnel", payment }
      : city
        ? { type: "station", city, payment }
        : { type: "claim", route: selected, payment };
  const key = JSON.stringify(action);
  const [validation, setValidation] = useState<{
    key: string;
    version: number;
    code: string | null;
  } | null>(null);
  useEffect(() => {
    let active = true;
    if (!selected && !city && table.pending?.kind !== "tunnel") return;
    const timer = setTimeout(
      () =>
        void preview(JSON.parse(key)).then((code) => {
          if (active) setValidation({ key, version: room.version, code });
        }),
      120,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [key, room.version, preview]);
  return (
    <GameActions
      game={table}
      selected={selected}
      city={city}
      onCancel={cancel}
      payment={payment}
      t={t}
      dispatch={dispatch}
      validate={() =>
        validation?.key === key && validation.version === room.version
          ? validation.code
          : "VALIDATING"
      }
    />
  );
}
export function OnlineApp({ onLocal }: { onLocal: () => void }) {
  const net = useRoom();
  const [lang, setLang] = useState<Lang>(() => {
    try {
      return localStorage.getItem("erc-language") === "fr" ? "fr" : "zh";
    } catch {
      return "zh";
    }
  });
  const n = onlineWords[lang],
    base = dictionaries[lang];
  const t = {
    ...base,
    fixture: base.europeCandidate,
    errors: { ...base.errors, ...n.errors },
  } as Words;
  const [name, setName] = useState(""),
    [roomId, setRoomId] = useState(invitationRoom),
    [color, setColor] = useState<PlayerColor>("red"),
    [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState(""),
    [city, setCity] = useState(""),
    [payment, setPayment] = useState<number[]>([]),
    [tickets, setTickets] = useState<string[]>([]),
    [preview, setPreview] = useState<Ticket | null>(null);
  const room = net.room,
    table = room?.table,
    self = room?.self;
  const personalKey = `erc-personal:${room?.id ?? ""}:${room?.viewer ?? ""}`;
  const [archived, setArchived] = usePreference<string[]>(
    personalKey + ":tickets",
    [],
  );
  const sound = useGameSound(
    `${table?.phase}:${table?.turn}:${self?.hand.length}:${Object.keys(table?.claims ?? {}).length}`,
  );
  const myTurn = !!table && table.players[table.active].id === room?.viewer;
  const canChoose =
    table?.phase === "setup" && table.pending?.kind === "tickets";
  const enabled =
    (myTurn || canChoose) && net.status === "connected" && !net.busy;
  useEffect(() => {
    setPayment([]);

    setSelected("");
    setCity("");
  }, [self?.hand.join(","), table?.turn]);
  const offerKey =
    table?.pending?.kind === "tickets"
      ? table.pending.tickets.map((t) => t.id).join(",")
      : "";
  useEffect(() => {
    setTickets([]);
  }, [offerKey]);
  useEffect(() => {
    try {
      localStorage.setItem("erc-language", lang);
    } catch {
      /* language storage is optional */
    }
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "fr";
  }, [lang]);
  const dispatch = (action: Action) => {
    if (enabled) net.command({ type: "action", action });
  };
  const error = (code: string) =>
    n.errors[code] ??
    t.errors[code as keyof typeof t.errors] ??
    n.errors.SERVER_ERROR;
  const active = !!table && table.phase !== "finished";
  const invite = room
    ? `${location.origin}${location.pathname}?room=${room.id}`
    : "";
  return (
    <div className={`app ${active ? "at-table live-table" : ""}`}>
      <header>
        <div className="brand">
          ✦ EUROPA <span>RAIL CLUB</span>
        </div>
        <button
          className="language"
          onClick={() => setLang(lang === "zh" ? "fr" : "zh")}
        >
          {lang === "zh" ? "FR Français" : "中 中文"}
        </button>
      </header>
      <button className="sound-toggle" onClick={sound.toggle}>
        {sound.enabled ? n.soundOn : n.soundOff}
      </button>
      <div className="mode-banner">
        {n.online} · {n[net.status]} {net.busy ? `· ${n.pending}` : ""}
      </div>
      {net.error && (
        <div className="error" role="alert">
          {error(net.error)}
          <button onClick={net.clearError} aria-label={t.clear}>
            ×
          </button>
        </div>
      )}
      {!room ? (
        <main className="hero">
          <h1>{n.online}</h1>
          <section className="panel setup-panel">
            <p>{n.noRoom}</p>
            <label>
              {n.nickname}
              <input
                value={name}
                maxLength={30}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              {t.playerColor}
              <select
                value={color}
                onChange={(e) => setColor(e.target.value as PlayerColor)}
              >
                {playerColors.map((c) => (
                  <option key={c} value={c}>
                    {t[c]}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="primary"
              disabled={net.busy || !name.trim()}
              onClick={() =>
                void net.admit(true, name, color, crypto.randomUUID())
              }
            >
              {n.create}
            </button>
            <small>{n.automaticColor}</small>
            <label>
              {n.roomId}
              <input
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.trim())}
              />
            </label>
            <button
              disabled={net.busy || !name.trim() || !roomId}
              onClick={() => void net.admit(false, name, color, roomId)}
            >
              {n.join}
            </button>
            <p>{n.saved}</p>
            <button onClick={onLocal}>{n.local}</button>
          </section>
        </main>
      ) : !table ? (
        <main className="hero">
          <h1>{n.lobby}</h1>
          <section className="panel setup-panel">
            <label>
              {n.invite}
              <input readOnly value={invite} />
            </label>
            <button
              onClick={() =>
                void navigator.clipboard
                  .writeText(invite)
                  .then(() => setCopied(true))
                  .catch(() => setCopied(false))
              }
            >
              {copied ? n.copied : n.copy}
            </button>
            <ul className="lobby-seats">
              {room.seats.map((s) => (
                <li key={s.id}>
                  {s.name} · {t[s.color]} ·{" "}
                  {s.online ? n.onlineSeat : n.offlineSeat}{" "}
                  {room.host === s.id ? `· ${n.host}` : ""}
                  {room.viewer === s.id ? ` · ${n.you}` : ""}
                </li>
              ))}
            </ul>
            <p role="status">
              {n.playersJoined}: {room.seats.length}/5 ·{" "}
              {room.seats.length < 2
                ? n.needPlayers
                : room.host === room.viewer
                  ? n.hostReady
                  : n.waitHost}
            </p>
            <label>
              {t.playerColor}
              <select
                value={room.seats.find((s) => s.id === room.viewer)!.color}
                disabled={net.busy || net.status !== "connected"}
                onChange={(e) =>
                  net.command({
                    type: "color",
                    color: e.target.value as PlayerColor,
                  })
                }
              >
                {playerColors.map((c) => (
                  <option
                    key={c}
                    value={c}
                    disabled={room.seats.some(
                      (s) => s.id !== room.viewer && s.color === c,
                    )}
                  >
                    {t[c]}
                  </option>
                ))}
              </select>
            </label>
            {room.host === room.viewer ? (
              <button
                className="primary"
                disabled={
                  room.seats.length < 2 ||
                  net.busy ||
                  net.status !== "connected"
                }
                onClick={() => net.command({ type: "start" })}
              >
                {n.start}
              </button>
            ) : (
              <button
                disabled={net.busy || net.status !== "connected"}
                onClick={() => net.command({ type: "claimHost" })}
              >
                {n.takeHost}
              </button>
            )}
            <button
              disabled={net.busy || net.status !== "connected"}
              onClick={() => net.command({ type: "leave" })}
            >
              {n.leave}
            </button>
            <p>{n.saved}</p>
            <small>{n.rules}</small>
          </section>
        </main>
      ) : table.phase === "finished" ? (
        <main className="results">
          <h1>{n.results}</h1>
          {room.scores?.map((row) => (
            <section className="panel result" key={row.id}>
              <h2>
                #{row.rank} {row.name} · {row.total} {t.points}
              </h2>
              <p>
                {t.routePoints}: {row.routePoints} · {t.ticketPoints}:{" "}
                {row.ticketPoints} · {t.stationPoints}: {row.stationPoints} ·{" "}
                {t.express}: {row.express}
              </p>
              <p>
                {t.longest}: {row.longest}
              </p>
            </section>
          ))}
          <button
            onClick={() => {
              location.href = location.pathname + "?online=1";
            }}
          >
            {n.newRoom}
          </button>
        </main>
      ) : (
        <main className="play tabletop-play">
          <div className="turnbar">
            <strong>
              {table.phase === "setup"
                ? t.setupTitle
                : `${t.turn} ${table.turn}`}{" "}
              · {table.players[table.active].name}
            </strong>
            <span>
              {enabled ? n.yourTurn : n.waiting}
              {table.finalTurns !== null
                ? ` · ${t.final} ${table.finalTurns}`
                : ""}
            </span>
          </div>
          <div className="players">
            {table.players.map((p, i) => (
              <PlayerPieces
                key={p.id}
                player={p}
                index={i}
                active={i === table.active}
                t={t}
              />
            ))}
          </div>
          <Tabletop
            game={table}
            selected={selected}
            selectedCity={city}
            onSelect={(id) => {
              setSelected(id);
              setCity("");
            }}
            onSelectCity={(id) => {
              setCity(id);
              setSelected("");
            }}
            t={t}
            dispatch={dispatch}
            preview={preview}
            enabled={enabled}
            sidebar={
              <>
                {preview && (
                  <div className="ticket-preview-status">
                    {preview.a} → {preview.b}
                    <button onClick={() => setPreview(null)}>
                      {t.clearPreview}
                    </button>
                  </div>
                )}
                <div className="private-dock">
                  <section className="surface own-hand">
                    <h2>
                      {t.hand}{" "}
                      <span className="count-pill">{self?.hand.length}</span>
                    </h2>
                    <OrderedHand
                      hand={self?.hand ?? []}
                      payment={payment}
                      t={t}
                      n={n}
                      storageKey={personalKey + ":hand"}
                      onSelect={(i) => {
                        if (
                          enabled &&
                          table.phase === "playing" &&
                          table.pending?.kind !== "tickets"
                        )
                          setPayment((prev) =>
                            prev.includes(i)
                              ? prev.filter((j) => j !== i)
                              : [...prev, i],
                          );
                      }}
                    />
                    <button onClick={() => setPayment([])}>{t.clear}</button>
                  </section>
                  {enabled && table.phase === "playing" && (
                    <OnlineActions
                      room={room}
                      payment={payment.map((i) => self!.hand[i])}
                      selected={selected}
                      city={city}
                      t={t}
                      dispatch={dispatch}
                      preview={net.preview}
                      cancel={() => {
                        setSelected("");
                        setCity("");
                      }}
                    />
                  )}
                  <section className="surface own-tickets">
                    <h2>
                      {table.pending?.kind === "tickets" ? t.choose : t.tickets}
                    </h2>
                    {!canChoose && table.phase === "setup" && (
                      <p>{n.confirmSetup}</p>
                    )}
                    <div className="ticket-offer">
                      {(table.pending?.kind === "tickets"
                        ? table.pending.tickets
                        : (self?.tickets ?? []).filter(
                            (ticket) => !archived.includes(ticket.id),
                          )
                      ).map((ticket) => (
                        <div key={ticket.id}>
                          <TicketCard
                            ticket={ticket}
                            cities={table.data.cities}
                            t={t}
                            previewing={preview?.id === ticket.id}
                            checked={
                              table.pending?.kind === "tickets"
                                ? tickets.includes(ticket.id)
                                : undefined
                            }
                            onChange={
                              table.pending?.kind === "tickets"
                                ? () => {
                                    setTickets((prev) =>
                                      prev.includes(ticket.id)
                                        ? prev.filter((id) => id !== ticket.id)
                                        : [...prev, ticket.id],
                                    );
                                    setPreview(ticket);
                                  }
                                : undefined
                            }
                            onPreview={() => setPreview(ticket)}
                          />
                          {table.pending?.kind !== "tickets" && (
                            <button
                              onClick={() =>
                                setArchived([...archived, ticket.id])
                              }
                            >
                              {n.archive}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {table.pending?.kind === "tickets" && (
                      <>
                        <p>
                          {t.minimum} {table.pending.minimum}
                        </p>
                        <button
                          className="primary keep-tickets"
                          disabled={
                            !enabled || tickets.length < table.pending.minimum
                          }
                          onClick={() =>
                            dispatch({ type: "keepTickets", ids: tickets })
                          }
                        >
                          {t.keep}
                        </button>
                      </>
                    )}
                    <details className="travel-collection">
                      <summary>
                        {n.collection} (
                        {self?.tickets.filter((ticket) =>
                          archived.includes(ticket.id),
                        ).length ?? 0}
                        )
                      </summary>
                      <p>{n.collectionHint}</p>
                      {self?.tickets
                        .filter((ticket) => archived.includes(ticket.id))
                        .map((ticket) => (
                          <div key={ticket.id}>
                            <TicketCard
                              ticket={ticket}
                              cities={table.data.cities}
                              t={t}
                              previewing={preview?.id === ticket.id}
                              onPreview={() => setPreview(ticket)}
                            />
                            <button
                              onClick={() =>
                                setArchived(
                                  archived.filter((id) => id !== ticket.id),
                                )
                              }
                            >
                              {n.unarchive}
                            </button>
                          </div>
                        ))}
                    </details>
                  </section>
                </div>
              </>
            }
          />
        </main>
      )}
    </div>
  );
}
