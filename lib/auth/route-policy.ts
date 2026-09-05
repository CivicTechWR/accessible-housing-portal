type RouteRequest = {
  pathname: string;
  method: string;
};

type RoutePattern = `/${string}`;

const PROTECTED_PAGE_PATTERNS = [
  "/admin/:path*",
  "/listings/:path*",
  "/listing-form/:path*",
  "/my-listings/:path*",
  "/manage-account/:path*",
] as const;

const PROTECTED_API_PATTERNS = ["/api/admin/:path*", "/api/listings/:path*"] as const;

export function requiresAuthSessionForRequest(request: RouteRequest) {
  return (
    matchesAnyRoutePattern(request.pathname, PROTECTED_PAGE_PATTERNS) ||
    matchesAnyRoutePattern(request.pathname, PROTECTED_API_PATTERNS)
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
