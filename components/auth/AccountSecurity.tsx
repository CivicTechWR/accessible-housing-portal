"use client";

import { useRef, useState, type FormEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import { Key01Icon } from "@hugeicons/core-free-icons";

/**
 * A card from sm up. On phones, a full-width block with a divider underneath, except the last,
 * where the footer's top border already divides.
 */
const SECTION_CARD =
  "max-sm:gap-4 max-sm:rounded-none max-sm:border-b max-sm:border-border max-sm:bg-transparent max-sm:py-6 max-sm:shadow-none max-sm:ring-0 max-sm:last:border-b-0";

/** Whether a sign-in method is set up, beside its section title. Nothing while it loads. */
function SetupStatus({ isOn }: { isOn: boolean | undefined }) {
  if (isOn === undefined) return null;
  return isOn ? (
    <StatusBadge tone="success">On</StatusBadge>
  ) : (
    <StatusBadge tone="neutral">Not set up</StatusBadge>
  );
}

export function AccountSecurity() {
  const { data: session } = authClient.useSession();
  const { data: passkeys, refetch } = authClient.useListPasskeys();
  const [message, setMessage] = useState("");
  const [passkeyMessage, setPasskeyMessage] = useState("");
  // The name field shows only once the user starts adding a passkey.
  const [isNamingPasskey, setIsNamingPasskey] = useState(false);
  const addPasskeyButtonRef = useRef<HTMLButtonElement>(null);
  // Closing the name form removes the focused control, so focus returns to "Add passkey".
  function closePasskeyForm() {
    setIsNamingPasskey(false);
    requestAnimationFrame(() => addPasskeyButtonRef.current?.focus());
  }
  const [passwordErrors, setPasswordErrors] = useState<{
    password?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [pending, setPending] = useState(false);
  // The authenticator card asks for the password only once setup (or disabling) is started.
  const [twoFactorPasswordOpen, setTwoFactorPasswordOpen] = useState(false);
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
      closePasskeyForm();
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
      setTwoFactorPasswordOpen(false);
    });
  }

  return (
    <div className="space-y-6 max-sm:space-y-0">
      {message && (
        <AlertBanner variant="info" role="status">
          {message}
        </AlertBanner>
      )}
      <Card className={SECTION_CARD}>
        <CardHeader className="max-sm:px-0">
          <CardTitle className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-lg">Passkeys</h2>
            <SetupStatus isOn={passkeys ? passkeys.length > 0 : undefined} />
          </CardTitle>
          <CardDescription>
            Sign in with your device's screen lock, biometrics, or a security key. Passkeys work
            only on the domain where you add them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-sm:px-0">
          {passkeys && passkeys.length > 0 ? (
            <ul className="divide-y rounded-lg border">
              {passkeys.map((key) => (
                <li key={key.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <span className="flex min-w-0 items-center gap-2.5 text-sm font-medium">
                    <HugeiconsIcon
                      icon={Key01Icon}
                      strokeWidth={2}
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="truncate">{key.name || "Passkey"}</span>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
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
          ) : null}
          {passkeys?.length === 0 && (
            <p className="text-sm text-muted-foreground">You haven't added a passkey yet.</p>
          )}
          {isNamingPasskey ? (
            <form className="space-y-4" onSubmit={addPasskey}>
              <div className="space-y-2">
                <Label htmlFor="passkey-name">Passkey name (optional)</Label>
                <Input
                  id="passkey-name"
                  name="name"
                  aria-describedby="passkey-name-hint"
                  autoFocus
                />
                <p id="passkey-name-hint" className="text-sm text-muted-foreground">
                  Name it after the device, such as "Work laptop".
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" disabled={pending}>
                  Add passkey
                </Button>
                <Button type="button" variant="ghost" onClick={closePasskeyForm}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button
              ref={addPasskeyButtonRef}
              type="button"
              variant="outline"
              onClick={() => {
                setPasskeyMessage("");
                setIsNamingPasskey(true);
              }}
            >
              Add passkey
            </Button>
          )}
          {passkeyMessage && (
            <p role="status" className="text-sm">
              {passkeyMessage}
            </p>
          )}
        </CardContent>
      </Card>
      <Card className={SECTION_CARD}>
        <CardHeader className="max-sm:px-0">
          <CardTitle className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-lg">Authenticator app</h2>
            <SetupStatus isOn={session ? Boolean(session.user.twoFactorEnabled) : undefined} />
          </CardTitle>
          <CardDescription>
            {session?.user.twoFactorEnabled
              ? "Password sign-in requires an authenticator or recovery code. Passkey sign-in uses your device's verification."
              : "Use an authenticator app to verify password sign-ins."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 max-sm:px-0">
          {twoFactorPasswordOpen ? (
            <form onSubmit={configureTwoFactor} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="two-factor-password">Current password</Label>
                <Input
                  id="two-factor-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  autoFocus
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={session?.user.twoFactorEnabled ? "destructive" : "default"}
                  disabled={pending}
                >
                  {session?.user.twoFactorEnabled ? "Disable authenticator" : "Continue"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setTwoFactorPasswordOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={pending || !!setup}
              onClick={() => setTwoFactorPasswordOpen(true)}
            >
              {session?.user.twoFactorEnabled ? "Disable authenticator" : "Set up authenticator"}
            </Button>
          )}
          {setup && (
            <div className="space-y-4 border-t pt-6">
              <p className="text-sm">
                Scan this code with your authenticator app, then enter its six-digit code.
              </p>
              <div className="inline-block rounded-xl bg-white p-4 ring-1 ring-foreground/10">
                <QRCodeSVG value={setup.totpURI} size={200} title="Authenticator setup QR code" />
              </div>
              <details>
                <summary className="cursor-pointer text-sm font-medium text-primary-text underline-offset-4 hover:underline">
                  Enter setup key manually
                </summary>
                <code className="mt-2 block rounded-lg bg-muted p-3 font-mono text-sm break-all">
                  {new URL(setup.totpURI).searchParams.get("secret")}
                </code>
              </details>
              <form
                className="flex flex-col items-start gap-3 sm:flex-row"
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
                  className="max-w-48"
                  required
                />
                <Button disabled={pending}>Verify and enable</Button>
              </form>
            </div>
          )}
          {backupCodes.length > 0 && (
            <div className="space-y-3 border-t pt-6">
              <h3 className="text-base">Save your recovery codes</h3>
              <p className="text-sm">
                Each code works once. Store them somewhere private, separate from your
                authenticator.
              </p>
              <pre className="rounded-lg bg-muted p-4 font-mono text-sm">
                {backupCodes.join("\n")}
              </pre>
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
              className="space-y-4 border-t pt-6"
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
              <div className="space-y-2">
                <Label htmlFor="recovery-password">
                  Current password to replace recovery codes
                </Label>
                <Input
                  id="recovery-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  aria-describedby="recovery-password-hint"
                />
                <p id="recovery-password-hint" className="text-sm text-muted-foreground">
                  This invalidates your previous recovery codes.
                </p>
              </div>
              <Button variant="outline" disabled={pending}>
                Replace recovery codes
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      <Card className={SECTION_CARD}>
        <CardHeader className="max-sm:px-0">
          <CardTitle>
            <h2 className="text-lg">Password</h2>
          </CardTitle>
          <CardDescription>Changing your password signs out your other devices.</CardDescription>
        </CardHeader>
        <CardContent className="max-sm:px-0">
          <form onSubmit={changePassword} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                aria-invalid={!!passwordErrors.newPassword}
                aria-describedby={
                  passwordErrors.newPassword ? "new-password-error" : "new-password-hint"
                }
              />
              {passwordErrors.newPassword ? (
                <p id="new-password-error" role="alert" className="text-sm text-destructive">
                  {passwordErrors.newPassword}
                </p>
              ) : (
                <p id="new-password-hint" className="text-sm text-muted-foreground">
                  Use 12 to 128 characters.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                aria-invalid={!!passwordErrors.confirmPassword}
                aria-describedby={
                  passwordErrors.confirmPassword ? "confirm-password-error" : undefined
                }
              />
              {passwordErrors.confirmPassword && (
                <p id="confirm-password-error" role="alert" className="text-sm text-destructive">
                  {passwordErrors.confirmPassword}
                </p>
              )}
            </div>
            <Button disabled={pending}>Change password</Button>
          </form>
        </CardContent>
      </Card>
      <Card className={SECTION_CARD}>
        <CardHeader className="max-sm:px-0">
          <CardTitle>
            <h2 className="text-lg">Signed-in devices</h2>
          </CardTitle>
          <CardDescription>
            See where your account is signed in, and sign out devices you don't recognize.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-sm:px-0">
          {sessions ? (
            <ul className="divide-y rounded-lg border">
              {sessions.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm break-words">
                      {item.userAgent || "Unknown device"}
                      {item.id === session?.session.id ? (
                        <Badge className="ml-2 align-middle">Current session</Badge>
                      ) : null}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Signed in {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {item.id !== session?.session.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 self-start sm:self-auto"
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
          ) : null}
          <div className="flex flex-wrap gap-3">
            {!sessions ? (
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
            ) : null}
            <Button
              variant="destructive"
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
