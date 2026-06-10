import { timingSafeEqual } from "node:crypto";

import { drainEmailJobs } from "@/lib/email-jobs/email-job-service";

/**
 * Protected drain endpoint for the email job queue. Hit it from a scheduler
 * (Vercel cron, system cron) or the polling worker in scripts/email-worker.mjs.
 * Concurrent calls are safe; workers claim disjoint job sets.
 */
function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  const received = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);

  return received.length === expected.length && timingSafeEqual(received, expected);
}

async function drain(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await drainEmailJobs();

    if (summary.claimed > 0 || summary.backlog.failed > 0) {
      console.info("Email job drain summary", summary);
    }

    return Response.json(summary);
  } catch (error) {
    console.error("Email job drain failed", error);

    return Response.json({ message: "Email job drain failed." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return drain(request);
}

export async function POST(request: Request) {
  return drain(request);
}
