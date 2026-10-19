import { NextResponse } from "next/server";
import { z } from "zod";

import { getOptionalSession } from "@/lib/auth/session";
import { getListingImageByIdService } from "@/lib/images/image.service";

const imageIdSchema = z.uuid("Invalid image id.");

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function getImageUploadByIdHandler(_request: Request, context: RouteContext) {
  const params = await context.params;
  const parsedImageId = imageIdSchema.safeParse(params.id);

  if (!parsedImageId.success) {
    return Response.json({ message: "Invalid image id." }, { status: 400 });
  }

  const optionalSession = await getOptionalSession();
  const result = await getListingImageByIdService({
    imageId: parsedImageId.data,
    actor: {
      userId: optionalSession.session?.user.id ?? null,
      role: optionalSession.authzUser?.role ?? null,
    },
  });

  if (!result.ok) {
    return Response.json({ message: result.error.message }, { status: result.error.status });
  }

  if (result.value.kind === "redirect") {
    return NextResponse.redirect(result.value.url);
  }

  return new Response(new Uint8Array(result.value.data), {
    status: 200,
    headers: {
      "cache-control": result.value.cacheControl,
      "content-length": String(result.value.sizeBytes),
      "content-type": result.value.contentType,
    },
  });
}
