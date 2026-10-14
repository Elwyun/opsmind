import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

/**
 * Single Prisma client for the process. Prisma ORM 7 requires a driver
 * adapter; the PostgreSQL driver adapter (`@prisma/adapter-pg`) is used so the
 * same code runs against the local/test database and the managed Postgres
 * behind the deployed Cloud Run instance.
 */

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and point it at a PostgreSQL database " +
        "(run `npm run db:setup` afterwards to push the schema and seed the demo data).",
    );
  }
  if (url.startsWith("file:")) {
    throw new Error(
      "DATABASE_URL still points at the old SQLite file. This project now uses PostgreSQL — " +
        "set a postgres:// connection string (see .env.example).",
    );
  }
  return url;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: resolveDatabaseUrl() });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { __opsmindPrisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.__opsmindPrisma ?? createPrismaClient();

// Reuse the client across hot reloads in development to avoid exhausting
// connections.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__opsmindPrisma = prisma;
}
