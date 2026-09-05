import "server-only";

import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { passkey } from "@better-auth/passkey";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  authRateLimits,
  passkeys,
  sessions,
  twoFactors,
  userInvites,
  users,
  verifications,
} from "@/db/schema";
import { queueAuthEmail } from "@/lib/auth/email";
import { invitationEmailContext } from "@/lib/auth/invite-context";
import { hashOpaqueToken } from "@/lib/auth/token";

type AuthTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function createAuth(database: typeof db | AuthTransaction = db) {
  const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 random characters.");
  if (
    process.env.NODE_ENV === "production" &&
    (!process.env.BETTER_AUTH_URL || new URL(baseURL).protocol !== "https:")
  )
    throw new Error("BETTER_AUTH_URL must be the public HTTPS origin in production.");
  return betterAuth({
    appName: "HomeHub",
    baseURL,
    secret,
    trustedOrigins: [new URL(baseURL).origin],
    database: drizzleAdapter(database, {
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
    }),
    advanced: { database: { generateId: "uuid" }, ipAddress: { ipAddressHeaders: ["x-real-ip"] } },
    user: {
      fields: { name: "fullName" },
      additionalFields: {
        role: { type: ["admin", "partner", "user"], defaultValue: "user", input: false },
        status: {
          type: ["invited", "active", "suspended", "deactivated"],
          defaultValue: "invited",
          input: false,
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: queueAuthEmail,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    verification: { storeIdentifier: "hashed" },
    rateLimit: { enabled: true, storage: "database" },
    databaseHooks: {
      verification: {
        create: {
          before: async (verification) => {
            if (invitationEmailContext.getStore())
              return {
                data: {
                  ...verification,
                  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
              };
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const [user] = await database
              .select({ status: users.status })
              .from(users)
              .where(eq(users.id, session.userId));
            if (user?.status !== "active")
              throw new APIError("FORBIDDEN", {
                message: "This account is not active. Contact an administrator.",
              });
          },
        },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        // Every credential method passes through session creation. Existing sessions
        // must also respect a status change before any account-security operation.
        if (ctx.headers) {
          const session = await getSessionFromCtx(ctx);
          if (session && session.user.status !== "active" && ctx.path !== "/sign-out") {
            throw new APIError("FORBIDDEN", {
              message: "This account is not active. Contact an administrator.",
            });
          }
        }
        if (ctx.path !== "/reset-password") return;
        const token = ctx.body?.token ?? ctx.query?.token;
        if (typeof token !== "string") return;
        const verification = await ctx.context.internalAdapter.findVerificationValue(
          `reset-password:${token}`,
        );
        if (!verification) return;
        const [user] = await database.select().from(users).where(eq(users.id, verification.value));
        const [invite] = await database
          .select()
          .from(userInvites)
          .where(eq(userInvites.tokenHash, hashOpaqueToken(token)));
        if (
          !user ||
          (user.status !== "active" && user.status !== "invited") ||
          (user.status === "invited" && !invite) ||
          (invite &&
            (invite.acceptedAt || invite.expiresAt <= new Date() || user.status !== "invited"))
        ) {
          throw new APIError("BAD_REQUEST", {
            message: "This link is unavailable. Contact an administrator.",
          });
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        const returned: unknown = ctx.context.returned;
        if (
          ctx.path !== "/reset-password" ||
          typeof returned !== "object" ||
          returned === null ||
          !("status" in returned) ||
          returned.status !== true
        )
          return;
        const token = ctx.body?.token ?? ctx.query?.token;
        if (typeof token !== "string") return;
        const [target] = await database
          .select({ userId: userInvites.userId })
          .from(userInvites)
          .where(eq(userInvites.tokenHash, hashOpaqueToken(token)));
        if (!target) return;
        await database.transaction(async (tx) => {
          const [user] = await tx
            .select()
            .from(users)
            .where(eq(users.id, target.userId))
            .for("update");
          const [invite] = await tx
            .select()
            .from(userInvites)
            .where(eq(userInvites.tokenHash, hashOpaqueToken(token)));
          if (
            !user ||
            user.status !== "invited" ||
            user.inviteAcceptedAt ||
            !invite ||
            invite.acceptedAt ||
            invite.expiresAt <= new Date()
          ) {
            throw new APIError("BAD_REQUEST", {
              message: "This invitation is no longer available. Request a new invitation.",
            });
          }
          await tx
            .update(users)
            .set({ status: "active", emailVerified: true, inviteAcceptedAt: new Date() })
            .where(eq(users.id, user.id));
          await tx
            .update(userInvites)
            .set({ acceptedAt: new Date(), sealedUrl: null })
            .where(eq(userInvites.id, invite.id));
        });
      }),
    },
    plugins: [
      twoFactor({ issuer: "HomeHub" }),
      passkey({
        rpID: new URL(baseURL).hostname,
        rpName: "HomeHub",
        origin: new URL(baseURL).origin,
        authenticatorSelection: { residentKey: "required", userVerification: "required" },
        registration: {
          afterVerification: async ({ verification }) => {
            if (!verification.registrationInfo?.userVerified)
              throw new APIError("BAD_REQUEST", {
                message: "Use a passkey that verifies your screen lock or biometrics.",
              });
          },
        },
        authentication: {
          afterVerification: async ({ verification }) => {
            if (!verification.authenticationInfo.userVerified)
              throw new APIError("UNAUTHORIZED", {
                message: "Verify your screen lock or biometrics to sign in.",
              });
          },
        },
      }),
      {
        id: "login-activity",
        hooks: {
          after: [
            {
              matcher: (ctx) =>
                [
                  "/sign-in/email",
                  "/passkey/verify-authentication",
                  "/two-factor/verify-totp",
                  "/two-factor/verify-backup-code",
                ].includes(ctx.path ?? ""),
              handler: createAuthMiddleware(async (ctx) => {
                const signedIn = ctx.context.newSession;
                if (signedIn)
                  await database
                    .update(users)
                    .set({ lastLoginAt: new Date() })
                    .where(eq(users.id, signedIn.user.id));
              }),
            },
          ],
        },
      },
      nextCookies(),
    ],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

// Next.js evaluates route modules during builds, before runtime secrets are available.
export const auth = new Proxy({} as ReturnType<typeof createAuth>, {
  has(_target, property) {
    instance ??= createAuth();
    return Reflect.has(instance, property);
  },
  get(_target, property) {
    instance ??= createAuth();
    return Reflect.get(instance, property);
  },
});
