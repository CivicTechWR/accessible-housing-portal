import { Image01Icon, WheelchairIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import { Fragment, type ReactNode } from "react";
import type { ListingFormInput } from "@/app/listing-form/types";
import { ListingDetails } from "@/components/listing-details/ListingDetails";
import { ListingsCard, formatPostedLabel } from "@/components/listings-card/ListingsCard";
import { Badge } from "@/components/ui/badge";
import { formatListingAddress } from "@/lib/address";
import { RENT_PERIOD, formatArea, formatBaths, formatBeds, formatRent } from "@/lib/listing-format";
import { cn } from "@/lib/utils";
import { LISTING_BUILDING_TYPE_VALUES, listingSquareFeetSchema } from "@/shared/schemas/listings";

export type ListingFormPreviewMode = "card" | "details";

export interface ListingFormPreviewProps {
  mode: ListingFormPreviewMode;
  formData: ListingFormInput;
  listingId?: string;
  onOpenDetails: () => void;
}

export function ListingFormPreview({
  mode,
  formData,
  listingId,
  onOpenDetails,
}: ListingFormPreviewProps) {
  const previewTitleValue = formData.title?.trim();
  const previewStreet1Value = formData.street1?.trim();
  const previewStreet2Value = formData.street2?.trim();
  const previewCityValue = formData.city?.trim();
  const previewPostalCodeValue = formData.postalCode?.trim();
  const previewUnitNumberValue = formData.unitNumber?.trim();
  const previewTitle = previewTitleValue || "Listing title";
  const previewStreet1 = previewStreet1Value || "Street address";
  const previewCardAddress = formatListingAddress(previewStreet1, previewUnitNumberValue);
  const previewCardFeatures = Array.from(
    new Set((formData.customFeatures ?? []).map((feature) => feature.name)),
  );
  const previewAvailability = formData.availableOn || "Now";
  const rentCents = formData.monthlyRentCents ?? null;
  const previewPrice = Math.round((rentCents ?? 0) / 100);
  const previewSquareFeet = listingSquareFeetSchema.safeParse(formData.squareFeet).data ?? null;
  const previewBuildingType = LISTING_BUILDING_TYPE_VALUES.find(
    (value) => value === formData.buildingType,
  );

  const previewFeaturesByCategory = Object.values(
    (formData.customFeatures ?? []).reduce<
      Record<string, { categoryName: string; features: { name: string; description: string }[] }>
    >((acc, feature) => {
      const category = feature.category;
      let categoryGroup = acc[category];

      if (!categoryGroup) {
        categoryGroup = { categoryName: category, features: [] };
        acc[category] = categoryGroup;
      }

      categoryGroup.features.push({
        name: feature.name,
        description: feature.description,
      });

      return acc;
    }, {}),
  );

  if (mode === "details") {
    return (
      <div className="space-y-4">
        <ListingDetails
          embedded
          title={previewTitle}
          price={previewPrice}
          description={formData.description}
          buildingType={previewBuildingType}
          leaseTermMonths={formData.leaseTerm ?? undefined}
          depositInfo={formData.depositInfo}
          availableOn={formData.availableOn || undefined}
          unitNumber={previewUnitNumberValue}
          street1={previewStreet1}
          street2={previewStreet2Value}
          city={previewCityValue || ""}
          postalCode={previewPostalCodeValue}
          beds={formData.bedrooms ?? 0}
          baths={formData.bathrooms ?? 0}
          sqft={previewSquareFeet}
          heatingType={formData.heatingType || undefined}
          utilitiesIncluded={formData.utilitiesIncluded}
          contactName={formData.contactName}
          contactRole={formData.contactRole}
          contactEmail={formData.contactEmail}
          contactPhone={formData.contactPhone}
          applicationUrl={formData.applicationUrl}
          applicationEmail={formData.applicationEmail}
          applicationPhone={formData.applicationPhone}
          applicationInstructions={formData.applicationInstructions}
          images={formData.images ?? []}
          timeAgo={previewAvailability}
          features={previewFeaturesByCategory}
        />
      </div>
    );
  }

  const bedrooms = formData.bedrooms ?? null;
  const bathrooms = formData.bathrooms ?? null;
  // The search card always shows rent and rooms. Until they're filled in, a card of our own
  // shows what's missing instead of "$0/mo" and "Studio · 0 baths".
  const hasCardFacts = rentCents !== null && bedrooms !== null && bathrooms !== null;

  return (
    <div className="flex flex-col items-center lg:items-stretch">
      {hasCardFacts ? (
        <ListingsCard
          id={listingId ?? "preview"}
          title={previewTitleValue}
          accessibilityFeatures={previewCardFeatures}
          price={previewPrice}
          address={previewCardAddress}
          city={previewCityValue || ""}
          beds={bedrooms}
          baths={bathrooms}
          sqft={previewSquareFeet}
          // Without a move-in date the card shows no availability rather than "Available now".
          timeAgo={formData.availableOn || ""}
          imageUrl={formData.images?.[0]?.url}
          variant="vertical"
          onClick={onOpenDetails}
          photoMayNeedSession
        />
      ) : (
        <IncompletePreviewCard
          title={previewTitleValue || (previewStreet1Value ? previewCardAddress : undefined)}
          place={
            previewTitleValue
              ? [previewStreet1Value && previewCardAddress, previewCityValue]
                  .filter(Boolean)
                  .join(", ")
              : previewCityValue
          }
          rentCents={rentCents}
          bedrooms={bedrooms}
          bathrooms={bathrooms}
          squareFeet={previewSquareFeet}
          availableOn={formData.availableOn || undefined}
          featureCount={previewCardFeatures.length}
          imageUrl={formData.images?.[0]?.url}
          onClick={onOpenDetails}
        />
      )}
    </div>
  );
}

/** The one style for a missing fact on the preview card, wherever it sits on the card. */
function Prompt({ children }: { children: string }) {
  return (
    <span className="text-[15px] font-normal tracking-normal text-muted-foreground">
      {children}
    </span>
  );
}

/** Items joined by " · ", each separator kept with the item after it, as on the search card. */
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

/**
 * The search card's structure (title, then price and rooms, then place and date, then the
 * accessibility pill) for a listing still missing its rent or rooms, with a muted prompt such as
 * "Add rent" in place of each missing fact.
 */
function IncompletePreviewCard({
  title,
  place,
  rentCents,
  bedrooms,
  bathrooms,
  squareFeet,
  availableOn,
  featureCount,
  imageUrl,
  onClick,
}: {
  title?: string;
  place?: string;
  rentCents: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  availableOn?: string;
  featureCount: number;
  imageUrl?: string;
  onClick: () => void;
}) {
  const missingRooms = [bedrooms === null && "bedrooms", bathrooms === null && "bathrooms"].filter(
    Boolean,
  );
  const facts: ReactNode[] = [
    rentCents === null ? (
      <Prompt>Add rent</Prompt>
    ) : (
      <>
        <span className="text-lg font-bold tabular-nums">
          {formatRent(Math.round(rentCents / 100))}
        </span>
        {RENT_PERIOD}
      </>
    ),
    ...(bedrooms === null ? [] : [formatBeds(bedrooms)]),
    ...(bathrooms === null ? [] : [formatBaths(bathrooms)]),
    ...(squareFeet === null ? [] : [formatArea(squareFeet)]),
    ...(missingRooms.length > 0 ? [<Prompt>{`Add ${missingRooms.join(" and ")}`}</Prompt>] : []),
  ];
  const meta = [place, availableOn ? formatPostedLabel(availableOn) : null].filter(
    (item): item is string => Boolean(item),
  );

  return (
    <article className="group relative flex w-full flex-col gap-3">
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl bg-muted">
        {imageUrl ? (
          // A draft's photo is readable only with the owner's session, so it skips the optimizer.
          <Image
            src={imageUrl}
            alt={title || "Listing photo"}
            fill
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <HugeiconsIcon icon={Image01Icon} strokeWidth={2} className="size-5" aria-hidden />
            Add a photo
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="line-clamp-2 text-base leading-snug font-semibold tracking-normal wrap-anywhere text-foreground md:text-[17px]">
          {title || <Prompt>Add a title</Prompt>}
        </h3>
        <p className="mt-0.5 text-[15px] leading-snug text-foreground">
          <DotSeparated items={facts} />
        </p>
        {meta.length > 0 ? (
          <p className="text-sm leading-snug text-muted-foreground md:text-[15px]">
            <DotSeparated items={meta} />
          </p>
        ) : null}
        <div className="mt-3 flex min-w-0">
          <Badge
            variant={featureCount > 0 ? "default" : "secondary"}
            className={cn(
              "h-7 max-w-full gap-1.5 px-2.5 text-xs md:text-sm [&>svg]:size-4!",
              featureCount === 0 && "bg-muted text-muted-foreground",
            )}
          >
            <HugeiconsIcon icon={WheelchairIcon} strokeWidth={2} className="shrink-0" aria-hidden />
            <span className="truncate">
              {featureCount === 0
                ? "No accessibility info"
                : `${featureCount} accessibility ${featureCount === 1 ? "feature" : "features"}`}
            </span>
          </Badge>
        </div>
      </div>
      <button
        type="button"
        aria-label={`View listing: ${title || "untitled listing"}`}
        className="absolute inset-0 z-10 cursor-pointer rounded-xl border-0 bg-transparent p-0 outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
        onClick={onClick}
      />
    </article>
  );
}
