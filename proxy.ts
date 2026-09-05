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
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/listings/:path*",
    "/listing-form/:path*",
    "/my-listings/:path*",
    "/manage-account",
    "/api/admin/:path*",
    "/api/listings/:path*",
  ],
};
