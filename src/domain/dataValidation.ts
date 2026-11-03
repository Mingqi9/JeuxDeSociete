import { z } from "zod";
import { colors, requireRule, routePoints, type Dataset } from "./model";
export function validateDataset(data: Dataset) {
  const safe = (id: string) =>
    id.length > 0 &&
    id.length <= 64 &&
    !["__proto__", "constructor", "prototype"].includes(id);
  requireRule(
    safe(data.id) &&
      typeof data.complete === "boolean" &&
      Object.keys(data.cities).length >= 2,
    "INVALID_DATA",
  );
  for (const [id, xy] of Object.entries(data.cities))
    requireRule(
      safe(id) &&
        Array.isArray(xy) &&
        xy.length === 2 &&
        xy.every(Number.isFinite),
      "INVALID_DATA",
    );
  const city = (id: string) => Object.hasOwn(data.cities, id);
  const ids = new Set<string>();
  for (const r of data.routes) {
    requireRule(
      safe(r.id) &&
        !ids.has(r.id) &&
        city(r.a) &&
        city(r.b) &&
        r.a !== r.b &&
        Object.hasOwn(routePoints, r.length) &&
        [...colors, "gray"].includes(r.color) &&
        Number.isInteger(r.locomotives ?? 0) &&
        (r.locomotives ?? 0) >= 0 &&
        (r.locomotives ?? 0) <= r.length &&
        (r.tunnel === undefined || typeof r.tunnel === "boolean"),
      "INVALID_DATA",
    );
    ids.add(r.id);
  }
  ids.clear();
  for (const t of data.tickets) {
    requireRule(
      safe(t.id) &&
        !ids.has(t.id) &&
        city(t.a) &&
        city(t.b) &&
        t.a !== t.b &&
        Number.isInteger(t.points) &&
        t.points > 0 &&
        (t.long === undefined || typeof t.long === "boolean"),
      "INVALID_DATA",
    );
    ids.add(t.id);
  }
  return true;
}

const datasetSchema = z
  .object({
    id: z.string(),
    complete: z.boolean(),
    cities: z.record(
      z.string(),
      z.tuple([z.number().finite(), z.number().finite()]),
    ),
    routes: z.array(
      z
        .object({
          id: z.string(),
          a: z.string(),
          b: z.string(),
          length: z.union([
            z.literal(1),
            z.literal(2),
            z.literal(3),
            z.literal(4),
            z.literal(6),
            z.literal(8),
          ]),
          color: z.enum([...colors, "gray"]),
          locomotives: z.number().int().optional(),
          tunnel: z.boolean().optional(),
        })
        .strict(),
    ),
    tickets: z.array(
      z
        .object({
          id: z.string(),
          a: z.string(),
          b: z.string(),
          points: z.number().int(),
          long: z.boolean().optional(),
        })
        .strict(),
    ),
  })
  .strict();
export function parseDataset(input: unknown): Dataset {
  const parsed = datasetSchema.safeParse(input);
  requireRule(parsed.success, "INVALID_DATA");
  validateDataset(parsed.data);
  return parsed.data;
}
