import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, jest } from "@jest/globals";

import { PriceRangeInput } from "./PriceRangeInput";

describe("PriceRangeInput", () => {
  it("reports whole non-negative prices and clears the filter when emptied", () => {
    const onMinChange = jest.fn(async (_min: number | undefined) => {});
    render(<PriceRangeInput onMinChange={onMinChange} onMaxChange={async () => {}} />);
    const min = screen.getByPlaceholderText("Min");

    fireEvent.change(min, { target: { value: "1200" } });
    expect(onMinChange).toHaveBeenLastCalledWith(1200);

    fireEvent.change(min, { target: { value: "-5" } });
    expect(min).toHaveValue(0);
    expect(onMinChange).toHaveBeenLastCalledWith(0);

    fireEvent.change(min, { target: { value: "" } });
    expect(min).toHaveValue(null);
    expect(onMinChange).toHaveBeenLastCalledWith(undefined);
  });
});
