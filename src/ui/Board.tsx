import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { Game, Ticket } from "../domain/model";
import type { Words } from "./i18n";
import { BoardScenery } from "./BoardScenery";
import { paints } from "./TrainCard";
import { playerPaints } from "./PlayerPieces";
import { scoreTrackIndex, scoreTrackPosition } from "./scoreTrack";
export function Board({
  game,
  selected,
  onSelect,
  t,
  preview,
  selectedCity,
  onSelectCity,
  enabled,
}: {
  game: Game;
  selected: string;
  onSelect: (id: string) => void;
  t: Words;
  preview: Ticket | null;
  selectedCity: string;
  onSelectCity: (city: string) => void;
  enabled: boolean;
}) {
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const zoomAnchor = useRef<{
    x: number;
    y: number;
    screenX: number;
    screenY: number;
  } | null>(null);
  const [tool, setTool] = useState<"wagon" | "station">("wagon");
  const [drag, setDrag] = useState<{
    kind: "wagon" | "station";
    x: number;
    y: number;
  } | null>(null);
  const player = game.players[game.active];
  const chooseRoute = (id: string) => {
    if (enabled) onSelect(id);
  };
  const chooseCity = (city: string) => {
    if (enabled) onSelectCity(city);
  };
  useEffect(() => {
    setDrag(null);
    setTool("wagon");
  }, [enabled, game.active]);
  const viewport = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setViewportSize({ width: el.clientWidth, height: el.clientHeight }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const mapW =
      Math.max(...Object.values(game.data.cities).map((p) => p[0])) + 90,
    mapH = Math.max(...Object.values(game.data.cities).map((p) => p[1])) + 75;
  const border = 76,
    w = mapW + border * 2,
    h = mapH + border * 2;
  const widthScale = viewportSize.width / w;
  const mapScale = widthScale * zoom;
  useLayoutEffect(() => {
    zoomRef.current = zoom;
    const el = viewport.current;
    const svg = el?.querySelector("svg");
    const anchor = zoomAnchor.current;
    if (!el || !svg || !anchor) return;
    zoomAnchor.current = null;
    const box = svg.getBoundingClientRect(),
      frame = el.getBoundingClientRect();
    el.scrollLeft +=
      box.left - frame.left + (anchor.x * box.width) / w - anchor.screenX;
    el.scrollTop +=
      box.top - frame.top + (anchor.y * box.height) / h - anchor.screenY;
  }, [zoom, mapScale, w, h]);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      const svg = el.querySelector("svg");
      if (!svg) return;
      const box = svg.getBoundingClientRect(),
        frame = el.getBoundingClientRect();
      const delta =
        event.deltaY *
        (event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? el.clientHeight
            : 1);
      const next = Math.max(
        0.2,
        Math.min(5, zoomRef.current * Math.exp(-delta * 0.008)),
      );
      if (next === zoomRef.current) return;
      zoomAnchor.current = {
        x: ((event.clientX - box.left) * w) / box.width,
        y: ((event.clientY - box.top) * h) / box.height,
        screenX: event.clientX - frame.left,
        screenY: event.clientY - frame.top,
      };
      zoomRef.current = next;
      setZoom(next);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [w, h]);
  useEffect(() => {
    const el = viewport.current;
    if (!el || !preview) return;
    setZoom(
      Math.max(0.2, Math.min(1, el.clientHeight / h / (el.clientWidth / w))),
    );
    el.scrollTo({ left: 0, top: 0 });
  }, [preview, w, h]);
  return (
    <section className="map-panel" aria-label={t.fixture}>
      {enabled && (
        <div
          className="map-placement"
          style={{ "--piece": playerPaints[player.color] } as CSSProperties}
        >
          <div className="placement-tools">
            {(["wagon", "station"] as const).map((kind) => (
              <button
                key={kind}
                className="placement-piece"
                data-piece-tool={kind}
                aria-pressed={tool === kind}
                disabled={
                  kind === "wagon"
                    ? player.trains === 0
                    : player.stations.length === 3
                }
                onClick={() => setTool(kind)}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setTool(kind);
                  setDrag({ kind, x: e.clientX, y: e.clientY });
                }}
                onPointerMove={(e) => {
                  if (e.currentTarget.hasPointerCapture(e.pointerId))
                    setDrag({ kind, x: e.clientX, y: e.clientY });
                }}
                onPointerUp={(e) => {
                  if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
                  e.currentTarget.releasePointerCapture(e.pointerId);
                  const target = document
                    .elementFromPoint(e.clientX, e.clientY)
                    ?.closest(
                      kind === "wagon" ? "[data-route]" : "[data-city]",
                    );
                  if (
                    target &&
                    e.currentTarget.closest(".map-panel")?.contains(target)
                  ) {
                    const id = target.getAttribute(
                      kind === "wagon" ? "data-route" : "data-city",
                    );
                    if (id) {
                      if (kind === "wagon") chooseRoute(id);
                      else chooseCity(id);
                    }
                  }
                  setDrag(null);
                }}
                onPointerCancel={() => setDrag(null)}
                onLostPointerCapture={() => setDrag(null)}
              >
                <span
                  className={kind === "wagon" ? "wagon-piece" : "station-piece"}
                  aria-hidden="true"
                />
                {kind === "wagon" ? t.wagonTool : t.stationTool} ·{" "}
                {kind === "wagon" ? player.trains : 3 - player.stations.length}
              </button>
            ))}
          </div>
          <p>{t.mapActionHint}</p>
          {drag && (
            <span
              aria-hidden="true"
              className={`drag-piece ${drag.kind === "wagon" ? "wagon-piece" : "station-piece"}`}
              style={{ left: drag.x, top: drag.y }}
            />
          )}
        </div>
      )}
      <div className="map-tools">
        <span>EUROPA · {t.scoreTrack}</span>
        <button
          className="fit-width"
          onClick={() => {
            setZoom(1);
            viewport.current?.scrollTo({ left: 0, top: 0 });
          }}
        >
          {t.fitWidth}
        </button>
        <label>
          {t.zoom}{" "}
          <input
            aria-label={t.zoom}
            type="range"
            min="0.2"
            max="5"
            step="0.01"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="map-scroll" ref={viewport}>
        <svg
          width={w * mapScale}
          height={h * mapScale}
          viewBox={`0 0 ${w} ${h}`}
          role="group"
          aria-label={t.fixture}
        >
          <rect
            className="board-frame"
            x="1"
            y="1"
            width={w - 2}
            height={h - 2}
            rx="22"
          />
          <rect
            className="map-paper"
            x="56"
            y="56"
            width={w - 112}
            height={h - 112}
            rx="12"
          />
          <g className="score-track" aria-label={t.scoreTrack}>
            {Array.from({ length: 100 }, (_, n) => {
              const pos = scoreTrackPosition(n, w, h);
              return (
                <g key={n} transform={`translate(${pos.x} ${pos.y})`}>
                  <rect
                    x="-21"
                    y="-21"
                    width="42"
                    height="42"
                    rx="5"
                    className={n % 5 === 0 ? "score-cell major" : "score-cell"}
                  />
                  <text textAnchor="middle" dy="7">
                    {n}
                  </text>
                </g>
              );
            })}
          </g>
          <g transform={`translate(${border} ${border})`}>
            <BoardScenery
              width={mapW}
              height={mapH}
              full={Object.keys(game.data.cities).length > 10}
            />
            {game.data.routes.map((r) => {
              const [x1, y1] = game.data.cities[r.a],
                [x2, y2] = game.data.cities[r.b];
              const pair = game.data.routes.filter(
                (o) =>
                  [o.a, o.b].sort().join("|") === [r.a, r.b].sort().join("|"),
              );
              const index = pair.findIndex((o) => o.id === r.id),
                offset =
                  pair.length > 1 ? (index - (pair.length - 1) / 2) * 24 : 0;
              const distance = Math.hypot(x2 - x1, y2 - y1),
                canonical = r.a < r.b ? 1 : -1;
              const dx = (-(y2 - y1) / distance) * offset * canonical,
                dy = ((x2 - x1) / distance) * offset * canonical;
              const owner = game.players.find(
                (p) => p.id === game.claims[r.id],
              );
              const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
              return (
                <g
                  key={r.id}
                  data-route={r.id}
                  data-owner={owner?.id}
                  role="button"
                  tabIndex={enabled ? 0 : -1}
                  aria-disabled={!enabled}
                  aria-pressed={selected === r.id}
                  aria-label={`${r.a} – ${r.b}, ${r.length}, ${t[r.color]}, ${owner?.name ?? t.unclaimed}`}
                  onClick={() => chooseRoute(r.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      chooseRoute(r.id);
                    }
                  }}
                >
                  <line
                    x1={x1 + dx}
                    y1={y1 + dy}
                    x2={x2 + dx}
                    y2={y2 + dy}
                    stroke={
                      selected === r.id
                        ? "#e9ae43"
                        : owner
                          ? "#fff9ed"
                          : "#b7b0a2"
                    }
                    strokeWidth={selected === r.id ? 31 : owner ? 29 : 19}
                    strokeLinecap="round"
                  />
                  <g
                    transform={`translate(${x1 + dx} ${y1 + dy}) rotate(${angle})`}
                  >
                    {Array.from({ length: r.length }, (_, i) => (
                      <g key={i}>
                        <rect
                          x={(distance / r.length) * i + 5}
                          y={owner ? -11 : -7}
                          width={Math.max(8, distance / r.length - 10)}
                          height={owner ? 22 : 14}
                          rx={owner ? 4 : 2}
                          fill={
                            owner
                              ? playerPaints[owner.color]
                              : selected === r.id
                                ? playerPaints[player.color]
                                : paints[r.color]
                          }
                          fillOpacity={!owner && selected === r.id ? 0.5 : 1}
                          stroke={
                            owner ? "#24323b" : r.tunnel ? "#3e4847" : "#fff9e7"
                          }
                          strokeWidth={owner ? 2.5 : r.tunnel ? 3 : 1}
                        />
                        {owner && (
                          <g
                            className="claimed-wagon-detail"
                            pointerEvents="none"
                          >
                            <path
                              d={`M${(distance / r.length) * i + 9} -5h${Math.max(3, distance / r.length - 18)}`}
                              stroke="#fff9ed"
                              strokeWidth="4"
                            />
                            <circle
                              cx={(distance / r.length) * i + 10}
                              cy="11"
                              r="3.5"
                              fill="#24323b"
                            />
                            <circle
                              cx={(distance / r.length) * (i + 1) - 10}
                              cy="11"
                              r="3.5"
                              fill="#24323b"
                            />
                          </g>
                        )}
                      </g>
                    ))}
                  </g>
                  <text
                    x={(x1 + x2) / 2 + dx + 8}
                    y={(y1 + y2) / 2 + dy - 14}
                    className="route-label"
                  >
                    {r.length}
                    {r.tunnel ? " ◇" : ""}
                    {r.locomotives ? " ⚓" : ""}
                    {owner ? ` · ${owner.name}` : ""}
                  </text>
                </g>
              );
            })}
            {Object.entries(game.data.cities).map(([city, [x, y]]) => {
              const highlighted = preview?.a === city || preview?.b === city;
              const owner = game.players.find((p) => p.stations.includes(city));
              return (
                <g
                  key={city}
                  data-city={city}
                  role="button"
                  tabIndex={enabled ? 0 : -1}
                  aria-disabled={!enabled}
                  aria-label={`${t.station} · ${city}${owner ? ` · ${owner.name}` : ""}`}
                  aria-pressed={selectedCity === city}
                  onClick={() => chooseCity(city)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      chooseCity(city);
                    }
                  }}
                  data-highlighted={highlighted ? "true" : undefined}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r="22"
                    fill="transparent"
                    className="city-hit"
                  />
                  {selectedCity === city && !owner && (
                    <path
                      d={`M${x + 12} ${y - 7}l9 -8l9 8v18h-18Z`}
                      fill={playerPaints[player.color]}
                      fillOpacity="0.5"
                      stroke={playerPaints[player.color]}
                      strokeDasharray="3 2"
                      strokeWidth="2"
                    />
                  )}
                  {highlighted && (
                    <circle
                      cx={x}
                      cy={y}
                      r="21"
                      fill="#ffd16e55"
                      stroke="#d67b24"
                      strokeWidth="4"
                    />
                  )}
                  <circle
                    cx={x}
                    cy={y}
                    r="8"
                    fill="#fff9ed"
                    stroke="#344c50"
                    strokeWidth="3"
                  />
                  {owner && (
                    <path
                      d={`M${x + 12} ${y - 7}l9 -8l9 8v18h-18Z`}
                      fill={playerPaints[owner.color]}
                      stroke="#fff9ed"
                      strokeWidth="2"
                    />
                  )}
                  <text x={x} y={y + 28} textAnchor="middle">
                    {city}
                  </text>
                </g>
              );
            })}
            {preview && (
              <g className="destination-beacons" pointerEvents="none">
                {["rings", "labels"].flatMap((layer) =>
                  [preview.a, preview.b].map((city, index) => {
                    const [x, y] = game.data.cities[city];
                    const unit = 1 / Math.max(mapScale, 0.05);
                    const labelWidth = (city.length * 8 + 36) * unit;
                    const labelHeight = 28 * unit;
                    const radius = 18 * unit;
                    const labelX = Math.max(
                      0,
                      Math.min(mapW - labelWidth, x - labelWidth / 2),
                    );
                    const above = index === 0 && y > radius + labelHeight;
                    const labelY = Math.max(
                      0,
                      Math.min(
                        mapH - labelHeight,
                        above
                          ? y - radius - labelHeight - 5 * unit
                          : y + radius + 5 * unit,
                      ),
                    );
                    return (
                      <g
                        key={`${layer}-${city}`}
                        data-endpoint={layer === "labels" ? city : undefined}
                      >
                        {layer === "rings" && (
                          <>
                            <circle
                              cx={x}
                              cy={y}
                              r={radius}
                              fill="#ffdf6544"
                              stroke="#fff"
                              strokeWidth={6 * unit}
                            />
                            <circle
                              cx={x}
                              cy={y}
                              r={radius}
                              fill="none"
                              stroke="#9b2435"
                              strokeWidth={3 * unit}
                            />
                            <circle
                              cx={x}
                              cy={y}
                              r={7 * unit}
                              fill="#ffdf65"
                              stroke="#9b2435"
                              strokeWidth={2 * unit}
                            />
                            <path
                              d={`M${x} ${above ? y - radius : y + radius}V${labelY + (above ? labelHeight : 0)}`}
                              stroke="#9b2435"
                              strokeWidth={2 * unit}
                            />
                          </>
                        )}
                        {layer === "labels" && (
                          <>
                            <rect
                              x={labelX}
                              y={labelY}
                              width={labelWidth}
                              height={labelHeight}
                              rx="9"
                              fill="#9b2435"
                              stroke="#fff9ed"
                              strokeWidth={2 * unit}
                            />
                            <text
                              x={labelX + labelWidth / 2}
                              y={labelY + 19 * unit}
                              textAnchor="middle"
                              className="endpoint-name"
                              style={{ fontSize: 14 * unit }}
                            >
                              {index + 1} · {city}
                            </text>
                          </>
                        )}
                      </g>
                    );
                  }),
                )}
              </g>
            )}
          </g>
          <g className="score-markers">
            {game.players.map((p, i) => {
              const pos = scoreTrackPosition(p.points, w, h);
              const same = game.players.filter(
                (o) => scoreTrackIndex(o.points) === scoreTrackIndex(p.points),
              );
              const groupIndex = same.findIndex((o) => o.id === p.id);
              const theta =
                (groupIndex / Math.max(same.length, 1)) * Math.PI * 2;
              const spread = same.length > 1 ? 13 : 0;
              return (
                <g
                  key={p.id}
                  className="score-marker"
                  style={{
                    transform: `translate(${pos.x + Math.cos(theta) * spread}px,${pos.y + Math.sin(theta) * spread}px)`,
                  }}
                  data-score-player={p.id}
                  data-points={p.points}
                  data-track-position={scoreTrackIndex(p.points)}
                  aria-label={`${p.name} · ${p.points} ${t.points}`}
                >
                  <title>
                    {p.name} · {p.points} {t.points}
                  </title>
                  <circle
                    r="12"
                    fill={playerPaints[p.color]}
                    stroke="#fff7df"
                    strokeWidth="3"
                  />
                  <text textAnchor="middle" dy="4">
                    {i + 1}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      <div className="map-caption">
        {t.inspectMap}
        {preview && (
          <strong>
            {" "}
            · {preview.a} → {preview.b}
          </strong>
        )}
      </div>
    </section>
  );
}
