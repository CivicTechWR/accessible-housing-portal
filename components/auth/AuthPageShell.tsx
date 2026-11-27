import Image from "next/image";
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

/** A photo and the product line beside the sign-in card, so signing in looks like the same
 * product. Decorative on top of the card's own heading, so it is hidden from assistive technology. */
function AuthSignPanel() {
  return (
    <div
      aria-hidden="true"
      className="hidden w-[420px] shrink-0 flex-col bg-primary text-primary-foreground lg:flex dark:bg-[#123f86]"
    >
      {/* An AI-generated photo of an accessible kitchen: lowered counter, roll-under sink. */}
      <div className="relative min-h-56 flex-1">
        <Image src="/sign-in-kitchen.webp" alt="" fill sizes="420px" className="object-cover" />
      </div>
      <div className="px-10 pt-8 pb-10">
        <p className="text-[1.75rem] leading-[1.1] font-bold tracking-[-0.02em] text-balance">
          Affordable, accessible rentals in {siteConfig.region}
        </p>
        <p className="mt-3 text-base leading-relaxed text-white/90">
          For housing navigators and the providers who list with them. Invitation only.
        </p>
      </div>
    </div>
  );
}
