import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, jest } from "@jest/globals";

import { PriceRangeInput } from "./PriceRangeInput";

describe("PriceRangeInput", () => {
  it("associates labels with min and max inputs for accessibility", () => {
    render(<PriceRangeInput onMinChange={async () => {}} onMaxChange={async () => {}} />);
    expect(screen.getByLabelText("Min Price")).toBeInstanceOf(HTMLInputElement);
    expect(screen.getByLabelText("Max Price")).toBeInstanceOf(HTMLInputElement);
  });

  it("reports whole non-negative prices and clears the filter when emptied", () => {
    const onMinChange = jest.fn(async (_min: number | undefined) => {});
    render(<PriceRangeInput onMinChange={onMinChange} onMaxChange={async () => {}} />);
    const min = screen.getByLabelText("Min Price");

    fireEvent.change(min, { target: { value: "1200.75" } });
    expect(min).toHaveValue(1200);
    expect(onMinChange).toHaveBeenLastCalledWith(1200);

    fireEvent.change(min, { target: { value: "-5" } });
    expect(min).toHaveValue(0);
    expect(onMinChange).toHaveBeenLastCalledWith(0);

    fireEvent.change(min, { target: { value: "" } });
    expect(min).toHaveValue(null);
    expect(onMinChange).toHaveBeenLastCalledWith(undefined);
  });
});
