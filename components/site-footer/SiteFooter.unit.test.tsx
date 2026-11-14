import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "@jest/globals";

import { SiteFooter } from "./SiteFooter";

describe("SiteFooter", () => {
  it("credits Redfin for Walk Score data with the provider's attribution link", () => {
    render(<SiteFooter />);

    const attribution = screen.getByRole("link", { name: "Walk Score® by Redfin" });
    expect(attribution).toHaveAttribute("href", "https://www.redfin.com/how-walk-score-works");
  });
});
