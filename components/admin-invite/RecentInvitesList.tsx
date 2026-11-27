import verbiage from "@/content/verbiage.json";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteEmailStatusSummary } from "@/components/admin-invite/InviteEmailStatusSummary";
import { RoleLabel } from "@/components/admin-invite/RoleLabel";
import type { InviteRecord } from "@/components/admin-invite/types";

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
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-lg">{copy.heading}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {invites.length === 0 ? (
          <EmptyState size="sm">{copy.emptyState}</EmptyState>
        ) : (
          <ul className="-my-3 divide-y">
            {invites.map((invite) => (
              <li key={invite.id} className="space-y-2 py-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium [overflow-wrap:anywhere] text-foreground">
                    {invite.email}
                  </p>
                  <RoleLabel role={invite.role} />
                  <p className="text-sm text-muted-foreground">
                    {inviteDateFormatter.format(new Date(invite.invitedAt))}
                  </p>
                </div>
                {invite.emailStatus && <InviteEmailStatusSummary status={invite.emailStatus} />}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
