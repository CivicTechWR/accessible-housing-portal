import "server-only";

import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getUserForSession, isUserAllowedToSignIn } from "@/lib/auth/user-store";

async function readSession() {
  const requestHeaders = await headers();
  return auth.api.getSession({ headers: requestHeaders });
}

type SessionErrorBody = {
  message: string;
};

type AuthSession = NonNullable<Awaited<ReturnType<typeof readSession>>>;
type AuthorizedUser = NonNullable<Awaited<ReturnType<typeof getUserForSession>>>;

type SessionGuardResult =
  | {
      response: NextResponse<SessionErrorBody>;
      session: null;
      authzUser: null;
    }
  | {
      response: null;
      session: AuthSession;
      authzUser: AuthorizedUser;
    };

type OptionalSessionResult = {
  session: AuthSession | null;
  authzUser: AuthorizedUser | null;
};

export async function getOptionalSession() {
  const session = await readSession();

  if (!session?.user?.id) {
    return {
      session: null,
      authzUser: null,
    } satisfies OptionalSessionResult;
  }

  const authzUser = await getUserForSession(session.user.id);

  if (!authzUser || !isUserAllowedToSignIn(authzUser.status)) {
    return {
      session: null,
      authzUser: null,
    } satisfies OptionalSessionResult;
  }

  return {
    session,
    authzUser,
  } satisfies OptionalSessionResult;
}

export async function requireSession() {
  const optionalSession = await getOptionalSession();

  if (!optionalSession.session || !optionalSession.authzUser) {
    return {
      response: NextResponse.json<SessionErrorBody>({ message: "Unauthorized" }, { status: 401 }),
      session: null,
      authzUser: null,
    } satisfies SessionGuardResult;
  }

  return {
    response: null,
    session: optionalSession.session,
    authzUser: optionalSession.authzUser,
  } satisfies SessionGuardResult;
}

export async function requireAdminSession() {
  const result = await requireSession();

  if (result.response) {
    return result;
  }

  if (result.authzUser?.role !== "admin") {
    return {
      response: NextResponse.json<SessionErrorBody>({ message: "Forbidden" }, { status: 403 }),
      session: null,
      authzUser: null,
    } satisfies SessionGuardResult;
  }

  return result;
}

export async function requireListingWriteSession() {
  const result = await requireSession();

  if (result.response) {
    return result;
  }

  if (result.authzUser?.role !== "admin" && result.authzUser?.role !== "partner") {
    return {
      response: NextResponse.json<SessionErrorBody>({ message: "Forbidden" }, { status: 403 }),
      session: null,
      authzUser: null,
    } satisfies SessionGuardResult;
  }

  return result;
}
