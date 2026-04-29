import "server-only";

import sharp from "sharp";
import { z } from "zod";

import type { UserRole } from "@/db/schema";
import {
  createListingImageUpload,
  findListingImageById,
  findListingRecordById,
} from "@/lib/listings/listing.repository";
import { canEditListing, canReadListing } from "@/lib/policies/listing-policy";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const MAX_UPLOAD_PIXELS = 24_000_000;
const MAX_OUTPUT_DIMENSION = 1600;
const JPEG_QUALITY = 80;

const listingIdSchema = z.uuid("Invalid listing id.");

const sharpSupportedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const supportedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".jxl"]);

type ProcessedImage = {
  contentType: "image/jpeg";
  data: Buffer;
  height: number;
  sizeBytes: number;
  width: number;
};

type ImageAccessActor = {
  userId: string | null;
  role: UserRole | null;
};

type GetListingImageByIdServiceResult =
  | {
      kind: "redirect";
      url: string;
    }
  | {
      kind: "binary";
      cacheControl: string;
      contentType: string;
      data: Buffer;
      sizeBytes: number;
    };

type ImageServiceError = {
  message: string;
  status: number;
};

type ImageServiceResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      error: ImageServiceError;
    };

export async function uploadListingImageService(input: {
  actorUserId: string;
  actorRole: UserRole;
  file: File;
  listingId: string;
}): Promise<
  ImageServiceResult<{
    message: string;
    data: {
      id: string;
      url: string;
      width: number;
      height: number;
      fileName: string;
      fileType: string;
      fileSize: number;
    };
  }>
> {
  const fileValidationResult = validateUploadedFile(input.file);

  if (!fileValidationResult.ok) {
    return fileValidationResult;
  }

  const listingIdResult = parseListingId(input.listingId);

  if (!listingIdResult.ok) {
    return listingIdResult;
  }

  const listing = await findListingRecordById(listingIdResult.value);

  if (!listing) {
    return fail(404, "Listing not found.");
  }

  if (
    !canEditListing(
      {
        ownerUserId: listing.property.ownerUserId,
        status: listing.status,
      },
      {
        userId: input.actorUserId,
        role: input.actorRole,
      },
    )
  ) {
    return fail(403, "Forbidden");
  }

  const fileBuffer = Buffer.from(await input.file.arrayBuffer());
  const processedImageResult = await processUploadedImage(input.file, fileBuffer);

  if (!processedImageResult.ok) {
    return processedImageResult;
  }

  const createdUpload = await createListingImageUpload({
    uploadedByUserId: input.actorUserId,
    listingId: listingIdResult.value,
    imageData: processedImageResult.value.data,
    originalFilename: input.file.name,
    contentType: processedImageResult.value.contentType,
    sizeBytes: processedImageResult.value.sizeBytes,
    width: processedImageResult.value.width,
    height: processedImageResult.value.height,
  });

  return succeed({
    message: "Image upload successful",
    data: {
      id: createdUpload.id,
      url: `/api/image-uploads/${createdUpload.id}`,
      width: processedImageResult.value.width,
      height: processedImageResult.value.height,
      fileName: input.file.name,
      fileType: processedImageResult.value.contentType,
      fileSize: processedImageResult.value.sizeBytes,
    },
  });
}

export async function getListingImageByIdService(input: {
  imageId: string;
  actor: ImageAccessActor;
}): Promise<ImageServiceResult<GetListingImageByIdServiceResult>> {
  const image = await findListingImageById(input.imageId);

  if (!image) {
    return fail(404, "Image not found.");
  }

  if (image.listingId && image.listingStatus && image.listingOwnerUserId) {
    if (
      !canReadListing(
        {
          ownerUserId: image.listingOwnerUserId,
          status: image.listingStatus,
        },
        input.actor,
      )
    ) {
      return fail(404, "Image not found.");
    }
  } else if (
    !input.actor.userId ||
    (input.actor.role !== "admin" && input.actor.userId !== image.uploadedByUserId)
  ) {
    return fail(401, "Unauthorized");
  }

  if (image.imageUrl && !image.imageData) {
    return succeed({
      kind: "redirect",
      url: image.imageUrl,
    });
  }

  if (!image.imageData || !image.contentType || !image.sizeBytes) {
    return fail(404, "Image not found.");
  }

  return succeed({
    kind: "binary",
    data: image.imageData,
    contentType: image.contentType,
    sizeBytes: image.sizeBytes,
    cacheControl:
      image.listingStatus === "published"
        ? "public, max-age=31536000, immutable"
        : "private, max-age=60",
  });
}

