// Dev-only test entry. Not imported from index.html or included in dist/.
// Only creates a standard new game; no state setters, secret inspection APIs,
// altered stocks, scripted hands or action bypasses are exposed to the page.
import { createRoot } from "react-dom/client";
import { App } from "../src/ui/App";
import { createGame } from "../src/domain/engine";
import { europe } from "../src/data/europe";
import "../src/styles.css";
const params = new URLSearchParams(location.search);
const players = Math.max(2, Math.min(5, Number(params.get("players") ?? 2)));
const seed = Number(params.get("seed") ?? 124);
createRoot(document.getElementById("root")!).render(
  <App
    initialGame={createGame(
      Array.from({ length: players }, (_, i) => `Player ${i + 1}`),
      europe,
      seed,
    )}
  />,
);
