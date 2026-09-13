"use client";
import { createAuthClient } from "better-auth/react";
import { twoFactorClient, inferAdditionalFields } from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";
import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>(), twoFactorClient(), passkeyClient()],
});
