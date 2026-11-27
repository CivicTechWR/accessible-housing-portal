import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { Image01Icon, WheelchairIcon } from "@hugeicons/core-free-icons";
import {
  RENT_PERIOD,
  formatArea,
  formatBaths,
  formatBeds,
  formatListingDate,
  formatRent,
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
 * Always the count, never feature names, so every card's pill reads the same way. Cards with no
 * features get a muted pill of the same size, so every card has the same structure.
 */
function AccessibilitySummary({ count, className }: { count: number; className?: string }) {
  return (
    <div className={cn("flex min-w-0", className)}>
      <Badge
        variant={count > 0 ? "default" : "secondary"}
        className={cn(
          "h-7 max-w-full gap-1.5 px-2.5 text-xs md:text-sm [&>svg]:size-4!",
          count === 0 && "bg-muted text-muted-foreground",
        )}
      >
        <HugeiconsIcon icon={WheelchairIcon} strokeWidth={2} className="shrink-0" aria-hidden />
        <span className="truncate">
          {count === 0
            ? "No accessibility info"
            : `${count} accessibility ${count === 1 ? "feature" : "features"}`}
        </span>
      </Badge>
    </div>
  );
}

/**
 * Items joined by " · ". Each separator stays with the item after it, so a wrapped line never
 * starts or ends on a lone dot.
 */
function DotSeparated({ items }: { items: ReactNode[] }) {
  return items.map((item, index) => (
    <Fragment key={index}>
      {index > 0 && " "}
      <span className="whitespace-nowrap">
        {index > 0 && "· "}
        {item}
      </span>
    </Fragment>
  ));
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
  // address takes its place and the grey line starts with the city instead.
  const heading = title || address;
  const place = title ? displayAddress : city;
  const metaItems = [place, posted].filter(Boolean);

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
          isHorizontal ? "justify-center gap-0.5 p-3" : "gap-1",
        )}
      >
        {/* The name gets its own lines, so it is never cut short by the rent. */}
        <h3 className="line-clamp-2 text-base leading-snug font-semibold tracking-normal wrap-anywhere text-foreground md:text-[17px]">
          {heading}
        </h3>
        <p className="mt-0.5 text-[15px] leading-snug text-foreground">
          <DotSeparated
            items={[
              <>
                <span className="text-lg font-bold tabular-nums">{formatRent(price)}</span>
                {RENT_PERIOD}
              </>,
              formatBeds(beds),
              formatBaths(baths),
              ...(sqft === null ? [] : [formatArea(sqft)]),
            ]}
          />
        </p>
        {metaItems.length > 0 && (
          <p className="text-sm leading-snug text-muted-foreground md:text-[15px]">
            <DotSeparated items={metaItems} />
          </p>
        )}
        <AccessibilitySummary
          count={featureCount}
          className={isHorizontal ? "mt-2 hidden sm:flex" : "mt-3"}
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
