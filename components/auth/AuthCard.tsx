import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthCardProps = {
  /** Shown above the title, for states such as an expired link. */
  icon?: IconSvgElement;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/** The card every sign-in, reset and invite screen uses. */
export function AuthCard({ icon, title, description, children, footer, className }: AuthCardProps) {
  return (
    <div
      className={cn(
        "flex h-fit w-full max-w-[400px] flex-col gap-6 text-card-foreground sm:rounded-xl sm:border sm:bg-card sm:p-8 sm:shadow-sm dark:sm:border-white/20",
        className,
      )}
    >
      <div className="space-y-2">
        {icon ? (
          <span className="mb-4 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary-text dark:bg-primary-text/15">
            <HugeiconsIcon icon={icon} strokeWidth={2} size={22} aria-hidden="true" />
          </span>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-base text-muted-foreground">{description}</p> : null}
      </div>
      {children ? <div className="space-y-5">{children}</div> : null}
      {footer ? <div className="space-y-3">{footer}</div> : null}
    </div>
  );
}

/** A label and input stacked with consistent spacing inside an AuthCard. */
export function AuthField({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-2 [&>label]:block [&>label]:text-sm [&>label]:font-medium">
      {children}
    </div>
  );
}
