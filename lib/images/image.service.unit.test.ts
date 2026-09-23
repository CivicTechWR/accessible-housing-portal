/** @jest-environment node */

import { beforeEach, expect, it, jest } from "@jest/globals";
import sharp from "sharp";

import { createListingImageUpload } from "@/lib/listings/listing.repository";
import { uploadListingImageService } from "./image.service";

jest.mock("@/lib/listings/listing.repository", () => ({
  findListingRecordById: jest.fn(async () => ({
    status: "draft",
    property: { ownerUserId: "owner" },
  })),
  createListingImageUpload: jest.fn(async () => ({ id: "upload" })),
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
