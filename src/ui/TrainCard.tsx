import type { Card } from "../domain/model";
import type { Words } from "./i18n";
export const paints: Record<string, string> = {
  red: "#bd3935",
  blue: "#248bb4",
  green: "#6f9d43",
  yellow: "#e9bb32",
  black: "#3c3e42",
  white: "#eee7d2",
  orange: "#d88332",
  purple: "#aa74ae",
  gray: "#9daba9",
  wild: "#4b6775",
};
// A small original railway engraving: distinct rolling stock and a steam engine.
export function TrainArt({ card }: { card: Card }) {
  const locomotive = card === "wild" || card === "black";
  const windows = card === "green" ? 5 : card === "purple" ? 3 : 4;
  return (
    <span
      className={`train-art train-art-${card} ${card === "wild" ? "rainbow-art" : ""}`}
      style={{ backgroundColor: paints[card] }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 180 92">
        <path
          className="card-scenery"
          d="M0 53L24 35L40 48L65 16L87 44L111 29L139 53L159 35L180 49V92H0Z"
        />
        <path
          className="card-horizon"
          d="M0 61Q25 48 52 59T102 57T154 58L180 56M0 84H180M10 88H170"
        />
        <g className="card-ornaments" fill="none">
          <path d="M9 22V9H32M148 9H171V22M9 70V83H28M152 83H171V70" />
          <path d="M14 14h10M156 14h10M14 78h9M157 78h9" />
        </g>
        {locomotive ? (
          <g className="rolling-stock locomotive">
            <path
              className="engine-smoke"
              d="M60 33C43 24 74 17 63 12C55 6 76 3 82 8M68 30C88 17 92 25 101 15"
            />
            <path d="M30 64H142V72H30ZM48 44H110V63H48ZM110 36H139V64H110ZM38 41H57V64H38Z" />
            <path d="M107 32H141L145 38H104ZM43 28H54L52 42H45ZM40 26H57V31H40Z" />
            <rect
              x="115"
              y="40"
              width="17"
              height="13"
              className="car-window"
            />
            <path
              d="M35 61L27 72H42M61 48H105M61 54H105"
              className="engine-trim"
            />
            <circle cx="48" cy="69" r="9" />
            <circle cx="78" cy="69" r="13" />
            <circle cx="105" cy="69" r="13" />
            <circle cx="132" cy="70" r="7" />
            <path d="M48 69H105" className="engine-rod" />
            <circle cx="78" cy="69" r="4" className="wheel-hub" />
            <circle cx="105" cy="69" r="4" className="wheel-hub" />
          </g>
        ) : (
          <g className="rolling-stock coach">
            <path d="M25 62H155V69H25ZM32 35H146V63H32ZM29 31Q88 20 149 31L153 36H25Z" />
            {Array.from({ length: windows }, (_, i) => (
              <rect
                key={i}
                x={40 + i * (94 / windows)}
                y="40"
                width={Math.min(15, 80 / windows)}
                height={card === "orange" ? 9 : 15}
                rx="1"
                className="car-window"
              />
            ))}
            <path d="M31 59H148M39 63V68M137 63V68" className="engine-trim" />
            <circle cx="50" cy="70" r="9" />
            <circle cx="130" cy="70" r="9" />
            <circle cx="50" cy="70" r="3" className="wheel-hub" />
            <circle cx="130" cy="70" r="3" className="wheel-hub" />
          </g>
        )}
        <path
          className="rail-sleepers"
          d="M20 86l3 4m13 -4l3 4m13 -4l3 4m13 -4l3 4m13 -4l3 4m13 -4l3 4m13 -4l3 4m13 -4l3 4m13 -4l3 4"
        />
      </svg>
    </span>
  );
}
export function TrainCard({
  card,
  t,
  selected,
  disabled,
  onClick,
}: {
  card: Card;
  t: Words;
  selected?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`train-card ${selected ? "chosen" : ""}`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
    >
      <TrainArt card={card} />
      <span>{t[card]}</span>
    </button>
  );
}
