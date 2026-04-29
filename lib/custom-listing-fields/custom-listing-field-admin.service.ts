import "server-only";

import { and, eq, type SQL } from "drizzle-orm";

import { customListingFields } from "@/db/schema";
import { getOptionalSession } from "@/lib/auth/session";
import { fail, succeed, type DomainResult } from "@/lib/http/domain-result";
import {
  createCustomListingField,
  deleteCustomListingFieldById,
  findAdminCustomListingFieldById,
  findAdminCustomListingFields,
  findCustomListingFieldByKey,
  reorderCustomListingFields,
  updateCustomListingFieldById,
} from "@/lib/custom-listing-fields/custom-listing-field-admin.repository";
import { normalizeCustomListingFieldCategory } from "@/lib/custom-listing-fields/custom-listing-field-ordering";
import { canManageAccounts, type AccountActor } from "@/lib/policies/account-policy";
import type {
  AdminCustomListingField,
  AdminCustomListingFieldListResponse,
  AdminCustomListingFieldQuery,
  CreateCustomListingFieldInput,
  CreateCustomListingFieldResponse,
  CustomListingFieldByIdResponse,
  DeleteCustomListingFieldResponse,
  ReorderCustomListingFieldsInput,
  ReorderCustomListingFieldsResponse,
  UpdateCustomListingFieldInput,
  UpdateCustomListingFieldResponse,
} from "@/shared/schemas/custom-listing-fields";

