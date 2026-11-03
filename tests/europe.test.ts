import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, it, expect } from "vitest";
import { europe, europeAudit } from "../src/data/europe";
import { validateDataset } from "../src/domain/dataValidation";
const normalize = (s: string) =>
  ({
    Muchen: "München",
    Palmero: "Palermo",
    Zurich: "Zürich",
    Athína: "Athina",
  })[s] ?? s;
describe("Europe candidate data provenance and coverage", () => {
  it("keeps full coverage separate from authoritative verification", () => {
    expect(europe.complete).toBe(false);
    expect(europeAudit.tickets).toContain("awaiting");
    expect(validateDataset(europe)).toBe(true);
    expect(Object.keys(europe.cities)).toHaveLength(47);
    expect(europe.routes).toHaveLength(101);
    expect(europe.tickets.filter((t) => !t.long)).toHaveLength(40);
    expect(europe.tickets.filter((t) => t.long)).toHaveLength(6);
  });
  it("matches every route attribute in the attributed frozen CC BY source", () => {
    const yaml = readFileSync(
      new URL("../references/europe-network.yaml", import.meta.url),
      "utf8",
    );
    expect(createHash("sha256").update(yaml).digest("hex")).toBe(
      "71287d7553549f9e3636283bcca164864f55aa4035608696d0372a822454c20f",
    );
    const cities = Object.fromEntries(
      [...yaml.matchAll(/- &(\w+)\s+\{deg:\s*\d+, label: ([^}]+)\}/g)].map(
        (m) => [m[1], normalize(m[2])],
      ),
    );
    const palette: Record<string, string> = {
      bla: "black",
      yel: "yellow",
      red: "red",
      grn: "green",
      ora: "orange",
      pur: "purple",
      blu: "blue",
      whi: "white",
      gry: "gray",
    };
    const tuples = [
      ...yaml.matchAll(
        /- \[ \*(\w+), \*(\w+), (\d+), \{color: \*(\w+), locomotives: (\d+), tunnel: (\d+) \} \]/g,
      ),
    ]
      .map((m) =>
        [
          ...[cities[m[1]], cities[m[2]]].sort(),
          Number(m[3]),
          palette[m[4]],
          Number(m[5]),
          m[6] === "1",
        ].join("|"),
      )
      .sort();
    expect(
      europe.routes
        .map((r) =>
          [
            ...[r.a, r.b].sort(),
            r.length,
            r.color,
            r.locomotives ?? 0,
            r.tunnel ?? false,
          ].join("|"),
        )
        .sort(),
    ).toEqual(tuples);
  });
  it("matches all 46 attributed ticket triples, with no invented filler or expansion additions", () => {
    const csv = readFileSync(
      new URL("../references/europe-ticket-triples.csv", import.meta.url),
      "utf8",
    )
      .trim()
      .split("\n")
      .slice(1)
      .sort();
    expect(
      europe.tickets
        .map((t) => `${t.a},${t.b},${t.points},${t.long ?? false}`)
        .sort(),
    ).toEqual(csv);
    expect(
      new Set(europe.tickets.map((t) => [t.a, t.b].sort().join("|"))).size,
    ).toBe(46);
  });
  it("matches the independently checked ticket-table fingerprint", () => {
    const audit = JSON.parse(
      readFileSync(
        new URL("../references/europe-audit.json", import.meta.url),
        "utf8",
      ),
    );
    const canonical = europe.tickets
      .map((t) =>
        [...[t.a, t.b].sort(), t.points, String(t.long ?? false)].join("|"),
      )
      .sort()
      .join("\n");
    expect(createHash("sha256").update(canonical).digest("hex")).toBe(
      audit.independentTickets.canonicalTriplesSha256,
    );
    expect(audit.independentTickets.matched).toBe(46);
    expect(audit.publisherCardAuditComplete).toBe(false);
  });
  it("is connected and every ticket is topologically reachable", () => {
    const visited = new Set(["London"]);
    for (let changed = true; changed; ) {
      changed = false;
      for (const r of europe.routes) {
        if (visited.has(r.a) !== visited.has(r.b)) {
          visited.add(r.a);
          visited.add(r.b);
          changed = true;
        }
      }
    }
    expect(visited.size).toBe(47);
    expect(
      europe.tickets.every((t) => visited.has(t.a) && visited.has(t.b)),
    ).toBe(true);
  });
  it("has the reviewed inventory and consistent double tracks", () => {
    const pairs = new Map<string, typeof europe.routes>();
    for (const r of europe.routes) {
      const key = [r.a, r.b].sort().join("|");
      pairs.set(key, [...(pairs.get(key) ?? []), r]);
    }
    expect(pairs.size).toBe(90);
    expect([...pairs.values()].filter((rs) => rs.length === 2)).toHaveLength(
      11,
    );
    expect(
      [...pairs.values()].every(
        (rs) => rs.length <= 2 && rs.every((r) => r.length === rs[0].length),
      ),
    ).toBe(true);
    expect(europe.routes.reduce((n, r) => n + r.length, 0)).toBe(300);
    expect(europe.routes.filter((r) => r.tunnel)).toHaveLength(18);
    expect(europe.routes.filter((r) => r.locomotives)).toHaveLength(13);
  });
  it("covers high-risk tunnels/ferries and correct London endpoints", () => {
    const between = (a: string, b: string) =>
      europe.routes.filter(
        (r) => [r.a, r.b].includes(a) && [r.a, r.b].includes(b),
      );
    expect(between("Stockholm", "Petrograd")).toMatchObject([
      { length: 8, tunnel: true, color: "gray" },
    ]);
    expect(between("London", "Dieppe")).toHaveLength(2);
    expect(between("London", "Paris")).toHaveLength(0);
    expect(between("London", "Amsterdam")[0]).toMatchObject({
      length: 2,
      locomotives: 2,
    });
    expect(between("Palermo", "Smyrna")[0]).toMatchObject({
      length: 6,
      locomotives: 2,
    });
    expect(between("Paris", "Pamplona").every((r) => !r.tunnel)).toBe(true);
  });
});
