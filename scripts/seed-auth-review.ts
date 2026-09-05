import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { accounts, lower, users } from "../db/schema.ts";

async function main() {
  const databaseURL = process.env.DATABASE_URL;
  const password = process.env.REVIEW_PASSWORD;
  if (!databaseURL || !password || password.length < 12)
    throw new Error("DATABASE_URL and REVIEW_PASSWORD of at least 12 characters are required.");
  const url = new URL(databaseURL);
  if (
    process.env.NODE_ENV === "production" ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.pathname !== "/homehub_auth_review"
  )
    throw new Error("Review seeds require a local homehub_auth_review database.");
  const sql = postgres(databaseURL, { max: 1 });
  const db = drizzle(sql);
  try {
    const hashedPassword = await hashPassword(password);
    const seeds = [
      { email: "admin@homehub.test", fullName: "Review Admin", role: "admin", status: "active" },
      {
        email: "searcher@homehub.test",
        fullName: "Review Searcher",
        role: "user",
        status: "active",
      },
      {
        email: "suspended@homehub.test",
        fullName: "Suspended Account",
        role: "partner",
        status: "suspended",
      },
      {
        email: "deactivated@homehub.test",
        fullName: "Deactivated Account",
        role: "user",
        status: "deactivated",
      },
      {
        email: "seed-partner-waterloo@example.com",
        fullName: "Waterloo Demo Partner",
        role: "partner",
        status: "active",
      },
      {
        email: "seed-partner-regional@example.com",
        fullName: "Regional Demo Partner",
        role: "partner",
        status: "active",
      },
    ] as const;
    for (const seed of seeds) {
      await db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(users)
          .where(eq(lower(users.email), seed.email));
        const values = { ...seed, emailVerified: true, inviteAcceptedAt: new Date() };
        const [user] = existing
          ? await tx.update(users).set(values).where(eq(users.id, existing.id)).returning()
          : await tx.insert(users).values(values).returning();
        if (!user) throw new Error("Unable to seed review account.");
        await tx
          .insert(accounts)
          .values({
            userId: user.id,
            accountId: user.id,
            providerId: "credential",
            issuer: "local:credential",
            password: hashedPassword,
          })
          .onConflictDoUpdate({
            target: [accounts.issuer, accounts.accountId],
            set: { password: hashedPassword },
          });
      });
    }
    console.log("Review accounts seeded.");
  } finally {
    await sql.end();
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unable to seed review accounts.");
  process.exitCode = 1;
});
