import type { CSSProperties } from "react";
import type { Player, PlayerColor } from "../domain/model";
import type { Words } from "./i18n";
export const playerPaints: Record<PlayerColor, string> = {
  red: "#bc4339",
  green: "#3f825f",
  blue: "#397fa6",
  yellow: "#d7ad35",
  black: "#3e4248",
};
export function PieceReserve({
  color,
  trains,
  stations,
}: {
  color: PlayerColor;
  trains: number;
  stations: number;
}) {
  return (
    <div
      className="piece-reserve"
      style={{ "--piece": playerPaints[color] } as CSSProperties}
      aria-hidden="true"
    >
      <div className="station-reserve">
        {Array.from({ length: stations }, (_, i) => (
          <span className="station-piece" key={i} />
        ))}
      </div>
      <div className="wagon-reserve">
        {Array.from({ length: trains }, (_, i) => (
          <span className="wagon-piece" key={i} />
        ))}
      </div>
    </div>
  );
}
export function PlayerPieces({
  player,
  index,
  active,
  t,
}: {
  player: Player;
  index: number;
  active: boolean;
  t: Words;
}) {
  return (
    <section
      className={`player-supply ${active ? "active" : ""}`}
      data-player={player.id}
      style={{ "--piece": playerPaints[player.color] } as CSSProperties}
    >
      <div className="supply-heading">
        <span className="score-disc">{index + 1}</span>
        <strong>{player.name}</strong>
        <output aria-live="polite">
          {player.points} {t.points}
        </output>
      </div>
      <div className="supply-counts">
        {t[player.color]} · {player.trains} {t.trains} ·{" "}
        {3 - player.stations.length} {t.stations}
      </div>
      <PieceReserve
        color={player.color}
        trains={player.trains}
        stations={3 - player.stations.length}
      />
    </section>
  );
}
