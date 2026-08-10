import "server-only";

import { desc, eq, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { customListingFields } from "@/db/schema";

export const adminCustomListingFieldColumns = {
  id: customListingFields.id,
  key: customListingFields.key,
  label: customListingFields.label,
  description: customListingFields.description,
  fieldType: customListingFields.fieldType,
  category: customListingFields.category,
  helpText: customListingFields.helpText,
  placeholder: customListingFields.placeholder,
  isPublic: customListingFields.isPublic,
  isFilterable: customListingFields.isFilterable,
  isRequired: customListingFields.isRequired,
  sortOrder: customListingFields.sortOrder,
  options: customListingFields.options,
  createdAt: customListingFields.createdAt,
  updatedAt: customListingFields.updatedAt,
};

export async function findAdminCustomListingFields(input: { where?: SQL<unknown> }) {
  return db
    .select(adminCustomListingFieldColumns)
    .from(customListingFields)
    .where(input.where)
    .orderBy(
      desc(customListingFields.category),
      customListingFields.sortOrder,
      customListingFields.key,
    );
}

export async function findAdminCustomListingFieldById(fieldId: string) {
  const [field] = await db
    .select(adminCustomListingFieldColumns)
    .from(customListingFields)
    .where(eq(customListingFields.id, fieldId))
    .limit(1);

  return field ?? null;
}

export async function findCustomListingFieldByKey(key: string) {
  const [field] = await db
    .select({
      id: customListingFields.id,
      key: customListingFields.key,
    })
    .from(customListingFields)
    .where(eq(customListingFields.key, key))
    .limit(1);

  return field ?? null;
}

export async function createCustomListingField(input: {
  key: string;
  label: string;
  description?: string | null;
  fieldType: typeof customListingFields.$inferInsert.fieldType;
  category: string;
  helpText?: string | null;
  placeholder?: string | null;
  isPublic: boolean;
  isFilterable: boolean;
  isRequired: boolean;
  sortOrder: number;
  options: null;
  actorUserId: string;
}) {
  const [field] = await db
    .insert(customListingFields)
    .values({
      key: input.key,
      label: input.label,
      description: input.description ?? null,
      fieldType: input.fieldType,
      category: input.category,
      helpText: input.helpText ?? null,
      placeholder: input.placeholder ?? null,
      isPublic: input.isPublic,
      isFilterable: input.isFilterable,
      isRequired: input.isRequired,
      sortOrder: input.sortOrder,
      options: input.options,
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
    })
    .returning({ id: customListingFields.id });

  return field ?? null;
}

export async function updateCustomListingFieldById(input: {
  fieldId: string;
  key?: string;
  label?: string;
  description?: string | null;
  fieldType?: typeof customListingFields.$inferInsert.fieldType;
  category?: string;
  helpText?: string | null;
  placeholder?: string | null;
  isPublic?: boolean;
  isFilterable?: boolean;
  isRequired?: boolean;
  sortOrder?: number;
  options?: typeof customListingFields.$inferInsert.options;
  actorUserId: string;
}) {
  const [field] = await db
    .update(customListingFields)
    .set({
      key: input.key,
      label: input.label,
      description: input.description,
      fieldType: input.fieldType,
      category: input.category,
      helpText: input.helpText,
      placeholder: input.placeholder,
      isPublic: input.isPublic,
      isFilterable: input.isFilterable,
      isRequired: input.isRequired,
      sortOrder: input.sortOrder,
      options: input.options,
      updatedByUserId: input.actorUserId,
    })
    .where(eq(customListingFields.id, input.fieldId))
    .returning({ id: customListingFields.id });

  return field ?? null;
}

export async function reorderCustomListingFields(input: {
  category: string;
  fields: Array<{
    id: string;
    sortOrder: number;
  }>;
  actorUserId: string;
}) {
  return db.transaction(async (tx) => {
    const categoryFields = await tx
      .select(adminCustomListingFieldColumns)
      .from(customListingFields)
      .where(eq(customListingFields.category, input.category));

    const requestedIds = new Set(input.fields.map((field) => field.id));
    const requestedSortOrders = new Set(input.fields.map((field) => field.sortOrder));
    const expectedSortOrders = new Set(input.fields.map((_, index) => index + 1));
    const includesEveryCategoryField =
      requestedIds.size === categoryFields.length &&
      categoryFields.every((field) => requestedIds.has(field.id));
    const hasContiguousSortOrder = input.fields.every((field) =>
      expectedSortOrders.has(field.sortOrder),
    );

    if (
      requestedIds.size !== input.fields.length ||
      requestedSortOrders.size !== input.fields.length ||
      !hasContiguousSortOrder ||
      !includesEveryCategoryField
    ) {
      return null;
    }

    for (const field of input.fields) {
      await tx
        .update(customListingFields)
        .set({
          sortOrder: field.sortOrder,
          updatedByUserId: input.actorUserId,
        })
        .where(eq(customListingFields.id, field.id));
    }

    return tx
      .select(adminCustomListingFieldColumns)
      .from(customListingFields)
      .where(eq(customListingFields.category, input.category))
      .orderBy(customListingFields.sortOrder, customListingFields.key);
  });
}

export async function deleteCustomListingFieldById(fieldId: string) {
  const [field] = await db
    .delete(customListingFields)
    .where(eq(customListingFields.id, fieldId))
    .returning({ id: customListingFields.id });

  return field ?? null;
}
