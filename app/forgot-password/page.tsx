import type { Metadata } from "next";

import { ForgotPasswordRequestForm } from "@/components/auth/ForgotPasswordRequestForm";
import { AuthPageShell } from "@/components/auth/AuthPageShell";

export const metadata: Metadata = {
  title: "Forgot Password | WR Housing Bridge",
};

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell>
      <ForgotPasswordRequestForm />
    </AuthPageShell>
  );
}