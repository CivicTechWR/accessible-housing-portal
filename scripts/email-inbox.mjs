import { createServer } from "node:http";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const directory = process.env.EMAIL_CAPTURE_DIR;
const port = Number(process.env.EMAIL_INBOX_PORT ?? 3108);
if (
  process.env.NODE_ENV === "production" ||
  process.env.EMAIL_TRANSPORT !== "capture" ||
  !directory
) {
  throw new Error("The inbox requires local email capture and EMAIL_CAPTURE_DIR.");
}
const escapeHtml = (text) =>
  String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const server = createServer(async (request, response) => {
  if (![`localhost:${port}`, `127.0.0.1:${port}`].includes(request.headers.host)) {
    response.writeHead(403).end();
    return;
  }
  response.setHeader("Cache-Control", "no-store");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
  );
  response.setHeader("Referrer-Policy", "no-referrer");
  try {
    const files = await readdir(directory).catch(() => []);
    const emails = await Promise.all(
      files
        .filter((file) => /^capture-[0-9a-f-]+\.json$/.test(file))
        .map(async (file) => JSON.parse(await readFile(join(directory, file), "utf8"))),
    );
    const content = emails
      .reverse()
      .map((email) => {
        const body = escapeHtml(email.text).replace(
          /https?:\/\/[^\s<>]+/g,
          (url) => `<a href="${url}">${url}</a>`,
        );
        return `<article><h2>${escapeHtml(email.subject)}</h2><p>To: ${escapeHtml(email.to)}</p><pre>${body}</pre></article>`;
      })
      .join("");
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>HomeHub email inbox</title><style>body{font:16px system-ui;margin:3rem auto;padding:0 1rem;max-width:900px;background:#f5f5f1;color:#202821}article{background:white;padding:1.5rem;margin:1.5rem 0;border:1px solid #d6dcd5;border-radius:14px}h2{font-size:1.1rem}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}a{color:#285b42}</style></head><body><h1>HomeHub email inbox</h1><p>Emails captured locally. Refresh to see new messages.</p><p><a href="/">Refresh inbox</a> · <a href="http://localhost:3107">Open HomeHub</a></p>${content || "<p>No captured emails yet.</p>"}</body></html>`,
    );
  } catch {
    response.writeHead(500).end("Unable to read captured emails.");
  }
});
server.listen(port, "127.0.0.1", () => console.log(`Email inbox: http://localhost:${port}`));
