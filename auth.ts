import NextAuth from "next-auth";
import type { NextAuthConfig, Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { userRoleEnum, userStatusEnum, type UserRole, type UserStatus } from "@/db/schema";
import {
  ensureBootstrapAdmin,
  getUserForAuth,
  getUserForSession,
  isUserAllowedToSignIn,
  recordSuccessfulLogin,
} from "@/lib/auth/user-store";
import { verifyPassword } from "@/lib/auth/password";
import { requiresAuthSessionForRequest } from "@/lib/auth/route-policy";
import { signInSchema } from "@/lib/auth/validation";

const authConfig = {
  pages: {
    signIn: "/sign-in",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = signInSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        let user = await getUserForAuth(parsed.data.email);
        const bootstrapUser = await ensureBootstrapAdmin(parsed.data.email, parsed.data.password);

        if (bootstrapUser) {
          user = bootstrapUser;
        }

        if (!user || !user.passwordHash) {
          return null;
        }

        if (!isUserAllowedToSignIn(user.status)) {
          return null;
        }

        const passwordMatches = await verifyPassword(parsed.data.password, user.passwordHash);

        if (!passwordMatches) {
          return null;
        }

        await recordSuccessfulLogin(user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.status = user.status;
      }

      return token;
    },
    session({ session, token }) {
      if (!session.user || !token.sub) {
        return session;
      }

      session.user.id = token.sub;
      session.user.role = parseUserRole(token.role);
      session.user.status = parseUserStatus(token.status);

      return session;
    },
    async authorized({ auth: currentAuth, request }) {
      const requiresSessionCheck = requiresAuthSessionForRequest({
        pathname: request.nextUrl.pathname,
        method: request.method,
      });

      if (!currentAuth?.user?.id) {
        return !requiresSessionCheck;
      }

      if (!requiresSessionCheck) {
        return true;
      }

      const authzUser = await getUserForSession(currentAuth.user.id);
      const isActiveUser = authzUser ? isUserAllowedToSignIn(authzUser.status) : false;

      if (!isActiveUser) {
        return false;
      }

      return true;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

function parseUserRole(value: Session["user"]["role"] | unknown): UserRole | undefined {
  return typeof value === "string" && userRoleEnum.enumValues.includes(value as UserRole)
    ? (value as UserRole)
    : undefined;
}

function parseUserStatus(value: Session["user"]["status"] | unknown): UserStatus | undefined {
  return typeof value === "string" && userStatusEnum.enumValues.includes(value as UserStatus)
    ? (value as UserStatus)
    : undefined;
}
