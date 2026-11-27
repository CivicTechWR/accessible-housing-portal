import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Bathtub01Icon,
  BedDoubleIcon,
  Calendar03Icon,
  Call02Icon,
  FloorPlanIcon,
  Location01Icon,
  Mail01Icon,
  PencilEdit01Icon,
  Tick02Icon,
  UniversalAccessIcon,
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
import {
  RENT_PERIOD,
  formatArea,
  formatBaths,
  formatBeds,
  formatListingDate,
  formatRent,
  toSentenceCase,
} from "@/lib/listing-format";
import Link from "next/link";
import { ListingApplyButton } from "./ListingApplyButton";
import { ListingLocationMap } from "./ListingLocationMap";
import { featureIcon } from "./featureIcon";

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
  /** Where the building is, for the map in the Location section. */
  coordinates?: { lat: number; lng: number };
  walkScore?: ReactNode;
}

const CONTACT_SECTION_ID = "listing-contact";

/** Deposit text up to this long shares a row with another detail; longer text gets its own. */
const SHORT_DETAIL_LENGTH = 60;

function Price({ price, className }: { price: number; className?: string }) {
  return (
    <span className={cn("font-semibold tracking-tight text-foreground", className)}>
      {formatRent(price)}
      <span className="text-[0.7em] font-normal text-muted-foreground"> {RENT_PERIOD}</span>
    </span>
  );
}

/**
 * The most important block after the photos, so it sits on its own panel. Each category is a
 * heading with its icon over full-width rows, so descriptions run at a readable width.
 */
