import { describe, it, expect } from "vitest";
import { dictionaries } from "../src/ui/i18n";
import { actionError, createGame, transition } from "../src/domain/engine";
import { demo } from "../src/data/demo";
import { validateDataset } from "../src/domain/dataValidation";
import { type Card } from "../src/domain/model";
function game() {
  let g = createGame(["A", "B"], demo, 8);
  for (let i = 0; i < 2; i++) {
    if (g.pending?.kind !== "tickets") throw Error();
    g = transition(g, g.players[g.active].id, {
      type: "keepTickets",
      ids: g.pending.tickets.slice(0, 2).map((t) => t.id),
    });
  }
  return g;
}
describe("validation and UI contract", () => {
  it("has matching nonempty Chinese/French keys including errors", () => {
    expect(Object.keys(dictionaries.zh).sort()).toEqual(
      Object.keys(dictionaries.fr).sort(),
    );
    expect(Object.keys(dictionaries.zh.errors).sort()).toEqual(
      Object.keys(dictionaries.fr.errors).sort(),
    );
    for (const dictionary of Object.values(dictionaries)) {
      expect(
        Object.values(dictionary).every(
          (value) => typeof value === "object" || value.length > 0,
        ),
      ).toBe(true);
    }
  });
  it("previews legality using immutable reducer validation", () => {
    const g = game(),
      before = structuredClone(g);
    expect(
      actionError(g, "p0", { type: "claim", route: "lp", payment: [] }),
    ).toBe("WRONG_PAYMENT");
    expect(actionError(g, "p0", { type: "drawTickets" })).toBe(null);
    expect(g).toEqual(before);
  });
  it("rejects prototype names as city actions and dataset keys", () => {
    const g = game();
    g.players[0].hand = ["red"];
    expect(() =>
      transition(g, "p0", {
        type: "station",
        city: "__proto__",
        payment: ["red"],
      }),
    ).toThrow("CITY_OCCUPIED");
    const data = structuredClone(demo);
    data.routes[0].id = "constructor";
    expect(() => validateDataset(data)).toThrow("INVALID_DATA");
  });
  it("rejects infinite coordinates and malformed route properties", () => {
    const data = structuredClone(demo);
    data.cities.Paris = [NaN, 0];
    expect(() => validateDataset(data)).toThrow("INVALID_DATA");
  });
  it("does not permit changing action mid-draw", () => {
    let g = game();
    g = transition(g, "p0", { type: "drawCard", source: "blind" });
    expect(() =>
      transition(g, "p0", { type: "station", city: "Paris", payment: ["red"] }),
    ).toThrow("WRONG_PHASE");
  });
  it("station rejects mixed color and wrong count without mutating state", () => {
    const g = game();
    g.players[0].stations = ["Berlin"];
    g.players[0].hand = ["blue", "red"];
    const before = structuredClone(g);
    expect(() =>
      transition(g, "p0", {
        type: "station",
        city: "Paris",
        payment: ["red", "blue"],
      }),
    ).toThrow("MIXED_PAYMENT");
    expect(() =>
      transition(g, "p0", { type: "station", city: "Paris", payment: ["red"] }),
    ).toThrow("WRONG_PAYMENT");
    expect(g).toEqual(before);
  });
  it("rejects an unsupported pass action instead of inventing a turn rule", () => {
    expect(() => transition(game(), "p0", { type: "pass" })).toThrow(
      "INVALID_ACTION",
    );
  });
  it.each([1, 2, 3, 4, 6, 8] as const)(
    "scores route length %i and spends matching trains",
    (length) => {
      const g = game();
      g.data.routes = [
        { id: "r", a: "London", b: "Paris", length, color: "gray" },
      ];
      g.players[0].hand = Array<Card>(length).fill("blue");
      const next = transition(g, "p0", {
        type: "claim",
        route: "r",
        payment: [...g.players[0].hand],
      });
      expect(next.players[0].trains).toBe(45 - length);
      expect(next.players[0].points).toBe(
        { 1: 1, 2: 2, 3: 4, 4: 7, 6: 15, 8: 21 }[length],
      );
    },
  );
});
