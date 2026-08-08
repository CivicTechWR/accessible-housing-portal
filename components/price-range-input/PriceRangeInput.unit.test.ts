import { describe, expect, it } from "@jest/globals";

import { parsePriceInputValue } from "./PriceRangeInput";

describe("parsePriceInputValue", () => {
  it("accepts empty values as undefined", () => {
    expect(parsePriceInputValue("")).toBeUndefined();
    expect(parsePriceInputValue("   ")).toBeUndefined();
  });

  it("parses non-negative integers", () => {
    expect(parsePriceInputValue("0")).toBe(0);
    expect(parsePriceInputValue("1200")).toBe(1200);
  });
});
