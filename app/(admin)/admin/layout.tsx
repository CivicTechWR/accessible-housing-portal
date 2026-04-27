import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { PageMessage } from "@/components/page-shell/AppPageShell";
import { getOptionalSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { session, authzUser } = await getOptionalSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  if (authzUser?.role !== "admin") {
    return (
      <PageMessage title="Admin access required">
        Only admin accounts can access this area.
      </PageMessage>
    );
  }

  return children;
}
