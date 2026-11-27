"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

// Auth pages carry their own way back to sign-in, so the header button would only repeat it.
const AUTH_PATHS = new Set(["/sign-in", "/forgot-password", "/reset-password", "/invite"]);

/** An outline button, so it never competes with a page's own primary action. */
export function HeaderSignInButton() {
  const pathname = usePathname();
  if (AUTH_PATHS.has(pathname)) return null;

  return (
    <Button asChild variant="outline">
      <Link href="/sign-in">Sign in</Link>
    </Button>
  );
}
