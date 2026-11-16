import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, it } from "@jest/globals";
import { ListingsPanelHeader } from "./ListingsPanelHeader";

const props = {
  sortOptionProps: { sortOptions: [], onChange: () => {} },
};

afterEach(cleanup);

describe("ListingsPanelHeader", () => {
  it("counts every match, and says how many are shown when loading stopped short", () => {
    const { rerender } = render(
      <ListingsPanelHeader {...props} shown={100} total={812} isPartial={false} />,
    );
    screen.getByText("812 listings found");

    rerender(<ListingsPanelHeader {...props} shown={500} total={812} isPartial />);
    screen.getByText("Showing 500 of 812 listings");
  });
});
