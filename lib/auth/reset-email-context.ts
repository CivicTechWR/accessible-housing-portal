import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

export type ResetEmailContext = {
  userId: string;
  outcome?: "queued" | "throttled";
};

// Administrators need the enqueue outcome; public reset responses remain neutral.
export const resetEmailContext = new AsyncLocalStorage<ResetEmailContext>();
