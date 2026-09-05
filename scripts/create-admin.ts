import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";
import { accounts, lower, users } from "../db/schema.ts";

async function main() {
  const config = z
    .object({
      DATABASE_URL: z.url(),
      BOOTSTRAP_ADMIN_EMAIL: z.email().transform((value) => value.toLowerCase()),
      BOOTSTRAP_ADMIN_PASSWORD: z.string().min(12).max(128),
    })
    .parse(process.env);
  const sql = postgres(config.DATABASE_URL, { max: 1 });
  const db = drizzle(sql);
  try {
    const password = await hashPassword(config.BOOTSTRAP_ADMIN_PASSWORD);
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(lower(users.email), config.BOOTSTRAP_ADMIN_EMAIL));
      if (existing) throw new Error("Account already exists. Use the in-app admin controls.");
      const [user] = await tx
        .insert(users)
        .values({
          email: config.BOOTSTRAP_ADMIN_EMAIL,
          fullName: "HomeHub Admin",
          role: "admin",
          status: "active",
          emailVerified: true,
          inviteAcceptedAt: new Date(),
        })
        .returning();
      if (!user) throw new Error("Unable to create administrator.");
      await tx.insert(accounts).values({
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        issuer: "local:credential",
        password,
      });
    });
    console.log(`Created administrator ${config.BOOTSTRAP_ADMIN_EMAIL}.`);
  } finally {
    await sql.end();
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unable to create administrator.");
  process.exitCode = 1;
});
