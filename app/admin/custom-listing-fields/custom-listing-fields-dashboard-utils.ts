import {
  compareCustomListingFieldCategories,
  formatCustomListingFieldCategoryLabel,
} from "@/lib/custom-listing-fields/custom-listing-field-ordering";
import type {
  AdminCustomListingField,
  CreateCustomListingFieldInput,
  UpdateCustomListingFieldInput,
} from "@/shared/schemas/custom-listing-fields";

export type SortKey =
  | "label"
  | "key"
  | "category"
  | "appliesTo"
  | "description"
  | "helpText"
  | "visibility"
  | "filterable"
  | "required";
export type SortDirection = "asc" | "desc";

// Drag handle, order, field (label and key), applies to, description and help text, visibility,
// filterable, required, actions. The minimum fits inside the wide page width at 1440px.
export const TABLE_COLUMNS =
  "grid-cols-[40px_48px_minmax(200px,1fr)_136px_minmax(300px,1.8fr)_136px_88px_88px_56px]";

export const TABLE_MIN_WIDTH = "min-w-[1100px]";

export const FIELD_HELP_TEXT = {
  label: "Human-readable field name shown to partners and renters.",
  key: "Stable identifier used by listing data and APIs.",
  category: "Groups related fields together in forms and listings.",
  appliesTo:
    "Whether this information is shared across units in the building or specific to one unit.",
  description: "Public text shown to tenants and applicants.",
  helpText: "Partner guidance shown while creating listings.",
  visibility: "Controls whether renters can see the field.",
  filterable: "Makes the field available in search filters.",
  required: "Marks whether listings should answer this field.",
} satisfies Record<SortKey, string>;

export type VisibilityFilter = "all" | "public" | "internal";

export type FieldDialogState = {
  mode: "create";
  category: string;
};

export type CreateFieldDialogPayload = Omit<
  CreateCustomListingFieldInput,
  "placeholder" | "sortOrder"
>;

export type DisplayGroup = {
  category: string;
  label: string;
  fields: AdminCustomListingField[];
  visibleFields: AdminCustomListingField[];
  hiddenCount: number;
};

export type BulkEditPayload = Pick<
  UpdateCustomListingFieldInput,
  "appliesTo" | "category" | "filterableOnly" | "publicOnly" | "required"
>;

export type DraggingField = {
  fieldId: string;
  category: string;
};

export type DropIndicator = {
  category: string;
  insertionIndex: number;
};

