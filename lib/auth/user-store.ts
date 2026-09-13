import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type UserStatus } from "@/db/schema";

export async function getUserForSession(userId: string) {
  const [user] = await db
    .select({ id: users.id, role: users.role, status: users.status })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ?? null;
}

export function isUserAllowedToSignIn(status: UserStatus) {
  return status === "active";
}
