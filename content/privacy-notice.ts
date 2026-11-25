import { buildPrivacyNotice, type PrivacyDeploymentConfig } from "@/lib/privacy-notice";
import { siteConfig } from "@/lib/site-config";

/**
 * Deployment-specific privacy notice configuration for this instance.
 *
 * Software-level disclosures live in `lib/privacy-notice.ts` so they stay in sync with the
 * codebase. Fill in or adjust the optional fields below for your deployment, or use
 * `sectionOverrides` and `extraSections` to customize wording without modifying software code.
 *
 * Unconfirmed fields for Union Community Housing's Home Hub deployment are left unset so the
 * page renders cleanly until confirmed before launch.
 */
export const privacyNoticeDeployment: PrivacyDeploymentConfig = {
  // Confirm whether a distinct incorporated legal name applies instead of `siteConfig.operator.name`.
  operatorLegalName: undefined,

  // Set once this deployment's privacy notice is reviewed and approved for launch (e.g. "2026-05-01").
  lastUpdated: undefined,

  // Falls back to `siteConfig.contactEmail` when omitted. Confirm if a dedicated privacy officer,
  // privacy email address, phone number, or mailing address should be listed.
  contact: {
    name: undefined,
    role: undefined,
    email: undefined,
    phone: undefined,
    mailingAddress: undefined,
  },

  // Confirm production hosting provider (e.g. Railway), database/app hosting region, and any
  // cross-border processing regions for Resend or other processors.
  infrastructure: {
    hostingProvider: undefined,
    hostingRegion: undefined,
    crossBorderRegions: undefined,
    crossBorderNote: undefined,
  },

  // Confirm operator retention timelines for deactivated accounts, archived listings, and email
  // delivery records, plus the deletion/access request workflow and target response time.
  retentionAndRequests: {
    accountAndListingRetention: undefined,
    requestProcess: undefined,
    responseTimeframe: undefined,
  },

  // Confirm applicable privacy legislation or voluntary privacy framework (for example, Ontario /
  // Canadian privacy commitments) and whether to link a supervisory authority.
  jurisdiction: {
    description: undefined,
    authorityName: undefined,
    authorityUrl: undefined,
  },

  // Set to false if WALKSCORE_API_KEY is not configured in this deployment.
  walkScoreEnabled: true,

  // Optional per-section overrides (`mode: "append"` or `mode: "replace"`).
  sectionOverrides: {},

  // Optional deployment-specific sections rendered before the final contact section.
  extraSections: [],
};

export const privacyNotice = buildPrivacyNotice(siteConfig, privacyNoticeDeployment);
