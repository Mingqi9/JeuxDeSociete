import type { Dataset, Ticket } from "../domain/model";
import type { Words } from "./i18n";
import { continentOutline } from "./BoardScenery";
export function TicketCard({
  ticket,
  t,
  cities,
  checked,
  onChange,
  onPreview,
  previewing,
}: {
  ticket: Ticket;
  t: Words;
  cities: Dataset["cities"];
  checked?: boolean;
  onChange?: () => void;
  onPreview: () => void;
  previewing?: boolean;
}) {
  const w = Math.max(...Object.values(cities).map((p) => p[0])) + 90,
    h = Math.max(...Object.values(cities).map((p) => p[1])) + 75;
  const xy = (city: string) => {
    const [x, y] = cities[city];
    return [12 + (x / w) * 176, 8 + (y / h) * 80];
  };
  const a = xy(ticket.a),
    b = xy(ticket.b);
  const content = (
    <>
      <span className="ticket-kind">
        {ticket.long ? t.longTicket : t.shortTicket}
      </span>
      <strong className="ticket-city-ribbon">
        {ticket.a} <span>→</span> {ticket.b}
      </strong>
      <svg viewBox="0 0 200 100" aria-hidden="true">
        <g transform="translate(10 3) scale(.11 .085)">
          <path className="ticket-continent" d={continentOutline} />
          <path
            className="ticket-continent"
            d="M130 10L210 25L245 70L205 140L231 240L170 290L120 220L143 155L116 100Z"
          />
        </g>
        <path
          className="ticket-route-line"
          d={`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`}
        />
        <circle className="ticket-endpoint" cx={a[0]} cy={a[1]} r="4" />
        <circle className="ticket-endpoint" cx={b[0]} cy={b[1]} r="4" />
      </svg>
      <span className="ticket-value">
        {ticket.points}
        <small>{t.points}</small>
      </span>
    </>
  );
  return (
    <article
      className={`ticket-card ${ticket.long ? "long-ticket" : "short-ticket"} ${checked ? "kept" : ""} ${previewing ? "previewing" : ""}`}
      data-ticket={ticket.id}
    >
      {onChange ? (
        <label className="ticket-choice">
          <input type="checkbox" checked={checked} onChange={onChange} />
          <span className="ticket-face">{content}</span>
        </label>
      ) : (
        <div className="ticket-face">{content}</div>
      )}
      <button
        className="ticket-locate"
        aria-pressed={previewing}
        onClick={onPreview}
      >
        {t.locateTicket}
      </button>
    </article>
  );
}
