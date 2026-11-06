import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
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

export function createAuthDatabaseAdapter(database: AuthDatabase) {
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
