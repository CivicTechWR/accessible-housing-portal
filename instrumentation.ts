export async function register() {
  // EMAIL_WORKER_ENABLED gates worker startup explicitly: any Node server
  // context (CI, tests, scripts, previews) would otherwise start pollers.
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.EMAIL_WORKER_ENABLED === "true") {
    const { startEmailWorker } = await import("@/lib/email-queue/worker.ts");
    await startEmailWorker();
  }
}
