import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthPageShellProps = {
  children: ReactNode;
  className?: string;
};

export function AuthPageShell({ children, className }: AuthPageShellProps) {
  return (
    <main
      className={cn(
        "flex min-h-[calc(100dvh-4rem)] justify-center bg-muted/40 px-4 py-10 sm:items-center sm:py-16",
        className,
      )}
    >
      {children}
    </main>
  );
}
