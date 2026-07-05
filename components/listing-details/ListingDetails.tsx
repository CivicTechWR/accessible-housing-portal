import { ListingImageCarousel } from "../listing-image-carousel/ListingImageCarousel";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { CardHeader, CardTitle, CardContent, Card } from "../ui/card";
import { buildAddress } from "@/lib/address";
import { UTILITY_INCLUDED_VALUES } from "@/shared/schemas/listings";
import Link from "next/link";
import { ListingApplyButton } from "./ListingApplyButton";

type UtilityIncluded = (typeof UTILITY_INCLUDED_VALUES)[number];

const UTILITY_LABELS: Record<UtilityIncluded, string> = {
  heat: "Heat",
  water: "Water",
  electricity: "Electricity",
  gas: "Gas",
  internet: "Internet",
};

type ListingFeature = {
  name: string;
  description: string;
};

type ListingImage = {
  url: string;
  caption: string;
};

type ListingFeatureCategory = {
  categoryName: string;
  features: ListingFeature[];
};

export interface ListingDetailProps {
  title?: string;
  editUrl?: string;
  price: number;
  unitNumber?: string;
  street1: string;
  street2?: string;
  city: string;
  postalCode?: string;
  beds: number;
  baths: number;
  sqft: number;
  utilitiesIncluded?: UtilityIncluded[];
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  applicationUrl?: string;
  images: ListingImage[];
  timeAgo: string;
  features: ListingFeatureCategory[];
  embedded?: boolean;
}

export function ListingDetails({
  title,
  editUrl,
  price,
  city,
  beds,
  baths,
  sqft,
  utilitiesIncluded,
  contactName,
  contactEmail,
  contactPhone,
  applicationUrl,
  images,
  timeAgo,
  features,
  unitNumber,
  street1,
  street2,
  postalCode,
  embedded = false,
}: ListingDetailProps) {
  const address = buildAddress({ unitNumber, street1, street2, city, postalCode });
  const rentalCost = `$${price.toLocaleString()}`;
  const WrapperElement = embedded ? "section" : "main";

  const rentalDetailRows: Array<{ label: string; value: string; fullWidth?: boolean }> = [
    { label: "Address", value: address || "Address Here", fullWidth: true },
    { label: "Rental Cost", value: rentalCost },
    { label: "Bedrooms", value: String(beds) },
    { label: "Bathrooms", value: String(baths) },
    { label: "Square Feet", value: `${sqft.toLocaleString()} sqft` },
    {
      label: "Utilities Included",
      value:
        utilitiesIncluded && utilitiesIncluded.length > 0
          ? utilitiesIncluded.map((utility) => UTILITY_LABELS[utility]).join(", ")
          : "None listed",
    },
    { label: "Posted", value: timeAgo },
  ];
  const contactRows = [
    {
      label: "Name",
      value: contactName?.trim(),
    },
    {
      label: "Email",
      value: contactEmail?.trim(),
      href: contactEmail ? `mailto:${contactEmail}` : undefined,
    },
    {
      label: "Phone",
      value: contactPhone?.trim(),
      href: contactPhone ? `tel:${contactPhone}` : undefined,
    },
  ].filter((row): row is { label: string; value: string; href?: string } => Boolean(row.value));

  const wrapperClasses = embedded ? "w-full" : "min-h-screen bg-muted/30 px-4 py-8 sm:px-6 lg:px-8";
  const contentClasses = embedded
    ? "mx-auto flex w-full max-w-5xl flex-col gap-6"
    : "mx-auto flex w-full max-w-4xl flex-col gap-6";

  return (
    <WrapperElement className={wrapperClasses}>
      <div className={contentClasses}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1>{address}</h1>
            {title && <h2>{title}</h2>}
            <h3 className="sm:text-xl">{`${rentalCost}/month`}</h3>
          </div>
          {editUrl ? (
            <Button asChild>
              <Link href={editUrl}>Edit listing</Link>
            </Button>
          ) : null}
        </div>

        {images.length > 0 && <ListingImageCarousel images={images} altPrefix={address} />}

        <Card>
          <CardHeader>
            <CardTitle>Rental Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {rentalDetailRows.map((row) => (
                <div
                  key={row.label}
                  className={`bg-background p-3 ${row.fullWidth ? "sm:col-span-2" : ""}`}
                >
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {row.label}
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rental Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {features.length === 0 && <p>No features listed</p>}
            {features.map((category) => (
              <section key={category.categoryName} className="space-y-2">
                <h2 className="text-sm text-foreground">{category.categoryName}</h2>
                <div className="flex flex-wrap gap-2">
                  {category.features.map((feature) => (
                    <Badge
                      key={feature.name}
                      variant="secondary"
                      title={feature.description}
                      className="text-sm px-3 py-1"
                    >
                      {feature.name}
                    </Badge>
                  ))}
                </div>
              </section>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Info</CardTitle>
          </CardHeader>
          <CardContent>
            {contactRows.length === 0 && !applicationUrl ? (
              <p className="text-sm text-muted-foreground">
                The lister hasn&apos;t provided contact or application details for this listing yet.
                Please check back later.
              </p>
            ) : (
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {contactRows.map((row) => (
                  <div key={row.label} className="min-w-0 bg-background p-3">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {row.label}
                    </dt>
                    <dd className="mt-1 break-words text-sm font-medium text-foreground">
                      {row.href ? (
                        <a href={row.href} className="hover:underline">
                          {row.value}
                        </a>
                      ) : (
                        row.value
                      )}
                    </dd>
                  </div>
                ))}
                <div className="min-w-0 bg-background p-3">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Application
                  </dt>
                  <dd className="mt-1">
                    {applicationUrl ? (
                      <ListingApplyButton applicationUrl={applicationUrl} />
                    ) : (
                      <p className="text-sm font-medium text-foreground">
                        No online application — contact the lister directly to apply.
                      </p>
                    )}
                  </dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>
      </div>
    </WrapperElement>
  );
}
