import { describe, expect, it } from "@jest/globals";

import { formatWalkScoreAddress } from "./address";

const address = {
  street1: "123 Main St",
  street2: null,
  city: "Waterloo",
  province: "ON",
  postalCode: "N2J 2H1",
};

describe("formatWalkScoreAddress", () => {
  it("formats the property address for a Walk Score search", () => {
    expect(formatWalkScoreAddress(address)).toBe("123 Main St, Waterloo, ON N2J 2H1, Canada");
  });

  it("includes a unit only when the caller supplies one", () => {
    expect(formatWalkScoreAddress({ ...address, unitNumber: "4" })).toBe(
      "4 - 123 Main St, Waterloo, ON N2J 2H1, Canada",
    );
  });
});
