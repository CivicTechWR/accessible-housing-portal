export const DEFAULT_MAX_ATTEMPTS = 7;

/**
 * A processing job whose claim is older than this is assumed to belong to a
 * crashed worker and becomes claimable again. Provider idempotency keys keep a
 * reclaim from double-sending if the original worker did reach Resend — valid
 * within Resend's 24h idempotency window, which the retry schedule stays
 * inside as long as a drain scheduler runs every few minutes.
 */
export const PROCESSING_LEASE_MS = 10 * 60 * 1000;

/**
 * Stop reclaiming well before Resend's 24h idempotency window expires. The
 * margin covers scheduler delay and the replacement provider request itself.
 */
export const MAX_PROCESSING_CLAIM_AGE_MS = 23 * 60 * 60 * 1000;

export function getProcessingClaimCutoffs(now: Date) {
  return {
    leaseExpiredAtOrBefore: new Date(now.getTime() - PROCESSING_LEASE_MS),
    staleAtOrBefore: new Date(now.getTime() - MAX_PROCESSING_CLAIM_AGE_MS),
  };
}

const BASE_RETRY_DELAY_MS = 30 * 1000;
const MAX_RETRY_DELAY_MS = 30 * 60 * 1000;
const RETRY_JITTER_RATIO = 0.2;
const MAX_ERROR_LENGTH = 500;

export function getRetryDelayMs(attempts: number, random: () => number = Math.random) {
  const exponentialMs = BASE_RETRY_DELAY_MS * 2 ** Math.max(attempts - 1, 0);
  const cappedMs = Math.min(exponentialMs, MAX_RETRY_DELAY_MS);
  const jitterFactor = 1 + (random() * 2 - 1) * RETRY_JITTER_RATIO;

  return Math.round(cappedMs * jitterFactor);
}

/**
 * Error text is persisted for operators, so it must never leak one-time URLs
 * (provider errors and URL parsing errors can echo the failing input back).
 */
export function sanitizeEmailJobError(error: unknown) {
  const message =
    error instanceof Error && error.message.length > 0 ? error.message : String(error);

  return message.replaceAll(/token=[^&\s"']+/gi, "token=[redacted]").slice(0, MAX_ERROR_LENGTH);
}
