import { openDatabase, migrate } from "./database";
import { Rooms } from "./rooms";
import { createGameServer } from "./http";
const port = Number(process.env.PORT ?? 3001);
const origins = (
  process.env.ALLOWED_ORIGINS ??
  "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:4173"
)
  .split(",")
  .map((s) => s.trim());
if (
  process.env.NODE_ENV === "production" &&
  (!process.env.ALLOWED_ORIGINS ||
    origins.some((s) => !s.startsWith("https://")))
)
  throw Error("Production requires HTTPS ALLOWED_ORIGINS");
const db = await openDatabase(
  process.env.DATABASE_URL,
  process.env.LOCAL_DATABASE_DIR ?? ".local-data/postgres",
);
await migrate(db);
const app = createGameServer(new Rooms(db), origins);
app.server.listen(port, process.env.HOST ?? "127.0.0.1", () =>
  console.log(
    `Rail server ready on port ${port} (${process.env.DATABASE_URL ? "PostgreSQL" : "local development database"})`,
  ),
);
let closing = false;
async function stop() {
  if (closing) return;
  closing = true;
  await app.close();
  await db.close();
}
process.on("SIGTERM", () => void stop());
process.on("SIGINT", () => void stop());