function validateUploadedFile(file: File): ImageServiceResult<true> {
  if (file.size > MAX_UPLOAD_BYTES) {
    return fail(413, "Image uploads must be 25MB or smaller.");
  }

  const normalizedFileName = file.name.toLowerCase();
  const matchingExtension = Array.from(supportedExtensions).find((extension) =>
    normalizedFileName.endsWith(extension),
  );

  const isSupportedMimeType =
    sharpSupportedMimeTypes.has(file.type) || file.type === "image/jxl" || file.type === "";

  if (!matchingExtension || !isSupportedMimeType) {
    return fail(415, "Only jpg, png, webp, avif, and jxl images are supported.");
  }

  return succeed(true);
}

function parseListingId(rawListingId: string): ImageServiceResult<string> {
  const parsedListingId = listingIdSchema.safeParse(rawListingId.trim());

  return parsedListingId.success
    ? succeed(parsedListingId.data)
    : fail(400, parsedListingId.error.issues[0]?.message ?? "Invalid listing id.");
}

async function processUploadedImage(
  file: File,
  fileBuffer: Buffer,
): Promise<ImageServiceResult<ProcessedImage>> {
  const normalizedFileName = file.name.toLowerCase();
  const isJxl = file.type === "image/jxl" || normalizedFileName.endsWith(".jxl");

  return isJxl ? processJxlImage(fileBuffer) : processSharpCompatibleImage(fileBuffer);
}

async function processSharpCompatibleImage(
  fileBuffer: Buffer,
): Promise<ImageServiceResult<ProcessedImage>> {
  try {
    const image = sharp(fileBuffer, {
      animated: false,
      failOn: "error",
      limitInputPixels: false,
    });
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      return fail(400, "Unable to determine image dimensions.");
    }

    const dimensionValidationResult = validateImageDimensions(metadata.width, metadata.height);

    if (!dimensionValidationResult.ok) {
      return dimensionValidationResult;
    }

    const { data, info } = await image
      .rotate()
      .flatten({ background: "#ffffff" })
      .resize({
        width: MAX_OUTPUT_DIMENSION,
        height: MAX_OUTPUT_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: JPEG_QUALITY,
        mozjpeg: true,
      })
      .toBuffer({ resolveWithObject: true });

    return succeed({
      contentType: "image/jpeg",
      data,
      width: info.width,
      height: info.height,
      sizeBytes: data.length,
    });
  } catch {
    return fail(400, "Unable to process uploaded image.");
  }
}

async function processJxlImage(fileBuffer: Buffer): Promise<ImageServiceResult<ProcessedImage>> {
  try {
    const { decode } = await import("@jsquash/jxl");
    const decodedImage = await decode(Uint8Array.from(fileBuffer).buffer);
    const dimensionValidationResult = validateImageDimensions(
      decodedImage.width,
      decodedImage.height,
    );

    if (!dimensionValidationResult.ok) {
      return dimensionValidationResult;
    }

    const rawImage = Buffer.from(
      decodedImage.data.buffer,
      decodedImage.data.byteOffset,
      decodedImage.data.byteLength,
    );
    const { data, info } = await sharp(rawImage, {
      raw: {
        width: decodedImage.width,
        height: decodedImage.height,
        channels: 4,
      },
      limitInputPixels: false,
    })
      .flatten({ background: "#ffffff" })
      .resize({
        width: MAX_OUTPUT_DIMENSION,
        height: MAX_OUTPUT_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: JPEG_QUALITY,
        mozjpeg: true,
      })
      .toBuffer({ resolveWithObject: true });

    return succeed({
      contentType: "image/jpeg",
      data,
      width: info.width,
      height: info.height,
      sizeBytes: data.length,
    });
  } catch {
    return fail(415, "JPEG XL uploads are not supported by this server build.");
  }
}

function validateImageDimensions(width: number, height: number): ImageServiceResult<true> {
  if (width * height > MAX_UPLOAD_PIXELS) {
    return fail(413, "Image uploads must be 24 megapixels or smaller.");
  }

  return succeed(true);
}

function succeed<T>(value: T): ImageServiceResult<T> {
  return {
    ok: true,
    value,
  };
}

function fail(status: number, message: string): ImageServiceResult<never> {
  return {
    ok: false,
    error: {
      status,
      message,
    },
  };
}
