import { describe, expect, it } from "@jest/globals";

import { formatNumberInput, parseNumberInput, stripLeadingZeros } from "./numberInput";

describe("stripLeadingZeros", () => {
  it.each([
    ["02", "2"],
    ["007", "7"],
    ["00", "0"],
    ["0", "0"],
    ["0.5", "0.5"],
    ["00.5", "0.5"],
    ["10", "10"],
    ["-02", "-2"],
    ["", ""],
  ])("turns %p into %p", (input, expected) => {
    expect(stripLeadingZeros(input)).toBe(expected);
  });
});

describe("parseNumberInput", () => {
  it("treats empty text as no value", () => {
    expect(parseNumberInput("")).toBeNull();
    expect(parseNumberInput("  ")).toBeNull();
  });

  it("keeps an explicit zero", () => {
    expect(parseNumberInput("0")).toBe(0);
  });

  it("applies the scale", () => {
    expect(parseNumberInput("1.5")).toBe(1.5);
    expect(parseNumberInput("1200", 100)).toBe(120000);
  });
});

describe("formatNumberInput", () => {
  it("shows an empty field when there is no number", () => {
    expect(formatNumberInput(undefined)).toBe("");
    expect(formatNumberInput(null)).toBe("");
    expect(formatNumberInput(Number.NaN)).toBe("");
  });

  it("shows zero and scaled values", () => {
    expect(formatNumberInput(0)).toBe(0);
    expect(formatNumberInput(120000, 100)).toBe(1200);
  });
});
