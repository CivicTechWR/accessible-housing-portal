import Link from "next/link";

import { Button } from "@/components/ui/button";
import { signOutFromHeader } from "@/components/site-header/actions";
import { getOptionalSession } from "@/lib/auth/session";

export async function SessionDock() {
  const optionalSession = await getOptionalSession();
  const session = optionalSession.session;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-end p-4 sm:p-6">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-background/90 p-2 shadow-lg shadow-black/5 backdrop-blur">
        {session?.user ? (
          <>
            {session?.user ? (
              <span className="max-w-56 truncate px-2 text-xs text-muted-foreground sm:px-3">
                {session.user.name ?? session.user.email}
              </span>
            ) : null}
            <form action={signOutFromHeader}>
              <Button type="submit" variant="ghost" size="sm" className="rounded-full px-3">
                Sign out
              </Button>
            </form>
          </>
        ) : (
          <Button asChild type="button" variant="ghost" size="sm" className="rounded-full px-3">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
