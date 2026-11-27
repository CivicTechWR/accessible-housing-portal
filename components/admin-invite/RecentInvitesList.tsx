import verbiage from "@/content/verbiage.json";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyInviteLinkButton } from "@/components/admin-invite/CopyInviteLinkButton";
import { InviteEmailStatusSummary } from "@/components/admin-invite/InviteEmailStatusSummary";
import { inviteRoleLabels, type InviteRecord } from "@/components/admin-invite/types";

type RecentInvitesListProps = {
  invites: InviteRecord[];
};

// Recent invites are from the last few days, so the year would only add length.
const inviteDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
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
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium [overflow-wrap:anywhere] text-foreground">
                    {invite.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {inviteRoleLabels[invite.role]},{" "}
                    {inviteDateFormatter.format(new Date(invite.invitedAt))}
                  </p>
                </div>
                {invite.emailStatus && <InviteEmailStatusSummary status={invite.emailStatus} />}
                <CopyInviteLinkButton inviteId={invite.id} email={invite.email} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
