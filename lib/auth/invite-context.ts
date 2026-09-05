import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

// Only server-side invitation creation supplies this context. Public reset requests cannot set it.
export const invitationEmailContext = new AsyncLocalStorage<{
  userId: string;
  invitedByUserId: string;
  sendEmail: boolean;
  inviteUrl?: string;
  inviteId?: string;
}>();
