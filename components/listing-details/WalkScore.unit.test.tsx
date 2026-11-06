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
  it("shows all scores with the first-mention trademark marks and correct links", () => {
    render(<WalkScore score={score} />);

    screen.getByRole("heading", { name: "Walk Score® rating" });
    screen.getByText("72 · Very Walkable");
    screen.getByRole("heading", { name: "Transit Score®" });
    screen.getByText("55 · Good Transit");
    screen.getByRole("heading", { name: "Bike Score®" });
    screen.getByText("68 · Bikeable");

    const scoreLink = screen.getByRole("link", { name: /Walk Score® rating/ });
    expect(scoreLink).toHaveAttribute("href", score.walk.help_link);
    expect(scoreLink).toHaveAttribute("target", "_blank");
    expect(scoreLink).toHaveAttribute("rel", "noopener noreferrer");

    expect(screen.queryByRole("link", { name: "How Walk Score works" })).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(1);

    const scoreSection = screen.getByRole("region", { name: "Location scores" });
    expect(within(scoreSection).getAllByText(/®/)).toHaveLength(3);
  });

  it("shows Get Score when the score is null", () => {
    render(<WalkScore score={null} />);

    screen.getByRole("heading", { name: "Walk Score® rating" });
    const link = screen.getByRole("link", { name: "Get Score" });
    expect(link).toHaveAttribute("href", "https://www.walkscore.com/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows the walk score when transit and bike scores are not returned", () => {
    const { transit: _transit, bike: _bike, ...walkOnlyScore } = score;
    render(<WalkScore score={walkOnlyScore} />);

    screen.getByText("72 · Very Walkable");
    expect(screen.queryByRole("heading", { name: "Transit Score®" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Bike Score®" })).toBeNull();
  });
});
