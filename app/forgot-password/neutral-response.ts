/**
 * Minimum wall-clock time for any neutral (success-shaped) response from the
 * forgot-password action. Unknown and inactive accounts return after a single
 * cheap query, while real accounts run a locked transaction plus a queue
 * enqueue; padding the fast paths to a common floor keeps response timing
 * from distinguishing existing accounts.
 */
let neutralResponseMinMs = 400;

/** Test hook: shrink or zero the padding so unit tests stay fast. */
export function setNeutralResponseMinMsForTesting(ms: number) {
  neutralResponseMinMs = ms;
}

export function getNeutralResponseMinMs() {
  return neutralResponseMinMs;
}

/** Delay until at least `minMs` have passed since `startedAt`. */
export async function ensureMinimumElapsed(startedAt: number) {
  const remaining = neutralResponseMinMs - (Date.now() - startedAt);

  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}
