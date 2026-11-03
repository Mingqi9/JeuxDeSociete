import raw from "./europe.json" with { type: "json" };
import { parseDataset } from "../domain/dataValidation";
// Full-coverage candidate. Completeness stays false until every ticket has
// been independently checked against an authoritative card list/reference.
export const europe = parseDataset(raw);
export const europeAudit = {
  coverage: { cities: 47, routes: 101, regularTickets: 40, longTickets: 6 },
  routes: "publisher-board-reviewed",
  tickets: "independently-crosschecked-awaiting-publisher-card-audit",
  assets: "original-schematic",
} as const;
