import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Absolute path of the repository root (shared by test helpers). */
export const rootDir = root;

/**
 * Test runs use their own embedded PostgreSQL instance so they never touch
 * the development demo database, whichever database that points at.
 *
 * Set TEST_DATABASE_URL to run the suite against an existing PostgreSQL
 * instead (the schema is still dropped and recreated on that database).
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL?.trim() ||
  "postgres://postgres:postgres@127.0.0.1:54330/opsmind_test";

/** True when the suite points at its own local embedded instance. */
export const USE_EMBEDDED_TEST_DB = TEST_DATABASE_URL.includes("127.0.0.1:54330");

export const TEST_PG_PORT = 54330;
export const TEST_PG_DIR = path.join(root, "node_modules", ".cache", "opsmind-test-pg");
