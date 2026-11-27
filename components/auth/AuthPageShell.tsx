import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";

type AuthPageShellProps = {
  children: ReactNode;
  /** The blue sign panel beside the card on wide screens. Off for wide content such as the
   * community agreement. */
  withPanel?: boolean;
  className?: string;
};

export function AuthPageShell({ children, withPanel = true, className }: AuthPageShellProps) {
  return (
    <main
      className={cn(
        "flex items-start justify-center bg-background px-4 pt-8 pb-16 sm:pt-20 sm:pb-24",
        className,
      )}
    >
      <div data-compact-footer hidden />
      {withPanel ? (
        <div className="flex w-full max-w-5xl items-start justify-center gap-16 lg:justify-between">
          <AuthSignPanel />
          {children}
        </div>
      ) : (
        children
      )}
    </main>
  );
}

/** The home page's sign panel, smaller, so signing in looks like the same product. Decorative
 * on top of the card's own heading, so it is hidden from assistive technology. */
function AuthSignPanel() {
  return (
    <div
      aria-hidden="true"
      className="hidden max-w-md flex-1 overflow-hidden rounded-xl bg-primary text-primary-foreground lg:block dark:bg-[#17478f]"
    >
      <div className="px-10 pt-10 pb-12">
        <p className="text-[2.5rem] leading-[1.05] font-extrabold tracking-[-0.03em]">
          Affordable, accessible rentals in {siteConfig.region}
        </p>
        <p className="mt-5 text-lg leading-relaxed text-white/90">
          For housing navigators and the providers who list with them. Invitation only.
        </p>
      </div>
      <div className="tactile-strip h-4" />
    </div>
  );
}
