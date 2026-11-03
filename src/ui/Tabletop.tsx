import type { ReactNode } from "react";
import type { Action, Ticket } from "../domain/model";
import type { TableState } from "../multiplayer/protocol";
import { routePoints } from "../domain/model";
import type { Words } from "./i18n";
import { Board } from "./Board";
import { TrainArt, TrainCard } from "./TrainCard";
export function Tabletop({
  game,
  selected,
  onSelect,
  selectedCity,
  onSelectCity,
  t,
  dispatch,
  preview,
  enabled,
  sidebar,
}: {
  game: TableState;
  selected: string;
  onSelect: (id: string) => void;
  selectedCity: string;
  onSelectCity: (city: string) => void;
  t: Words;
  dispatch: (a: Action) => void;
  preview: Ticket | null;
  enabled: boolean;
  sidebar: ReactNode;
}) {
  const pending = game.pending,
    locked = !enabled || (!!pending && pending.kind !== "draw");
  return (
    <div className="tabletop">
      <aside className="table-left">
        {sidebar}
        <details className="scoring-help">
          <summary>{t.scoringHelp}</summary>
          <section className="express-card">
            <span className="eyebrow">EUROPEAN EXPRESS</span>
            <div className="express-route" aria-hidden="true">
              ● ── ◇ ── ●
            </div>
            <strong>{t.longestCard}</strong>
            <b>+10</b>
            <small>{t.longestRule}</small>
          </section>
          <section className="route-guide">
            <h2>{t.routeScoring}</h2>
            {Object.entries(routePoints).map(([length, points]) => (
              <div key={length}>
                <span>{length} 🚃</span>
                <strong>
                  {points} {t.points}
                </strong>
              </div>
            ))}
          </section>
        </details>
      </aside>
      <Board
        game={game}
        selected={selected}
        onSelect={onSelect}
        selectedCity={selectedCity}
        onSelectCity={onSelectCity}
        enabled={enabled && game.phase === "playing" && !pending}
        t={t}
        preview={preview}
      />
      <aside className="deck-rail" aria-label={t.market}>
        <button
          className="card-back ticket-deck"
          aria-label={`${t.drawTickets} (${game.ticketCount})`}
          disabled={!enabled || !!pending || !game.ticketCount}
          onClick={() => dispatch({ type: "drawTickets" })}
        >
          <span className="deck-emblem" aria-hidden="true">
            ◇
          </span>
          <strong>{t.destinationDeck}</strong>
          <span>{game.ticketCount}</span>
        </button>
        <button
          className="card-back train-deck"
          aria-label={t.blind}
          disabled={locked || game.deckCount + game.discardCount === 0}
          onClick={() => dispatch({ type: "drawCard", source: "blind" })}
        >
          <span className="deck-emblem" aria-hidden="true">
            ═╪═
          </span>
          <strong>{t.trainDeck}</strong>
          <span>
            {game.deckCount} {t.remaining}
          </span>
        </button>
        <div className="market">
          <h2>{t.market}</h2>
          {game.market.map((card, i) => (
            <TrainCard
              key={i}
              card={card}
              t={t}
              disabled={locked || (pending?.kind === "draw" && card === "wild")}
              onClick={() => dispatch({ type: "drawCard", source: i })}
            />
          ))}
        </div>
        <div
          className="discard-stack"
          aria-label={`${t.discardPile} (${game.discardCount})`}
        >
          {game.discardCount > 0 ? (
            <TrainArt card={game.discardTop!} />
          ) : (
            <span className="empty-discard" aria-hidden="true">
              ↻
            </span>
          )}
          <small>
            {t.discardPile} · {game.discardCount}
          </small>
        </div>
        <p className="market-hint">{t.marketRule}</p>
      </aside>
    </div>
  );
}
