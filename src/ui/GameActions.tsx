import {
  routePoints,
  type Game,
  type Card,
  type Action,
} from "../domain/model";
import type { Words } from "./i18n";
import { TrainArt } from "./TrainCard";
export function GameActions({
  game,
  validate,
  selected,
  city,
  onCancel,
  payment,
  t,
  dispatch,
}: {
  game: Pick<Game, "data" | "active" | "pending" | "claims"> & {
    players: Pick<Game["players"][number], "id" | "name" | "stations">[];
  };
  validate: (action: Action) => string | null;
  selected: string;
  city: string;
  onCancel: () => void;
  payment: Card[];
  t: Words;
  dispatch: (a: Action) => void;
}) {
  const p = game.players[game.active],
    pending = game.pending;
  const r = game.data.routes.find((r) => r.id === selected),
    locked = !!pending;
  const reason = (code: string | null) =>
    code ? (t.errors[code as keyof typeof t.errors] ?? code) : "";
  if (pending?.kind === "tickets") return null;
  if (pending?.kind === "tunnel") {
    const error = validate({ type: "resolveTunnel", payment });
    return (
      <section className="surface tunnel-panel">
        <h2>{t.tunnel}</h2>
        <div className="tunnel-reveal">
          <span>{t.revealCards}</span>
          {pending.revealed.map((card, i) => (
            <div key={i}>
              <TrainArt card={card} />
              <span>{t[card]}</span>
            </div>
          ))}
        </div>
        <p>
          {t.extra}: {pending.extra}
        </p>
        <p>{t.tunnelPaymentHint}</p>
        <div className="action-buttons">
          <button
            className="primary"
            disabled={!!error}
            onClick={() => dispatch({ type: "resolveTunnel", payment })}
          >
            {t.accept}
          </button>
          <button
            onClick={() => dispatch({ type: "resolveTunnel", payment: null })}
          >
            {t.cancel}
          </button>
        </div>
        {error && <small>{reason(error)}</small>}
      </section>
    );
  }
  const claimError = r
    ? validate({ type: "claim", route: r.id, payment })
    : "UNKNOWN_ROUTE";
  const stationError = validate({
    type: "station",
    city,
    payment,
  });
  return (
    <section className="actions-tray" aria-label={t.turnActions}>
      {!city && r && (
        <div className="surface route-action">
          <h2>{t.route}</h2>
          <strong>
            {r.a} → {r.b}
          </strong>
          {r && (
            <>
              <p>
                {t.length}: {r.length} · {routePoints[r.length]} {t.points} ·{" "}
                {t[r.color]} · {t.wildNeeded}: {r.locomotives ?? 0}
              </p>
              <small>
                {r.tunnel ? t.tunnelRisk : t.normal} · {t.routeOwned}:{" "}
                {game.players.find((other) => other.id === game.claims[r.id])
                  ?.name ?? t.unclaimed}
              </small>
              <button
                className="primary"
                disabled={!!claimError}
                onClick={() =>
                  dispatch({ type: "claim", route: r.id, payment })
                }
              >
                {t.claim}
              </button>
              {claimError && <small>{reason(claimError)}</small>}
            </>
          )}
        </div>
      )}
      {city && (
        <div className="surface station-action">
          <h2>{t.station}</h2>
          <strong>{city}</strong>
          <p>
            {t.pay}: {p.stations.length + 1}
          </p>
          <button
            className="wide"
            disabled={locked || !!stationError}
            onClick={() => dispatch({ type: "station", city, payment })}
          >
            {t.build}
          </button>
          {stationError && <small>{reason(stationError)}</small>}
        </div>
      )}
      {!city && !r && <p>{t.chooseMapTarget}</p>}
      {(city || r) && (
        <>
          <small>{t.placementHint}</small>
          <button onClick={onCancel}>{t.cancelPlacement}</button>
        </>
      )}
      <details className="station-help">
        <summary>{t.stationHelp}</summary>
        <p>{t.stationExplanation}</p>
      </details>
    </section>
  );
}
