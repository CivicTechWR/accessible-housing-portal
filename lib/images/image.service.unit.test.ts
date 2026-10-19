/** @jest-environment node */

import { beforeEach, expect, it, jest } from "@jest/globals";
import sharp from "sharp";

import {
  createListingImageUpload,
  findListingImageById,
  findListingRecordById,
} from "@/lib/listings/listing.repository";
import { getListingImageByIdService, uploadListingImageService } from "./image.service";

jest.mock("@/lib/listings/listing.repository", () => ({
  findListingRecordById: jest.fn(async () => ({
    status: "draft",
    property: { ownerUserId: "owner" },
  })),
  createListingImageUpload: jest.fn(async () => ({ id: "upload" })),
  findListingImageById: jest.fn(),
}));

async function uploadPng(width: number, height: number) {
  const png = await sharp({
    create: { width, height, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();

  return uploadListingImageService({
    actorUserId: "owner",
    actorRole: "partner",
    listingId: "22222222-2222-4222-8222-222222222222",
    file: new File([new Uint8Array(png)], "photo.png", { type: "image/png" }),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

it("hides foreign listing existence during uploads", async () => {
  const input = {
    actorUserId: "other-partner",
    actorRole: "partner" as const,
    listingId: "22222222-2222-4222-8222-222222222222",
    file: new File(["unused"], "photo.png", { type: "image/png" }),
  };
  const foreignResult = await uploadListingImageService(input);
  jest.mocked(findListingRecordById).mockResolvedValueOnce(null);

  expect(foreignResult).toEqual({
    ok: false,
    error: { status: 404, message: "Listing not found." },
  });
  expect(await uploadListingImageService(input)).toEqual(foreignResult);
  expect(createListingImageUpload).not.toHaveBeenCalled();
});

it("hides orphaned image existence from other partners", async () => {
  jest
    .mocked(findListingImageById)
    .mockResolvedValueOnce({
      id: "image",
      listingId: null,
      uploadedByUserId: "owner",
      imageUrl: null,
      imageData: Buffer.from("image"),
      contentType: "image/jpeg",
      sizeBytes: 5,
      listingStatus: null,
      listingOwnerUserId: null,
    })
    .mockResolvedValueOnce(null);

  const input = { imageId: "image", actor: { userId: "other-partner", role: "partner" as const } };
  const foreignResult = await getListingImageByIdService(input);
  expect(foreignResult).toEqual({
    ok: false,
    error: { status: 404, message: "Image not found." },
  });
  expect(await getListingImageByIdService(input)).toEqual(foreignResult);
});

it("shares published images with caches and keeps archived images private", async () => {
  const image = {
    id: "image",
    listingId: "22222222-2222-4222-8222-222222222222",
    uploadedByUserId: "owner",
    imageUrl: null,
    imageData: Buffer.from("image"),
    contentType: "image/jpeg",
    sizeBytes: 5,
    listingStatus: "published" as const,
    listingOwnerUserId: "owner",
  };
  const publicRequest = { imageId: image.id, actor: { userId: null, role: null } };
  jest.mocked(findListingImageById).mockResolvedValueOnce(image);

  expect(await getListingImageByIdService(publicRequest)).toMatchObject({
    ok: true,
    value: { kind: "binary", cacheControl: "public, max-age=86400", data: image.imageData },
  });

  jest.mocked(findListingImageById).mockResolvedValue({ ...image, listingStatus: "archived" });
  expect(await getListingImageByIdService(publicRequest)).toEqual({
    ok: false,
    error: { status: 404, message: "Image not found." },
  });
  expect(
    await getListingImageByIdService({
      imageId: image.id,
      actor: { userId: "owner", role: "partner" },
    }),
  ).toMatchObject({
    ok: true,
    value: { kind: "binary", cacheControl: "private, max-age=60" },
  });
});

it("rejects an image above 24 megapixels without storing it", async () => {
  expect(await uploadPng(6001, 4000)).toEqual({
    ok: false,
    error: { status: 413, message: "Image uploads must be 24 megapixels or smaller." },
  });
  expect(createListingImageUpload).not.toHaveBeenCalled();
});

it("accepts an image at 24 megapixels and stores a resized JPEG", async () => {
  const result = await uploadPng(6000, 4000);

  expect(result.ok).toBe(true);
  const upload = jest.mocked(createListingImageUpload).mock.calls[0]?.[0];
  if (!upload) throw new Error("Expected the image to be stored.");
  const metadata = await sharp(upload.imageData).metadata();
  expect(metadata.format).toBe("jpeg");
  expect(metadata.width).toBe(1600);
  expect(metadata.height).toBe(1067);
});
