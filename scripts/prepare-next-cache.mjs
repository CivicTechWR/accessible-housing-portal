import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const nextDir = path.join(projectRoot, ".next");
const cacheRoot = path.join(os.tmpdir(), "WRHousingBridge-next-cache");
const cacheDir = path.join(cacheRoot, ".next");
const command = process.argv[2];
const args = process.argv.slice(3);

async function ensureLocalNextDir() {
  await fs.mkdir(cacheDir, { recursive: true });

  const existing = await fs.lstat(nextDir).catch(() => null);
  if (existing?.isSymbolicLink()) {
    const currentTarget = await fs.realpath(nextDir).catch(() => null);
    if (currentTarget === cacheDir) {
      return;
    }
  }

  if (existing) {
    await fs.rm(nextDir, { recursive: true, force: true });
  }

  await fs.symlink(cacheDir, nextDir, "junction");
}

async function main() {
  await ensureLocalNextDir();

  if (!command) {
    return;
  }

  const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
  const nodePathEntries = [path.join(projectRoot, "node_modules"), process.env.NODE_PATH].filter(Boolean);
  const childEnv = {
    ...process.env,
    NODE_PATH: nodePathEntries.join(path.delimiter),
  };

  const child = spawn(process.execPath, [nextBin, command, ...args], {
    stdio: "inherit",
    cwd: projectRoot,
    env: childEnv,
  });

  child.on("exit", (exitCode, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(exitCode ?? 0);
  });
}

await main();