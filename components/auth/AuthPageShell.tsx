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
        // On wide screens the panel and the card join into one box of equal height; the card
        // drops its own border there. Below lg only the card shows.
        <div
          data-auth-panel
          className="group/auth flex w-full justify-center lg:max-w-[880px] lg:overflow-hidden lg:rounded-xl lg:border lg:bg-card dark:lg:border-white/20 lg:[&>:last-child]:max-w-none lg:[&>:last-child]:flex-1"
        >
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
      className="hidden w-[420px] shrink-0 flex-col justify-between bg-primary text-primary-foreground lg:flex dark:bg-[#17478f]"
    >
      <div className="px-10 pt-10 pb-12">
        <p className="text-[2rem] leading-[1.1] font-bold tracking-[-0.02em] text-balance">
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
