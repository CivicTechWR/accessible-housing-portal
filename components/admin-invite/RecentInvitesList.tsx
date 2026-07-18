import verbiage from "@/content/verbiage.json";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { InviteRecord } from "@/components/admin-invite/types";
import { inviteRoleLabels, inviteStatusLabels } from "@/components/admin-invite/types";

type RecentInvitesListProps = {
  invites: InviteRecord[];
};

const inviteDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function RecentInvitesList({ invites }: RecentInvitesListProps) {
  const copy = verbiage.adminInvite.recentInvites;

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4 text-card-foreground">
      <header className="space-y-0.5">
        <h2 className="font-heading text-sm font-semibold text-foreground">{copy.heading}</h2>
        <p className="text-xs text-muted-foreground">{copy.description}</p>
      </header>

      {invites.length === 0 ? (
        <EmptyState size="sm">{copy.emptyState}</EmptyState>
      ) : (
        <ul className="space-y-2">
          {invites.map((invite) => (
            <li
              key={invite.id}
              className="flex flex-col gap-2 rounded-md border border-border/70 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="truncate text-sm font-medium text-foreground">{invite.email}</p>
                <p className="text-xs text-muted-foreground">
                  {inviteDateFormatter.format(new Date(invite.invitedAt))}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{inviteRoleLabels[invite.role]}</Badge>
                <Badge variant={invite.status === "failed" ? "destructive" : "secondary"}>
                  {inviteStatusLabels[invite.status]}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
