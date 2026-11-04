import { Landing } from "./Landing";
import { cityName } from "./cityNames";
import { LanguageSelect } from "./LanguageSelect";
import { readLanguage } from "./i18n";
import { useEffect, useMemo, useState } from "react";
import { createGame, transition, actionError } from "../domain/engine";
import { scoreGame } from "../domain/scoring";
import {
  RuleError,
  playerColors,
  type PlayerColor,
  type Action,
  type Game,
  type Ticket,
} from "../domain/model";
import { demo } from "../data/demo";
import { europe } from "../data/europe";
import { dictionaries, type Lang } from "./i18n";
import { localTable } from "../multiplayer/protocol";
import { Tabletop } from "./Tabletop";
import { PlayerPieces, PieceReserve, playerPaints } from "./PlayerPieces";
import { TrainCard } from "./TrainCard";
import { TicketCard } from "./TicketCard";
import { GameActions } from "./GameActions";
import { OnlineApp } from "./OnlineApp";
import { onlineWords } from "./onlineWords";
function initialLanguage(): Lang {
  try {
    return readLanguage();
  } catch {
    return "zh";
  }
}
export function App({ initialGame }: { initialGame?: Game } = {}) {
  const [online, setOnline] = useState(
    () => !initialGame && !new URL(location.href).searchParams.has("local"),
  );
  const [lang, setLang] = useState<Lang>(initialLanguage),
    [names, setNames] = useState("Alice\nCamille"),
    [chosenColors, setChosenColors] = useState<PlayerColor[]>([
      ...playerColors,
    ]),
    [game, setGame] = useState<Game | null>(() =>
      initialGame ? structuredClone(initialGame) : null,
    ),
    [mapMode, setMapMode] = useState("europe"),
    [visible, setVisible] = useState(false),
    [error, setError] = useState(""),
    [selected, setSelected] = useState(""),
    [selectedCity, setSelectedCity] = useState(""),
    [payment, setPayment] = useState<number[]>([]),
    [tickets, setTickets] = useState<string[]>([]),
    [early, setEarly] = useState(false),
    [preview, setPreview] = useState<Ticket | null>(null);
  const base = dictionaries[lang],
    isEurope = game ? game.data.id === europe.id : mapMode === "europe";
  const t = isEurope
    ? {
        ...base,
        fixture: base.europeCandidate,
        start: base.startEurope,
        results: base.resultsEurope,
        finish: base.finishEurope,
        finishHint: base.finishHintEurope,
        finishConfirm: base.finishConfirmEurope,
        notice: base.earlyNoticeEurope,
        newGame: base.newGameEurope,
      }
    : base;
  const scores = useMemo(
    () => (game?.phase === "finished" ? scoreGame(game) : []),
    [game],
  );
  const playerNames = names
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean);
  useEffect(() => {
    setChosenColors((prev) => {
      const used = new Set<PlayerColor>();
      return prev.map((color, i) => {
        if (i >= Math.min(playerNames.length, 5)) return color;
        const next = used.has(color)
          ? playerColors.find((c) => !used.has(c))!
          : color;
        used.add(next);
        return next;
      });
    });
  }, [playerNames.length]);
  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : lang;
    try {
      localStorage.setItem("erc-language", lang);
    } catch {
      /* optional */
    }
  }, [lang]);
  function showError(e: unknown) {
    setError(e instanceof RuleError ? e.code : "INVALID_ACTION");
  }
  function start() {
    try {
      const seed = new Uint32Array(1);
      crypto.getRandomValues(seed);
      const data = mapMode === "europe" ? europe : demo;
      setGame(
        createGame(
          playerNames,
          data,
          seed[0],
          chosenColors.slice(0, playerNames.length),
        ),
      );
      setSelected("");
      setSelectedCity("");
      setVisible(false);
      setError("");
      setEarly(false);
      setTickets([]);
      setPayment([]);
      setPreview(null);
    } catch (e) {
      showError(e);
    }
  }
  function dispatch(action: Action) {
    if (!game || !visible) return;
    try {
      const next = transition(game, game.players[game.active].id, action);
      if (next.active !== game.active || next.turn !== game.turn)
        setVisible(false);
      setSelected("");
      setSelectedCity("");
      setGame(next);
      setError("");
      setPayment([]);
      setTickets([]);
      setPreview(null);
    } catch (e) {
      showError(e);
    }
  }
  function inspect(ticket: Ticket) {
    setPreview(ticket);
  }
  const p = game?.players[game.active],
    pending = game?.pending,
    setup = game?.phase === "setup";
  const paid = p ? payment.map((i) => p.hand[i]) : [];
  if (online)
    return (
      <OnlineApp
        onLocal={() => {
          history.replaceState(null, "", location.pathname + "?local=1");
          setLang(readLanguage());
          setOnline(false);
        }}
      />
    );
  return (
    <div
      className={`app ${!game ? "landing-app" : ""} ${game ? "at-table" : ""} ${game && game.phase !== "finished" ? "live-table" : ""}`}
    >
      {game && (
        <header>
          <div className="brand">
            ✦ EUROPA <span>RAIL CLUB</span>
          </div>
          <LanguageSelect lang={lang} onChange={setLang} />
        </header>
      )}
      {game && <div className="mode-banner">{t.local}</div>}
      {error && (
        <div role="alert" className="error">
          {t.error}：{t.errors[error as keyof typeof t.errors] ?? error}
          <button aria-label={t.clear} onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}
      {!game ? (
        <Landing
          lang={lang}
          setLang={setLang}
          mode="local"
          onMode={() => setOnline(true)}
        >
          <div className="landing-section-heading">
            <span className="landing-eyebrow">LOCAL / EUROPA RAIL CLUB</span>
            <h2>{onlineWords[lang].local}</h2>
            <p>{t.local}</p>
          </div>
          <section className="panel setup-panel">
            <p>{t.intro}</p>
            <label htmlFor="map-mode">{t.mapMode}</label>
            <select
              id="map-mode"
              value={mapMode}
              onChange={(e) => setMapMode(e.target.value)}
            >
              <option value="europe">{base.europeCandidate}</option>
              <option value="demo">{base.fixture}</option>
            </select>
            {isEurope && (
              <small className="data-warning">{t.dataWarning}</small>
            )}
            <h2>{t.choosePieces}</h2>
            <label htmlFor="names">{t.names}</label>
            <textarea
              id="names"
              rows={3}
              value={names}
              onChange={(e) => setNames(e.target.value)}
            />
            <div className="seat-choices">
              {playerNames.slice(0, 5).map((name, i) => (
                <section className="seat-choice" key={i}>
                  <div>
                    <strong>{name}</strong>
                    <select
                      aria-label={`${t.playerColor} ${name}`}
                      value={chosenColors[i]}
                      onChange={(e) =>
                        setChosenColors((prev) =>
                          prev.map((c, j) =>
                            j === i ? (e.target.value as PlayerColor) : c,
                          ),
                        )
                      }
                    >
                      {playerColors.map((color) => (
                        <option
                          key={color}
                          value={color}
                          disabled={chosenColors
                            .slice(0, playerNames.length)
                            .some((c, j) => c === color && j !== i)}
                        >
                          {t[color]}
                        </option>
                      ))}
                    </select>
                    <small>{t.readyPieces}</small>
                  </div>
                  <PieceReserve
                    color={chosenColors[i]}
                    trains={45}
                    stations={3}
                  />
                </section>
              ))}
            </div>
            <button className="primary" onClick={start}>
              {t.start} →
            </button>
            <small>{t.setupWaiting}</small>
          </section>
        </Landing>
      ) : game.phase === "finished" ? (
        <main className="results">
          <h1>{t.results}</h1>
          <p>{t.fixture}</p>
          {early && <p>{t.notice}</p>}
          {scores.map((row) => (
            <section className="panel result" key={row.id}>
              <h2>
                #{row.rank} {row.name} · {row.total} {t.points}
              </h2>
              <dl>
                {(
                  [
                    [t.routePoints, row.routePoints],
                    [t.ticketPoints, row.ticketPoints],
                    [t.stationPoints, row.stationPoints],
                    [t.express, row.express],
                    [t.longest, row.longest],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <h3>{t.tickets}</h3>
              {game.players
                .find((player) => player.id === row.id)!
                .tickets.map((ticket) => (
                  <p key={ticket.id}>
                    {row.completed.includes(ticket.id) ? "✓" : "✕"}{" "}
                    {cityName(ticket.a, t)} → {cityName(ticket.b, t)} ·{" "}
                    {ticket.points}
                  </p>
                ))}
            </section>
          ))}
          <button
            onClick={() => {
              setGame(null);
              setError("");
              setPreview(null);
            }}
          >
            {t.newGame}
          </button>
        </main>
      ) : (
        <main className="play tabletop-play">
          <div className="turnbar">
            <strong>
              {setup
                ? `${t.setupTitle} · ${game.active + 1}/${game.players.length}`
                : `${t.turn} ${game.turn}`}{" "}
              · {p!.name}
            </strong>
            <span>
              {setup
                ? t.setupWaiting
                : game.finalTurns !== null
                  ? `${t.final} ${game.finalTurns}`
                  : pending?.kind === "draw"
                    ? t.second
                    : t.chooseAction}
            </span>
          </div>
          <div className="players">
            {game.players.map((player, i) => (
              <PlayerPieces
                player={player}
                index={i}
                active={i === game.active}
                key={player.id}
                t={t}
              />
            ))}
          </div>
          <Tabletop
            game={localTable(game)}
            selected={selected}
            onSelect={(id) => {
              setSelected(id);
              setSelectedCity("");
            }}
            selectedCity={selectedCity}
            onSelectCity={(city) => {
              setSelectedCity(city);
              setSelected("");
            }}
            t={t}
            dispatch={dispatch}
            preview={visible ? preview : null}
            enabled={visible}
            sidebar={
              visible ? (
                <>
                  {setup && (
                    <div className="deal-banner">
                      <strong>{t.prepareDeal}</strong>
                      <p>{t.setupSummary}</p>
                    </div>
                  )}
                  {preview && (
                    <div className="ticket-preview-status">
                      <span>
                        {t.previewTicket}: {cityName(preview.a, t)} →{" "}
                        {cityName(preview.b, t)}
                      </span>
                      <button onClick={() => setPreview(null)}>
                        {t.clearPreview}
                      </button>
                    </div>
                  )}
                  <div className="private-dock">
                    <section
                      className={`surface own-hand ${setup ? "deal-hand" : ""}`}
                    >
                      <h2>
                        {t.hand}{" "}
                        <span className="count-pill">{p!.hand.length}</span>
                      </h2>
                      <p>{setup ? t.trainCards : t.pay}</p>
                      <div className="hand">
                        {p!.hand.map((card, i) => (
                          <TrainCard
                            key={i}
                            card={card}
                            t={t}
                            selected={payment.includes(i)}
                            disabled={setup || pending?.kind === "tickets"}
                            onClick={() =>
                              setPayment((prev) =>
                                prev.includes(i)
                                  ? prev.filter((n) => n !== i)
                                  : [...prev, i],
                              )
                            }
                          />
                        ))}
                      </div>
                      {!setup && pending?.kind !== "tickets" && (
                        <div className="selection">
                          {t.selected}: {payment.length}
                          <button onClick={() => setPayment([])}>
                            {t.clear}
                          </button>
                        </div>
                      )}
                    </section>
                    {!setup && (
                      <GameActions
                        game={game}
                        validate={(action) =>
                          actionError(
                            game,
                            game.players[game.active].id,
                            action,
                          )
                        }
                        selected={selected}
                        city={selectedCity}
                        onCancel={() => {
                          setSelected("");
                          setSelectedCity("");
                        }}
                        payment={paid}
                        t={t}
                        dispatch={dispatch}
                      />
                    )}
                    <section className="surface own-tickets">
                      {pending?.kind === "tickets" ? (
                        <>
                          <div className="ticket-section-heading">
                            <h2>{t.choose}</h2>
                            <span>
                              {t.minimum} {pending.minimum} · {t.selected}{" "}
                              {tickets.length}/{pending.tickets.length}
                            </span>
                          </div>
                          <div className="ticket-offer">
                            {pending.tickets.map((ticket) => (
                              <TicketCard
                                key={ticket.id}
                                ticket={ticket}
                                cities={game.data.cities}
                                t={t}
                                checked={tickets.includes(ticket.id)}
                                previewing={preview?.id === ticket.id}
                                onChange={() => {
                                  setTickets((prev) =>
                                    prev.includes(ticket.id)
                                      ? prev.filter((id) => id !== ticket.id)
                                      : [...prev, ticket.id],
                                  );
                                  setPreview(ticket);
                                }}
                                onPreview={() => inspect(ticket)}
                              />
                            ))}
                          </div>
                          <small>
                            {pending.initial
                              ? t.setupSecret
                              : t.laterTicketSecret}
                          </small>
                          <button
                            className="primary keep-tickets"
                            disabled={tickets.length < pending.minimum}
                            onClick={() =>
                              dispatch({ type: "keepTickets", ids: tickets })
                            }
                          >
                            {t.keep}
                          </button>
                        </>
                      ) : (
                        <>
                          <h2>
                            {t.tickets}{" "}
                            <span className="count-pill">
                              {p!.tickets.length}
                            </span>
                          </h2>
                          <div className="ticket-offer">
                            {p!.tickets.map((ticket) => (
                              <TicketCard
                                key={ticket.id}
                                ticket={ticket}
                                cities={game.data.cities}
                                t={t}
                                previewing={preview?.id === ticket.id}
                                onPreview={() => inspect(ticket)}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </section>
                  </div>
                  <details className="finish-options">
                    <summary>{t.finish}</summary>
                    <small>{t.finishHint}</small>
                    <button
                      className="plain"
                      onClick={() => {
                        if (window.confirm(t.finishConfirm)) {
                          setGame({
                            ...game,
                            phase: "finished",
                            pending: null,
                          });
                          setEarly(true);
                        }
                      }}
                    >
                      {t.finish}
                    </button>
                  </details>
                </>
              ) : null
            }
          />
          {!visible ? (
            <div className="handoff-cover">
              <section
                className="handoff panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="handoff-name"
              >
                <span className="badge">
                  {setup ? t.prepareDeal : t.playStage}
                </span>
                <span
                  className="handoff-token"
                  style={{ background: playerPaints[p!.color] }}
                  aria-hidden="true"
                />
                <h1 id="handoff-name">
                  {t.handoff}
                  <br />
                  {p!.name}
                </h1>
                <p>{t.privacy}</p>
                {!setup && game.turn === 1 && (
                  <p className="deal-complete">{t.dealComplete}</p>
                )}
                <button className="primary" onClick={() => setVisible(true)}>
                  {t.reveal} →
                </button>
              </section>
            </div>
          ) : (
            <></>
          )}
        </main>
      )}
      <footer>
        EUROPA RAIL CLUB · {t.local}
        <details className="data-notes">
          <summary>{t.dataSources}</summary>
          <p>{t.dataWarning}</p>
          <a
            href="https://github.com/rkdarst/board-game-networks"
            target="_blank"
            rel="noreferrer"
          >
            Richard Darst · CC BY 4.0
          </a>{" "}
          ·{" "}
          <a
            href="https://docs.rs/ticket2ride/0.3.1/src/ticket2ride/lib.rs.html"
            target="_blank"
            rel="noreferrer"
          >
            Konstantinos Tsiligkiris · Apache 2.0
          </a>
          <p>{t.originalLayout}</p>
        </details>
      </footer>
    </div>
  );
}
