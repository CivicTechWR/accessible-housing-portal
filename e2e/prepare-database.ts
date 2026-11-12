// Creates, migrates, and seeds the local review database used by Playwright.
// Runs before the Playwright web server starts (see playwright.config.ts), with the react-server
// condition so app modules that import "server-only" can be reused here.
import { execFileSync } from "node:child_process";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { lower, userInvites, users } from "../db/schema.ts";
import { hashOpaqueToken } from "../lib/auth/token.ts";
import {
  E2E_DATABASE_URL,
  E2E_INVITE_TOKEN,
  E2E_INVITED_EMAIL,
  E2E_REVIEW_PASSWORD,
} from "./settings.ts";

const databaseUrl = new URL(E2E_DATABASE_URL);
const databaseName = databaseUrl.pathname.slice(1);

// Migrations and seeds below write to this database, so refuse anything but the local review
// database before touching it (scripts/seed-auth-review.ts applies the same rule, but runs last).
function assertLocalReviewDatabase() {
  if (
    !["localhost", "127.0.0.1"].includes(databaseUrl.hostname) ||
    databaseName !== "homehub_auth_review"
  ) {
    throw new Error("E2E_DATABASE_URL must point to a local homehub_auth_review database.");
  }
}

async function ensureDatabaseExists() {
  const maintenanceUrl = new URL(E2E_DATABASE_URL);
  maintenanceUrl.pathname = "/postgres";
  const sql = postgres(maintenanceUrl.toString(), { max: 1, onnotice: () => {} });
  try {
    const [existing] = await sql`select 1 from pg_database where datname = ${databaseName}`;
    if (!existing) {
      await sql`create database ${sql(databaseName)}`;
      console.log(`[e2e] Created database ${databaseName}.`);
    }
  } finally {
    await sql.end();
  }
}

// Existing project scripts read DATABASE_URL; values set here take precedence over .env.local.
function runScript(script: string) {
  execFileSync("npm", ["run", "--silent", script], {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: E2E_DATABASE_URL,
      REVIEW_PASSWORD: E2E_REVIEW_PASSWORD,
    },
  });
}

async function seedPendingInvite() {
  const sql = postgres(E2E_DATABASE_URL, { max: 1 });
  const db = drizzle(sql);
  try {
    // Same select-then-upsert pattern as scripts/seed-auth-review.ts.
    await db.transaction(async (tx) => {
      const values = {
        email: E2E_INVITED_EMAIL,
        fullName: "Invited Partner",
        role: "partner",
        status: "invited",
        inviteAcceptedAt: null,
      } as const;
      const [existing] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(lower(users.email), E2E_INVITED_EMAIL));
      const [user] = existing
        ? await tx
            .update(users)
            .set(values)
            .where(eq(users.id, existing.id))
            .returning({ id: users.id })
        : await tx.insert(users).values(values).returning({ id: users.id });
      if (!user) throw new Error("Unable to seed the invited user.");
      await tx.delete(userInvites).where(eq(userInvites.userId, user.id));
      await tx.insert(userInvites).values({
        userId: user.id,
        email: E2E_INVITED_EMAIL,
        tokenHash: hashOpaqueToken(E2E_INVITE_TOKEN),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    });
  } finally {
    await sql.end();
  }
}

async function main() {
  assertLocalReviewDatabase();
  await ensureDatabaseExists();
  runScript("db:migrate");
  runScript("db:seed");
  runScript("db:seed:auth-review");
  await seedPendingInvite();
  console.log("[e2e] Review database ready.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
