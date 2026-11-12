import { test as base, type BrowserContext, type Route } from "@playwright/test";

// Replaces every request that leaves the app with local stand-ins, so screenshots are the same
// on every run and need no network: listing photos, the footer logo, and the OpenFreeMap map.

const PLACEHOLDER_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#dfe4ea"/>
  <path d="M300 400l90-120 70 90 50-60 90 90z" fill="#b4bcc6"/>
  <circle cx="330" cy="230" r="34" fill="#b4bcc6"/>
</svg>`;

// A MapLibre style with only a background layer. Listing markers are HTML, so they still render.
const BLANK_MAP_STYLE = JSON.stringify({
  version: 8,
  name: "Playwright blank",
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#eef1f4" } }],
});

// Other outside images (such as the Civic Tech WR footer logo) render as nothing rather than a gray box.
const TRANSPARENT_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>`;

// Keep in sync with the listing photo hosts in next.config.ts and proxy.ts.
const LISTING_PHOTO_HOSTS = new Set(["images.pexels.com", "picsum.photos"]);

function isLocal(url: URL) {
  return url.hostname === "localhost" || url.hostname === "127.0.0.1";
}

function fulfillPlaceholderImage(route: Route) {
  return route.fulfill({ contentType: "image/svg+xml", body: PLACEHOLDER_IMAGE });
}

export async function mockExternalRequests(context: BrowserContext) {
  await context.route(
    (url) => !isLocal(url),
    (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.hostname === "tiles.openfreemap.org" && url.pathname.startsWith("/styles/")) {
        return route.fulfill({ contentType: "application/json", body: BLANK_MAP_STYLE });
      }
      if (LISTING_PHOTO_HOSTS.has(url.hostname)) return fulfillPlaceholderImage(route);
      if (request.resourceType() === "image") {
        return route.fulfill({ contentType: "image/svg+xml", body: TRANSPARENT_IMAGE });
      }
      return route.abort("blockedbyclient");
    },
  );

  // next/image fetches remote photos on the server; answer the browser's /_next/image request instead.
  await context.route(
    (url) => url.pathname === "/_next/image" && /^https?:/.test(url.searchParams.get("url") ?? ""),
    fulfillPlaceholderImage,
  );
}

export const test = base.extend({
  context: async ({ context }, use) => {
    await mockExternalRequests(context);
    await use(context);
  },
});

export { expect } from "@playwright/test";
