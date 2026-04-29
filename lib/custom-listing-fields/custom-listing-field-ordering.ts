export function formatCustomListingFieldCategoryLabel(category: string) {
  return category
    .split(/\s*&\s*/)
    .map((part) =>
      part
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
    )
    .join(" & ");
}

export function normalizeCustomListingFieldCategory(category: string) {
  return category.trim().toUpperCase();
}

export function isSameCustomListingFieldCategory(value: string, option: string) {
  const normalizedValue = normalizeCustomListingFieldCategory(value);
  const normalizedOption = normalizeCustomListingFieldCategory(option);
  return (
    normalizedValue === normalizedOption ||
    normalizedValue ===
      normalizeCustomListingFieldCategory(formatCustomListingFieldCategoryLabel(option))
  );
}

export function getCanonicalCustomListingFieldCategory(value: string, categories: string[]) {
  const normalizedValue = normalizeCustomListingFieldCategory(value);
  const match = categories.find((category) =>
    isSameCustomListingFieldCategory(normalizedValue, category),
  );
  return match ? normalizeCustomListingFieldCategory(match) : normalizedValue;
}

export function getUniqueCustomListingFieldCategories(categories: string[]) {
  const seen = new Set<string>();
  const uniqueCategories: string[] = [];

  for (const category of categories) {
    const normalizedCategory = normalizeCustomListingFieldCategory(category);
    if (!normalizedCategory || seen.has(normalizedCategory)) {
      continue;
    }

    seen.add(normalizedCategory);
    uniqueCategories.push(normalizedCategory);
  }

  return uniqueCategories;
}

export function compareCustomListingFieldCategories(leftCategory: string, rightCategory: string) {
  return formatCustomListingFieldCategoryLabel(leftCategory).localeCompare(
    formatCustomListingFieldCategoryLabel(rightCategory),
  );
}

export function sortCustomListingFieldsForDisplay<
  T extends { category: string; sortOrder: number; key: string },
>(fields: T[]) {
  return [...fields].sort((left, right) => {
    const byCategory = compareCustomListingFieldCategories(left.category, right.category);
    if (byCategory !== 0) {
      return byCategory;
    }

    const bySortOrder = left.sortOrder - right.sortOrder;
    if (bySortOrder !== 0) {
      return bySortOrder;
    }

    return left.key.localeCompare(right.key);
  });
}
