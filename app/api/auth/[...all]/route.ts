import { toNextJsHandler } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth, createAuth } from "@/lib/auth";

const handlers = toNextJsHandler(auth);
export const GET = handlers.GET;

export async function POST(request: Request) {
  const url = new URL(request.url);
  const pathname = decodeURIComponent(url.pathname).replace(/\/+$/, "");
  if (pathname !== "/api/auth/reset-password") return handlers.POST(request);
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

  // Serialize password setup with invitation replacement and account-status changes.
  // Better Auth still validates and consumes the token and writes the credential.
  try {
    return await db.transaction(async (tx) => {
      await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, verification.value))
        .for("update");
      const response = await toNextJsHandler(createAuth(tx)).POST(request);
      if (!response.ok) throw response;
      return response;
    });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }
}
