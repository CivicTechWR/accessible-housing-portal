import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Bathtub01Icon,
  BedDoubleIcon,
  Image01Icon,
  SquareArrowExpand01Icon,
} from "@hugeicons/core-free-icons";
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

const MAX_FEATURES = 3;

const TIME_UNITS: Record<string, string> = {
  second: "s",
  minute: "m",
  hour: "h",
  day: "d",
  month: "mo",
  year: "y",
};

/**
 * Shortens date-fns' "about 6 hours ago" to "Posted 6h ago". Text it doesn't recognise, such as
 * the listing form preview's availability date, is returned unchanged.
 */
export function formatPostedLabel(timeAgo: string) {
  if (/^less than a minute ago$/.test(timeAgo)) return "Posted just now";
  const match =
    /^(?:about |over |almost )?(\d+|an?) (second|minute|hour|day|month|year)s? ago$/.exec(timeAgo);
  if (!match) return timeAgo;
  const [, amount, unit] = match;
  const count = amount === "a" || amount === "an" ? "1" : amount;
  return `Posted ${count}${TIME_UNITS[unit as keyof typeof TIME_UNITS]} ago`;
}

function plural(count: number, singular: string) {
  return `${count.toLocaleString()} ${singular}${count === 1 ? "" : "s"}`;
}

function ListingStats({
  beds,
  baths,
  sqft,
  className,
}: Pick<ListingsCardProps, "beds" | "baths" | "sqft"> & { className?: string }) {
  const stats = [
    { icon: BedDoubleIcon, label: plural(beds, "bed") },
    { icon: Bathtub01Icon, label: plural(baths, "bath") },
    ...(sqft !== null
      ? [{ icon: SquareArrowExpand01Icon, label: `${sqft.toLocaleString()} sq ft` }]
      : []),
  ];

  return (
    <ul
      role="list"
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground",
        className,
      )}
    >
      {stats.map((stat) => (
        <li key={stat.label} className="flex items-center gap-1.5">
          <HugeiconsIcon
            icon={stat.icon}
            strokeWidth={1.75}
            className="size-4 text-muted-foreground"
            aria-hidden
          />
          {stat.label}
        </li>
      ))}
    </ul>
  );
}

function FeatureChips({ features, className }: { features: string[]; className?: string }) {
  if (features.length === 0) return null;
  const shown = features.slice(0, MAX_FEATURES);
  const hiddenCount = features.length - shown.length;

  return (
    <ul
      role="list"
      aria-label="Accessibility features"
      className={cn("flex flex-wrap gap-1.5", className)}
    >
      {shown.map((feature, index) => (
        <li key={`${feature}-${index}`} className="max-w-full">
          <Badge variant="secondary" className="max-w-full font-normal text-foreground">
            <span className="truncate">{feature}</span>
          </Badge>
        </li>
      ))}
      {hiddenCount > 0 && (
        <li>
          <Badge variant="outline" className="font-normal text-muted-foreground">
            +{hiddenCount} more
          </Badge>
        </li>
      )}
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
      <HugeiconsIcon icon={Image01Icon} strokeWidth={1.75} className="size-5" aria-hidden />
      No photo
    </div>
  );

  const priceLabel = (
    <p className="text-lg font-semibold tracking-tight text-foreground">
      ${price.toLocaleString()}
      <span className="text-sm font-normal text-muted-foreground"> /mo</span>
    </p>
  );

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
          "flex min-w-0 flex-col gap-1",
          isHorizontal ? "flex-1 justify-center p-3" : "px-0.5",
        )}
      >
        <div className="flex items-baseline justify-between gap-3">
          {priceLabel}
          {!isHorizontal && <p className="shrink-0 text-[13px] text-muted-foreground">{posted}</p>}
        </div>
        <h3 className="truncate text-[15px] font-medium tracking-normal text-foreground">
          {displayAddress}
        </h3>
        {title && <p className="truncate text-sm text-muted-foreground">{title}</p>}
        <ListingStats
          beds={beds}
          baths={baths}
          sqft={sqft}
          className={isHorizontal ? "mt-0.5" : "mt-1"}
        />
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
