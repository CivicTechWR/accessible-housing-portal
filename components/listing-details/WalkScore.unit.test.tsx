import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "@jest/globals";

import { WalkScore } from "./WalkScore";

const score = {
  walk: {
    score: 72,
    description: "Very Walkable",
    ws_link: "https://www.walkscore.com/score/example",
    help_link: "https://www.walkscore.com/how-it-works/",
    logo_url: "https://cdn.walk.sc/images/api-logo.png",
  },
  transit: { score: 55, description: "Good Transit" },
  bike: { score: 68, description: "Bikeable" },
};

describe("WalkScore", () => {
  it("shows all scores with trademark marks, the Redfin attribution, and correct links", () => {
    render(<WalkScore score={score} address="160 King St W, Kitchener, ON, Canada" />);

    screen.getByRole("heading", { name: "Walk Score®" });
    screen.getByText("72");
    screen.getByText("Very Walkable");
    screen.getByRole("heading", { name: "Transit Score®" });
    screen.getByText("55");
    screen.getByText("Good Transit");
    screen.getByRole("heading", { name: "Bike Score®" });
    screen.getByText("68");
    screen.getByText("Bikeable");

    const scoreLink = screen.getByRole("link", { name: /^Walk Score® 72/ });
    expect(scoreLink).toHaveAttribute("href", score.walk.help_link);
    expect(scoreLink).toHaveAttribute("target", "_blank");
    expect(scoreLink).toHaveAttribute("rel", "noopener noreferrer");

    const scoreSection = screen.getByRole("region", { name: "Location scores" });

    const addressLink = within(scoreSection).getByRole("link", { name: "More about this address" });
    expect(addressLink).toHaveAttribute("href", score.walk.ws_link);
    expect(addressLink).toHaveAttribute("target", "_blank");
    expect(addressLink).toHaveAttribute("rel", "noopener noreferrer");

    const attribution = within(scoreSection).getByRole("link", { name: "Walk Score® by Redfin" });
    expect(attribution).toHaveAttribute("href", "https://www.redfin.com/how-walk-score-works");
    expect(attribution).toHaveAttribute("target", "_blank");
    expect(attribution).toHaveAttribute("rel", "noopener noreferrer");

    expect(scoreLink).not.toContainElement(addressLink);
    expect(scoreLink).not.toContainElement(attribution);
  });

  it("links to the address's Walk Score when no score is available", () => {
    render(<WalkScore score={null} address="160 King St W, Kitchener, ON, Canada" />);

    const link = screen.getByRole("link", { name: "See the Walk Score® for this address" });
    expect(link).toHaveAttribute(
      "href",
      "https://www.walkscore.com/score/160%20King%20St%20W%2C%20Kitchener%2C%20ON%2C%20Canada",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows the walk score when transit and bike scores are not returned", () => {
    const { transit: _transit, bike: _bike, ...walkOnlyScore } = score;
    render(<WalkScore score={walkOnlyScore} address="160 King St W, Kitchener, ON, Canada" />);

    screen.getByText("72");
    expect(screen.queryByRole("heading", { name: /Transit Score®/ })).toBeNull();
    expect(screen.queryByRole("heading", { name: /Bike Score®/ })).toBeNull();
  });
});
