export type PrivacyNoticeLink = {
  text: string;
  href: string;
  external?: boolean;
};

export type PrivacyNoticeItem = {
  title: string;
  body: string;
  link?: PrivacyNoticeLink;
};

export type PrivacyNoticeSection = {
  id: string;
  title: string;
  intro?: string;
  paragraphs?: readonly string[];
  items?: readonly PrivacyNoticeItem[];
  link?: PrivacyNoticeLink;
};

export type SoftwarePrivacySectionId =
  | "operator-and-scope"
  | "account-and-auth"
  | "invitations-and-email"
  | "listings-and-photos"
  | "browsing-and-saved-activity"
  | "cookies-and-storage"
  | "third-party-services"
  | "what-we-do-not-collect"
  | "retention-and-requests"
  | "privacy-contact";

export type PrivacySectionOverride =
  | {
      mode: "replace";
      title?: string;
      intro?: string;
      paragraphs?: readonly string[];
      items?: readonly PrivacyNoticeItem[];
      link?: PrivacyNoticeLink;
    }
  | {
      mode: "append";
      extraParagraphs?: readonly string[];
      extraItems?: readonly PrivacyNoticeItem[];
    };

export type PrivacyDeploymentConfig = {
  /** Legal entity name operating this deployment, if different from `siteConfig.operator.name`. */
  operatorLegalName?: string;
  /** Date the operator reviewed or updated this notice (for example, "2026-05-01"). */
  lastUpdated?: string;
  /** Privacy contact details. Falls back to `siteConfig.contactEmail` when omitted. */
  contact?: {
    name?: string;
    role?: string;
    email?: string;
    phone?: string;
    mailingAddress?: string;
  };
  /** Hosting provider and data-processing region details for this deployment. */
  infrastructure?: {
    /** Hosting provider running the application server and PostgreSQL database. */
    hostingProvider?: string;
    /** Country or region where the application server and database are hosted. */
    hostingRegion?: string;
    /** Additional countries or regions where external service providers may process data. */
    crossBorderRegions?: readonly string[];
    /** Additional deployment-specific note on hosting safeguards or cross-border transfers. */
    crossBorderNote?: string;
  };
  /** Deployment-specific retention schedule and data-request handling. */
  retentionAndRequests?: {
    /** Operator policy for keeping or purging deactivated accounts, archived listings, and logs. */
    accountAndListingRetention?: string;
    /** How users submit access, correction, export, or permanent deletion requests. */
    requestProcess?: string;
    /** Target timeframe for responding to privacy requests (for example, "within 30 days"). */
    responseTimeframe?: string;
  };
  /** Applicable privacy law or supervisory authority for this deployment. */
  jurisdiction?: {
    description?: string;
    authorityName?: string;
    authorityUrl?: string;
  };
  /**
   * Set to false when this deployment does not configure WALKSCORE_API_KEY.
   * Defaults to true so the Walk Score integration is disclosed when enabled.
   */
  walkScoreEnabled?: boolean;
  /** Replace or append to individual built-in sections without editing software-level code. */
  sectionOverrides?: Partial<Record<SoftwarePrivacySectionId, PrivacySectionOverride>>;
  /** Deployment-specific sections inserted before the final privacy contact section. */
  extraSections?: readonly PrivacyNoticeSection[];
};

export type PrivacyNoticeSiteInfo = {
  readonly name: string;
  readonly operator: { readonly name: string; readonly url: string };
  readonly contactEmail: string;
  readonly feedbackFormUrl?: string;
  readonly bookingUrl?: string;
  readonly builder: { readonly name: string; readonly url: string };
  readonly repositoryUrl: string;
};

export type PrivacyNoticeDocument = {
  title: string;
  subtitle: string;
  lastUpdated?: string;
  introduction: string;
  sections: readonly PrivacyNoticeSection[];
};

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function cleanStrings(values: readonly string[] | undefined): string[] {
  if (!values) return [];
  return values.map((value) => value.trim()).filter((value) => value.length > 0);
}

function cleanLink(link: PrivacyNoticeLink | undefined): PrivacyNoticeLink | undefined {
  const text = nonEmpty(link?.text);
  const href = nonEmpty(link?.href);
  if (!text || !href) return undefined;
  return link?.external === undefined ? { text, href } : { text, href, external: link.external };
}

