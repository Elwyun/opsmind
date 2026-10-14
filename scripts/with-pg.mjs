#!/usr/bin/env node
/**
 * Runs a command with a local embedded PostgreSQL available.
 *
 * The project targets PostgreSQL (docs/SCHEMA.md) but must still work with
 * zero external setup, so development commands start a private PostgreSQL
 * instance (embedded-postgres) on a dedicated port before running:
 *
 *   node scripts/with-pg.mjs next dev
 *   node scripts/with-pg.mjs npm run _db:setup
 *
 * Behaviour:
 * - If DATABASE_URL points somewhere other than localhost, nothing is
 *   started: the command runs as-is (that URL belongs to a managed database).
 * - If localhost already answers on the expected port, that server is reused
 *   and left running afterwards (it may belong to another dev session).
 * - Otherwise a persistent embedded cluster is initialised (once) under
 *   `.local-pg/`, started, and stopped when the command finishes.
 *
 * Exits with the wrapped command's exit code.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

function parseDatabaseUrl(url) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 5432,
      database: parsed.pathname.replace(/^\//, "") || "postgres",
      username: parsed.username || "postgres",
      password: parsed.password || "",
    };
  } catch {
    return null;
  }
}

function probePort(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
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
}

async function main() {
  const command = process.argv[2];
  if (!command) {
    console.error("Usage: node scripts/with-pg.mjs <command> [args...]");
    process.exit(2);
  }
  const args = process.argv.slice(3);

  const databaseUrl = process.env.DATABASE_URL?.trim();
  const parsed = databaseUrl ? parseDatabaseUrl(databaseUrl) : null;

  let child = null;
  let managedPostgres = null;

  const runCommand = () =>
    new Promise((resolve) => {
      child = spawn(command, args, {
        cwd: root,
        stdio: "inherit",
        shell: process.platform === "win32",
        env: process.env,
      });
      child.once("exit", (code, signal) => resolve(signal ? 1 : (code ?? 1)));
      child.once("error", (error) => {
        console.error(`Failed to run "${command}":`, error.message);
        resolve(1);
      });
    });

  const forwardSignal = (signal) => {
    if (child && !child.killed) child.kill(signal);
  };
  process.on("SIGINT", () => forwardSignal("SIGINT"));
  process.on("SIGTERM", () => forwardSignal("SIGTERM"));

  // Remote or explicit non-local database: nothing to start here.
  if (parsed && !LOCAL_HOSTS.has(parsed.host)) {
    process.exit(await runCommand());
  }

  const port = parsed?.port ?? 54329;
  const host = LOCAL_HOSTS.has(parsed?.host ?? "") ? "127.0.0.1" : "127.0.0.1";

  if (await probePort(port, host)) {
    // Something already listens there (most likely a previous dev session):
    // reuse it and leave it alone.
    process.exit(await runCommand());
  }

  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  const dataDir = process.env.OPSMIND_PG_DIR ?? path.join(root, ".local-pg");
  const user = parsed?.username ?? "postgres";
  const password = parsed?.password ?? "postgres";

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user,
    password,
    port,
    persistent: true,
    initdbFlags: ["--encoding=UTF8"],
  });

  const firstRun = !existsSync(path.join(dataDir, "PG_VERSION"));
  process.stderr.write(
    `[with-pg] starting local PostgreSQL on port ${port}` +
      `${firstRun ? " (first run: initialising data directory)" : ""}...\n`,
  );

  try {
    if (firstRun) await pg.initialise();
    await pg.start();
    managedPostgres = pg;
    if (parsed?.database && parsed.database !== "postgres") {
      try {
        await pg.createDatabase(parsed.database);
      } catch (error) {
        if (!/already exists/i.test(String(error?.message))) throw error;
      }
    }
  } catch (error) {
    console.error("[with-pg] could not start the local PostgreSQL:", error.message);
    console.error(
      "[with-pg] set DATABASE_URL to a reachable database instead (see .env.example).",
    );
    process.exit(1);
  }

  const exitCode = await runCommand();

  if (managedPostgres) {
    try {
      await managedPostgres.stop();
      process.stderr.write("[with-pg] local PostgreSQL stopped.\n");
    } catch (error) {
      console.error("[with-pg] failed to stop local PostgreSQL:", error.message);
    }
  }
  process.exit(exitCode);
}

main().catch((error) => {
  console.error("[with-pg] unexpected error:", error);
  process.exit(1);
});
