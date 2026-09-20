import { describe, expect, it } from "@jest/globals";
import { createListingsQueryString, getListingsQueryFromSearchParams } from "./query";

describe("listing search URLs", () => {
  it("round-trips the Canadian neighbourhood parameter", () => {
    const query = getListingsQueryFromSearchParams({
      neighbourhood: ["  Uptown Waterloo  ", "Downtown Kitchener"],
      bedrooms: "2+",
    });

    expect(query.neighbourhood).toBe("Uptown Waterloo");
    const params = new URLSearchParams(createListingsQueryString(query));
    expect(params.get("neighbourhood")).toBe("Uptown Waterloo");
    expect(getListingsQueryFromSearchParams(Object.fromEntries(params))).toEqual(query);
  });
});
