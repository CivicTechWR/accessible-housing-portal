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
        "flex items-start justify-center bg-background px-4 pt-8 pb-16 sm:pt-24 sm:pb-24",
        className,
      )}
    >
      <div data-compact-footer hidden />
      {children}
    </main>
  );
}
