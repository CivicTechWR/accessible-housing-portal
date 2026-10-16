import { expect, it } from "@jest/globals";

import {
  createCustomListingFieldSchema,
  updateCustomListingFieldSchema,
} from "./custom-listing-fields";

it.each(["constructor", "__proto__", "invalid key"])(
  "rejects custom field key %s on creation and rename",
  (key) => {
    expect(
      createCustomListingFieldSchema.safeParse({
        key,
        label: "Feature",
        type: "boolean",
        category: "Access",
        appliesTo: "unit",
        publicOnly: true,
        filterableOnly: true,
        required: false,
        sortOrder: 0,
      }).success,
    ).toBe(false);
    expect(updateCustomListingFieldSchema.safeParse({ key }).success).toBe(false);
  },
);
