import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthPageShellProps = {
  children: ReactNode;
  className?: string;
};

export function AuthPageShell({ children, className }: AuthPageShellProps) {
  return (
    <main className={cn("flex justify-center bg-background px-4 py-10 sm:py-20", className)}>
      {children}
    </main>
  );
}
