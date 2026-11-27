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
  WheelchairIcon,
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

/** The cards in the desktop sidebar: contact and location. */
const sideCardClassName =
  "rounded-xl border bg-card p-5 text-card-foreground shadow-sm sm:p-6 dark:border-white/12";

function Price({ price, className }: { price: number; className?: string }) {
  return (
    <span className={cn("font-semibold tracking-tight text-foreground", className)}>
      {formatRent(price)}
      <span className="text-[0.7em] font-normal text-muted-foreground"> {RENT_PERIOD}</span>
    </span>
  );
}

/** Below this many features, grouping by category adds more headings than it saves. */
const MIN_FEATURES_TO_GROUP = 5;

function FeatureItem({ feature, category }: { feature: ListingFeature; category?: string }) {
  // The listings API sends a feature's name as its description when it has none.
  const featureDescription = feature.description.trim();
  const hasDescription = featureDescription !== "" && featureDescription !== feature.name;
  return (
    <li className="flex gap-3 wrap-anywhere">
      <HugeiconsIcon
        icon={Tick02Icon}
        strokeWidth={2}
        className="mt-0.5 size-5 shrink-0 text-primary-text"
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-base font-semibold text-foreground">{toSentenceCase(feature.name)}</p>
        {hasDescription && (
          <p className="mt-0.5 max-w-prose text-[15px] leading-6 text-foreground/80">
            {featureDescription}
          </p>
        )}
        {category && (
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {toSentenceCase(category)}
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * The most important block after the photos, so it sits on its own panel. With enough features,
 * each category gets a small muted label over its rows; with only a few, one flat list reads
 * better, and the category shows under each feature instead.
 */
function AccessibilityFeatures({ categories }: { categories: ListingFeatureCategory[] }) {
  const count = categories.reduce((total, category) => total + category.features.length, 0);
  const grouped = count >= MIN_FEATURES_TO_GROUP;
  // In the flat list, each feature names its category, unless they all share one.
  const labelCategories = categories.filter((category) => category.features.length > 0).length > 1;
  const headingId = "listing-accessibility";

  return (
    <section aria-labelledby={headingId}>
      {/* Light mode tints the panel; dark mode keeps the shared card surface and carries the
          brand colour in the border only, so it matches the contact card beside it. */}
      <div className="rounded-xl border border-primary/15 bg-primary/4 p-5 sm:p-7 dark:border-primary-text/35 dark:bg-card">
        <div className="mb-6 flex items-center gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HugeiconsIcon icon={WheelchairIcon} strokeWidth={2} className="size-5" aria-hidden />
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
        ) : grouped ? (
          <div className="space-y-7">
            {categories.map((category) => (
              <div key={category.categoryName}>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium tracking-normal text-muted-foreground">
                  <HugeiconsIcon
                    icon={featureIcon(category.categoryName)}
                    strokeWidth={2}
                    className="size-4 shrink-0"
                    aria-hidden
                  />
                  {toSentenceCase(category.categoryName)}
                </h3>
                {/* Safari drops list semantics from a list without markers unless the role is set. */}
                <ul role="list" className="space-y-4">
                  {category.features.map((feature) => (
                    <FeatureItem key={feature.name} feature={feature} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <ul role="list" className="space-y-5">
            {categories.flatMap((category) =>
              category.features.map((feature) => (
                <FeatureItem
                  key={`${category.categoryName}-${feature.name}`}
                  feature={feature}
                  category={labelCategories ? category.categoryName : undefined}
                />
              )),
            )}
          </ul>
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

/** Keeps the info button on the same line as the label's last word when the label wraps. */
function LabelWithInfo({
  label,
  info,
}: {
  label: string;
  info: { label: string; description: string };
}) {
  const lastSpace = label.lastIndexOf(" ");
  return (
    <>
      {label.slice(0, lastSpace + 1)}
      <span className="whitespace-nowrap">
        {label.slice(lastSpace + 1)}
        <span className="ml-1 inline-flex align-middle">
          <InfoPopover {...info} />
        </span>
      </span>
    </>
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

  // Rent sits beside the title on desktop and in the bottom bar on phones. The embedded preview
  // has neither, so rent joins the facts there. On desktop the move-in date leads the contact
  // card instead, beside Apply.
  const keyFacts = [
    { icon: BedDoubleIcon, label: formatBeds(beds) },
    { icon: Bathtub01Icon, label: formatBaths(baths) },
    ...(sqft !== null ? [{ icon: FloorPlanIcon, label: formatArea(sqft) }] : []),
    ...(availableDate
      ? [
          {
            icon: Calendar03Icon,
            label: `Available ${availableDate}`,
            className: embedded ? undefined : "lg:hidden",
          },
        ]
      : []),
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
    preserveWhitespace?: boolean;
  }> = [
    ...(trimmedDeposit
      ? [
          {
            label: "Deposit",
            value: trimmedDeposit,
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
            // Phones put the posting date on its own line, so it never wraps mid-phrase.
            <span className="wrap-anywhere">
              {title && address}
              {title && posted && <span className="max-sm:hidden"> · </span>}
              {posted && <span className="whitespace-nowrap max-sm:block">Posted {posted}</span>}
            </span>
          ) : undefined
        }
        actions={
          !embedded || editUrl ? (
            <>
              {/* Phones and tablets show rent in the bottom bar instead. pt-1 lines its baseline
                  up with the title's. */}
              {!embedded && (
                <p className="pt-1 text-2xl leading-8 font-bold tracking-tight whitespace-nowrap max-lg:hidden">
                  {formatRent(price)}
                  <span className="text-base font-normal text-muted-foreground">
                    {" "}
                    {RENT_PERIOD}
                  </span>
                </p>
              )}
              {editUrl && (
                <Button asChild variant="outline">
                  <Link href={editUrl}>
                    <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} aria-hidden />
                    Edit listing
                  </Link>
                </Button>
              )}
            </>
          ) : null
        }
      />
      {/* Two columns of facts on phones, so a long fact never wraps onto a line by itself. The
          first column takes its content's width, leaving the second room for the move-in date. */}
      <ul
        role="list"
        aria-label="Key facts"
        className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-base text-foreground sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2"
      >
        {embedded && (
          <li className="col-span-2">
            <Price price={price} className="text-2xl" />
          </li>
        )}
        {keyFacts.map((fact) => (
          <li key={fact.label} className={cn("flex items-center gap-2", fact.className)}>
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

  // A card like the contact card, so the two stack as one column on desktop.
  const location = (coordinates || walkScore) && (
    <section aria-labelledby="listing-location" className="order-5 min-w-0">
      <div className={cn(sideCardClassName, "space-y-3")}>
        <h2 id="listing-location" className="text-xl font-semibold tracking-tight">
          Location
        </h2>
        <p className="flex items-start gap-2.5 text-base wrap-anywhere text-foreground">
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
    </section>
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
        {/* One label and value per row, so any number of details looks complete and long values
            like the deposit wrap in place. */}
        <dl className="divide-y border-y">
          {rentalDetailRows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-baseline gap-4 py-3"
            >
              <dt className="text-[15px] text-muted-foreground">
                {row.info ? <LabelWithInfo label={row.label} info={row.info} /> : row.label}
              </dt>
              <dd
                className={cn(
                  "text-base font-medium wrap-anywhere text-foreground",
                  row.preserveWhitespace && "whitespace-pre-line",
                )}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
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
      <div className={cn(sideCardClassName, "space-y-5")}>
        {/* Rent is beside the title on desktop, in the same screen, so the card leads with the
            move-in date and Apply. */}
        {!embedded && availableDate && (
          <p className="hidden items-center gap-2.5 text-lg font-semibold tracking-tight lg:flex">
            <HugeiconsIcon
              icon={Calendar03Icon}
              strokeWidth={2}
              className="size-5 shrink-0 text-foreground/70"
              aria-hidden
            />
            Available {availableDate}
          </p>
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
                {/* When one contact covers everything, this repeats the card's heading wherever that
                    heading shows (phones and the form preview), so it's hidden there. */}
                <h3
                  className={cn(
                    "text-sm font-semibold tracking-normal",
                    allContactMethodsShared && (embedded ? "sr-only" : "max-lg:sr-only"),
                  )}
                >
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
                            <span className="block pl-6 text-sm text-muted-foreground">
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
