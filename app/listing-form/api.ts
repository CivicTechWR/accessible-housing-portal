import { z } from "zod";

import { errorMessageSchema } from "@/shared/schemas/common";
import {
  createDraftListingResponseSchema,
  listingEditorResponseSchema,
  type CreateListingInput,
  type ListingEditorData,
  type UpdateListingInput,
} from "@/shared/schemas/listings";
import type { ListingFormData, ListingFormInput } from "./types";

const listingIdResponseSchema = z.object({
  data: z.object({
    id: z.uuid(),
  }),
});

export function mapListingFormToCreateListingInput(data: ListingFormData): CreateListingInput {
  return buildListingPayloadFromForm(data);
}

export function mapListingFormToUpdateListingInput(
  data: ListingFormData,
  status = data.status,
  rawInput?: ListingFormInput,
): UpdateListingInput {
  const { eligibilityCriteria: _eligibilityCriteria, ...payload } = {
    ...buildListingPayloadFromForm(data),
    status,
  };
  const patch: UpdateListingInput = { ...payload };

  if (
    rawInput?.unitNumber !== undefined &&
    normalizeOptionalString(rawInput.unitNumber) === undefined
  ) {
    patch.unitNumber = null;
  }

  const applicationUrl = normalizeOptionalString(data.applicationUrl);
  if (applicationUrl) {
    patch.applicationUrl = applicationUrl;
  } else if (rawInput?.applicationUrl !== undefined) {
    patch.applicationUrl = null;
  }

  return patch;
}

export function mapListingFormToAutosaveUpdateInput(
  data: ListingFormInput,
  status = data.status ?? "draft",
): UpdateListingInput | null {
  const patch: UpdateListingInput = {};
  const address: NonNullable<UpdateListingInput["address"]> = {};
  const contact: NonNullable<UpdateListingInput["contact"]> = {};
  const unit: NonNullable<UpdateListingInput["units"]>[number] = {};

  assignTrimmedString(patch, "title", data.title);
  assignTrimmedString(patch, "name", data.name);
  assignTrimmedString(patch, "description", data.description);
  assignTrimmedString(address, "street", data.street1);
  assignTrimmedString(address, "street2", data.street2);
  assignTrimmedString(address, "city", data.city);
  assignTrimmedString(address, "province", data.province);
  assignTrimmedString(address, "postalCode", data.postalCode);
  assignTrimmedString(contact, "name", data.contactName);
  const contactEmail = normalizeOptionalString(data.contactEmail);
  if (contactEmail && z.email().safeParse(contactEmail).success) {
    contact.email = contactEmail;
  }
  assignTrimmedString(contact, "phone", data.contactPhone);

  const applicationUrl = normalizeOptionalString(data.applicationUrl);
  if (applicationUrl && z.httpUrl().safeParse(applicationUrl).success) {
    patch.applicationUrl = applicationUrl;
  } else if (data.applicationUrl !== undefined) {
    patch.applicationUrl = null;
  }

  if (data.unitNumber !== undefined) {
    patch.unitNumber = normalizeOptionalString(data.unitNumber) ?? null;
  }

  assignTrimmedString(patch, "propertyType", data.propertyType);
  assignTrimmedString(patch, "buildingType", data.buildingType);
  assignTrimmedString(patch, "leaseTerm", data.leaseTerm);

  if (Number.isFinite(data.bedrooms)) {
    unit.bedrooms = data.bedrooms;
  }

  if (Number.isFinite(data.bathrooms)) {
    unit.bathrooms = data.bathrooms;
  }

  if (Number.isFinite(data.squareFeet)) {
    unit.sqft = data.squareFeet;
  }

  if (Number.isFinite(data.monthlyRentCents)) {
    unit.rent = Math.round(data.monthlyRentCents / 100);
  }

  const availableDate = normalizeOptionalString(data.availableOn);

  if (availableDate) {
    unit.availableDate = availableDate;
  }

  if (Object.keys(address).length > 0) {
    patch.address = address;
  }

  if (Object.keys(contact).length > 0) {
    patch.contact = contact;
  }

  if (Object.keys(unit).length > 0) {
    patch.units = [unit];
  }

  if (Number.isFinite(data.unitStory)) {
    patch.unitStory = data.unitStory;
  }

  patch.utilitiesIncluded = data.utilitiesIncluded ?? [];
  patch.accessibilityFeatures = (data.customFeatures ?? []).map((feature) => ({
    id: feature.id,
    name: feature.name,
    description: normalizeOptionalString(feature.description) ?? feature.name,
  }));
  patch.images = (data.images ?? []).flatMap((image) =>
    image.id
      ? [
          {
            id: image.id,
            caption: normalizeOptionalString(image.caption),
          },
        ]
      : [],
  );
  patch.status = status;

  return Object.keys(patch).length > 0 ? patch : null;
}

export async function parseCreateDraftListingResponse(response: Response): Promise<{ id: string }> {
  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  const payload = createDraftListingResponseSchema.parse(await response.json());
  return payload.data;
}

export async function parseCreateListingResponse(response: Response): Promise<{ id: string }> {
  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  const payload = listingIdResponseSchema.parse(await response.json());
  return payload.data;
}

export async function parseListingEditorResponse(response: Response): Promise<{
  id: string;
  data: ListingEditorData;
}> {
  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response));
  }

  const payload = listingEditorResponseSchema.parse(await response.json());
  return {
    id: payload.data.id,
    data: payload.data,
  };
}

async function getApiErrorMessage(response: Response) {
  try {
    const payload = errorMessageSchema.parse(await response.json());
    return payload.message;
  } catch {
    return "Unable to save listing. Please try again.";
  }
}

function buildListingPayloadFromForm(data: ListingFormData): CreateListingInput {
  const applicationUrl = normalizeOptionalString(data.applicationUrl);

  return {
    title: data.title,
    name: data.name,
    description: normalizeOptionalString(data.description),
    address: {
      street: data.street1,
      street2: normalizeOptionalString(data.street2),
      city: data.city,
      province: data.province,
      postalCode: data.postalCode,
    },
    units: [
      {
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        sqft: data.squareFeet ?? 0,
        rent: Math.round(data.monthlyRentCents / 100),
        availableDate:
          normalizeOptionalString(data.availableOn) ?? new Date().toISOString().slice(0, 10),
      },
    ],
    amenities: [],
    accessibilityFeatures: data.customFeatures.map((feature) => ({
      id: feature.id,
      name: feature.name,
      description: normalizeOptionalString(feature.description) ?? feature.name,
    })),
    applicationUrl: applicationUrl ?? undefined,
    eligibilityCriteria: {},
    images: data.images.flatMap((image) =>
      image.id
        ? [
            {
              id: image.id,
              caption: normalizeOptionalString(image.caption),
            },
          ]
        : [],
    ),
    contact: {
      name: data.contactName,
      email: data.contactEmail,
      phone: data.contactPhone,
    },
    status: data.status,
    unitNumber: normalizeOptionalString(data.unitNumber),
    propertyType: data.propertyType,
    buildingType: data.buildingType,
    unitStory: data.unitStory,
    leaseTerm: data.leaseTerm,
    utilitiesIncluded: data.utilitiesIncluded,
  };
}

function normalizeOptionalString(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function assignTrimmedString(
  target: Record<string, unknown>,
  key: string,
  value: string | undefined,
) {
  const normalized = normalizeOptionalString(value);

  if (normalized) {
    target[key] = normalized;
  }
}
