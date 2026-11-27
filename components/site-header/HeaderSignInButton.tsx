"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

/** Hidden on the sign-in page itself, where it would only link to the current page. */
export function HeaderSignInButton() {
  const pathname = usePathname();
  if (pathname === "/sign-in") return null;

  return (
    <Button asChild>
      <Link href="/sign-in">Sign in</Link>
    </Button>
  );
}