export function getCategoryStats(fields: AdminCustomListingField[]) {
  const stats = new Map<string, { category: string; label: string; count: number }>();

  for (const field of fields) {
    const category = normalizeCategoryValue(field.category);
    const current = stats.get(category);
    if (current) {
      current.count += 1;
    } else {
      stats.set(category, {
        category,
        label: formatCustomListingFieldCategoryLabel(category),
        count: 1,
      });
    }
  }

  return Array.from(stats.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export function groupFields(fields: AdminCustomListingField[]) {
  const groups = new Map<
    string,
    {
      category: string;
      label: string;
      fields: AdminCustomListingField[];
    }
  >();

  for (const field of fields) {
    const category = normalizeCategoryValue(field.category);
    const group = groups.get(category);

    if (group) {
      group.fields.push(field);
    } else {
      groups.set(category, {
        category,
        label: formatCustomListingFieldCategoryLabel(category),
        fields: [field],
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export function getDisplayGroups(input: {
  activeCategory: string;
  expandedCategories: Set<string>;
  groupedFields: Array<{
    category: string;
    label: string;
    fields: AdminCustomListingField[];
  }>;
  isFiltered: boolean;
}): DisplayGroup[] {
  return input.groupedFields.map((group, groupIndex) => {
    const isExpanded = input.expandedCategories.has(group.category);
    const shouldCollapse =
      input.activeCategory === "all" && !input.isFiltered && groupIndex > 0 && !isExpanded;
    const visibleFields = shouldCollapse ? group.fields.slice(0, 3) : group.fields;

    return {
      ...group,
      visibleFields,
      hiddenCount: group.fields.length - visibleFields.length,
    };
  });
}

export function sortFields(fields: AdminCustomListingField[]) {
  return [...fields].sort(
    (a, b) =>
      compareCustomListingFieldCategories(a.category, b.category) || compareCategoryFields(a, b),
  );
}

/** Each field's place within its category, counting from 1, regardless of filters or sorting. */
export function getCategoryPositions(fields: AdminCustomListingField[]) {
  const positions = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const field of sortFields(fields)) {
    const position = (counts.get(field.category) ?? 0) + 1;
    counts.set(field.category, position);
    positions.set(field.id, position);
  }
  return positions;
}

export function sortCategoryFields(fields: AdminCustomListingField[]) {
  return [...fields].sort(compareCategoryFields);
}

export function compareCategoryFields(a: AdminCustomListingField, b: AdminCustomListingField) {
  const bySortOrder = a.sortOrder - b.sortOrder;
  if (bySortOrder !== 0) {
    return bySortOrder;
  }

  return a.label.localeCompare(b.label);
}

export function moveItemToInsertionIndex<T>(items: T[], fromIndex: number, insertionIndex: number) {
  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);

  if (!item) {
    return nextItems;
  }

  const adjustedIndex = fromIndex < insertionIndex ? insertionIndex - 1 : insertionIndex;
  const boundedIndex = Math.max(0, Math.min(adjustedIndex, nextItems.length));

  nextItems.splice(boundedIndex, 0, item);
  return nextItems;
}

export function getInsertionIndexForPointer(input: {
  category: string;
  fields: AdminCustomListingField[];
  pointerY: number;
  rowRect: DOMRect;
  targetFieldId: string;
}) {
  const categoryFields = sortCategoryFields(
    input.fields.filter((field) => field.category === input.category),
  );
  const targetIndex = categoryFields.findIndex((field) => field.id === input.targetFieldId);

  if (targetIndex < 0) {
    return 0;
  }

  const position =
    input.pointerY < input.rowRect.top + input.rowRect.height / 2 ? "before" : "after";
  return position === "after" ? targetIndex + 1 : targetIndex;
}

export function shouldShowDropIndicator(input: {
  draggingField: DraggingField;
  fields: AdminCustomListingField[];
  insertionIndex: number;
}) {
  const categoryFields = sortCategoryFields(
    input.fields.filter((field) => field.category === input.draggingField.category),
  );
  const draggedIndex = categoryFields.findIndex(
    (field) => field.id === input.draggingField.fieldId,
  );

  return (
    draggedIndex >= 0 &&
    input.insertionIndex !== draggedIndex &&
    input.insertionIndex !== draggedIndex + 1
  );
}

export function sortVisibleFields(
  fields: AdminCustomListingField[],
  sortKey: SortKey,
  direction: SortDirection,
) {
  const factor = direction === "asc" ? 1 : -1;

  return [...fields].sort((a, b) => {
    let compare: number;

    switch (sortKey) {
      case "label":
        compare = a.label.localeCompare(b.label);
        break;
      case "key":
        compare = a.key.localeCompare(b.key);
        break;
      case "category":
        compare = compareCustomListingFieldCategories(a.category, b.category);
        break;
      case "appliesTo":
        compare = a.appliesTo.localeCompare(b.appliesTo);
        break;
      case "description":
        compare = (a.description ?? "").localeCompare(b.description ?? "");
        break;
      case "helpText":
        compare = (a.helpText ?? "").localeCompare(b.helpText ?? "");
        break;
      case "visibility":
        compare = Number(a.publicOnly) - Number(b.publicOnly);
        break;
      case "filterable":
        compare = Number(a.filterableOnly) - Number(b.filterableOnly);
        break;
      case "required":
        compare = Number(a.required) - Number(b.required);
        break;
    }

    if (compare !== 0) {
      return compare * factor;
    }

    return (a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)) * factor;
  });
}

export function nextSortOrder(fields: AdminCustomListingField[], category: string) {
  const normalizedCategory = normalizeCategoryValue(category);
  const orders = fields
    .filter((field) => normalizeCategoryValue(field.category) === normalizedCategory)
    .map((field) => field.sortOrder);

  return orders.length > 0 ? Math.max(...orders) + 1 : 1;
}

export function getCanonicalCategoryValue(value: string, categories: string[]) {
  const normalizedValue = normalizeCategoryValue(value);
  const match = categories.find((category) => isSameCategoryOption(normalizedValue, category));
  return match ? normalizeCategoryValue(match) : normalizedValue;
}

export function isSameCategoryOption(value: string, option: string) {
  const normalizedValue = normalizeCategoryValue(value);
  const normalizedOption = normalizeCategoryValue(option);
  return (
    normalizedValue === normalizedOption ||
    normalizedValue === normalizeCategoryValue(formatCustomListingFieldCategoryLabel(option))
  );
}

export function normalizeCategoryValue(value: string) {
  return value.trim().toUpperCase();
}

export function getUniqueCategoryOptions(categories: string[]) {
  const seen = new Set<string>();
  const uniqueCategories: string[] = [];

  for (const category of categories) {
    const normalizedCategory = normalizeCategoryValue(category);
    if (!normalizedCategory || seen.has(normalizedCategory)) {
      continue;
    }

    seen.add(normalizedCategory);
    uniqueCategories.push(normalizedCategory);
  }

  return uniqueCategories;
}

export function normalizeFieldCategory(field: AdminCustomListingField) {
  return {
    ...field,
    category: normalizeCategoryValue(field.category),
  };
}

export function normalizeFieldCategories(fields: AdminCustomListingField[]) {
  return fields.map(normalizeFieldCategory);
}

export function normalizeCategoryPayload<T extends { category?: string }>(payload: T) {
  if (!payload.category) {
    return payload;
  }

  return {
    ...payload,
    category: normalizeCategoryValue(payload.category),
  };
}

export function slugifyKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeKeyDraft(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
}

export function nullableTrim(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function isFormControlTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}
