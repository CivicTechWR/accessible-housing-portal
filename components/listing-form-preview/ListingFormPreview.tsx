import { Image01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import type { ListingFormInput } from "@/app/listing-form/types";
import { ListingDetails } from "@/components/listing-details/ListingDetails";
import { ListingsCard } from "@/components/listings-card/ListingsCard";
import { formatListingAddress } from "@/lib/address";
import { RENT_PERIOD, formatArea, formatBaths, formatBeds, formatRent } from "@/lib/listing-format";
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
    <div className="flex flex-col items-center gap-3 lg:items-stretch">
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
          subtitle={
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
          imageUrl={formData.images?.[0]?.url}
          onClick={onOpenDetails}
        />
      )}
      <p className="px-1 text-sm text-muted-foreground">
        Select the card to preview the full listing page.
      </p>
    </div>
  );
}

function Prompt({ children }: { children: string }) {
  return <span className="font-normal text-muted-foreground">{children}</span>;
}

/**
 * The search card's layout for a listing still missing its rent or rooms, with a muted prompt
 * ("Add rent") in place of each missing fact.
 */
function IncompletePreviewCard({
  title,
  subtitle,
  rentCents,
  bedrooms,
  bathrooms,
  squareFeet,
  imageUrl,
  onClick,
}: {
  title?: string;
  subtitle?: string;
  rentCents: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  imageUrl?: string;
  onClick: () => void;
}) {
  const rooms = [
    bedrooms === null ? null : formatBeds(bedrooms),
    bathrooms === null ? null : formatBaths(bathrooms),
    squareFeet === null ? null : formatArea(squareFeet),
  ].filter(Boolean);
  const missingRooms = [bedrooms === null && "bedrooms", bathrooms === null && "bathrooms"].filter(
    Boolean,
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
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 min-w-0 text-base leading-snug font-semibold tracking-normal wrap-anywhere">
            {title || <Prompt>Add a title</Prompt>}
          </h3>
          <p className="shrink-0 text-lg leading-snug font-semibold whitespace-nowrap tabular-nums">
            {rentCents === null ? (
              <Prompt>Add rent</Prompt>
            ) : (
              <>
                {formatRent(Math.round(rentCents / 100))}
                <span className="text-sm font-normal text-muted-foreground">{RENT_PERIOD}</span>
              </>
            )}
          </p>
        </div>
        {subtitle ? <p className="truncate text-sm text-muted-foreground">{subtitle}</p> : null}
        <p className="text-sm">
          {rooms.join(" · ")}
          {missingRooms.length > 0 ? (
            <>
              {rooms.length > 0 ? " · " : null}
              <Prompt>{`Add ${missingRooms.join(" and ")}`}</Prompt>
            </>
          ) : null}
        </p>
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
