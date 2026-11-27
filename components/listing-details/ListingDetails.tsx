import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Bathtub01Icon,
  BedDoubleIcon,
  Calendar03Icon,
  Call02Icon,
  CheckmarkCircle02Icon,
  Mail01Icon,
  PencilEdit01Icon,
  SquareArrowExpand01Icon,
} from "@hugeicons/core-free-icons";

import { ListingImageCarousel } from "../listing-image-carousel/ListingImageCarousel";
import { Button } from "../ui/button";
import { AppPageShell, PageHeader, pageWidths } from "@/components/page-shell/AppPageShell";
import { buildAddress } from "@/lib/address";
import { cn } from "@/lib/utils";
import { HOUSING_DEFINITIONS } from "@/shared/housing-definitions";
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
  sqft: number | null;
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
  /** Rendered inside another page, such as the listing form preview: no page shell, no sticky parts. */
  embedded?: boolean;
  walkScore?: ReactNode;
}

const CONTACT_SECTION_ID = "listing-contact";

function formatAvailableDate(isoDate: string) {
  const parsed = parseISO(isoDate);
  return Number.isNaN(parsed.getTime()) ? isoDate : format(parsed, "MMMM d, yyyy");
}

/** Feature categories are stored in capitals ("ENTRY & EXTERIOR"); show them in sentence case. */
function formatCategoryName(name: string) {
  if (name !== name.toUpperCase()) return name;
  const lower = name.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function plural(count: number, singular: string) {
  return `${count.toLocaleString()} ${singular}${count === 1 ? "" : "s"}`;
}

function Price({ price, className }: { price: number; className?: string }) {
  return (
    <span className={cn("font-semibold tracking-tight text-foreground", className)}>
      ${price.toLocaleString()}
      <span className="text-[0.7em] font-normal text-muted-foreground"> /mo</span>
    </span>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="py-8 first:pt-0">
      <h2 id={id} className="mb-5 text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ContactLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: typeof Mail01Icon;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className="inline-flex min-h-6 items-start gap-2 text-sm text-primary-text underline-offset-4 hover:underline"
    >
      <HugeiconsIcon icon={icon} strokeWidth={2} className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span className="wrap-anywhere">{children}</span>
    </a>
  );
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
  walkScore,
}: ListingDetailProps) {
  const address = buildAddress({ unitNumber, street1, street2, city, postalCode });
  const heading = title || address;
  const availableDate = availableOn ? formatAvailableDate(availableOn) : undefined;
  const trimmedDescription = description?.trim();

  const keyFacts = [
    { icon: BedDoubleIcon, label: plural(beds, "bed") },
    { icon: Bathtub01Icon, label: plural(baths, "bath") },
    ...(sqft !== null
      ? [{ icon: SquareArrowExpand01Icon, label: `${sqft.toLocaleString()} sq ft` }]
      : []),
    ...(availableDate ? [{ icon: Calendar03Icon, label: `Available ${availableDate}` }] : []),
  ];

  // Rent, size and availability are in the key facts above, and the address is under the title,
  // so the details list only holds what isn't shown elsewhere.
  const rentalDetailRows: Array<{
    label: string;
    value: string;
    info?: { label: string; description: string };
    fullWidth?: boolean;
    preserveWhitespace?: boolean;
  }> = [
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
    ...(buildingType
      ? [{ label: "Building type", value: LISTING_BUILDING_TYPE_LABELS[buildingType] }]
      : []),
    ...(heatingType
      ? [{ label: "Primary heating type", value: HEATING_TYPE_LABELS[heatingType] }]
      : []),
    {
      label: "Utilities included",
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
            label: "Initial lease term",
            value: `${leaseTermMonths}-month lease`,
            info: {
              label: HOUSING_DEFINITIONS.leaseTerm.label,
              description: `${HOUSING_DEFINITIONS.leaseTerm.description} ${HOUSING_DEFINITIONS.leaseTerm.searcherNote}`,
            },
          },
        ]
      : []),
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
    {
      label: "Email",
      value: generalEmail,
      href: `mailto:${generalEmail}`,
      icon: Mail01Icon,
      shared: sharesEmail,
    },
    {
      label: "Phone",
      value: generalPhone,
      href: `tel:${generalPhone}`,
      icon: Call02Icon,
      shared: sharesPhone,
    },
  ].filter((row): row is typeof row & { value: string } => Boolean(row.value));
  const applicationRows = [
    {
      label: "Application email",
      value: sharesEmail ? undefined : applyEmail,
      href: `mailto:${applyEmail}`,
      icon: Mail01Icon,
    },
    {
      label: "Application phone",
      value: sharesPhone ? undefined : applyPhone,
      href: `tel:${applyPhone}`,
      icon: Call02Icon,
    },
  ].filter((row): row is typeof row & { value: string } => Boolean(row.value));
  const hasContactDetails = Boolean(contactName?.trim() || contactRole?.trim() || hasContactMethod);
  const hasApplicationMethod = Boolean(applyUrl || applyEmail || applyPhone);
  const canReachLister = hasContactMethod || applicationRows.length > 0;

  const header = (
    <div className="space-y-4">
      <PageHeader
        title={<span className="wrap-anywhere">{heading}</span>}
        description={title ? <span className="wrap-anywhere">{address}</span> : undefined}
        actions={
          editUrl ? (
            <Button asChild variant="outline">
              <Link href={editUrl}>
                <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} aria-hidden />
                Edit listing
              </Link>
            </Button>
          ) : null
        }
      />
      <ul
        role="list"
        aria-label="Key facts"
        className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] text-foreground"
      >
        <li>
          <Price price={price} className="text-2xl" />
        </li>
        {keyFacts.map((fact) => (
          <li key={fact.label} className="flex items-center gap-2">
            <HugeiconsIcon
              icon={fact.icon}
              strokeWidth={2}
              className="size-5 text-muted-foreground"
              aria-hidden
            />
            {fact.label}
          </li>
        ))}
      </ul>
    </div>
  );

  const mainColumn = (
    <div className="min-w-0 divide-y">
      <Section id="listing-accessibility" title="Accessibility features">
        {features.length === 0 ? (
          <p className="text-[15px] text-muted-foreground">No accessibility features listed.</p>
        ) : (
          <div className="space-y-7">
            {features.map((category) => (
              <div key={category.categoryName}>
                <h3 className="mb-3 text-base font-semibold tracking-normal">
                  {formatCategoryName(category.categoryName)}
                </h3>
                {/* Safari drops list semantics from a list without markers unless the role is set. */}
                <ul role="list" className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                  {category.features.map((feature) => {
                    // The listings API sends a feature's name as its description when it has none.
                    const featureDescription = feature.description.trim();
                    const hasDescription =
                      featureDescription !== "" && featureDescription !== feature.name;
                    return (
                      <li key={feature.name} className="flex gap-3 wrap-anywhere">
                        <HugeiconsIcon
                          icon={CheckmarkCircle02Icon}
                          strokeWidth={2}
                          className="mt-px size-5 shrink-0 text-primary-text"
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <p className="text-[15px] font-medium text-foreground">{feature.name}</p>
                          {hasDescription && (
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {featureDescription}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>

      {trimmedDescription && (
        <Section id="listing-description" title="Description">
          <p className="max-w-prose text-[15px] leading-relaxed whitespace-pre-line wrap-anywhere text-foreground">
            {trimmedDescription}
          </p>
        </Section>
      )}

      <Section id="listing-rental-details" title="Rental details">
        <dl className="grid grid-cols-2 gap-x-8">
          {rentalDetailRows.map((row) => (
            <div
              key={row.label}
              className={cn("min-w-0 border-t py-3.5", row.fullWidth && "col-span-2")}
            >
              <dt className="flex items-center gap-1 text-sm text-muted-foreground">
                {row.label}
                {row.info && <InfoPopover {...row.info} />}
              </dt>
              <dd
                className={cn(
                  "mt-1 text-[15px] font-medium wrap-anywhere text-foreground",
                  row.preserveWhitespace && "whitespace-pre-line",
                )}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      {walkScore ? <div className="py-8">{walkScore}</div> : null}

      {instructions && (
        <Section id="listing-how-to-apply" title="How to apply">
          <figure className="space-y-2">
            <figcaption className="text-sm text-muted-foreground">
              From the housing lister
            </figcaption>
            <blockquote className="rounded-r-lg border-l-2 border-primary/40 bg-muted/50 px-4 py-3 text-[15px] leading-relaxed whitespace-pre-line wrap-anywhere">
              {instructions}
            </blockquote>
          </figure>
        </Section>
      )}
    </div>
  );

  const contactCard = (
    <aside
      id={CONTACT_SECTION_ID}
      aria-labelledby={`${CONTACT_SECTION_ID}-heading`}
      className={cn("min-w-0 scroll-mt-24", !embedded && "lg:sticky lg:top-24 lg:self-start")}
    >
      <div className="space-y-5 rounded-xl border bg-card p-5 text-card-foreground shadow-sm sm:p-6">
        {/* Phones get the price from the key facts and the bottom bar, so it shows here on desktop only. */}
        {!embedded && (
          <div className="hidden lg:block">
            <Price price={price} className="text-2xl" />
            {availableDate && (
              <p className="mt-1 text-sm text-muted-foreground">Available {availableDate}</p>
            )}
          </div>
        )}
        <h2
          id={`${CONTACT_SECTION_ID}-heading`}
          className={cn("text-xl font-semibold tracking-tight", !embedded && "lg:sr-only")}
        >
          Contact and applications
        </h2>
        {(applyUrl || hasContactMethod || hasApplicationMethod || instructions) && (
          <div className="space-y-2">
            {applyUrl && <ListingApplyButton applicationUrl={applyUrl} className="w-full" />}
            <p className="text-sm text-muted-foreground">
              Apply directly with the housing lister, outside this portal.
            </p>
          </div>
        )}

        {(hasContactDetails || applicationRows.length > 0) && (
          <div className="space-y-5 border-t pt-5">
            {hasContactDetails && (
              <section className="min-w-0 space-y-3">
                <h3 className="text-sm font-semibold tracking-normal">
                  {allContactMethodsShared ? "For questions and applications" : "General enquiries"}
                </h3>
                {(contactName?.trim() || contactRole?.trim()) && (
                  <div>
                    {contactName?.trim() && (
                      <p className="text-[15px] font-medium wrap-anywhere">{contactName.trim()}</p>
                    )}
                    {contactRole?.trim() && (
                      <p className="text-sm wrap-anywhere text-muted-foreground">
                        {contactRole.trim()}
                      </p>
                    )}
                  </div>
                )}
                {contactRows.length > 0 && (
                  <dl className="space-y-2">
                    {contactRows.map((row) => (
                      <div key={row.label} className="min-w-0">
                        <dt className="sr-only">{row.label}</dt>
                        <dd>
                          <ContactLink href={row.href} icon={row.icon}>
                            {row.value}
                          </ContactLink>
                          {row.shared && !allContactMethodsShared && (
                            <span className="block pl-6 text-[13px] text-muted-foreground">
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
              <section className={cn("min-w-0 space-y-3", hasContactDetails && "border-t pt-5")}>
                <h3 className="text-sm font-semibold tracking-normal">Applications</h3>
                <dl className="space-y-2">
                  {applicationRows.map((row) => (
                    <div key={row.label} className="min-w-0">
                      <dt className="sr-only">{row.label}</dt>
                      <dd>
                        <ContactLink href={row.href} icon={row.icon}>
                          {row.value}
                        </ContactLink>
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>
        )}
        {!hasApplicationMethod && hasContactMethod && (
          <p className="text-sm text-muted-foreground">Contact the lister to ask how to apply.</p>
        )}
        {!hasContactDetails && !hasApplicationMethod && !instructions && (
          <p className="text-sm text-muted-foreground">
            The lister hasn&apos;t provided contact or application details for this listing yet.
            Please check back later.
          </p>
        )}
      </div>
    </aside>
  );

  const body = (
    <div className={cn("mx-auto flex w-full flex-col gap-8", pageWidths.content)}>
      {header}
      {images.length > 0 && <ListingImageCarousel images={images} altPrefix={address} />}
      <div
        className={cn(
          "grid grid-cols-1 gap-10",
          !embedded && "lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14",
        )}
      >
        {mainColumn}
        {contactCard}
      </div>
    </div>
  );

  if (embedded) {
    return <section className="w-full">{body}</section>;
  }

  return (
    <AppPageShell className="bg-background">
      {body}
      {/* Keeps the price and the main action in reach while scrolling on phones. Sticky rather than
          fixed, so it stops above the site footer. */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-10 -mb-8 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-10 sm:px-6 lg:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="min-w-0">
            <Price price={price} className="text-lg" />
            {availableDate && (
              <p className="truncate text-[13px] text-muted-foreground">
                Available {availableDate}
              </p>
            )}
          </div>
          {applyUrl ? (
            <ListingApplyButton applicationUrl={applyUrl} className="px-8" />
          ) : canReachLister ? (
            <Button asChild size="lg" className="h-11 px-8 text-sm">
              <a href={`#${CONTACT_SECTION_ID}`}>Contact</a>
            </Button>
          ) : null}
        </div>
      </div>
    </AppPageShell>
  );
}
