import { z } from "zod";

import { errorMessageSchema } from "@/shared/schemas/common";
import {
  createDraftListingResponseSchema,
  listingEditorResponseSchema,
  type CreateListingInput,
  type ListingEditorData,
  type PatchListingInput,
  type ReplaceListingInput,
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

export function mapListingFormToReplaceListingInput(
  data: ListingFormData,
  status = data.status,
  rawInput?: ListingFormInput,
): ReplaceListingInput {
  const payload = {
    ...buildListingPayloadFromForm(data),
    status,
  };
  const replacement: ReplaceListingInput = { ...payload };

  if (
    rawInput?.unitNumber !== undefined &&
    normalizeOptionalString(rawInput.unitNumber) === undefined
  ) {
    replacement.unitNumber = null;
  }

  const applicationUrl = normalizeOptionalString(data.applicationUrl);
  if (applicationUrl) {
    replacement.applicationUrl = applicationUrl;
  } else if (rawInput?.applicationUrl !== undefined) {
    replacement.applicationUrl = null;
  }

  return replacement;
}

export function mapListingFormToAutosavePatchInput(
  data: ListingFormInput,
  status = data.status ?? "draft",
): PatchListingInput | null {
  const patch: PatchListingInput = {};
  const address: NonNullable<PatchListingInput["address"]> = {};
  const contact: NonNullable<PatchListingInput["contact"]> = {};
  const unit: NonNullable<PatchListingInput["units"]>[number] = {};

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

  assignTrimmedString(patch, "buildingType", data.buildingType);
  const leaseTermMonths = parseLeaseTermMonths(data.leaseTerm);
  if (leaseTermMonths !== undefined) {
    patch.leaseTermMonths = leaseTermMonths;
  }

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
    accessibilityFeatures: data.customFeatures.map((feature) => ({
      id: feature.id,
      name: feature.name,
      description: normalizeOptionalString(feature.description) ?? feature.name,
    })),
    applicationUrl: applicationUrl ?? undefined,
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
    buildingType: data.buildingType,
    leaseTermMonths: data.leaseTerm,
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

function parseLeaseTermMonths(value: number | undefined) {
  return value !== undefined && Number.isInteger(value) && value > 0 ? value : undefined;
}
