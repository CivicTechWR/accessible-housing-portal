/** @jest-environment node */

import { beforeEach, expect, it, jest } from "@jest/globals";
import { NextRequest } from "next/server";

import { uploadListingImageService } from "@/lib/images/image.service";
import { postImageUploadHandler } from "./handlers";

jest.mock("@/lib/auth/session", () => ({
  requireListingWriteSession: jest.fn(async () => ({
    response: null,
    session: { user: { id: "owner" } },
    authzUser: { role: "partner" },
  })),
}));

jest.mock("@/lib/images/image.service", () => ({
  MAX_UPLOAD_BYTES: 25 * 1024 * 1024,
  uploadListingImageService: jest.fn(async () => ({ ok: true, value: { message: "Stored" } })),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

it("accepts a normal multipart upload", async () => {
  const body = new FormData();
  body.set("file", new File(["photo"], "photo.png", { type: "image/png" }));
  body.set("listingId", "22222222-2222-4222-8222-222222222222");

  const response = await postImageUploadHandler(
    new NextRequest("http://localhost/api/image-uploads", { method: "POST", body }),
  );

  expect(response.status).toBe(201);
  const upload = jest.mocked(uploadListingImageService).mock.calls[0]?.[0];
  expect(upload?.listingId).toBe("22222222-2222-4222-8222-222222222222");
  expect(await upload?.file.text()).toBe("photo");
});

it("rejects an oversized declared body without reading it", async () => {
  let cancelled = false;
  let bytesRead = 0;
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        bytesRead += 1;
        controller.enqueue(new Uint8Array(1));
      },
      cancel() {
        cancelled = true;
      },
    },
    { highWaterMark: 0 },
  );
  const response = await postImageUploadHandler(
    new NextRequest("http://localhost/api/image-uploads", {
      method: "POST",
      headers: { "content-length": String(27 * 1024 * 1024) },
      body,
      duplex: "half",
    }),
  );

  expect(response.status).toBe(413);
  expect(bytesRead).toBe(0);
  expect(cancelled).toBe(true);
  expect(uploadListingImageService).not.toHaveBeenCalled();
});

it.each([undefined, "1"])(
  "bounds streamed fields with Content-Length %s",
  async (contentLength) => {
    let chunksRead = 0;
    let cancelled = false;
    const megabyte = new Uint8Array(1024 * 1024).fill(97);
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            '--upload\r\nContent-Disposition: form-data; name="extra"\r\n\r\n',
          ),
        );
      },
      pull(controller) {
        chunksRead += 1;
        if (chunksRead <= 40) {
          controller.enqueue(megabyte);
        } else {
          controller.enqueue(new TextEncoder().encode("\r\n--upload--\r\n"));
          controller.close();
        }
      },
      cancel() {
        cancelled = true;
      },
    });
    const headers = new Headers({ "content-type": "multipart/form-data; boundary=upload" });
    if (contentLength) headers.set("content-length", contentLength);

    const response = await postImageUploadHandler(
      new NextRequest("http://localhost/api/image-uploads", {
        method: "POST",
        body,
        headers,
        duplex: "half",
      }),
    );

    expect(response.status).toBe(413);
    expect(chunksRead).toBeLessThan(40);
    expect(cancelled).toBe(true);
    expect(uploadListingImageService).not.toHaveBeenCalled();
  },
);