function toAdminCustomListingField(row: {
  id: string;
  key: string;
  label: string;
  description: string | null;
  fieldType: AdminCustomListingField["type"];
  category: string;
  helpText: string | null;
  placeholder: string | null;
  isPublic: boolean;
  isFilterable: boolean;
  isRequired: boolean;
  sortOrder: number;
  options: AdminCustomListingField["options"];
  createdAt: Date;
  updatedAt: Date;
}): AdminCustomListingField {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    description: row.description,
    type: row.fieldType,
    category: row.category,
    helpText: row.helpText,
    placeholder: row.placeholder,
    publicOnly: row.isPublic,
    filterableOnly: row.isFilterable,
    required: row.isRequired,
    sortOrder: row.sortOrder,
    options: row.options ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getAdminCustomListingFieldsService(
  query: AdminCustomListingFieldQuery,
): Promise<DomainResult<AdminCustomListingFieldListResponse>> {
  const actorResult = await requireCustomListingFieldsAdminActor();

  if (!actorResult.ok) {
    return actorResult;
  }

  const conditions: SQL<unknown>[] = [];

  if (query.publicOnly === "true") {
    conditions.push(eq(customListingFields.isPublic, true));
  }

  if (query.filterableOnly === "true") {
    conditions.push(eq(customListingFields.isFilterable, true));
  }

  if (query.category) {
    conditions.push(eq(customListingFields.category, query.category));
  }

  if (query.type) {
    conditions.push(eq(customListingFields.fieldType, query.type));
  }

  const rows = await findAdminCustomListingFields({
    where: conditions.length > 0 ? and(...conditions) : undefined,
  });

  return succeed({
    data: rows.map(toAdminCustomListingField),
  });
}

export async function getAdminCustomListingFieldByIdService(
  fieldId: string,
): Promise<DomainResult<CustomListingFieldByIdResponse>> {
  const actorResult = await requireCustomListingFieldsAdminActor();

  if (!actorResult.ok) {
    return actorResult;
  }

  const field = await findAdminCustomListingFieldById(fieldId);

  if (!field) {
    return fail("not_found", "Custom listing field not found");
  }

  return succeed({
    data: toAdminCustomListingField(field),
  });
}

export async function createAdminCustomListingFieldService(
  input: CreateCustomListingFieldInput,
): Promise<DomainResult<CreateCustomListingFieldResponse>> {
  const actorResult = await requireCustomListingFieldsAdminActor();

  if (!actorResult.ok) {
    return actorResult;
  }

  const existingByKey = await findCustomListingFieldByKey(input.key);

  if (existingByKey) {
    return fail("conflict", "A custom listing field with this key already exists.");
  }

  const created = await createCustomListingField({
    key: input.key,
    label: input.label,
    description: input.description,
    fieldType: input.type,
    category: normalizeCustomListingFieldCategory(input.category),
    helpText: input.helpText,
    placeholder: input.placeholder,
    isPublic: input.publicOnly,
    isFilterable: input.filterableOnly,
    isRequired: input.required,
    sortOrder: input.sortOrder,
    options: input.options,
    actorUserId: actorResult.value.actor.userId,
  });

  if (!created) {
    return fail("validation", "Unable to create custom listing field.");
  }

  const field = await findAdminCustomListingFieldById(created.id);

  if (!field) {
    return fail("not_found", "Custom listing field not found");
  }

  return succeed({
    message: "Custom listing field created",
    data: toAdminCustomListingField(field),
  });
}

export async function updateAdminCustomListingFieldByIdService(input: {
  fieldId: string;
  payload: UpdateCustomListingFieldInput;
}): Promise<DomainResult<UpdateCustomListingFieldResponse>> {
  const actorResult = await requireCustomListingFieldsAdminActor();

  if (!actorResult.ok) {
    return actorResult;
  }

  const existingField = await findAdminCustomListingFieldById(input.fieldId);

  if (!existingField) {
    return fail("not_found", "Custom listing field not found");
  }

  if (input.payload.key && input.payload.key !== existingField.key) {
    const existingByKey = await findCustomListingFieldByKey(input.payload.key);

    if (existingByKey && existingByKey.id !== input.fieldId) {
      return fail("conflict", "A custom listing field with this key already exists.");
    }
  }

  const updated = await updateCustomListingFieldById({
    fieldId: input.fieldId,
    key: input.payload.key,
    label: input.payload.label,
    description: input.payload.description,
    fieldType: input.payload.type,
    category: input.payload.category
      ? normalizeCustomListingFieldCategory(input.payload.category)
      : undefined,
    helpText: input.payload.helpText,
    placeholder: input.payload.placeholder,
    isPublic: input.payload.publicOnly,
    isFilterable: input.payload.filterableOnly,
    isRequired: input.payload.required,
    sortOrder: input.payload.sortOrder,
    options: input.payload.options,
    actorUserId: actorResult.value.actor.userId,
  });

  if (!updated) {
    return fail("not_found", "Custom listing field not found");
  }

  const field = await findAdminCustomListingFieldById(input.fieldId);

  if (!field) {
    return fail("not_found", "Custom listing field not found");
  }

  return succeed({
    message: "Custom listing field updated",
    data: toAdminCustomListingField(field),
  });
}

export async function reorderAdminCustomListingFieldsService(
  input: ReorderCustomListingFieldsInput,
): Promise<DomainResult<ReorderCustomListingFieldsResponse>> {
  const actorResult = await requireCustomListingFieldsAdminActor();

  if (!actorResult.ok) {
    return actorResult;
  }

  const reorderedFields = await reorderCustomListingFields({
    category: normalizeCustomListingFieldCategory(input.category),
    fields: input.fields,
    actorUserId: actorResult.value.actor.userId,
  });

  if (!reorderedFields) {
    return fail("validation", "Unable to reorder custom listing fields. Refresh and try again.");
  }

  return succeed({
    message: "Custom listing field order updated",
    data: reorderedFields.map(toAdminCustomListingField),
  });
}

export async function deleteAdminCustomListingFieldByIdService(
  fieldId: string,
): Promise<DomainResult<DeleteCustomListingFieldResponse>> {
  const actorResult = await requireCustomListingFieldsAdminActor();

  if (!actorResult.ok) {
    return actorResult;
  }

  const deleted = await deleteCustomListingFieldById(fieldId);

  if (!deleted) {
    return fail("not_found", "Custom listing field not found");
  }

  return succeed({
    message: "Custom listing field deleted",
    data: {
      id: deleted.id,
    },
  });
}

async function requireCustomListingFieldsAdminActor(): Promise<
  DomainResult<{
    actor: AccountActor;
  }>
> {
  const optionalSession = await getOptionalSession();

  if (!optionalSession.session || !optionalSession.authzUser) {
    return fail("unauthorized", "Unauthorized");
  }

  const actor: AccountActor = {
    userId: optionalSession.session.user.id,
    role: optionalSession.authzUser.role,
  };

  if (!canManageAccounts(actor)) {
    return fail("forbidden", "Forbidden");
  }

  return succeed({
    actor,
  });
}
