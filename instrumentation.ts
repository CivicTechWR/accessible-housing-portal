export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.EMAIL_WORKER_ENABLED === "true") {
    const { startEmailWorker } = await import("@/lib/email-queue/worker.ts");
    await startEmailWorker();
  }
}
