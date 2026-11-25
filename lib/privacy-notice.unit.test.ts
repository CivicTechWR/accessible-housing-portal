import { describe, expect, it } from "@jest/globals";

import { buildPrivacyNotice, type PrivacyNoticeSiteInfo } from "@/lib/privacy-notice";

const openSourceDefaultSite: PrivacyNoticeSiteInfo = {
  name: "Accessible Housing Portal",
  operator: { name: "Community Housing Network", url: "https://housing.example.org" },
  contactEmail: "info@housing.example.org",
  builder: { name: "CivicTech", url: "https://civictechwr.org/" },
  repositoryUrl: "https://github.com/CivicTechWR/accessible-housing-portal",
};

describe("buildPrivacyNotice", () => {
  it("builds a complete default notice from site config alone without empty values", () => {
    const notice = buildPrivacyNotice(openSourceDefaultSite);

    expect(notice.title).toBe("Privacy Notice");
    expect(notice.subtitle).toBe("Accessible Housing Portal Platform");
    expect(notice.lastUpdated).toBeUndefined();
    expect(notice.introduction).toContain("Accessible Housing Portal");
    expect(notice.introduction).toContain("Community Housing Network");
    expect(notice.sections.length).toBe(10);

    for (const section of notice.sections) {
      expect(section.title.trim().length).toBeGreaterThan(0);
      for (const paragraph of section.paragraphs ?? []) {
        expect(paragraph.trim().length).toBeGreaterThan(0);
      }
      for (const item of section.items ?? []) {
        expect(item.title.trim().length).toBeGreaterThan(0);
        expect(item.body.trim().length).toBeGreaterThan(0);
      }
    }

    const contactSection = notice.sections.find((section) => section.id === "privacy-contact");
    expect(contactSection?.items).toEqual([
      {
        title: "Email",
        body: "Send privacy questions or data requests to",
        link: { text: "info@housing.example.org", href: "mailto:info@housing.example.org" },
      },
    ]);

    const servicesSection = notice.sections.find(
      (section) => section.id === "third-party-services",
    );
    expect(servicesSection?.items?.some((item) => item.title.includes("Walk Score"))).toBe(true);
  });

  it("ignores blank optional deployment fields cleanly", () => {
    const notice = buildPrivacyNotice(openSourceDefaultSite, {
      operatorLegalName: "   ",
      lastUpdated: "",
      contact: {
        name: " ",
        role: "",
        email: "   ",
        phone: "",
        mailingAddress: " ",
      },
      infrastructure: {
        hostingProvider: "",
        hostingRegion: "  ",
        crossBorderRegions: ["", "   "],
        crossBorderNote: "",
      },
      retentionAndRequests: {
        accountAndListingRetention: "  ",
        requestProcess: "",
        responseTimeframe: " ",
      },
      jurisdiction: {
        description: "",
        authorityName: " ",
        authorityUrl: "",
      },
      extraSections: [{ id: "blank", title: "   ", paragraphs: [""] }],
    });

    expect(notice.lastUpdated).toBeUndefined();
    expect(notice.sections.length).toBe(10);

    const contactSection = notice.sections.find((section) => section.id === "privacy-contact");
    expect(contactSection?.items).toHaveLength(1);
    expect(contactSection?.items?.[0]?.link?.href).toBe("mailto:info@housing.example.org");
  });

  it("applies deployment-specific details, overrides, and extra sections", () => {
    const notice = buildPrivacyNotice(openSourceDefaultSite, {
      operatorLegalName: "Community Housing Network Inc.",
      lastUpdated: "2026-06-01",
      contact: {
        name: "Jordan Lee",
        role: "Privacy Officer",
        email: "privacy@housing.example.org",
        mailingAddress: "100 Main St, Waterloo, ON",
      },
      infrastructure: {
        hostingProvider: "Railway",
        hostingRegion: "Canada",
        crossBorderRegions: ["United States", "European Union"],
        crossBorderNote: "Data processed outside Canada may be subject to local laws.",
      },
      retentionAndRequests: {
        accountAndListingRetention: "Deactivated accounts are purged after 12 months.",
        requestProcess: "Email our Privacy Officer to request an export or deletion.",
        responseTimeframe: "within 30 days",
      },
      jurisdiction: {
        description: "Operated under applicable Canadian privacy principles.",
        authorityName: "Office of the Privacy Commissioner of Canada",
        authorityUrl: "https://www.priv.gc.ca/",
      },
      walkScoreEnabled: false,
      sectionOverrides: {
        "operator-and-scope": {
          mode: "append",
          extraParagraphs: ["Pilot participation is reviewed quarterly."],
        },
        "what-we-do-not-collect": {
          mode: "replace",
          title: "8. Out of scope",
          paragraphs: ["Custom scope statement."],
        },
      },
      extraSections: [
        {
          id: "pilot-program",
          title: "10. Pilot program feedback",
          paragraphs: ["Optional feedback interviews are scheduled separately."],
        },
      ],
    });

    expect(notice.lastUpdated).toBe("2026-06-01");
    expect(notice.sections.map((section) => section.id)).toEqual([
      "operator-and-scope",
      "account-and-auth",
      "invitations-and-email",
      "listings-and-photos",
      "browsing-and-saved-activity",
      "cookies-and-storage",
      "third-party-services",
      "what-we-do-not-collect",
      "retention-and-requests",
      "pilot-program",
      "privacy-contact",
    ]);

    const operatorSection = notice.sections.find((section) => section.id === "operator-and-scope");
    expect(operatorSection?.paragraphs?.[0]).toContain(
      "Community Housing Network Inc., operating as Community Housing Network",
    );
    expect(operatorSection?.paragraphs).toContain("Pilot participation is reviewed quarterly.");

    const servicesSection = notice.sections.find(
      (section) => section.id === "third-party-services",
    );
    expect(servicesSection?.items?.some((item) => item.title.includes("Walk Score"))).toBe(false);
    const hostingItem = servicesSection?.items?.find(
      (item) => item.title === "Hosting and data-processing regions",
    );
    expect(hostingItem?.body).toContain("hosted on Railway in Canada");
    expect(hostingItem?.body).toContain("United States and European Union");
    expect(hostingItem?.body).toContain(
      "Data processed outside Canada may be subject to local laws.",
    );

    const replacedSection = notice.sections.find(
      (section) => section.id === "what-we-do-not-collect",
    );
    expect(replacedSection).toEqual({
      id: "what-we-do-not-collect",
      title: "8. Out of scope",
      intro: undefined,
      paragraphs: ["Custom scope statement."],
      items: undefined,
      link: undefined,
    });

    const retentionSection = notice.sections.find(
      (section) => section.id === "retention-and-requests",
    );
    expect(
      retentionSection?.items?.find((item) => item.title === "Deployment retention schedule")?.body,
    ).toBe("Deactivated accounts are purged after 12 months.");
    expect(
      retentionSection?.items?.find(
        (item) => item.title === "Access, correction, and deletion requests",
      )?.body,
    ).toContain("within 30 days");

    const contactSection = notice.sections.find((section) => section.id === "privacy-contact");
    expect(contactSection?.title).toBe("11. Privacy questions and contact");
    expect(contactSection?.items?.find((item) => item.title === "Privacy contact")?.body).toBe(
      "Jordan Lee, Privacy Officer",
    );
    expect(contactSection?.items?.find((item) => item.title === "Email")?.link?.href).toBe(
      "mailto:privacy@housing.example.org",
    );
    expect(
      contactSection?.items?.find((item) => item.title === "Applicable privacy framework")?.link
        ?.href,
    ).toBe("https://www.priv.gc.ca/");
  });
});
