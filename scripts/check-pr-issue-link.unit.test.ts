import { describe, expect, it } from "@jest/globals";
import { hasIssueLink } from "./check-pr-issue-link.js";

describe("hasIssueLink", () => {
  it.each([
    ["Closes #507", "a closing keyword"],
    ["Replaces #498. Closes #495.", "a closing keyword after other references"],
    ["## What\nStuff\n\nfixes #12", "a lowercase keyword on a later line"],
    ["RESOLVED #3", "an uppercase keyword"],
    ["Fixes: #8", "a keyword followed by a colon"],
    ["Closes https://github.com/CivicTechWR/accessible-housing-portal/issues/528", "a full URL"],
    ...["close", "closed", "fix", "fixed", "resolve", "resolves"].map((keyword) => [
      `${keyword} #1`,
      keyword,
    ]),
  ])("passes %p (%s)", (body: string) => {
    expect(hasIssueLink(body)).toBe(true);
  });

  it.each([
    ["## What\nHides the footer on mobile.\n\n## Testing\nChecked in the browser.", "no issue"],
    ["Replaces #498.", "a reference with no closing keyword"],
    ["See #496", "a bare reference"],
    ["Part of #496 (part 2 of 2)", "Part of, which GitHub treats as a mention"],
    ["Closes the dialog when you press Escape", "a keyword with no issue"],
    ["Prefixes #4", "a keyword inside another word"],
    [
      "Closes https://github.com/CivicTechWR/accessible-housing-portal/pull/12",
      "a pull request URL",
    ],
    ["", "an empty description"],
  ])("fails %p (%s)", (body: string) => {
    expect(hasIssueLink(body)).toBe(false);
  });

  it("fails a missing description", () => {
    expect(hasIssueLink(null)).toBe(false);
  });
});
