import { describe, expect, it } from "@jest/globals";

import type { AdminCustomListingField } from "@/shared/schemas/custom-listing-fields";
import {
  bulkEditDialogSchema,
  getDefaultBulkEditDialogValues,
  getDefaultCreateFieldDialogValues,
  toBulkEditPayload,
  toCreateFieldDialogPayload,
} from "./custom-listing-fields-dashboard-forms";
import {
  formatCategoryLabel,
  getCanonicalCategoryValue,
  getCategoryStats,
  getDisplayGroups,
  getInsertionIndexForPointer,
  getUniqueCategoryOptions,
  groupFields,
  moveItemToInsertionIndex,
  nextSortOrder,
  normalizeCategoryPayload,
  normalizeFieldCategories,
  nullableTrim,
  shouldShowDropIndicator,
  slugifyKey,
  sortFields,
  sortVisibleFields,
} from "./custom-listing-fields-dashboard-utils";

const baseField: AdminCustomListingField = {
  id: "00000000-0000-4000-8000-000000000001",
  key: "field_one",
  label: "Field One",
  description: null,
  type: "boolean",
  category: "BUILDING AMENITIES",
  appliesTo: "building",
  helpText: null,
  placeholder: null,
  publicOnly: true,
  filterableOnly: true,
  required: false,
  sortOrder: 1,
  options: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function field(overrides: Partial<AdminCustomListingField>): AdminCustomListingField {
  return {
    ...baseField,
    ...overrides,
  };
}

describe("custom listing field dashboard utilities", () => {
  it("normalizes and labels categories consistently", () => {
    expect(formatCategoryLabel("BUILDING AMENITIES & SERVICES")).toBe(
      "Building Amenities & Services",
    );
    expect(getCanonicalCategoryValue("building amenities", ["BUILDING AMENITIES"])).toBe(
      "BUILDING AMENITIES",
    );
    expect(getUniqueCategoryOptions([" building amenities ", "BUILDING AMENITIES", ""])).toEqual([
      "BUILDING AMENITIES",
    ]);
    expect(normalizeCategoryPayload({ category: " accessibility ", required: true })).toEqual({
      category: "ACCESSIBILITY",
      required: true,
    });
  });

  it("normalizes field categories and derives sorted category stats", () => {
    const fields = normalizeFieldCategories([
      field({ id: "00000000-0000-4000-8000-000000000002", category: " accessibility " }),
      field({ id: "00000000-0000-4000-8000-000000000003", category: "BUILDING AMENITIES" }),
      field({ id: "00000000-0000-4000-8000-000000000004", category: "ACCESSIBILITY" }),
    ]);

    expect(fields.map((item) => item.category)).toEqual([
      "ACCESSIBILITY",
      "BUILDING AMENITIES",
      "ACCESSIBILITY",
    ]);
    expect(getCategoryStats(fields)).toEqual([
      { category: "ACCESSIBILITY", label: "Accessibility", count: 2 },
      { category: "BUILDING AMENITIES", label: "Building Amenities", count: 1 },
    ]);
  });

  it("groups and collapses display groups when all fields are unfiltered", () => {
    const groupedFields = groupFields(
      sortFields([
        field({
          id: "00000000-0000-4000-8000-000000000002",
          label: "Ramp",
          category: "ACCESSIBILITY",
        }),
        field({
          id: "00000000-0000-4000-8000-000000000003",
          label: "Laundry",
          category: "BUILDING AMENITIES",
          sortOrder: 1,
        }),
        field({
          id: "00000000-0000-4000-8000-000000000004",
          label: "Parking",
          category: "BUILDING AMENITIES",
          sortOrder: 2,
        }),
        field({
          id: "00000000-0000-4000-8000-000000000005",
          label: "Storage",
          category: "BUILDING AMENITIES",
          sortOrder: 3,
        }),
        field({
          id: "00000000-0000-4000-8000-000000000006",
          label: "Elevator",
          category: "BUILDING AMENITIES",
          sortOrder: 4,
        }),
      ]),
    );

    const displayGroups = getDisplayGroups({
      activeCategory: "all",
      expandedCategories: new Set(),
      groupedFields,
      isFiltered: false,
    });

    expect(displayGroups).toHaveLength(2);
    expect(displayGroups[0]?.visibleFields).toHaveLength(1);
    expect(displayGroups[1]?.visibleFields).toHaveLength(3);
    expect(displayGroups[1]?.hiddenCount).toBe(1);
  });

  it("sorts visible fields by requested key and direction", () => {
    const fields = [
      field({ id: "00000000-0000-4000-8000-000000000002", label: "Beta", sortOrder: 1 }),
      field({ id: "00000000-0000-4000-8000-000000000003", label: "Alpha", sortOrder: 2 }),
    ];

    expect(sortVisibleFields(fields, "label", "asc").map((item) => item.label)).toEqual([
      "Alpha",
      "Beta",
    ]);
    expect(sortVisibleFields(fields, "label", "desc").map((item) => item.label)).toEqual([
      "Beta",
      "Alpha",
    ]);
  });

  it("moves items around insertion indices without mutating input", () => {
    const values = ["a", "b", "c", "d"];

    expect(moveItemToInsertionIndex(values, 0, 3)).toEqual(["b", "c", "a", "d"]);
    expect(moveItemToInsertionIndex(values, 3, 1)).toEqual(["a", "d", "b", "c"]);
    expect(values).toEqual(["a", "b", "c", "d"]);
  });

  it("calculates drag insertion and no-op indicator states", () => {
    const fields = [
      field({ id: "00000000-0000-4000-8000-000000000002", label: "Alpha", sortOrder: 1 }),
      field({ id: "00000000-0000-4000-8000-000000000003", label: "Beta", sortOrder: 2 }),
      field({ id: "00000000-0000-4000-8000-000000000004", label: "Gamma", sortOrder: 3 }),
    ];
    const rowRect = { top: 100, height: 40 } as DOMRect;

    expect(
      getInsertionIndexForPointer({
        category: "BUILDING AMENITIES",
        fields,
        pointerY: 121,
        rowRect,
        targetFieldId: fields[1]?.id ?? "",
      }),
    ).toBe(2);
    expect(
      shouldShowDropIndicator({
        draggingField: { fieldId: fields[0]?.id ?? "", category: "BUILDING AMENITIES" },
        fields,
        insertionIndex: 1,
      }),
    ).toBe(false);
    expect(
      shouldShowDropIndicator({
        draggingField: { fieldId: fields[0]?.id ?? "", category: "BUILDING AMENITIES" },
        fields,
        insertionIndex: 3,
      }),
    ).toBe(true);
  });

  it("derives next sort order and normalizes text inputs", () => {
    expect(
      nextSortOrder([field({ sortOrder: 4 }), field({ sortOrder: 7 })], "building amenities"),
    ).toBe(8);
    expect(slugifyKey("  Laundry / Storage!  ")).toBe("laundry_storage");
    expect(nullableTrim("   ")).toBeNull();
    expect(nullableTrim("  hello  ")).toBe("hello");
  });

  it("builds create dialog defaults and payloads", () => {
    const defaults = getDefaultCreateFieldDialogValues({
      mode: "create",
      category: "BUILDING AMENITIES",
    });

    expect(defaults).toMatchObject({
      category: "BUILDING AMENITIES",
      publicOnly: true,
      filterableOnly: true,
      required: false,
    });
    expect(
      toCreateFieldDialogPayload(
        {
          ...defaults,
          key: "shared_laundry",
          label: "Shared Laundry",
          description: "  Laundry room is shared. ",
          helpText: "   ",
        },
        ["BUILDING AMENITIES"],
      ),
    ).toEqual({
      key: "shared_laundry",
      label: "Shared Laundry",
      description: "Laundry room is shared.",
      type: "boolean",
      category: "BUILDING AMENITIES",
      helpText: null,
      publicOnly: true,
      filterableOnly: true,
      required: false,
      options: null,
    });
  });

  it("validates and converts bulk edit dialog values", () => {
    expect(
      bulkEditDialogSchema.safeParse(getDefaultBulkEditDialogValues(["BUILDING AMENITIES"]))
        .success,
    ).toBe(false);

    expect(
      toBulkEditPayload(
        {
          ...getDefaultBulkEditDialogValues(["BUILDING AMENITIES"]),
          categoryEnabled: true,
          category: "building amenities",
          requiredEnabled: true,
          required: true,
        },
        ["BUILDING AMENITIES"],
      ),
    ).toEqual({
      category: "BUILDING AMENITIES",
      required: true,
    });
  });
});
