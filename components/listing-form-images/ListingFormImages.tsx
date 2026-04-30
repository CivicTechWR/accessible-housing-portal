"use client";

import { ChangeEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";

import { ListingFormControl, ListingFormImage } from "@/app/listing-form/types";
import { FormSection } from "@/components/listing-form-layout/ListingFormLayout";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trimmedAbsoluteOrRootRelativeUrlString } from "@/shared/schemas/string-normalizers";

const uploadImageResponseSchema = z.object({
  data: z.object({
    id: z.uuid(),
    url: trimmedAbsoluteOrRootRelativeUrlString(),
  }),
});

const acceptedImageTypes =
  ".jpg,.jpeg,.png,.webp,.avif,.jxl,image/jpeg,image/png,image/webp,image/avif,image/jxl";

export interface ListingFormImagesProps {
  control: ListingFormControl;
  listingId?: string;
  activateDraftListing: (listingId: string) => void;
  prepareDraftListing: () => Promise<string>;
}

async function uploadFile(
  file: File,
  listingId: string,
): Promise<z.infer<typeof uploadImageResponseSchema>["data"]> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("listingId", listingId);

  const response = await fetch("/api/image-uploads", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? "Image upload failed.");
  }

  return uploadImageResponseSchema.parse(await response.json()).data;
}

export function ListingFormImages({
  control,
  listingId,
  activateDraftListing,
  prepareDraftListing,
}: ListingFormImagesProps) {
  const uploadMutation = useMutation({
    mutationFn: async ({ file, listingId }: { file: File; listingId: string }) =>
      uploadFile(file, listingId),
  });

  const handleImageUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    currentImages: ListingFormImage[],
    onChange: (images: ListingFormImage[]) => void,
  ) => {
    const files = event.target.files;

    if (!files?.length) {
      return;
    }

    try {
      const uploadedImages: ListingFormImage[] = [];
      const resolvedListingId = listingId ?? (await prepareDraftListing());

      for (const file of Array.from(files)) {
        const uploadedImage = await uploadMutation.mutateAsync({
          file,
          listingId: resolvedListingId,
        });
        uploadedImages.push({
          id: uploadedImage.id,
          url: uploadedImage.url,
          caption: "",
        });
      }

      onChange([...currentImages, ...uploadedImages]);

      if (!listingId) {
        activateDraftListing(resolvedListingId);
      }
    } catch {
      // TanStack Query stores the error for rendering beside the input.
    } finally {
      event.target.value = "";
    }
  };

  return (
    <FormSection
      isSeparated
      title="Listing Images"
      description="Upload photos for the listing and add captions to provide extra context for each image."
    >
      <FormField
        control={control}
        name="images"
        render={({ field }) => {
          const images = field.value ?? [];

          return (
            <FormItem className="md:col-span-2">
              <FormLabel>Images</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  multiple
                  accept={acceptedImageTypes}
                  onChange={(event) => handleImageUpload(event, images, field.onChange)}
                  disabled={uploadMutation.isPending}
                />
              </FormControl>
              <FormDescription>
                {uploadMutation.isPending
                  ? "Uploading images..."
                  : !listingId
                    ? "Uploading an image will create a draft automatically."
                    : "You can select multiple files at once. Captions are optional."}
              </FormDescription>
              {uploadMutation.error && (
                <p className="text-sm text-destructive">
                  {uploadMutation.error instanceof Error
                    ? uploadMutation.error.message
                    : "Unable to upload image(s). Please try again."}
                </p>
              )}

              {images.length > 0 && (
                <div className="space-y-4 pt-2">
                  {images.map((image, index) => (
                    <div key={`${image.url}-${index}`} className="rounded-md border p-3">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-[120px_1fr_auto] md:items-start">
                        <div className="overflow-hidden rounded-md border bg-muted/30">
                          <img
                            src={image.url}
                            alt={image.caption || `Uploaded listing image ${index + 1}`}
                            className="h-24 w-full object-cover"
                          />
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground break-all">{image.url}</p>
                          <Input
                            type="text"
                            placeholder="Write an image caption"
                            value={image.caption}
                            onChange={(event) => {
                              field.onChange(
                                images.map((currentImage, imageIndex) =>
                                  imageIndex === index
                                    ? {
                                        ...currentImage,
                                        caption: event.target.value,
                                      }
                                    : currentImage,
                                ),
                              );
                            }}
                          />
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            field.onChange(images.filter((_, imageIndex) => imageIndex !== index));
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <FormMessage />
            </FormItem>
          );
        }}
      />
    </FormSection>
  );
}
