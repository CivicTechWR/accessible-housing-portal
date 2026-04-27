import { Card, CardContent } from "../ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";

interface ListingsCardProps {
  id: string;
  title?: string;
  accessibilityFeatures?: string[];
  price: number;
  address: string;
  city: string;
  beds: number;
  baths: number;
  sqft: number;
  imageUrl?: string;
  timeAgo: string;
  variant?: "vertical" | "horizontal";
  href?: string;
  onClick?: () => void;
}

const variants = {
  vertical: {
    card: "w-full max-w-[320px] flex flex-col min-h-[300px]",
    image: "w-full h-[160px] sm:h-[175px] lg:h-[190px] shrink-0",
    content: "p-4 flex flex-col flex-1",
    price: "text-xl",
    address: "text-sm",
    stats: "text-sm gap-x-3",
    statGap: "gap-1",
    badge: "top-2 left-2 px-2 py-1 gap-1.5",
    badgeDot: "w-2 h-2",
    badgeText: "text-[10px]",
    noImageText: "text-sm",
  },
  horizontal: {
    card: "w-full min-h-[120px] flex flex-row",
    image: "w-[100px] sm:w-[130px] shrink-0 rounded-l-lg overflow-hidden",
    content: "p-3 sm:p-4 flex-1 min-w-0 flex flex-col justify-center",
    price: "text-lg",
    address: "text-xs",
    stats: "text-xs gap-x-2",
    statGap: "gap-0.5",
    badge: "top-1.5 left-1.5 px-1.5 py-0.5 gap-1",
    badgeDot: "w-1.5 h-1.5",
    badgeText: "text-[8px]",
    noImageText: "text-xs",
  },
};

function FeatureBadge({ children }: { children: string }) {
  return (
    <Badge
      variant="secondary"
      className="border-transparent bg-secondary/60 px-1.5 py-0 text-[10px] font-normal"
    >
      {children}
    </Badge>
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
}: ListingsCardProps) {
  const v = variants[variant];
  const isHorizontal = variant === "horizontal";
  const safeFeatures = accessibilityFeatures || [];
  const MAX_FEATURES = 3;
  const hasMoreFeatures = safeFeatures.length > MAX_FEATURES;
  const baseFeatures = safeFeatures.slice(0, MAX_FEATURES);
  const extraFeatures = safeFeatures.slice(MAX_FEATURES);
  const listingHref = href ?? `/listings/${id}`;
  const displayAddress = city ? `${address}, ${city}` : address;
  const ariaLabel = `View listing: ${title ? `${title} at ${displayAddress}` : displayAddress}`;

  return (
    <Card
      className={`${v.card} relative overflow-hidden hover:shadow-md transition-all cursor-pointer group`}
    >
      <div className={`relative ${v.image} bg-muted`}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={displayAddress}
            fill
            sizes="(max-width: 640px) 260px, (max-width: 1024px) 290px, 320px"
            unoptimized={imageUrl.startsWith("/api/image-uploads/")}
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center text-muted-foreground ${v.noImageText}`}
          >
            {isHorizontal ? "No Image" : "No Image Available"}
          </div>
        )}
        <div
          className={`absolute ${v.badge} bg-black/70 backdrop-blur-sm rounded flex items-center z-10`}
        >
          <div className={`${v.badgeDot} rounded-full bg-primary`} />
          <span className={`${v.badgeText} text-white font-semibold tracking-wide uppercase`}>
            {timeAgo}
          </span>
        </div>
      </div>

      <CardContent className={v.content}>
        <div className={isHorizontal ? "mb-2" : "mb-3"}>
          <div
            className={`${v.price} font-bold text-foreground tracking-tight flex items-baseline gap-1`}
          >
            ${price.toLocaleString()}
            <span className="text-sm font-normal text-muted-foreground">/mo</span>
          </div>
          <h3>{displayAddress}</h3>
          {title && <h4>{title}</h4>}
        </div>

        <div className={`flex items-center ${v.stats} flex-wrap text-muted-foreground mb-auto`}>
          <span className={`flex items-center ${v.statGap}`}>
            <strong className="text-foreground">{beds}</strong> bds
          </span>
          <span className="text-border">|</span>
          <span className={`flex items-center ${v.statGap}`}>
            <strong className="text-foreground">{baths}</strong> ba
          </span>
          <span className="text-border">|</span>
          <span className={`flex items-center ${v.statGap}`}>
            <strong className="text-foreground">{sqft || "-"}</strong> sqft
          </span>
        </div>

        {safeFeatures.length > 0 && (
          <div
            className={`mt-3 pt-3 border-t relative z-20 ${isHorizontal ? "hidden sm:block" : ""}`}
          >
            <div className="flex flex-wrap gap-1.5 items-center">
              {baseFeatures.map((f, idx) => (
                <FeatureBadge key={`${f}-${idx}`}>{f}</FeatureBadge>
              ))}

              {hasMoreFeatures && (
                <details className="group w-full">
                  <summary className="list-none text-[10px] text-primary hover:underline font-medium px-1 cursor-pointer select-none [&::-webkit-details-marker]:hidden">
                    <span className="group-open:hidden">{`+${extraFeatures.length} more`}</span>
                    <span className="hidden group-open:inline">Show less</span>
                  </summary>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {extraFeatures.map((f, idx) => (
                      <FeatureBadge key={`${f}-${MAX_FEATURES + idx}`}>{f}</FeatureBadge>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {onClick ? (
        <button
          type="button"
          aria-label={ariaLabel}
          className="absolute inset-0 z-10 cursor-pointer border-0 bg-transparent p-0"
          onClick={onClick}
        />
      ) : (
        <Link
          href={listingHref}
          prefetch={false}
          aria-label={ariaLabel}
          className="absolute inset-0 z-10"
        />
      )}
    </Card>
  );
}
