import { ListingImageCarousel } from "../listing-image-carousel/ListingImageCarousel";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { CardHeader, CardTitle, CardDescription, CardAction, CardContent, Card } from "../ui/card";
import { buildAddress } from "@/lib/address";
import { LEASE_TERM_DESCRIPTION } from "@/shared/lease-term";
import { InfoPopover } from "@/components/info-popover/InfoPopover";
import {
  LISTING_BUILDING_TYPE_LABELS,
  UTILITY_INCLUDED_LABELS,
  UTILITY_INCLUDED_VALUES,
  type ListingBuildingType,
  type UtilityIncluded,
} from "@/shared/schemas/listings";
import { HEATING_TYPE_LABELS, type HeatingType } from "@/shared/heating-type";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { ListingApplyButton } from "./ListingApplyButton";

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
  description?: string;
  buildingType?: ListingBuildingType;
  leaseTermMonths?: number;
  depositInfo?: string;
  /** ISO date string (YYYY-MM-DD). */
  availableOn?: string;
  unitNumber?: string;
  street1: string;
  street2?: string;
  city: string;
  postalCode?: string;
  beds: number;
  baths: number;
  sqft: number;
  heatingType?: HeatingType;
  utilitiesIncluded?: UtilityIncluded[];
  contactRole?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  applicationUrl?: string;
  applicationEmail?: string;
  applicationPhone?: string;
  applicationInstructions?: string;
  images: ListingImage[];
  timeAgo: string;
  features: ListingFeatureCategory[];
  embedded?: boolean;
}

function formatAvailableDate(isoDate: string) {
  const parsed = parseISO(isoDate);
  return Number.isNaN(parsed.getTime()) ? isoDate : format(parsed, "MMMM d, yyyy");
}

