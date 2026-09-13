import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";

type SqlClient = ReturnType<typeof postgres>;
type Database = ReturnType<typeof drizzle<typeof schema>>;

const globalForDatabase = globalThis as typeof globalThis & {
  __ahpSqlClient?: SqlClient;
  __ahpDatabase?: Database;
};

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Add it to your environment before using the database.",
    );
  }

  return databaseUrl;
}

function createSqlClient() {
  return postgres(getDatabaseUrl(), {
    prepare: false,
    max: 5,
    idle_timeout: 20,
  });
}

function createDatabase() {
  const sqlClient = globalForDatabase.__ahpSqlClient ?? createSqlClient();

  globalForDatabase.__ahpSqlClient = sqlClient;

  return drizzle(sqlClient, { schema });
}

function getDatabase() {
  const existingDatabase = globalForDatabase.__ahpDatabase;

  if (existingDatabase) {
    return existingDatabase;
  }

  const database = createDatabase();
  globalForDatabase.__ahpDatabase = database;

  return database;
}

export const db = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    return Reflect.get(getDatabase(), prop, receiver);
  },
});
