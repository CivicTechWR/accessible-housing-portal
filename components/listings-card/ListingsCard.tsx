import { AccessibilityBadge } from "@/components/ui/accessibility-mark";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { Image01Icon } from "@hugeicons/core-free-icons";
import {
  RENT_PERIOD,
  formatArea,
  formatBaths,
  formatBeds,
  formatListingDate,
  formatRent,
  toSentenceCase,
} from "@/lib/listing-format";
import Image from "next/image";
import Link from "next/link";
import { Fragment, type ReactNode, type Ref } from "react";

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
  /** How many photos the listing has. The desktop card shows "1/3" on the photo when it has more than one. */
  photoCount?: number;
  /** The move-in date (YYYY-MM-DD), shown as "Available May 15" after the address. */
  availableOn?: string;
  /**
   * Shown after the address when there is no `availableOn`. The listing form preview passes the
   * move-in date here ("2026-05-15", or "Now").
   */
  timeAgo?: string;
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
 * Shortens date-fns' "about 6 hours ago" to "6h ago". The listing form preview passes the move-in
 * date ("2026-05-15", or "Now") instead, because a draft hasn't been posted yet; that shows as
 * "Available May 15, 2026". Any other text is returned unchanged.
 */
export function formatPostedLabel(timeAgo: string) {
  if (/^less than a minute ago$/.test(timeAgo)) return "Just now";
  if (/^\d{4}-\d{2}-\d{2}$/.test(timeAgo)) return `Available ${formatListingDate(timeAgo)}`;
  if (timeAgo === "Now") return "Available now";
  const match =
    /^(?:about |over |almost )?(\d+|an?) (second|minute|hour|day|month|year)s? ago$/.exec(timeAgo);
  if (!match) return timeAgo;
  const [, amount, unit] = match;
  const count = amount === "a" || amount === "an" ? "1" : amount;
  return `${count}${TIME_UNITS[unit as keyof typeof TIME_UNITS]} ago`;
}

/** Today's date as YYYY-MM-DD in the reader's time zone, to compare with ISO move-in dates. */
function todayIso() {
  const now = new Date();
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");
}

/**
 * "Available May 15", or "Available now" once the date is today or past. The year shows only when
 * it is neither this year nor next.
 */
export function formatAvailability(isoDate: string, today = todayIso()) {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return `Available ${isoDate}`;
  if (isoDate <= today) return "Available now";
  const thisYear = Number(today.slice(0, 4));
  return `Available ${new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-CA", {
    month: "long",
    day: "numeric",
    ...(year === thisYear || year === thisYear + 1 ? {} : { year: "numeric" }),
    timeZone: "UTC",
  })}`;
}

/** A thin inner edge over a photo, so a bright photo keeps its shape on a white or dark page. */
export function PhotoEdge() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-black/5 ring-inset dark:ring-white/8"
    />
  );
}

/**
 * The first accessibility feature by name and a count of the rest, such as "Barrier-free entrance
 * +2", on one line. The name truncates; the count never does. Cards with none get the muted pill
 * of the same size, so every card has the same structure.
 */
function AccessibilitySummary({ features, className }: { features: string[]; className?: string }) {
  const [first] = features;
  const rest = features.length - 1;
  return (
    <div className={cn("flex min-w-0", className)}>
      {first ? (
        <AccessibilityBadge>
          <span className="flex min-w-0">
            <span className="truncate">{toSentenceCase(first)}</span>
            {rest > 0 && <span className="shrink-0">&nbsp;+{rest}</span>}
          </span>
        </AccessibilityBadge>
      ) : (
        <AccessibilityBadge empty>No accessibility info</AccessibilityBadge>
      )}
    </div>
  );
}

/**
 * Items joined by " · ". Each separator stays with the item before it, so a wrapped line can end
 * on a dot but never starts with one.
 */
function DotSeparated({ items }: { items: ReactNode[] }) {
  return items.map((item, index) => (
    <Fragment key={index}>
      {index > 0 && " "}
      <span className="whitespace-nowrap">
        {item}
        {index < items.length - 1 && " ·"}
      </span>
    </Fragment>
  ));
}

/**
 * "90 Queen St S, Kitchener · Available May 15". The place's last word, the dot and the
 * availability never break apart, so a wrapped line never starts with the dot.
 */
function PlaceAndPosted({ place, posted }: { place: string; posted: string }) {
  if (!place) return posted;
  if (!posted) return place;
  const lastSpace = place.lastIndexOf(" ");
  return (
    <>
      {place.slice(0, lastSpace + 1)}
      <span className="whitespace-nowrap">
        {place.slice(lastSpace + 1)} · {posted}
      </span>
    </>
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
  photoCount = 0,
  availableOn,
  timeAgo,
  variant = "vertical",
  href,
  onClick,
  buttonRef,
  photoMayNeedSession = false,
}: ListingsCardProps) {
  const isHorizontal = variant === "horizontal";
  const listingHref = href ?? `/listings/${id}`;
  const displayAddress = city ? `${address}, ${city}` : address;
  const ariaLabel = `View listing: ${title ? `${title} at ${displayAddress}` : displayAddress}`;
  const posted = availableOn
    ? formatAvailability(availableOn)
    : timeAgo
      ? formatPostedLabel(timeAgo)
      : "";
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
  // address takes its place and the grey line starts with the city instead.
  const heading = title || address;
  const place = title ? displayAddress : city;

  return (
    <article
      className={cn(
        "group relative w-full",
        isHorizontal
          ? // Shown floating over the map, so it keeps a shadow under its border.
            "flex min-h-28 overflow-hidden rounded-xl border bg-card text-card-foreground shadow-lg dark:border-white/15"
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
        {imageUrl && <PhotoEdge />}
        {!isHorizontal && photoCount > 1 && (
          <span
            aria-hidden
            className="absolute right-2.5 bottom-2.5 rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white max-md:hidden"
          >
            1/{photoCount}
          </span>
        )}
      </div>

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          isHorizontal ? "justify-center gap-0.5 p-3" : "gap-1",
        )}
      >
        {/* The name gets its own lines, so it is never cut short by the rent. */}
        <h3 className="line-clamp-2 text-[17px] leading-snug font-bold tracking-[-0.01em] wrap-anywhere text-foreground">
          {heading}
        </h3>
        <p className="mt-0.5 text-xl leading-snug font-bold whitespace-nowrap text-foreground">
          {formatRent(price)}
          <span className="text-[15px] font-normal text-muted-foreground">{RENT_PERIOD}</span>
        </p>
        <p className="text-[15px] leading-snug text-foreground/80">
          <DotSeparated
            items={[
              formatBeds(beds),
              formatBaths(baths),
              ...(sqft === null ? [] : [formatArea(sqft)]),
            ]}
          />
        </p>
        {(place || posted) && (
          <p className="text-sm leading-snug wrap-anywhere text-muted-foreground md:text-[15px]">
            <PlaceAndPosted place={place} posted={posted} />
          </p>
        )}
        <AccessibilitySummary
          features={accessibilityFeatures ?? []}
          className={isHorizontal ? "mt-2 hidden sm:flex" : "mt-2.5"}
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
