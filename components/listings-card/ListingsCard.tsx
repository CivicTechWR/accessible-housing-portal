import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { Image01Icon, UniversalAccessIcon } from "@hugeicons/core-free-icons";
import { featureIcon } from "@/components/listing-details/featureIcon";
import {
  RENT_PERIOD,
  formatListingDate,
  formatRent,
  formatRooms,
  toSentenceCase,
} from "@/lib/listing-format";
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

/**
 * Named chips while every feature fits on one row of the narrowest card (about 260px); past that,
 * one chip with the count, so no feature hides behind a "+N more".
 */
const MAX_NAMED_CHIPS = 2;
const MAX_CHARS_FOR_TWO_CHIPS = 22;

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

function FeatureChips({ features, className }: { features: string[]; className?: string }) {
  const showNames =
    features.length === 1 ||
    (features.length <= MAX_NAMED_CHIPS && features.join("").length <= MAX_CHARS_FOR_TWO_CHIPS);
  const chipClassName = "h-7 max-w-full gap-1.5 px-2.5 text-[13px] [&>svg]:size-4!";

  return (
    // A fixed-height row, kept even when empty, so cards in one grid row line up.
    <ul
      role="list"
      aria-label={showNames ? "Accessibility features" : undefined}
      className={cn("flex h-7 min-w-0 items-center gap-1.5 overflow-hidden", className)}
    >
      {showNames ? (
        features.map((feature, index) => (
          <li key={`${feature}-${index}`} className="flex min-w-0">
            <Badge className={chipClassName}>
              <HugeiconsIcon
                icon={featureIcon(feature)}
                strokeWidth={2}
                className="shrink-0"
                aria-hidden
              />
              <span className="truncate">{toSentenceCase(feature)}</span>
            </Badge>
          </li>
        ))
      ) : features.length > 0 ? (
        <li className="flex min-w-0">
          <Badge className={chipClassName}>
            <HugeiconsIcon
              icon={UniversalAccessIcon}
              strokeWidth={2}
              className="shrink-0"
              aria-hidden
            />
            <span className="truncate">{features.length} accessibility features</span>
          </Badge>
        </li>
      ) : null}
    </ul>
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
  const features = accessibilityFeatures ?? [];
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
            the name wraps to a second line instead of pushing it out. */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 min-w-0 text-base leading-snug font-semibold tracking-normal wrap-anywhere text-foreground">
            {heading}
          </h3>
          <p className="shrink-0 text-lg leading-snug font-semibold tracking-normal whitespace-nowrap text-foreground tabular-nums">
            {formatRent(price)}
            <span className="text-sm font-normal text-muted-foreground">{RENT_PERIOD}</span>
          </p>
        </div>
        {subheading && <p className="truncate text-sm text-muted-foreground">{subheading}</p>}
        <p className="text-sm text-foreground">
          {formatRooms(beds, baths, sqft)}
          {posted && <span className="text-muted-foreground"> · {posted}</span>}
        </p>
        <FeatureChips
          features={features}
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
