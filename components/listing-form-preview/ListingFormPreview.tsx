import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ListingFormInput } from "@/app/listing-form/types";
import { Button } from "@/components/ui/button";
import { ListingDetails } from "@/components/listing-details/ListingDetails";
import { ListingsCard } from "@/components/listings-card/ListingsCard";
import { buildAddress } from "@/lib/address";
import { LISTING_BUILDING_TYPE_VALUES, listingSquareFeetSchema } from "@/shared/schemas/listings";

export type ListingFormPreviewMode = "card" | "details";

export interface ListingFormPreviewProps {
  mode: ListingFormPreviewMode;
  formData: ListingFormInput;
  listingId?: string;
  onOpenDetails: () => void;
  /** Returns to the card preview. At lg and up the layout divider does this instead. */
  onCloseDetails: () => void;
}

export function ListingFormPreview({
  mode,
  formData,
  listingId,
  onOpenDetails,
  onCloseDetails,
}: ListingFormPreviewProps) {
  const previewTitleValue = formData.title?.trim();
  const previewStreet1Value = formData.street1?.trim();
  const previewStreet2Value = formData.street2?.trim();
  const previewCityValue = formData.city?.trim();
  const previewPostalCodeValue = formData.postalCode?.trim();
  const previewUnitNumberValue = formData.unitNumber?.trim();
  const previewTitle = previewTitleValue || "Title Here";
  const previewStreet1 = previewStreet1Value || "Address Here";
  const previewCardAddress = buildAddress({
    unitNumber: previewUnitNumberValue,
    street1: previewStreet1,
    street2: previewStreet2Value,
    city: previewCityValue,
  });
  const previewCardFeatures = Array.from(
    new Set((formData.customFeatures ?? []).map((feature) => feature.name)),
  );
  const previewAvailability = formData.availableOn || "Now";
  const previewPrice = Math.round((formData.monthlyRentCents ?? 0) / 100);
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
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onCloseDetails}
          className="h-11 text-sm lg:hidden"
        >
          <HugeiconsIcon
            icon={ArrowLeft01Icon}
            strokeWidth={2}
            data-icon="inline-start"
            aria-hidden
          />
          Back to card preview
        </Button>
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

  return (
    <div className="flex flex-col items-center gap-3 lg:items-stretch">
      <ListingsCard
        id={listingId ?? "preview"}
        title={previewTitleValue}
        accessibilityFeatures={previewCardFeatures}
        price={previewPrice}
        address={previewCardAddress}
        city={previewCityValue || ""}
        beds={formData.bedrooms ?? 0}
        baths={formData.bathrooms ?? 0}
        sqft={previewSquareFeet}
        timeAgo={previewAvailability}
        imageUrl={formData.images?.[0]?.url}
        variant="vertical"
        onClick={onOpenDetails}
      />
      <p className="text-xs text-muted-foreground px-1">
        Click the listing card to preview full listing details.
      </p>
    </div>
  );
}
