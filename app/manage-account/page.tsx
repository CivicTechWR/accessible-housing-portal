import { redirect } from "next/navigation";
import { getOptionalSession } from "@/lib/auth/session";
import { AccountSecurity } from "@/components/auth/AccountSecurity";
export default async function ManageAccountPage() {
  const { session } = await getOptionalSession();
  if (!session) redirect("/sign-in?callbackUrl=/manage-account");
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <h1 className="text-3xl font-semibold">Manage account</h1>
      <p className="text-muted-foreground">{session.user.email}</p>
      <AccountSecurity />
    </main>
  );
}
