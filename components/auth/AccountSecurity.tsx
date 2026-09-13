"use client";

import { useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AccountSecurity() {
  const { data: session } = authClient.useSession();
  const { data: passkeys, refetch } = authClient.useListPasskeys();
  const [message, setMessage] = useState("");
  const [passkeyMessage, setPasskeyMessage] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<{
    password?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [pending, setPending] = useState(false);
  const [setup, setSetup] = useState<{ totpURI: string; backupCodes: string[] } | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [sessions, setSessions] = useState<(typeof authClient.$Infer.Session.session)[] | null>(
    null,
  );

  async function run(operation: () => Promise<void>) {
    setPending(true);
    setMessage("");
    try {
      await operation();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to complete this action.");
    } finally {
      setPending(false);
    }
  }
  function check(error: { message?: string } | null) {
    if (error) throw new Error(error.message ?? "Unable to complete this action.");
  }
  const sectionClass = "space-y-4 rounded-2xl border border-border bg-card p-6";

  async function addPasskey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name"));
    setPending(true);
    setMessage("");
    setPasskeyMessage("");
    try {
      const result = await authClient.passkey.addPasskey({ name: name || undefined });
      if (!result?.data) {
        setPasskeyMessage(
          result?.error &&
            "code" in result.error &&
            result.error.code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED"
            ? "This passkey has already been added."
            : "Passkey setup wasn't completed. You can try again.",
        );
        return;
      }
      form.reset();
      setPasskeyMessage("Passkey added.");
      await refetch();
    } catch {
      setPasskeyMessage("Passkey setup wasn't completed. You can try again.");
    } finally {
      setPending(false);
    }
  }

  function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("password"));
    const newPassword = String(data.get("newPassword"));
    const errors: typeof passwordErrors = {};
    setMessage("");
    if (!currentPassword) errors.password = "Enter your current password.";
    if (newPassword.length < 12 || newPassword.length > 128) {
      errors.newPassword = "Use 12 to 128 characters.";
    }
    if (newPassword !== data.get("confirmPassword")) {
      errors.confirmPassword = "Passwords do not match.";
    }
    setPasswordErrors(errors);
    if (Object.keys(errors).length) {
      form.querySelector<HTMLInputElement>(`[name="${Object.keys(errors)[0]}"]`)?.focus();
      return;
    }
    void run(async () => {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error?.code === "INVALID_PASSWORD") {
        setPasswordErrors({ password: "Your current password is incorrect." });
        form.querySelector<HTMLInputElement>('[name="password"]')?.focus();
        return;
      }
      if (["PASSWORD_TOO_SHORT", "PASSWORD_TOO_LONG"].includes(result.error?.code ?? "")) {
        setPasswordErrors({ newPassword: "Use 12 to 128 characters." });
        form.querySelector<HTMLInputElement>('[name="newPassword"]')?.focus();
        return;
      }
      check(result.error);
      form.reset();
      setMessage("Password changed. Other sessions have been signed out.");
    });
  }

  function configureTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const password = String(new FormData(form).get("password"));
    void run(async () => {
      if (session?.user.twoFactorEnabled) {
        const result = await authClient.twoFactor.disable({ password });
        check(result.error);
        setSetup(null);
        setBackupCodes([]);
        setMessage("Authenticator verification disabled.");
      } else {
        const result = await authClient.twoFactor.enable({ password });
        check(result.error);
        if (result.data?.method === "totp") {
          setSetup(result.data);
          setBackupCodes(result.data.backupCodes);
        }
      }
      form.reset();
    });
  }

  return (
    <div className="space-y-6">
      {message && (
        <p role="status" className="rounded-xl border p-4 text-sm">
          {message}
        </p>
      )}
      <section className={sectionClass}>
        <h2 className="text-xl font-semibold">Passkeys</h2>
        <p className="text-sm text-muted-foreground">
          Sign in with your device's screen lock, biometrics, or a security key. Passkeys work only
          on the domain where you add them.
        </p>
        <form className="flex flex-wrap gap-3" onSubmit={addPasskey}>
          <Input
            name="name"
            aria-label="Passkey name"
            placeholder="Passkey name, e.g. laptop"
            className="sm:max-w-xs"
          />
          <Button disabled={pending}>Add passkey</Button>
        </form>
        {passkeyMessage && (
          <p role="status" className="text-sm">
            {passkeyMessage}
          </p>
        )}
        <ul className="space-y-3">
          {passkeys?.map((key) => (
            <li key={key.id} className="flex items-center justify-between gap-4">
              <span>{key.name || "Passkey"}</span>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() =>
                  void run(async () => {
                    const result = await authClient.passkey.deletePasskey({ id: key.id });
                    check(result.error);
                    await refetch();
                    setMessage("Passkey removed.");
                  })
                }
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
        {passkeys?.length === 0 && (
          <p className="text-sm text-muted-foreground">No passkeys added yet.</p>
        )}
      </section>
      <section className={sectionClass}>
        <h2 className="text-xl font-semibold">Authenticator app</h2>
        <p className="text-sm text-muted-foreground">
          {session?.user.twoFactorEnabled
            ? "Enabled. Password sign-in requires an authenticator or recovery code. Passkey sign-in uses your device's verification."
            : "Use an authenticator app to verify password sign-ins."}
        </p>
        <form onSubmit={configureTwoFactor} className="space-y-3">
          <label htmlFor="two-factor-password">Current password</label>
          <Input
            id="two-factor-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          <Button disabled={pending || !!setup}>
            {session?.user.twoFactorEnabled ? "Disable authenticator" : "Set up authenticator"}
          </Button>
        </form>
        {setup && (
          <div className="space-y-4">
            <p>Scan this code with your authenticator app, then enter its six-digit code.</p>
            <div className="inline-block rounded-xl bg-white p-4">
              <QRCodeSVG value={setup.totpURI} size={200} title="Authenticator setup QR code" />
            </div>
            <details>
              <summary className="cursor-pointer text-sm underline">
                Enter setup key manually
              </summary>
              <code className="break-all text-sm">
                {new URL(setup.totpURI).searchParams.get("secret")}
              </code>
            </details>
            <form
              className="flex gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const code = String(new FormData(event.currentTarget).get("code"));
                void run(async () => {
                  const result = await authClient.twoFactor.verifyTotp({ code });
                  check(result.error);
                  setSetup(null);
                  setMessage("Authenticator verification enabled. Save your recovery codes.");
                });
              }}
            >
              <Input
                name="code"
                aria-label="Authenticator code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                required
              />
              <Button disabled={pending}>Verify and enable</Button>
            </form>
          </div>
        )}
        {backupCodes.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Save your recovery codes</h3>
            <p className="text-sm">
              Each code works once. Store them somewhere private, separate from your authenticator.
            </p>
            <pre className="rounded-xl bg-muted p-4 text-sm">{backupCodes.join("\n")}</pre>
            <Button
              variant="outline"
              onClick={() => {
                setBackupCodes([]);
              }}
            >
              I've saved these codes
            </Button>
          </div>
        )}
        {session?.user.twoFactorEnabled && (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const password = String(new FormData(form).get("password"));
              void run(async () => {
                const result = await authClient.twoFactor.generateBackupCodes({ password });
                check(result.error);
                if (result.data) setBackupCodes(result.data.backupCodes);
                form.reset();
              });
            }}
          >
            <label htmlFor="recovery-password">Current password to replace recovery codes</label>
            <Input
              id="recovery-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            <Button variant="outline" disabled={pending}>
              Replace recovery codes
            </Button>
            <p className="text-xs text-muted-foreground">
              This invalidates your previous recovery codes.
            </p>
          </form>
        )}
      </section>
      <section className={sectionClass}>
        <h2 className="text-xl font-semibold">Password</h2>
        <form onSubmit={changePassword} className="space-y-3" noValidate>
          <label htmlFor="current-password">Current password</label>
          <Input
            id="current-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={!!passwordErrors.password}
            aria-describedby={passwordErrors.password ? "current-password-error" : undefined}
          />
          {passwordErrors.password && (
            <p id="current-password-error" role="alert" className="text-sm text-destructive">
              {passwordErrors.password}
            </p>
          )}
          <label htmlFor="new-password">New password, 12 to 128 characters</label>
          <Input
            id="new-password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            aria-invalid={!!passwordErrors.newPassword}
            aria-describedby={passwordErrors.newPassword ? "new-password-error" : undefined}
          />
          {passwordErrors.newPassword && (
            <p id="new-password-error" role="alert" className="text-sm text-destructive">
              {passwordErrors.newPassword}
            </p>
          )}
          <label htmlFor="confirm-password">Confirm new password</label>
          <Input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            aria-invalid={!!passwordErrors.confirmPassword}
            aria-describedby={passwordErrors.confirmPassword ? "confirm-password-error" : undefined}
          />
          {passwordErrors.confirmPassword && (
            <p id="confirm-password-error" role="alert" className="text-sm text-destructive">
              {passwordErrors.confirmPassword}
            </p>
          )}
          <Button disabled={pending}>Change password</Button>
        </form>
      </section>
      <section className={sectionClass}>
        <h2 className="text-xl font-semibold">Signed-in devices</h2>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            void run(async () => {
              const result = await authClient.listSessions();
              check(result.error);
              setSessions(result.data);
            })
          }
        >
          Show sessions
        </Button>
        <ul className="space-y-4">
          {sessions?.map((item) => (
            <li key={item.id} className="space-y-2 border-t pt-3">
              <p className="break-words text-sm">
                {item.userAgent || "Unknown device"}
                {item.id === session?.session.id ? " • Current session" : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Created {new Date(item.createdAt).toLocaleString()}
              </p>
              {item.id !== session?.session.id && (
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    void run(async () => {
                      const result = await authClient.revokeSession({ token: item.token });
                      check(result.error);
                      setSessions(sessions.filter((other) => other.id !== item.id));
                    })
                  }
                >
                  Sign out device
                </Button>
              )}
            </li>
          ))}
        </ul>
        <Button
          disabled={pending}
          onClick={() =>
            void run(async () => {
              const result = await authClient.revokeOtherSessions();
              check(result.error);
              setSessions(null);
              setMessage("Other sessions have been signed out.");
            })
          }
        >
          Sign out all other devices
        </Button>
      </section>
    </div>
  );
}
