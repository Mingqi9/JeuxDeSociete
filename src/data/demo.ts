import type { Dataset } from "../domain/model";
// Original compact fixture. NOT the official Europe map or ticket distribution.
export const demo: Dataset = {
  id: "original-training-v1",
  complete: false,
  cities: {
    London: [130, 100],
    Paris: [260, 280],
    Bruxelles: [390, 160],
    Zürich: [480, 420],
    Berlin: [680, 160],
    Wien: [720, 400],
  },
  routes: [
    {
      id: "lp",
      a: "London",
      b: "Paris",
      length: 2,
      color: "gray",
      locomotives: 1,
    },
    { id: "pb1", a: "Paris", b: "Bruxelles", length: 2, color: "red" },
    { id: "pb2", a: "Paris", b: "Bruxelles", length: 2, color: "blue" },
    {
      id: "pz",
      a: "Paris",
      b: "Zürich",
      length: 3,
      color: "gray",
      tunnel: true,
    },
    { id: "bb", a: "Bruxelles", b: "Berlin", length: 4, color: "yellow" },
    { id: "zw", a: "Zürich", b: "Wien", length: 3, color: "green" },
    { id: "bw", a: "Berlin", b: "Wien", length: 4, color: "black" },
    { id: "bz", a: "Bruxelles", b: "Zürich", length: 2, color: "white" },
    { id: "pw", a: "Paris", b: "Wien", length: 6, color: "orange" },
  ],
  tickets: [
    ...["London", "Paris", "Bruxelles", "Zürich", "Berlin"].map((a, i) => ({
      id: `long-${i}`,
      a,
      b: "Wien",
      points: 9 + i,
      long: true,
    })),
    ...Array.from({ length: 24 }, (_, i) => {
      const pairs = [
        ["London", "Berlin"],
        ["Paris", "Wien"],
        ["Bruxelles", "Wien"],
        ["London", "Zürich"],
        ["Paris", "Berlin"],
        ["Zürich", "Berlin"],
      ];
      const [a, b] = pairs[i % 6];
      return { id: `regular-${i}`, a, b, points: 5 + (i % 6) };
    }),
  ],
};
