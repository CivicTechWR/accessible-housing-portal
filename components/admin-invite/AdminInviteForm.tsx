import { useActionState, useEffect, useState } from "react";

import { sendAdminInviteAction, type SendAdminInviteActionState } from "@/app/admin/invite/actions";
import verbiage from "@/content/verbiage.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  defaultInviteRole,
  inviteRoleOptions,
  type InviteRole,
  type InviteActionResult,
} from "@/components/admin-invite/types";

const initialState: SendAdminInviteActionState = {
  status: "idle",
  message: "",
};

type AdminInviteFormProps = {
  onResult: (result: InviteActionResult) => void;
};

export function AdminInviteForm({ onResult }: AdminInviteFormProps) {
  const copy = verbiage.adminInvite.fields;
  const [state, action, pending] = useActionState(sendAdminInviteAction, initialState);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>(defaultInviteRole);
  const [organization, setOrganization] = useState("");

  useEffect(() => {
    if (state.status === "idle") {
      return;
    }

    onResult(state);

    // "queued" also created the invite; only true errors keep the form filled.
    if (state.status === "sent" || state.status === "queued") {
      setName("");
      setEmail("");
      setOrganization("");
    }
  }, [onResult, state]);

  return (
    <form className="space-y-4" action={action}>
      <div className="space-y-1.5">
        <Label htmlFor="invite-name">{copy.nameLabel}</Label>
        <Input
          id="invite-name"
          name="name"
          autoComplete="name"
          required
          placeholder={copy.namePlaceholder}
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={pending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="invite-email">{copy.emailLabel}</Label>
        <Input
          id="invite-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={copy.emailPlaceholder}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={pending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="invite-organization">{copy.organizationLabel}</Label>
        <Input
          id="invite-organization"
          name="organization"
          autoComplete="organization"
          placeholder={copy.organizationPlaceholder}
          value={organization}
          onChange={(event) => setOrganization(event.target.value)}
          disabled={pending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="invite-role">{copy.roleLabel}</Label>
        <input type="hidden" name="role" value={role} />
        <Select
          value={role}
          onValueChange={(nextRole) => setRole(nextRole as InviteRole)}
          disabled={pending}
        >
          <SelectTrigger id="invite-role" className="w-full justify-between">
            <SelectValue placeholder={copy.rolePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {inviteRoleOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? verbiage.adminInvite.actions.sending : verbiage.adminInvite.actions.send}
        </Button>
      </div>
    </form>
  );
}
