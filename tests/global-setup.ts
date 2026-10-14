import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { rootDir, TEST_DATABASE_URL, TEST_PG_DIR, TEST_PG_PORT, USE_EMBEDDED_TEST_DB } from "./test-db";

interface ManagedPostgres {
  stop(): Promise<void>;
}

/**
 * Prepares an isolated PostgreSQL database for the test run.
 *
 * By default the suite boots its own embedded PostgreSQL instance on a
 * dedicated port, so neither the development demo database nor any managed
 * database is ever touched. Point `TEST_DATABASE_URL` at an existing server
 * to run against that instead (the schema is still force-reset).
 */
export default async function globalSetup(): Promise<() => Promise<void>> {
  let postgres: ManagedPostgres | null = null;

  if (USE_EMBEDDED_TEST_DB && !(await portIsOpen(TEST_PG_PORT))) {
    const { default: EmbeddedPostgres } = await import("embedded-postgres");
    const instance = new EmbeddedPostgres({
      databaseDir: TEST_PG_DIR,
      user: "postgres",
      password: "postgres",
      port: TEST_PG_PORT,
      persistent: true,
      initdbFlags: ["--encoding=UTF8"],
    });
    const firstRun = !existsSync(path.join(TEST_PG_DIR, "PG_VERSION"));
    if (firstRun) await instance.initialise();
    await instance.start();
    postgres = instance;
    try {
      await instance.createDatabase("opsmind_test");
    } catch (error) {
      if (!/already exists/i.test(String((error as Error).message))) throw error;
    }
  }

  execSync("npx prisma db push --force-reset", {
    stdio: "inherit",
    cwd: rootDir,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });

  return async () => {
    if (postgres) await postgres.stop();
  };
}

function portIsOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    import("node:net").then(({ default: net }) => {
      const socket = net.connect({ port, host: "127.0.0.1" });
      socket.setTimeout(1500);
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => resolve(false));
      socket.once("timeout", () => {
        socket.destroy();
        resolve(false);
      });
    });
  });
}