function cleanItems(items: readonly PrivacyNoticeItem[] | undefined): PrivacyNoticeItem[] {
  if (!items) return [];
  const cleaned: PrivacyNoticeItem[] = [];
  for (const item of items) {
    const title = nonEmpty(item.title);
    const body = nonEmpty(item.body);
    if (!title || !body) continue;
    const link = cleanLink(item.link);
    cleaned.push(link ? { title, body, link } : { title, body });
  }
  return cleaned;
}

function formatList(values: readonly string[]): string {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function applySectionOverride(
  section: PrivacyNoticeSection,
  override: PrivacySectionOverride | undefined,
): PrivacyNoticeSection {
  if (!override) return section;

  if (override.mode === "replace") {
    return {
      id: section.id,
      title: nonEmpty(override.title) ?? section.title,
      intro: override.intro === undefined ? section.intro : nonEmpty(override.intro),
      paragraphs: override.paragraphs === undefined ? undefined : cleanStrings(override.paragraphs),
      items: override.items === undefined ? undefined : cleanItems(override.items),
      link: cleanLink(override.link),
    };
  }

  const extraParagraphs = cleanStrings(override.extraParagraphs);
  const extraItems = cleanItems(override.extraItems);

  return {
    ...section,
    paragraphs:
      extraParagraphs.length > 0
        ? [...(section.paragraphs ?? []), ...extraParagraphs]
        : section.paragraphs,
    items: extraItems.length > 0 ? [...(section.items ?? []), ...extraItems] : section.items,
  };
}

/**
 * Builds the privacy notice from software-level behaviour implemented in Accessible Housing Portal
 * combined with deployment-specific configuration supplied by the instance operator.
 */
export function buildPrivacyNotice(
  site: PrivacyNoticeSiteInfo,
  deployment: PrivacyDeploymentConfig = {},
): PrivacyNoticeDocument {
  const operatorDisplayName = nonEmpty(site.operator.name) ?? site.name;
  const operatorLegalName = nonEmpty(deployment.operatorLegalName);
  const effectiveOperatorName = operatorLegalName ?? operatorDisplayName;
  const operatorUrl = nonEmpty(site.operator.url);
  const builderName = nonEmpty(site.builder.name) ?? "Accessible Housing Portal contributors";
  const repositoryUrl = nonEmpty(site.repositoryUrl);
  const lastUpdated = nonEmpty(deployment.lastUpdated);

  const contactEmail = nonEmpty(deployment.contact?.email) ?? nonEmpty(site.contactEmail);
  const contactName = nonEmpty(deployment.contact?.name);
  const contactRole = nonEmpty(deployment.contact?.role);
  const contactPhone = nonEmpty(deployment.contact?.phone);
  const contactMailingAddress = nonEmpty(deployment.contact?.mailingAddress);

  const hostingProvider = nonEmpty(deployment.infrastructure?.hostingProvider);
  const hostingRegion = nonEmpty(deployment.infrastructure?.hostingRegion);
  const crossBorderRegions = cleanStrings(deployment.infrastructure?.crossBorderRegions);
  const crossBorderNote = nonEmpty(deployment.infrastructure?.crossBorderNote);

  const accountAndListingRetention = nonEmpty(
    deployment.retentionAndRequests?.accountAndListingRetention,
  );
  const requestProcess = nonEmpty(deployment.retentionAndRequests?.requestProcess);
  const responseTimeframe = nonEmpty(deployment.retentionAndRequests?.responseTimeframe);

  const jurisdictionDescription = nonEmpty(deployment.jurisdiction?.description);
  const authorityName = nonEmpty(deployment.jurisdiction?.authorityName);
  const authorityUrl = nonEmpty(deployment.jurisdiction?.authorityUrl);

  const walkScoreEnabled = deployment.walkScoreEnabled !== false;

  const operatorSummary =
    operatorLegalName && operatorLegalName !== operatorDisplayName
      ? `${site.name} is operated by ${operatorLegalName}, operating as ${operatorDisplayName}.`
      : `${site.name} is operated by ${effectiveOperatorName}.`;

  const hostingItem = buildHostingItem({
    operatorName: effectiveOperatorName,
    hostingProvider,
    hostingRegion,
    crossBorderRegions,
    crossBorderNote,
  });

  const externalLinksDetail = buildExternalLinksDetail(site);

  const thirdPartyItems: PrivacyNoticeItem[] = [
    {
      title: "Transactional email delivery (Resend)",
      body: "Account invitations, welcome messages, and password-reset emails are sent through Resend. Resend receives the recipient email address, recipient name when included in the message, and message content, and sends signed delivery-status webhooks back to this application.",
    },
    {
      title: "Interactive map tiles (OpenFreeMap)",
      body: "When you view the map on the listings page, your browser loads map styles, vector tiles, sprites, and map glyphs directly from tiles.openfreemap.org. OpenFreeMap receives your IP address, standard browser request headers, and the map region you view. No account information is sent to OpenFreeMap, and listing markers are placed locally in your browser.",
    },
    ...(walkScoreEnabled
      ? [
          {
            title: "Location scores (Walk Score by Redfin)",
            body: "When a deployment configures Walk Score and a signed-in user opens a listing with map coordinates, the server sends the property address, unit number if present, and latitude and longitude to api.walkscore.com to retrieve Walk, Transit, and Bike scores. No user account information is sent to Walk Score. Clicking Walk Score attribution or detail links opens external walkscore.com or redfin.com pages.",
          },
        ]
      : []),
    {
      title: "Self-hosted fonts",
      body: "Application fonts are bundled and served from this site. Your browser does not contact external font CDNs at runtime.",
    },
    {
      title: "External links",
      body: externalLinksDetail,
    },
    hostingItem,
  ];

  const retentionItems: PrivacyNoticeItem[] = [
    {
      title: "Automated cleanup built into the software",
      body: "Sign-in sessions expire after 7 days (or earlier when you sign out, change or reset your password, or an administrator suspends or deactivates your account). Password-reset links expire after 1 hour and invitation links expire after 7 days; changing or resetting a password deletes outstanding reset tokens. Encrypted invitation URLs are cleared when an invitation is accepted, revoked, or replaced, and encrypted email-job secrets are redacted after queued jobs finish or fail. Verified Resend webhook receipts are automatically deleted after 90 days by a daily background job when the email worker is enabled.",
    },
    {
      title: "Records without automated purging",
      body: "The software does not automatically delete user accounts, properties, listings, uploaded listing photos, or email delivery attempt logs. Archiving a listing hides it from searchers while keeping the database record. Deactivating an account immediately revokes active sessions and blocks sign-in while preserving the account row and property or listing audit references. Removing a photo from a listing in the editor deletes that image row from the database.",
    },
    {
      title: "Managing your own security settings",
      body: "Signed-in users can change their password, add or remove passkeys, enable or disable an authenticator app, replace recovery codes, and inspect or sign out active device sessions from their account security page.",
      link: { text: "Open Manage account.", href: "/manage-account" },
    },
    ...(accountAndListingRetention
      ? [
          {
            title: "Deployment retention schedule",
            body: accountAndListingRetention,
          },
        ]
      : []),
    {
      title: "Access, correction, and deletion requests",
      body: buildRequestHandlingBody({
        operatorName: effectiveOperatorName,
        requestProcess,
        responseTimeframe,
      }),
    },
  ];

  const contactItems: PrivacyNoticeItem[] = [];
  if (contactName || contactRole) {
    const label = [contactName, contactRole].filter(Boolean).join(", ");
    contactItems.push({
      title: "Privacy contact",
      body: label,
    });
  }
  if (contactEmail) {
    contactItems.push({
      title: "Email",
      body: "Send privacy questions or data requests to",
      link: { text: contactEmail, href: `mailto:${contactEmail}` },
    });
  }
  if (contactPhone) {
    contactItems.push({
      title: "Phone",
      body: contactPhone,
    });
  }
  if (contactMailingAddress) {
    contactItems.push({
      title: "Mailing address",
      body: contactMailingAddress,
    });
  }
  if (jurisdictionDescription) {
    contactItems.push({
      title: "Applicable privacy framework",
      body: jurisdictionDescription,
      ...(authorityName && authorityUrl
        ? { link: { text: authorityName, href: authorityUrl, external: true } }
        : {}),
    });
  }

  const softwareSections: Record<SoftwarePrivacySectionId, PrivacyNoticeSection> = {
    "operator-and-scope": {
      id: "operator-and-scope",
      title: "1. Who operates this platform",
      paragraphs: [
        `${operatorSummary} Access is invitation-only and is intended for authorized housing navigators, housing providers, and platform administrators.`,
        `${site.name} runs on Accessible Housing Portal, open-source software built by ${builderName}. The open-source contributors write the software and do not operate this deployment or have access to its database.`,
      ],
      ...(operatorUrl
        ? { link: { text: `Visit ${operatorDisplayName}.`, href: operatorUrl, external: true } }
        : {}),
    },
    "account-and-auth": {
      id: "account-and-auth",
      title: "2. Account and authentication data",
      intro:
        "Accounts are created by invitation only. Public self-registration is disabled. When an administrator creates your account and when you sign in, the application stores the following records in PostgreSQL:",
      items: [
        {
          title: "Account profile",
          body: "Your full name, email address, optional organization name, role (housing searcher, housing lister, or administrator), account status (invited, active, suspended, or deactivated), email verification flag, two-factor authentication status, and account timestamps (created, updated, invitation accepted, and last sign-in).",
        },
        {
          title: "Passwords",
          body: "Your password is stored as a salted cryptographic hash managed by Better Auth. Plaintext passwords are never stored.",
        },
        {
          title: "Active sessions",
          body: "Each sign-in session stores a session token, expiry timestamp (7 days, refreshed after 24 hours of active use), IP address (read from the trusted edge proxy header, using a /64 prefix for IPv6), and browser user agent so you can review and revoke signed-in devices.",
        },
        {
          title: "Passkeys and authenticator verification",
          body: "If you add a passkey, the application stores its public key, credential identifier, optional name, device and backup metadata, and signature counter. Screen-lock or biometric checks stay on your device; the platform never receives biometric data. If you enable an authenticator app, the application stores your encrypted TOTP secret, encrypted single-use recovery codes, verification state, and failed-attempt lockout data.",
        },
        {
          title: "Verification tokens and rate limits",
          body: "One-time invitation, password-reset, and two-factor challenge identifiers are stored in hashed form with short expiry windows. Database-backed rate-limit counters record request counts by IP address (/64 prefix for IPv6) and endpoint to protect authentication routes against abuse.",
        },
      ],
    },
    "invitations-and-email": {
      id: "invitations-and-email",
      title: "3. Invitations and transactional email",
      items: [
        {
          title: "Account invitations",
          body: "Invitation records store the recipient email address, the inviting administrator's user ID, a hashed token, and lifecycle timestamps (created, expires after 7 days, queued, sent, accepted, revoked, or failed). While an invitation is still pending, an AES-256-GCM encrypted copy of the setup link is stored so an administrator can copy it or the worker can retry a temporary mail bounce. Accepting, revoking, or replacing an invitation clears that encrypted link.",
        },
        {
          title: "Email queue and delivery attempts",
          body: "Welcome emails (for non-admin invitees), account invitations, and password-reset emails are queued in PostgreSQL. One-time links are encrypted with AES-256-GCM while queued and redacted from job rows once the job finishes or fails. Delivery attempt records store timestamps, idempotency keys, provider email IDs, and short outcome codes (queued, sent, delivered, delayed, bounced, complained, failed, or suppressed). Welcome email attempts store their first rendered message encrypted so retries send the same message.",
        },
        {
          title: "Delivery status webhooks",
          body: "Verified Resend webhooks update delivery status in a privacy-minimized receipt ledger. The ledger stores only the event type, provider email ID, timestamps, internal correlation IDs, and short bounce, failure, or suppression codes. Raw webhook payloads, email addresses, subjects, message bodies, IP addresses, links, and open or click events are not stored.",
        },
      ],
    },
    "listings-and-photos": {
      id: "listings-and-photos",
      title: "4. Properties, listings, contact details, and photos",
      items: [
        {
          title: "Property and unit information",
          body: "Housing providers and administrators enter property names, street addresses, cities, provinces, postal codes, countries, neighbourhoods, optional map coordinates, rent, bedroom and bathroom counts, square footage, availability dates, lease terms, heating type, included utilities, deposit details, optional maximum income limits, accessibility and custom listing fields, and audit links to the accounts that own, created, or updated each record.",
        },
        {
          title: "Provider and application contacts",
          body: "Listings may include a property contact name, role, email address, and phone number, as well as application email, phone number, external URL, and instructions. Published listings, including street addresses and listed contact details, are visible to all signed-in users. Draft and archived listings are visible only to the owning provider and administrators.",
        },
        {
          title: "Uploaded listing photos",
          body: "Uploaded photos (JPEG, PNG, WebP, or AVIF) are converted and resized on the server to JPEG format, which removes embedded EXIF camera metadata during re-encoding. The processed image is stored in PostgreSQL along with the uploader's user ID, image dimensions, file size, alt text, display order, and the original filename. Published listing photos are served with a 24-hour public cache header so image optimization works reliably, meaning cached copies may remain available for up to 24 hours after a listing is archived. Draft and archived listing photos require an authorized owner or administrator session and use a 60-second private cache header.",
        },
      ],
    },
    "browsing-and-saved-activity": {
      id: "browsing-and-saved-activity",
      title: "5. Browsing, search filters, and saved activity",
      items: [
        {
          title: "Listing searches and filters",
          body: "When you search or filter listings by location, price, unit size, move-in date, or accessibility features, your active filters are placed in the page URL query string and sent to the server to return matching listings. The application does not keep a search-history log of ad-hoc searches.",
        },
        {
          title: "Saved listings and saved searches",
          body: "The database schema includes tables for saving listings and named search filters (including accessibility feature filters) to a user's account, though those user-facing features are not yet active in the current interface. When enabled on a housing seeker's own account, saved accessibility filters may indicate disability-related housing needs. Those records belong to the signed-in account and are deleted automatically if the account row is removed.",
        },
      ],
    },
    "cookies-and-storage": {
      id: "cookies-and-storage",
      title: "6. Cookies and browser storage",
      items: [
        {
          title: "Essential authentication cookies",
          body: "The application sets host-only HTTP cookies managed by Better Auth to maintain signed-in sessions and protect two-factor and passkey sign-in flows. Session cookie caching is disabled so every protected request is checked against the database.",
        },
        {
          title: "Colour theme preference",
          body: "Your browser stores your chosen light, dark, or system theme in localStorage.",
        },
        {
          title: "No analytics or advertising trackers",
          body: "The software does not include analytics scripts, advertising networks, or cross-site tracking cookies, and enforces a strict Content Security Policy.",
        },
      ],
    },
    "third-party-services": {
      id: "third-party-services",
      title: "7. External services and hosting",
      items: thirdPartyItems,
    },
    "what-we-do-not-collect": {
      id: "what-we-do-not-collect",
      title: "8. What this platform does not collect or do",
      items: [
        {
          title: "No payments or financial accounts",
          body: "The platform does not process rent payments, deposits, fees, or banking details.",
        },
        {
          title: "No on-platform housing applications or tenant records",
          body: "Housing applications, screenings, and lease agreements take place outside the platform directly between housing providers, support organizations, and prospective tenants.",
        },
        {
          title: "No client case files",
          body: "Housing navigators use their own accounts to browse listings. The platform does not request or store personal records about the clients or tenants they support.",
        },
        {
          title: "No device geolocation, camera, or microphone access",
          body: "The application blocks browser geolocation, camera, and microphone permissions through HTTP headers (Permissions-Policy) and does not send addresses to an external geocoding service.",
        },
      ],
    },
    "retention-and-requests": {
      id: "retention-and-requests",
      title: "9. Retention, account deactivation, and privacy requests",
      items: retentionItems,
    },
    "privacy-contact": {
      id: "privacy-contact",
      title: "10. Privacy questions and contact",
      paragraphs: [
        `Questions or requests about personal information stored in ${site.name} should be directed to ${effectiveOperatorName}, not to ${builderName} or the open-source software contributors.`,
      ],
      items: contactItems.length > 0 ? contactItems : undefined,
      ...(repositoryUrl
        ? {
            link: {
              text: "View the Accessible Housing Portal source code on GitHub.",
              href: repositoryUrl,
              external: true,
            },
          }
        : {}),
    },
  };

  const orderedIds: readonly SoftwarePrivacySectionId[] = [
    "operator-and-scope",
    "account-and-auth",
    "invitations-and-email",
    "listings-and-photos",
    "browsing-and-saved-activity",
    "cookies-and-storage",
    "third-party-services",
    "what-we-do-not-collect",
    "retention-and-requests",
  ];

  const mainSections = orderedIds.map((id) =>
    applySectionOverride(softwareSections[id], deployment.sectionOverrides?.[id]),
  );

  const extraSections: PrivacyNoticeSection[] = [];
  for (const section of deployment.extraSections ?? []) {
    const id = nonEmpty(section.id);
    const title = nonEmpty(section.title);
    if (!id || !title) continue;
    const intro = nonEmpty(section.intro);
    const paragraphs = cleanStrings(section.paragraphs);
    const items = cleanItems(section.items);
    const link = cleanLink(section.link);
    extraSections.push({
      id,
      title,
      ...(intro ? { intro } : {}),
      ...(paragraphs.length > 0 ? { paragraphs } : {}),
      ...(items.length > 0 ? { items } : {}),
      ...(link ? { link } : {}),
    });
  }

  const contactSection = applySectionOverride(
    softwareSections["privacy-contact"],
    deployment.sectionOverrides?.["privacy-contact"],
  );

  // Keep section numbering sequential when extra sections are inserted before the final contact section.
  const renumberedContactSection =
    extraSections.length > 0 && !deployment.sectionOverrides?.["privacy-contact"]
      ? {
          ...contactSection,
          title: contactSection.title.replace(
            /^10\./,
            `${mainSections.length + extraSections.length + 1}.`,
          ),
        }
      : contactSection;

  return {
    title: "Privacy Notice",
    subtitle: `${site.name} Platform`,
    ...(lastUpdated ? { lastUpdated } : {}),
    introduction: `This notice explains what personal information ${site.name} collects, stores, sends to external services, and retains, based on how the software operates and how ${effectiveOperatorName} runs this deployment.`,
    sections: [...mainSections, ...extraSections, renumberedContactSection],
  };
}

function buildHostingItem(params: {
  operatorName: string;
  hostingProvider?: string;
  hostingRegion?: string;
  crossBorderRegions: readonly string[];
  crossBorderNote?: string;
}): PrivacyNoticeItem {
  const sentences: string[] = [];

  if (params.hostingProvider && params.hostingRegion) {
    sentences.push(
      `This deployment's application server and PostgreSQL database are hosted on ${params.hostingProvider} in ${params.hostingRegion}.`,
    );
  } else if (params.hostingProvider) {
    sentences.push(
      `This deployment's application server and PostgreSQL database are hosted on ${params.hostingProvider}.`,
    );
  } else if (params.hostingRegion) {
    sentences.push(
      `This deployment's application server and PostgreSQL database are hosted in ${params.hostingRegion}.`,
    );
  } else {
    sentences.push(
      `This deployment's application server and PostgreSQL database are hosted on infrastructure managed by ${params.operatorName}.`,
    );
  }

  if (params.crossBorderRegions.length > 0) {
    sentences.push(
      `External service providers used by the platform may process data in ${formatList(params.crossBorderRegions)}.`,
    );
  } else {
    sentences.push(
      "External service providers used by the platform (such as Resend, OpenFreeMap, and Walk Score when enabled) may process data outside your region.",
    );
  }

  if (params.crossBorderNote) {
    sentences.push(params.crossBorderNote);
  } else if (!params.hostingProvider || !params.hostingRegion) {
    sentences.push(
      `Contact ${params.operatorName} for current hosting provider and data-location details.`,
    );
  }

  return {
    title: "Hosting and data-processing regions",
    body: sentences.join(" "),
  };
}

function buildExternalLinksDetail(site: PrivacyNoticeSiteInfo): string {
  const configuredLinks: string[] = [];
  if (nonEmpty(site.operator.url)) configuredLinks.push("the operator's website");
  if (nonEmpty(site.feedbackFormUrl)) configuredLinks.push("the feedback form");
  if (nonEmpty(site.bookingUrl)) configuredLinks.push("the onboarding call booking link");
  configuredLinks.push("external housing application links entered on listings");

  return `Following links to external websites (such as ${formatList(configuredLinks)}) takes you to third-party services governed by their own privacy policies.`;
}

function buildRequestHandlingBody(params: {
  operatorName: string;
  requestProcess?: string;
  responseTimeframe?: string;
}): string {
  if (params.requestProcess && params.responseTimeframe) {
    return `${params.requestProcess} ${params.operatorName} aims to respond ${params.responseTimeframe}.`;
  }
  if (params.requestProcess) {
    return params.requestProcess;
  }
  if (params.responseTimeframe) {
    return `To request access to, correction of, export of, or permanent deletion of your account or listing records, contact ${params.operatorName} using the privacy contact details below. Requests are handled ${params.responseTimeframe}.`;
  }
  return `Administrators can update account details or deactivate accounts in the application. To request access to, correction of, export of, or permanent deletion of your account or listing records, contact ${params.operatorName} using the privacy contact details below.`;
}
