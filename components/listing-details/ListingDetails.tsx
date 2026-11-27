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
} from "@hugeicons/core-free-icons";

import { ListingImageCarousel } from "../listing-image-carousel/ListingImageCarousel";
import { formatAvailability } from "../listings-card/ListingsCard";
import { AccessibilityMark } from "@/components/ui/accessibility-mark";
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
  formatRent,
  toSentenceCase,
} from "@/lib/listing-format";
import Link from "next/link";
import { BackToResults } from "./BackToResults";
import { ListingApplyButton } from "./ListingApplyButton";
import { ListingLocationMap } from "./ListingLocationMap";

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

/**
 * The contact card in the desktop sidebar. Phones and the form preview show the same content as a
 * plain section.
 */
const contactCardClassName =
  "lg:rounded-xl lg:border lg:bg-card lg:p-6 lg:text-card-foreground lg:dark:border-white/12";

/** Rent at 28px; `className` can size it down, as the phone bottom bar does. */
function Price({ price, className }: { price: number; className?: string }) {
  return (
    <span
      className={cn("text-[28px] leading-9 font-bold whitespace-nowrap text-foreground", className)}
    >
      {formatRent(price)}
      <span className="text-base font-normal text-muted-foreground">{RENT_PERIOD}</span>
    </span>
  );
}

function FeatureItem({ feature }: { feature: ListingFeature }) {
  // The listings API sends a feature's name as its description when it has none.
  const featureDescription = feature.description.trim();
  const hasDescription = featureDescription !== "" && featureDescription !== feature.name;
  return (
    <li className="flex gap-3 wrap-anywhere">
      <HugeiconsIcon
        icon={Tick02Icon}
        strokeWidth={2}
        className="mt-0.5 size-5 shrink-0 text-foreground"
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-base font-medium text-foreground">{toSentenceCase(feature.name)}</p>
        {hasDescription && (
          <p className="mt-0.5 max-w-prose text-base text-foreground">{featureDescription}</p>
        )}
      </div>
    </li>
  );
}

/**
 * The most important block after the photos, and the page's signature: a card with a strip of
 * tactile yellow along its top edge and the accessibility mark by its heading. Features sit under
 * a small muted label for their category.
 */
