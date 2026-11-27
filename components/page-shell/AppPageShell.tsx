import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AppPageShellProps = {
  children: ReactNode;
  className?: string;
};

export function AppPageShell({ children, className }: AppPageShellProps) {
  return (
    <main
      className={cn("min-h-[calc(100vh-7rem)] bg-background px-4 py-8 sm:px-6 sm:py-10", className)}
    >
      <div data-compact-footer-mobile hidden />
      {children}
    </main>
  );
}

/** The three content widths: forms and messages, content pages, and wide tables. */
export const pageWidths = {
  form: "max-w-2xl",
  content: "max-w-5xl",
  wide: "max-w-7xl",
} as const;

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Buttons or links shown beside the title on wide screens and below it on phones. */
  actions?: ReactNode;
  className?: string;
};

/** The title block every page starts with: one h1, an optional description, and actions. */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6",
        className,
      )}
    >
      <div className="min-w-0 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-base text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

type PageMessageProps = {
  title: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  titleClassName?: string;
  tone?: "default" | "error";
  width?: "3xl" | "5xl";
};

export function PageMessage({
  title,
  children,
  className,
  contentClassName,
  titleClassName,
  tone = "default",
  width = "3xl",
}: PageMessageProps) {
  return (
    <AppPageShell className={className}>
      <div
        className={cn(
          "mx-auto rounded-xl border bg-card p-6 shadow-xs sm:p-8",
          width === "3xl" ? "max-w-3xl" : "max-w-5xl",
          contentClassName,
        )}
      >
        <h1 className={cn("text-2xl font-semibold tracking-tight", titleClassName)}>{title}</h1>
        <p
          className={cn(
            "mt-2 text-base",
            tone === "error" ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {children}
        </p>
      </div>
    </AppPageShell>
  );
}