export function ListingDetails({
  title,
  editUrl,
  price,
  description,
  buildingType,
  leaseTermMonths,
  depositInfo,
  availableOn,
  city,
  beds,
  baths,
  sqft,
  heatingType,
  utilitiesIncluded,
  contactRole,
  contactName,
  contactEmail,
  contactPhone,
  applicationUrl,
  applicationEmail,
  applicationPhone,
  applicationInstructions,
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

  const trimmedDescription = description?.trim();

  const rentalDetailRows: Array<{
    label: string;
    value: string;
    info?: { label: string; description: string };
    fullWidth?: boolean;
    preserveWhitespace?: boolean;
  }> = [
    { label: "Address", value: address || "Address Here", fullWidth: true },
    ...(depositInfo?.trim()
      ? [
          {
            label: "Deposit",
            value: depositInfo.trim(),
            fullWidth: true,
            preserveWhitespace: true,
          },
        ]
      : []),
    { label: "Rental Cost", value: rentalCost },
    ...(buildingType
      ? [{ label: "Building Type", value: LISTING_BUILDING_TYPE_LABELS[buildingType] }]
      : []),
    { label: "Bedrooms", value: String(beds) },
    { label: "Bathrooms", value: String(baths) },
    { label: "Square Feet", value: `${sqft.toLocaleString()} sqft` },
    ...(heatingType
      ? [{ label: "Primary heating type", value: HEATING_TYPE_LABELS[heatingType] }]
      : []),
    {
      label: "Utilities Included",
      value:
        utilitiesIncluded && utilitiesIncluded.length > 0
          ? UTILITY_INCLUDED_VALUES.filter((utility) => utilitiesIncluded.includes(utility))
              .map((utility) => UTILITY_INCLUDED_LABELS[utility])
              .join(", ")
          : "None listed",
    },
    ...(leaseTermMonths
      ? [
          {
            label: "Initial Lease Term",
            value: `${leaseTermMonths}-month lease`,
            info: {
              label: "About initial lease terms",
              description: `${LEASE_TERM_DESCRIPTION} Confirm the final lease terms and renewal options with the lister.`,
            },
          },
        ]
      : []),
    ...(availableOn ? [{ label: "Available", value: formatAvailableDate(availableOn) }] : []),
    { label: "Posted", value: timeAgo },
  ];
  const generalEmail = contactEmail?.trim();
  const generalPhone = contactPhone?.trim();
  const applyUrl = applicationUrl?.trim();
  const applyEmail = applicationEmail?.trim();
  const applyPhone = applicationPhone?.trim();
  const instructions = applicationInstructions?.trim();
  const sharesEmail = Boolean(
    applyEmail && generalEmail && applyEmail.toLowerCase() === generalEmail.toLowerCase(),
  );
  const sharesPhone = Boolean(
    applyPhone &&
    generalPhone &&
    applyPhone.replace(/[()\s.-]/g, "") === generalPhone.replace(/[()\s.-]/g, ""),
  );
  const hasContactMethod = Boolean(generalEmail || generalPhone);
  const allContactMethodsShared =
    hasContactMethod && (!generalEmail || sharesEmail) && (!generalPhone || sharesPhone);
  const contactRows = [
    { label: "Email", value: generalEmail, href: `mailto:${generalEmail}`, shared: sharesEmail },
    { label: "Phone", value: generalPhone, href: `tel:${generalPhone}`, shared: sharesPhone },
  ].filter((row): row is typeof row & { value: string } => Boolean(row.value));
  const applicationRows = [
    {
      label: "Application email",
      value: sharesEmail ? undefined : applyEmail,
      href: `mailto:${applyEmail}`,
    },
    {
      label: "Application phone",
      value: sharesPhone ? undefined : applyPhone,
      href: `tel:${applyPhone}`,
    },
  ].filter((row): row is typeof row & { value: string } => Boolean(row.value));
  const hasContactDetails = Boolean(contactName?.trim() || contactRole?.trim() || hasContactMethod);
  const hasApplicationMethod = Boolean(applyUrl || applyEmail || applyPhone);

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

        {trimmedDescription && (
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-sm text-foreground">{trimmedDescription}</p>
            </CardContent>
          </Card>
        )}

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
                  <dt className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
                    {row.label}
                    {row.info && <InfoPopover {...row.info} />}
                  </dt>
                  <dd
                    className={`mt-1 text-sm font-medium text-foreground${
                      row.preserveWhitespace ? " whitespace-pre-line" : ""
                    }`}
                  >
                    {row.value}
                  </dd>
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
          <CardHeader className="gap-x-4 gap-y-2 border-b">
            <CardTitle>
              <h2 className="text-base font-semibold">Contact and applications</h2>
            </CardTitle>
            {(hasContactMethod || hasApplicationMethod || instructions) && (
              <CardDescription className="text-sm">
                Apply directly with the housing lister, outside this portal.
              </CardDescription>
            )}
            {applyUrl && (
              <CardAction>
                <ListingApplyButton applicationUrl={applyUrl} />
              </CardAction>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {(hasContactDetails || applicationRows.length > 0) && (
              <div
                className={
                  hasContactDetails && applicationRows.length > 0
                    ? "grid gap-6 sm:grid-cols-2"
                    : "grid gap-6"
                }
              >
                {hasContactDetails && (
                  <section className="min-w-0 space-y-3">
                    <h3 className="text-sm font-semibold">
                      {allContactMethodsShared
                        ? "For questions and applications"
                        : "General enquiries"}
                    </h3>
                    {(contactName?.trim() || contactRole?.trim()) && (
                      <div>
                        {contactName?.trim() && (
                          <p className="text-sm font-medium">{contactName.trim()}</p>
                        )}
                        {contactRole?.trim() && (
                          <p className="text-sm text-muted-foreground">{contactRole.trim()}</p>
                        )}
                      </div>
                    )}
                    {contactRows.length > 0 && (
                      <dl className="space-y-2">
                        {contactRows.map((row) => (
                          <div key={row.label} className="min-w-0">
                            <dt className="sr-only">{row.label}</dt>
                            <dd className="break-words text-sm leading-relaxed">
                              <a
                                href={row.href}
                                className="text-primary-text underline-offset-4 hover:underline"
                              >
                                {row.value}
                              </a>
                              {row.shared && !allContactMethodsShared && (
                                <span className="block text-xs text-muted-foreground">
                                  Also for applications
                                </span>
                              )}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </section>
                )}
                {applicationRows.length > 0 && (
                  <section
                    className={
                      hasContactDetails
                        ? "min-w-0 space-y-3 border-t pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6"
                        : "min-w-0 space-y-3"
                    }
                  >
                    <h3 className="text-sm font-semibold">Applications</h3>
                    <dl className="space-y-2">
                      {applicationRows.map((row) => (
                        <div key={row.label} className="min-w-0">
                          <dt className="sr-only">{row.label}</dt>
                          <dd className="break-words text-sm leading-relaxed">
                            <a
                              href={row.href}
                              className="text-primary-text underline-offset-4 hover:underline"
                            >
                              {row.value}
                            </a>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                )}
              </div>
            )}
            {!hasApplicationMethod && hasContactMethod && (
              <p className="text-sm text-muted-foreground">
                Contact the lister to ask how to apply.
              </p>
            )}
            {instructions && (
              <figure className="space-y-3 border-t pt-4">
                <figcaption className="space-y-1">
                  <h3 className="text-sm font-semibold">Additional application information</h3>
                  <p className="text-xs text-muted-foreground">From the housing lister</p>
                </figcaption>
                <blockquote className="whitespace-pre-line break-words rounded-r-md border-l-2 border-primary/30 bg-muted/40 px-4 py-3 text-sm leading-relaxed">
                  {instructions}
                </blockquote>
              </figure>
            )}
            {!hasContactDetails && !hasApplicationMethod && !instructions && (
              <p className="text-sm text-muted-foreground">
                The lister hasn&apos;t provided contact or application details for this listing yet.
                Please check back later.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </WrapperElement>
  );
}
