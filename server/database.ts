import { Pool } from "pg";
import { mkdir } from "node:fs/promises";

export interface Sql {
  query<T extends Record<string, unknown>>(
    sql: string,
    values?: unknown[],
  ): Promise<{ rows: T[] }>;
}
export interface Database {
  transaction<T>(run: (sql: Sql) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
export async function openDatabase(
  url?: string,
  dataDir = ".local-data/postgres",
): Promise<Database> {
  if (url) {
    const pool = new Pool({
      connectionString: url,
      max: 10,
      connectionTimeoutMillis: 10000,
      statement_timeout: 15000,
    });
    return {
      async transaction(run) {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const result = await run(client);
          await client.query("COMMIT");
          return result;
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
      },
      close: () => pool.end(),
    };
  }
  if (process.env.NODE_ENV === "production")
    throw new Error("DATABASE_URL required in production");
  const { PGlite } = await import("@electric-sql/pglite");
  if (dataDir !== "memory://") await mkdir(dataDir, { recursive: true });
  const db = await PGlite.create(dataDir);
  return {
    transaction: (run) => db.transaction((tx) => run(tx)),
    close: () => db.close(),
  };
}
export async function migrate(db: Database) {
  await db.transaction(async (sql) => {
    await sql.query(
      `CREATE TABLE IF NOT EXISTS erc_rooms (id uuid PRIMARY KEY, payload jsonb NOT NULL, expires_at bigint NOT NULL)`,
    );
    await sql.query(
      `CREATE TABLE IF NOT EXISTS erc_commands (room_id uuid REFERENCES erc_rooms(id) ON DELETE CASCADE, seat_id text NOT NULL, id uuid NOT NULL, fingerprint text NOT NULL, version integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(room_id, seat_id, id))`,
    );
    await sql.query(
      `CREATE INDEX IF NOT EXISTS erc_rooms_expiry ON erc_rooms(expires_at)`,
    );
  });
}
