import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { Image01Icon, WheelchairIcon } from "@hugeicons/core-free-icons";
import { RENT_PERIOD, formatListingDate, formatRent, formatRooms } from "@/lib/listing-format";
import Image from "next/image";
import Link from "next/link";
import type { Ref } from "react";

interface ListingsCardProps {
  id: string;
  title?: string;
  accessibilityFeatures?: string[];
  price: number;
  address: string;
  city: string;
  beds: number;
  baths: number;
  sqft: number | null;
  imageUrl?: string;
  timeAgo: string;
  variant?: "vertical" | "horizontal";
  href?: string;
  onClick?: () => void;
  /** The card's button. Only rendered when `onClick` is set. */
  buttonRef?: Ref<HTMLButtonElement>;
  /**
   * Set when the listing may be a draft. A draft's uploaded photo is readable only with the
   * owner's session cookie, and Next's image optimizer fetches photos without cookies, so the
   * browser loads the photo directly instead.
   */
  photoMayNeedSession?: boolean;
}

const TIME_UNITS: Record<string, string> = {
  second: "s",
  minute: "m",
  hour: "h",
  day: "d",
  month: "mo",
  year: "y",
};

/**
 * Shortens date-fns' "about 6 hours ago" to "Posted 6h ago". The listing form preview passes the
 * move-in date ("2026-05-15", or "Now") instead, because a draft hasn't been posted yet; that shows
 * as "Available May 15, 2026". Any other text is returned unchanged.
 */
export function formatPostedLabel(timeAgo: string) {
  if (/^less than a minute ago$/.test(timeAgo)) return "Posted just now";
  if (/^\d{4}-\d{2}-\d{2}$/.test(timeAgo)) return `Available ${formatListingDate(timeAgo)}`;
  if (timeAgo === "Now") return "Available now";
  const match =
    /^(?:about |over |almost )?(\d+|an?) (second|minute|hour|day|month|year)s? ago$/.exec(timeAgo);
  if (!match) return timeAgo;
  const [, amount, unit] = match;
  const count = amount === "a" || amount === "an" ? "1" : amount;
  return `Posted ${count}${TIME_UNITS[unit as keyof typeof TIME_UNITS]} ago`;
}

/**
 * Always the count, never feature names, so every card's chip reads the same way. Cards with no
 * features keep the slot with a muted note, so cards in a row stay the same height.
 */
function AccessibilitySummary({ count, className }: { count: number; className?: string }) {
  return (
    <div className={cn("flex h-7 min-w-0 items-center", className)}>
      {count > 0 ? (
        <Badge className="h-7 max-w-full gap-1.5 px-2.5 text-xs md:text-sm [&>svg]:size-4!">
          <HugeiconsIcon icon={WheelchairIcon} strokeWidth={2} className="shrink-0" aria-hidden />
          <span className="truncate">
            {count} accessibility {count === 1 ? "feature" : "features"}
          </span>
        </Badge>
      ) : (
        <p className="truncate text-xs text-muted-foreground md:text-sm">
          No accessibility details yet
        </p>
      )}
    </div>
  );
}

export function ListingsCard({
  id,
  title,
  accessibilityFeatures,
  price,
  address,
  city,
  beds,
  baths,
  sqft,
  imageUrl,
  timeAgo,
  variant = "vertical",
  href,
  onClick,
  buttonRef,
  photoMayNeedSession = false,
}: ListingsCardProps) {
  const isHorizontal = variant === "horizontal";
  const featureCount = accessibilityFeatures?.length ?? 0;
  const listingHref = href ?? `/listings/${id}`;
  const displayAddress = city ? `${address}, ${city}` : address;
  const ariaLabel = `View listing: ${title ? `${title} at ${displayAddress}` : displayAddress}`;
  const posted = formatPostedLabel(timeAgo);
  const overlayClassName =
    "absolute inset-0 z-10 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/60";

  const photo = imageUrl ? (
    <Image
      src={imageUrl}
      alt={displayAddress}
      fill
      sizes={isHorizontal ? "128px" : "(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 360px"}
      unoptimized={photoMayNeedSession && imageUrl.startsWith("/api/image-uploads/")}
      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
    />
  ) : (
    <div className="flex size-full flex-col items-center justify-center gap-1.5 text-sm text-muted-foreground">
      <HugeiconsIcon icon={Image01Icon} strokeWidth={2} className="size-5" aria-hidden />
      No photo
    </div>
  );

  // The building name leads, as on the detail page and My listings. Without one, the street
  // address takes its place and the city goes underneath, so every card has two lines here.
  const heading = title || address;
  const subheading = title ? displayAddress : city;

  return (
    <article
      className={cn(
        "group relative w-full",
        isHorizontal
          ? "flex min-h-28 overflow-hidden rounded-xl bg-card text-card-foreground shadow-lg ring-1 ring-foreground/10"
          : "flex flex-col gap-3",
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-muted",
          isHorizontal ? "w-28 sm:w-32" : "aspect-[3/2] w-full rounded-xl",
        )}
      >
        {photo}
      </div>

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          isHorizontal ? "justify-center gap-0.5 p-3" : "gap-0.5",
        )}
      >
        {/* Rent is the strongest text on the card, so it holds the right of the first row and
            the name gives way to it instead of pushing it out. */}
        <div className="flex items-start justify-between gap-3">
          {/* One line in the grid, so every card in a row lines up. */}
          <h3
            className={cn(
              "min-w-0 text-base leading-snug font-semibold tracking-normal wrap-anywhere text-foreground md:text-[17px]",
              isHorizontal ? "line-clamp-2" : "line-clamp-1",
            )}
          >
            {heading}
          </h3>
          <p className="shrink-0 text-lg leading-snug font-semibold tracking-normal whitespace-nowrap text-foreground tabular-nums">
            {formatRent(price)}
            <span className="text-sm font-normal text-muted-foreground">{RENT_PERIOD}</span>
          </p>
        </div>
        {subheading && (
          <p className="truncate text-sm text-muted-foreground md:text-[15px]">{subheading}</p>
        )}
        <p className="text-sm text-foreground md:text-[15px]">{formatRooms(beds, baths, sqft)}</p>
        {/* Its own line, so it never wraps to a line that starts with a separator. */}
        {posted && (
          <p className="truncate text-sm text-muted-foreground md:text-[15px]">{posted}</p>
        )}
        <AccessibilitySummary
          count={featureCount}
          className={isHorizontal ? "mt-1.5 hidden sm:flex" : "mt-2"}
        />
      </div>

      {onClick ? (
        <button
          ref={buttonRef}
          type="button"
          aria-label={ariaLabel}
          className={cn(overlayClassName, "cursor-pointer border-0 bg-transparent p-0")}
          onClick={onClick}
        />
      ) : (
        <Link
          href={listingHref}
          prefetch={false}
          aria-label={ariaLabel}
          className={overlayClassName}
        />
      )}
    </article>
  );
}
