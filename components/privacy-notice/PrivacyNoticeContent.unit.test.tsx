import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "@jest/globals";

import { PrivacyNoticeContent } from "@/components/privacy-notice/PrivacyNoticeContent";
import { siteConfig } from "@/lib/site-config";

describe("PrivacyNoticeContent", () => {
  it("renders software disclosures, internal links, external links, and contact email", () => {
    render(<PrivacyNoticeContent />);

    expect(
      screen.getByRole("heading", { name: "2. Account and authentication data" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "8. What this platform does not collect or do" }),
    ).toBeVisible();

    const manageAccountLink = screen.getByRole("link", { name: "Open Manage account." });
    expect(manageAccountLink).toHaveAttribute("href", "/manage-account");
    expect(manageAccountLink).not.toHaveAttribute("target");

    const emailLink = screen.getByRole("link", { name: siteConfig.contactEmail });
    expect(emailLink).toHaveAttribute("href", `mailto:${siteConfig.contactEmail}`);
    expect(emailLink).not.toHaveAttribute("target");

    const repoLink = screen.getByRole("link", {
      name: "View the Accessible Housing Portal source code on GitHub.",
    });
    expect(repoLink).toHaveAttribute("href", siteConfig.repositoryUrl);
    expect(repoLink).toHaveAttribute("target", "_blank");
    expect(repoLink).toHaveAttribute("rel", "noopener noreferrer");
  });
});