function AccessibilityFeatures({ categories }: { categories: ListingFeatureCategory[] }) {
  const count = categories.reduce((total, category) => total + category.features.length, 0);
  const headingId = "listing-accessibility";

  return (
    <section aria-labelledby={headingId}>
      {/* Light mode tints the panel; dark mode keeps the shared card surface and carries the
          brand colour in the border only, so it matches the contact card beside it. */}
      <div className="rounded-xl border border-primary/15 bg-primary/4 p-5 sm:p-7 dark:border-primary-text/35 dark:bg-card">
        <div className="mb-6 flex items-center gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HugeiconsIcon
              icon={UniversalAccessIcon}
              strokeWidth={2}
              className="size-5"
              aria-hidden
            />
          </span>
          <div className="min-w-0">
            <h2 id={headingId} className="text-xl font-semibold tracking-tight">
              Accessibility features
            </h2>
            {count > 0 && (
              <p className="text-sm text-muted-foreground">
                {count} {count === 1 ? "feature" : "features"}
              </p>
            )}
          </div>
        </div>
        {count === 0 ? (
          <p className="text-base text-foreground">No accessibility features listed.</p>
        ) : (
          <div className="space-y-7">
            {categories.map((category) => (
              <div key={category.categoryName}>
                <h3 className="mb-3 flex items-center gap-3 text-base font-semibold tracking-normal">
                  <HugeiconsIcon
                    icon={featureIcon(category.categoryName)}
                    strokeWidth={2}
                    className="size-5 shrink-0 text-foreground/70"
                    aria-hidden
                  />
                  {toSentenceCase(category.categoryName)}
                </h3>
                {/* Safari drops list semantics from a list without markers unless the role is set. */}
                <ul role="list" className="space-y-3">
                  {category.features.map((feature) => {
                    // The listings API sends a feature's name as its description when it has none.
                    const featureDescription = feature.description.trim();
                    const hasDescription =
                      featureDescription !== "" && featureDescription !== feature.name;
                    return (
                      <li key={feature.name} className="flex gap-3 wrap-anywhere">
                        <HugeiconsIcon
                          icon={Tick02Icon}
                          strokeWidth={2}
                          className="mt-0.5 size-5 shrink-0 text-primary-text"
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <p className="text-base font-medium text-foreground">
                            {toSentenceCase(feature.name)}
                          </p>
                          {hasDescription && (
                            <p className="max-w-prose text-base text-foreground/75">
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
      </div>
    </section>
  );
}

/** A titled block below the accessibility panel. A rule above it separates it from the last. */
function Section({
  id,
  title,
  className,
  children,
}: {
  id: string;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={cn("border-t pt-8", className)}>
      <h2 id={id} className="mb-3 text-xl font-semibold tracking-tight">
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
      className="inline-flex min-h-6 items-start gap-2 text-[15px] text-primary-text underline-offset-4 hover:underline"
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
  coordinates,
  walkScore,
}: ListingDetailProps) {
  const address = buildAddress({ unitNumber, street1, street2, city, postalCode });
  const heading = title || address;
  const availableDate = availableOn ? formatListingDate(availableOn) : undefined;
  const trimmedDescription = description?.trim();

  // Rent leads the contact card on desktop and the bottom bar on phones, so the key facts stay
  // with the home itself. The embedded preview has neither, so rent joins the facts there.
  const keyFacts = [
    { icon: BedDoubleIcon, label: formatBeds(beds) },
    { icon: Bathtub01Icon, label: formatBaths(baths) },
    ...(sqft !== null ? [{ icon: FloorPlanIcon, label: formatArea(sqft) }] : []),
    ...(availableDate ? [{ icon: Calendar03Icon, label: `Available ${availableDate}` }] : []),
  ];
  const trimmedDeposit = depositInfo?.trim();
  // The form preview passes the move-in date here, because a draft hasn't been posted.
  const posted = timeAgo.endsWith(" ago") ? timeAgo : undefined;

  // Rent, size and availability are in the key facts above, and the address and posting date are
  // under the title, so the details list only holds what isn't shown elsewhere.
  const rentalDetailRows: Array<{
    label: string;
    value: string;
    info?: { label: string; description: string };
    fullWidth?: boolean;
    preserveWhitespace?: boolean;
  }> = [
    ...(trimmedDeposit
      ? [
          {
            label: "Deposit",
            value: trimmedDeposit,
            fullWidth: trimmedDeposit.length > SHORT_DETAIL_LENGTH || trimmedDeposit.includes("\n"),
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
        description={
          title || posted ? (
            <span className="wrap-anywhere">
              {[title ? address : undefined, posted ? `Posted ${posted}` : undefined]
                .filter(Boolean)
                .join(" · ")}
            </span>
          ) : undefined
        }
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
        className="flex flex-wrap items-center gap-x-5 gap-y-2 text-base text-foreground"
      >
        {embedded && (
          <li>
            <Price price={price} className="text-2xl" />
          </li>
        )}
        {keyFacts.map((fact) => (
          <li key={fact.label} className="flex items-center gap-2">
            <HugeiconsIcon
              icon={fact.icon}
              strokeWidth={2}
              className="size-4.5 text-foreground/70"
              aria-hidden
            />
            {fact.label}
          </li>
        ))}
      </ul>
    </div>
  );

  // On desktop the page has two columns: the reading content on the left, and the contact card
  // with the location under it on the right. Phones and the embedded preview have one column, where
  // `display: contents` dissolves both column wrappers and `order` interleaves their blocks, so
  // contact comes straight after the accessibility panel.
  const twoColumns = !embedded;

  const location = (coordinates || walkScore) && (
    <Section
      id="listing-location"
      title="Location"
      className={cn("order-5", twoColumns && "lg:border-t-0 lg:pt-0")}
    >
      <div className="space-y-3">
        {/* The address is under the page title, which sits just above the sidebar on desktop. */}
        <p
          className={cn(
            "flex items-start gap-2.5 text-base wrap-anywhere text-foreground",
            twoColumns && "lg:sr-only",
          )}
        >
          <HugeiconsIcon
            icon={Location01Icon}
            strokeWidth={2}
            className="mt-0.5 size-5 shrink-0 text-foreground/70"
            aria-hidden
          />
          {address}
        </p>
        {coordinates && <ListingLocationMap lat={coordinates.lat} lng={coordinates.lng} />}
        {walkScore}
      </div>
    </Section>
  );

  const mainColumn = (
    <div className={cn("contents", twoColumns && "lg:flex lg:min-w-0 lg:flex-col lg:gap-8")}>
      <div className="order-1">
        <AccessibilityFeatures categories={features} />
      </div>

      {trimmedDescription && (
        <Section id="listing-description" title="Description" className="order-3">
          <p className="max-w-prose text-base whitespace-pre-line wrap-anywhere text-foreground">
            {trimmedDescription}
          </p>
        </Section>
      )}

      <Section id="listing-rental-details" title="Rental details" className="order-4">
        {/* Columns follow the section's width, which differs in the form preview. */}
        <div className="@container">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 pt-1 @lg:grid-cols-3">
            {rentalDetailRows.map((row) => (
              <div key={row.label} className={cn("min-w-0", row.fullWidth && "col-span-full")}>
                <dt className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                  {row.label}
                  {row.info && <InfoPopover {...row.info} />}
                </dt>
                <dd
                  className={cn(
                    "mt-0.5 text-base font-medium wrap-anywhere text-foreground",
                    row.preserveWhitespace && "whitespace-pre-line",
                  )}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      {instructions && (
        <Section id="listing-how-to-apply" title="How to apply" className="order-6">
          <figure className="space-y-2">
            <figcaption className="text-sm text-muted-foreground">
              From the housing provider
            </figcaption>
            <blockquote className="rounded-r-lg border-l-2 border-primary/40 bg-muted/50 px-4 py-3 text-base whitespace-pre-line wrap-anywhere">
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
      className="order-2 min-w-0 scroll-mt-24"
    >
      <div className="space-y-5 rounded-xl border bg-card p-5 text-card-foreground shadow-sm sm:p-6 dark:border-white/12">
        {/* Phones get the price from the bottom bar, so it shows here on desktop only. */}
        {!embedded && (
          <div className="hidden lg:block">
            <Price price={price} className="text-[1.75rem]" />
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
            {/* Phones have Apply in the bottom bar, so the card keeps only the contacts there. */}
            {applyUrl && (
              <ListingApplyButton
                applicationUrl={applyUrl}
                className={cn("w-full", !embedded && "max-lg:hidden")}
              />
            )}
            <p className="text-sm text-muted-foreground">
              Apply directly with the housing provider, outside this portal.
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
                      <p className="text-base font-medium wrap-anywhere">{contactName.trim()}</p>
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
          "flex flex-col gap-8",
          twoColumns && "lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-x-14",
        )}
      >
        {mainColumn}
        <div
          className={cn(
            "contents",
            twoColumns &&
              // Sticky on desktop, so rent and Apply follow the reader down the page. Only on
              // screens tall enough to show the whole column, or its end would stay out of reach.
              "lg:flex lg:flex-col lg:gap-6 lg:[@media(min-height:52rem)]:sticky lg:[@media(min-height:52rem)]:top-22",
          )}
        >
          {contactCard}
          {location}
        </div>
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
          fixed, so it takes its own space at the end of the page (nothing is left hidden under it)
          and stops above the site footer. Solid, so text scrolling underneath doesn't show through. */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-6 -mb-8 border-t bg-background px-4 py-3 sm:-mx-6 sm:-mb-10 sm:px-6 lg:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Price price={price} className="min-w-0 text-xl" />
          {applyUrl ? (
            <ListingApplyButton applicationUrl={applyUrl} className="px-8" />
          ) : canReachLister ? (
            <Button asChild size="lg" className="px-8">
              <a href={`#${CONTACT_SECTION_ID}`}>Contact</a>
            </Button>
          ) : null}
        </div>
      </div>
    </AppPageShell>
  );
}
