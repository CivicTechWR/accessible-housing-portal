import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import type { BetterAuthOptions } from "better-auth";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  authRateLimits,
  passkeys,
  sessions,
  twoFactors,
  users,
  verifications,
} from "@/db/schema";

type AuthTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type AuthDatabase = typeof db | AuthTransaction;

function createDrizzleAdapter(database: AuthDatabase) {
  return drizzleAdapter(database, {
    provider: "pg",
    transaction: database === db,
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
      twoFactor: twoFactors,
      passkey: passkeys,
      rateLimit: authRateLimits,
    },
  });
}

export function createAuthDatabaseAdapter(database: AuthDatabase) {
  return (options: BetterAuthOptions) => {
    const adapter = createDrizzleAdapter(database)(options);
    return {
      ...adapter,
      async incrementOne<T>(input: Parameters<typeof adapter.incrementOne>[0]): Promise<T | null> {
        if (input.model !== "rateLimit") return adapter.incrementOne<T>(input);
        const key = input.where.find(
          (condition) => condition.field === "key" && (condition.operator ?? "eq") === "eq",
        )?.value;
        if (typeof key !== "string") throw new Error("Rate-limit updates require a counter key.");

        // Drizzle adapter 1.7.2 checks the guard in an ID subquery. Lock first so
        // that query sees the latest count after any concurrent update commits.
        return database.transaction(async (tx) => {
          const [counter] = await tx
            .select({ id: authRateLimits.id })
            .from(authRateLimits)
            .where(eq(authRateLimits.key, key))
            .for("update");
          if (!counter) return null;
          return createDrizzleAdapter(tx)(options).incrementOne<T>(input);
        });
      },
    };
  };
}
