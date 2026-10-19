import { NextRequest } from "next/server";
import { z } from "zod";

import { requireListingWriteSession } from "@/lib/auth/session";
import { MAX_UPLOAD_BYTES, uploadListingImageService } from "@/lib/images/image.service";

// Allow multipart headers and fields in addition to the 25 MiB file limit.
const MAX_MULTIPART_BYTES = MAX_UPLOAD_BYTES + 1024 * 1024;

class UploadTooLargeError extends Error {}

export async function postImageUploadHandler(request: NextRequest) {
  const sessionResult = await requireListingWriteSession();

  if (sessionResult.response) {
    return sessionResult.response;
  }

  let formData: FormData;
  try {
    formData = await readUploadFormData(request);
  } catch (error) {
    if (error instanceof UploadTooLargeError) {
      return Response.json(
        { message: "Upload requests must be 26MB or smaller." },
        { status: 413 },
      );
    }

    return Response.json({ message: "Invalid upload request." }, { status: 400 });
  }

  try {
    const file = formData.get("file");
    const listingId = formData.get("listingId");

    if (!(file instanceof File)) {
      return Response.json({ message: "Missing image file upload." }, { status: 400 });
    }

    if (typeof listingId !== "string") {
      return Response.json({ message: "Missing listing id." }, { status: 400 });
    }

    const result = await uploadListingImageService({
      actorUserId: sessionResult.session.user.id,
      actorRole: sessionResult.authzUser.role,
      file,
      listingId,
    });

    if (!result.ok) {
      return Response.json({ message: result.error.message }, { status: result.error.status });
    }

    return Response.json(result.value, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { message: error.issues[0]?.message ?? "Invalid upload request." },
        { status: 400 },
      );
    }

    return Response.json({ message: "Unable to upload image." }, { status: 500 });
  }
}

async function readUploadFormData(request: NextRequest) {
  if (Number(request.headers.get("content-length")) > MAX_MULTIPART_BYTES) {
    await request.body?.cancel();
    throw new UploadTooLargeError();
  }

  let bytesRead = 0;
  const limiter = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      bytesRead += chunk.byteLength;
      if (bytesRead > MAX_MULTIPART_BYTES) {
        throw new UploadTooLargeError();
      }
      controller.enqueue(chunk);
    },
  });

  return new Response(request.body?.pipeThrough(limiter), {
    headers: { "content-type": request.headers.get("content-type") ?? "" },
  }).formData();
}
