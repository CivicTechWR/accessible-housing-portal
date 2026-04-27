type RouteRequest = {
  pathname: string;
  method: string;
};

type RoutePattern = `/${string}`;

const PROTECTED_PAGE_PATTERNS = [
  "/admin/:path*",
  "/listing-form/:path*",
  "/my-listings/:path*",
] as const;

const PROTECTED_API_PATTERNS = ["/api/admin/:path*"] as const;

const LISTING_WRITE_API_PATTERNS = ["/api/listings/:path*"] as const;

function isListingWriteApiPath({ pathname, method }: RouteRequest) {
  return method !== "GET" && matchesAnyRoutePattern(pathname, LISTING_WRITE_API_PATTERNS);
}

function isProtectedPagePath(pathname: string) {
  return matchesAnyRoutePattern(pathname, PROTECTED_PAGE_PATTERNS);
}

export function requiresAuthSessionForRequest(request: RouteRequest) {
  return (
    isProtectedPagePath(request.pathname) ||
    matchesAnyRoutePattern(request.pathname, PROTECTED_API_PATTERNS) ||
    isListingWriteApiPath(request)
  );
}

function matchesAnyRoutePattern(pathname: string, patterns: readonly RoutePattern[]) {
  return patterns.some((pattern) => matchesRoutePattern(pathname, pattern));
}

function matchesRoutePattern(pathname: string, pattern: RoutePattern) {
  if (!pattern.endsWith("/:path*")) {
    return pathname === pattern;
  }

  const prefix = pattern.slice(0, -"/:path*".length);

  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}
