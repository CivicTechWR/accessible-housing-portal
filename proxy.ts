import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { requiresAuthSessionForRequest } from "@/lib/auth/route-policy";

export function proxy(request: NextRequest) {
  // An optimistic redirect only. Data access checks the database session and current role.
  if (
    requiresAuthSessionForRequest({ pathname: request.nextUrl.pathname, method: request.method }) &&
    !getSessionCookie(request)
  ) {
    if (request.nextUrl.pathname.startsWith("/api/"))
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Next.js reads the nonce from the request's CSP header and adds it to its own scripts.
  // Every page is already dynamically rendered, so a per-request nonce costs no static output.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

function contentSecurityPolicy(nonce: string) {
  // React uses eval for debugging information in development only.
  const devEval = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
  // Listing photos may be stored as external URLs and render as plain <img>. Keep these hosts in
  // sync with images.remotePatterns in next.config.ts.
  const listingImageHosts = "https://images.pexels.com https://picsum.photos";
  // MapLibre fetches the style, tiles, sprites, and glyphs from OpenFreeMap.
  const mapTiles = "https://tiles.openfreemap.org";

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${devEval}`,
    // React server-renders style attributes, which a nonce cannot cover.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://civictechwr.org ${listingImageHosts}`,
    "font-src 'self'",
    `connect-src 'self' ${mapTiles}`,
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export const config = {
  // Pages need a fresh CSP nonce, so proxy runs on everything except build assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
