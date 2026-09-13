import { toNextJsHandler } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import { lower, users, verifications } from "@/db/schema";
import { auth, createAuth } from "@/lib/auth";

const handlers = toNextJsHandler(auth);
export const GET = handlers.GET;

export async function POST(request: Request) {
  const url = new URL(request.url);
  const pathname = decodeURIComponent(url.pathname).replace(/\/+$/, "");
  if (pathname === "/api/auth/request-password-reset") {
    // Public resets let Next.js finish email work after the response. Server-side
    // invitation creation uses the default auth instance and awaits its link.
    return toNextJsHandler(createAuth(db, { handler: (task) => after(() => task) })).POST(request);
  }
  if (pathname === "/api/auth/reset-password") return handleResetPassword(request, url);
  if (pathname === "/api/auth/change-password") return handleChangePassword(request);
  if (pathname === "/api/auth/sign-in/email") return handleSignInEmail(request);
  if (
    pathname === "/api/auth/two-factor/verify-totp" ||
    pathname === "/api/auth/two-factor/verify-backup-code"
  ) {
    try {
      return await db.transaction(async (tx) => {
        // The auth hook locks the challenge's user before Better Auth consumes it.
        // Commit rejected codes too, preserving attempt counts and account lockouts.
        const response = await toNextJsHandler(createAuth(tx)).POST(request);
        if (response.status >= 500) throw response;
        return response;
      });
    } catch (error) {
      if (error instanceof Response) return error;
      throw error;
    }
  }
  return handlers.POST(request);
}

async function handleResetPassword(request: Request, url: URL) {
  if (!request.headers.get("content-type")?.split(";")[0]?.trim().endsWith("/json")) {
    return Response.json({ message: "Use application/json for password setup." }, { status: 415 });
  }
  const body: unknown = await request
    .clone()
    .json()
    .catch(() => null);
  const bodyToken =
    typeof body === "object" && body !== null && "token" in body ? body.token : null;
  const token = bodyToken || url.searchParams.get("token");
  if (typeof token !== "string") return handlers.POST(request);
  const context = await auth.$context;
  const verification = await context.internalAdapter.findVerificationValue(
    `reset-password:${token}`,
  );
  if (!verification) return handlers.POST(request);
  const userId = verification.value;

  // Serialize password setup with invitation replacement and account-status changes.
  // Better Auth still validates and consumes the token and writes the credential
  // inside the row lock, so a concurrent change-password or sign-in sees one
  // committed password and the loser's credential check fails or its session is
  // revoked by this transaction.
  try {
    return await db.transaction(async (tx) => {
      await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");
      const response = await toNextJsHandler(createAuth(tx)).POST(request);
      if (!response.ok) throw response;
      // A successful reset must invalidate every other outstanding reset link for
      // this account. Consuming one token does not revoke its siblings.
      await tx.delete(verifications).where(eq(verifications.value, userId));
      return response;
    });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
}

async function handleChangePassword(request: Request) {
  // Identify the account from its current session so concurrent resets and
  // sign-ins serialize on the same user row. Credential verification runs
  // inside the lock via the transaction-bound auth instance.
  let userId: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    userId = session?.user?.id ?? null;
  } catch {
    userId = null;
  }
  if (!userId) return handlers.POST(request);
  try {
    return await db.transaction(async (tx) => {
      await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");
      const response = await toNextJsHandler(createAuth(tx)).POST(request);
      // Preserve rate-limit counts for rejected current passwords.
      if (response.status >= 500) throw response;
      // An authenticated password change also retires outstanding reset links.
      if (response.ok) await tx.delete(verifications).where(eq(verifications.value, userId));
      return response;
    });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
}

async function handleSignInEmail(request: Request) {
  // Serialize password sign-ins against concurrent resets and password changes
  // on the same account. The password check runs inside the row lock, so a
  // sign-in racing a completed reset fails instead of minting a session on the
  // old password, and a sign-in that wins is revoked by the reset that follows.
  const email = await readSignInEmail(request);
  if (!email) return handlers.POST(request);
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(lower(users.email), email))
    .limit(1);
  if (!existing) return handlers.POST(request);
  try {
    return await db.transaction(async (tx) => {
      await tx.select({ id: users.id }).from(users).where(eq(users.id, existing.id)).for("update");
      const response = await toNextJsHandler(createAuth(tx)).POST(request);
      // Rejected credentials must still commit Better Auth's rate-limit counter.
      // Server errors roll back any incomplete session creation.
      if (response.status >= 500) throw response;
      return response;
    });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
}

async function readSignInEmail(request: Request): Promise<string | null> {
  const cloned = request.clone();
  const contentType = request.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  if (contentType.endsWith("/json") || contentType === "") {
    const body: unknown = await cloned.json().catch(() => null);
    if (typeof body === "object" && body !== null && "email" in body) {
      const email = (body as { email?: unknown }).email;
      if (typeof email === "string" && email.includes("@")) return email.trim().toLowerCase();
    }
    if (contentType.endsWith("/json")) return null;
  }
  try {
    const form = await request.clone().formData();
    const email = form.get("email");
    if (typeof email === "string" && email.includes("@")) return email.trim().toLowerCase();
  } catch {
    return null;
  }
  return null;
}
