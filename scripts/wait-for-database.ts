import postgres from "postgres";

// Railway preview databases sleep when idle and refuse connections for a few
// seconds while they wake, so retry before the migration's single attempt.
const timeoutSeconds = 60;
const retryDelayMs = 1_000;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set.");

  const deadline = Date.now() + timeoutSeconds * 1_000;
  let lastError = "unknown error";
  while (Date.now() < deadline) {
    const sql = postgres(databaseUrl, { max: 1, connect_timeout: 5, onnotice: () => {} });
    try {
      await sql`select 1`;
      console.log("Database is accepting connections.");
      return;
    } catch (error) {
      // Report only the error code. Messages can include the host and user.
      lastError =
        error instanceof Error && "code" in error ? String(error.code) : "connection failed";
    } finally {
      await sql.end({ timeout: 0 });
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }
  throw new Error(
    `Database did not accept connections within ${timeoutSeconds} seconds (last error: ${lastError}).`,
  );
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Failed to wait for the database.");
  process.exitCode = 1;
});
