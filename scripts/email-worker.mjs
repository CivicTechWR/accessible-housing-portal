/**
 * Long-running email queue worker. Polls the protected drain endpoint so all
 * queue logic runs inside the Next.js runtime (lib/* uses the "@/" alias and
 * server-only, which plain Node cannot import directly).
 *
 * Usage: npm run email:worker (requires the app and CRON_SECRET).
 * Multiple workers are safe; job claiming uses FOR UPDATE SKIP LOCKED.
 */

const appUrl = process.env.EMAIL_WORKER_APP_URL ?? "http://localhost:3000";
const cronSecret = process.env.CRON_SECRET;
const pollIntervalMs = Number(process.env.EMAIL_WORKER_POLL_INTERVAL_MS ?? 15_000);

if (!cronSecret) {
  console.error("CRON_SECRET is not set. The worker cannot authenticate against the app.");
  process.exit(1);
}

if (!Number.isFinite(pollIntervalMs) || pollIntervalMs < 1_000) {
  console.error("EMAIL_WORKER_POLL_INTERVAL_MS must be a number >= 1000.");
  process.exit(1);
}

const drainUrl = new URL("/api/cron/email-jobs", appUrl).toString();

let stopped = false;
let wakeUp;

function requestStop(signal) {
  console.info(`Received ${signal}, finishing current drain before exiting.`);
  stopped = true;
  wakeUp?.();
}

process.on("SIGINT", () => requestStop("SIGINT"));
process.on("SIGTERM", () => requestStop("SIGTERM"));

async function drainOnce() {
  const response = await fetch(drainUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${cronSecret}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Drain endpoint responded with ${response.status}.`);
  }

  return response.json();
}

function sleep(ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    wakeUp = () => {
      clearTimeout(timer);
      resolve();
    };
  });
}

console.info(`Email worker polling ${drainUrl} every ${pollIntervalMs}ms.`);

while (!stopped) {
  try {
    const summary = await drainOnce();

    if (summary.claimed > 0 || summary.backlog.failed > 0) {
      console.info(`[${new Date().toISOString()}] drained:`, JSON.stringify(summary));
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] drain failed:`, error.message ?? error);
  }

  if (!stopped) {
    await sleep(pollIntervalMs);
  }
}

console.info("Email worker stopped.");