function AccessibilityFeatures({ categories }: { categories: ListingFeatureCategory[] }) {
  const count = categories.reduce((total, category) => total + category.features.length, 0);
  const headingId = "listing-accessibility";

  return (
    <section
      aria-labelledby={headingId}
      className="relative overflow-hidden rounded-xl border bg-card p-5 pt-[26px] text-card-foreground sm:p-6 sm:pt-[30px] dark:border-white/12"
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-signal" />
      <div className="mb-5 flex items-center gap-3">
        <AccessibilityMark size="lg" />
        <h2 id={headingId} className="min-w-0 text-[22px] leading-7 font-bold">
          Accessibility features
        </h2>
        {count > 0 && (
          <p className="ml-auto shrink-0 text-sm text-muted-foreground max-sm:hidden">
            {count} {count === 1 ? "feature" : "features"}
          </p>
        )}
      </div>
      {count === 0 ? (
        <p className="text-base text-foreground">No accessibility features listed.</p>
      ) : (
        <div className="space-y-6">
          {categories
            .filter((category) => category.features.length > 0)
            .map((category) => (
              <div key={category.categoryName}>
                <h3 className="mb-3 text-sm font-medium tracking-normal text-muted-foreground">
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
      )}
    </section>
  );
}

/** A plain titled block below the accessibility panel, 40px below the one before it. */
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
    <section aria-labelledby={id} className={cn("pt-10", className)}>
      <h2 id={id} className="mb-3 text-[22px] leading-7 font-bold">
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
  const trimmedDescription = description?.trim();

  // Rent is in the contact card on desktop and in the bottom bar below `lg`. The embedded preview
  // has neither, so rent joins the facts there.
  const keyFacts = [
    { key: "beds", icon: BedDoubleIcon, label: formatBeds(beds) },
    { key: "baths", icon: Bathtub01Icon, label: formatBaths(baths) },
    ...(sqft !== null ? [{ key: "area", icon: FloorPlanIcon, label: formatArea(sqft) }] : []),
    ...(availableOn
      ? [{ key: "available", icon: Calendar03Icon, label: formatAvailability(availableOn) }]
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
            label: "Lease term",
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

  const hasPhotos = images.length > 0;

  const header = (
    <div className="space-y-4">
      <PageHeader
        title={<span className="wrap-anywhere">{heading}</span>}
        description={
          title || posted ? (
            // On phones the posting date drops its dot and wraps under the address as a whole.
            <span className="mt-0.5 flex flex-wrap items-baseline gap-x-2 wrap-anywhere sm:gap-x-0">
              {title && <span>{address}</span>}
              {posted && (
                <span className="whitespace-nowrap max-sm:text-sm">
                  {title && <span className="max-sm:hidden">&nbsp;·&nbsp;</span>}
                  Posted {posted}
                </span>
              )}
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
          ) : undefined
        }
      />
      {/* A 2×2 grid of facts on phones, so a long fact never wraps onto a line by itself. */}
      <ul
        role="list"
        aria-label="Key facts"
        className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-base text-foreground sm:flex sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2"
      >
        {embedded && (
          <li className="col-span-2">
            <Price price={price} className="text-[22px] leading-7" />
          </li>
        )}
        {keyFacts.map((fact) => (
          <li key={fact.key} className="flex min-w-0 items-center gap-2">
            <HugeiconsIcon
              icon={fact.icon}
              strokeWidth={2}
              className="size-5 shrink-0 text-foreground/70"
              aria-hidden
            />
            <span>{fact.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  // On desktop the page has two columns: plain sections on the left, and the contact card on the
  // right. Phones and the embedded preview have one column, where `display: contents` dissolves
  // the left column's wrapper and `order` puts contact straight after the accessibility panel.
  const twoColumns = !embedded;

  const location = (coordinates || walkScore) && (
    <Section id="listing-location" title="Location" className="order-6">
      <div className="space-y-4">
        <p className="flex items-start gap-2.5 text-base wrap-anywhere text-foreground">
          <HugeiconsIcon
            icon={Location01Icon}
            strokeWidth={2}
            className="mt-0.5 size-5 shrink-0 text-foreground/70"
            aria-hidden
          />
          {address}
        </p>
        {coordinates && (
          <ListingLocationMap
            lat={coordinates.lat}
            lng={coordinates.lng}
            className="aspect-[4/3] sm:aspect-[2/1]"
          />
        )}
        {walkScore}
      </div>
    </Section>
  );

  const mainColumn = (
    <div className={cn("contents", twoColumns && "lg:flex lg:min-w-0 lg:flex-col")}>
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
            like the deposit wrap in place. Rules only between rows. */}
        <dl className="divide-y">
          {rentalDetailRows.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-baseline gap-4 py-3 first:pt-0 last:pb-0"
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
        <Section id="listing-how-to-apply" title="How to apply" className="order-5">
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

      {location}
    </div>
  );

  const contactCard = (
    <aside
      id={CONTACT_SECTION_ID}
      aria-labelledby={`${CONTACT_SECTION_ID}-heading`}
      className={cn(
        "order-2 min-w-0 scroll-mt-6 pt-10",
        // Sticky on desktop, so rent and Apply follow the reader down the page, clear of the site
        // header's height.
        twoColumns && "lg:sticky lg:top-6 lg:pt-0",
      )}
    >
      <div className={cn("space-y-5", twoColumns && contactCardClassName)}>
        {/* The page's one rent on desktop, over Apply, so it stays in view as the reader scrolls.
            Phones have it in the bottom bar. */}
        {twoColumns && <Price price={price} className="block max-lg:hidden" />}
        <h2
          id={`${CONTACT_SECTION_ID}-heading`}
          className={cn("text-[22px] leading-7 font-bold", twoColumns && "lg:sr-only")}
        >
          Contact and applications
        </h2>
        {(applyUrl || hasContactMethod || hasApplicationMethod || instructions) && (
          <div className="space-y-2">
            {/* Phones have Apply in the bottom bar, so the section keeps only the contacts there. */}
            {applyUrl && (
              <ListingApplyButton
                applicationUrl={applyUrl}
                className={cn("w-full", twoColumns && "max-lg:hidden")}
              />
            )}
            <p className="text-sm text-muted-foreground">
              You apply directly with the housing provider.
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
                    "text-sm font-medium tracking-normal",
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
                <h3 className="text-sm font-medium tracking-normal">Applications</h3>
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
    <div className={cn("mx-auto flex w-full flex-col gap-6 sm:gap-8", pageWidths.content)}>
      <div className="flex flex-col gap-2">
        {/* Phones with photos get the link over the first photo instead. */}
        {!embedded && <BackToResults className={cn(hasPhotos && "max-sm:hidden")} />}
        {header}
      </div>
      {hasPhotos && (
        // Phones show the photos before the title, edge to edge, by cancelling the page shell's
        // padding, with a round back button over the top-left corner.
        <div
          className={cn("relative", !embedded && "max-sm:order-first max-sm:-mx-4 max-sm:-mt-8")}
        >
          <ListingImageCarousel images={images} altPrefix={address} edgeToEdge={!embedded} />
          {!embedded && <BackToResults iconOnly className="absolute top-3 left-3 z-10 sm:hidden" />}
        </div>
      )}
      <div
        className={cn(
          "flex flex-col",
          twoColumns && "lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-x-14",
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
          fixed, so it takes its own space at the end of the page (nothing is left hidden under it)
          and stops above the site footer. Solid, so text scrolling underneath doesn't show through. */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-4 -mb-8 border-t bg-background px-4 py-3 sm:-mx-6 sm:-mb-10 sm:px-6 lg:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Price price={price} className="min-w-0 text-[22px] leading-7" />
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
