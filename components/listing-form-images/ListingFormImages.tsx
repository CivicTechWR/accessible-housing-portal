"use client";

import { useId, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Delete02Icon,
  ImageUploadIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";

import { ListingFormControl, ListingFormImage } from "@/app/listing-form/types";
import { listingFormSectionId } from "@/app/listing-form/fieldDefinitions";
import { FormSection } from "@/components/listing-form-layout/ListingFormLayout";
import { Badge } from "@/components/ui/badge";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trimmedAbsoluteOrRootRelativeUrlString } from "@/shared/schemas/string-normalizers";

const uploadImageResponseSchema = z.object({
  data: z.object({
    id: z.uuid(),
    url: trimmedAbsoluteOrRootRelativeUrlString(),
  }),
});

const acceptedImageTypes = ".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const hintId = useId();
  const uploadMutation = useMutation({
    mutationFn: async ({ file, listingId }: { file: File; listingId: string }) =>
      uploadFile(file, listingId),
  });

  const uploadImages = async (
    files: File[],
    currentImages: ListingFormImage[],
    onChange: (images: ListingFormImage[]) => void,
  ) => {
    if (files.length === 0 || uploadMutation.isPending) {
      return;
    }

    try {
      const uploadedImages: ListingFormImage[] = [];
      const resolvedListingId = listingId ?? (await prepareDraftListing());

      for (const file of files) {
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
      // TanStack Query stores the error for rendering beside the dropzone.
    }
  };

  return (
    <FormSection
      id={listingFormSectionId("images")}
      title="Photos"
      description="The first photo is the cover on search results. Captions describe each photo for people who use screen readers."
    >
      <FormField
        control={control}
        name="images"
        render={({ field }) => {
          const images = field.value ?? [];
          const moveImage = (from: number, to: number) => {
            const next = [...images];
            const [moved] = next.splice(from, 1);
            if (!moved) return;
            next.splice(to, 0, moved);
            field.onChange(next);
          };

          return (
            <FormItem className="col-span-2 gap-4">
              <FormLabel className="sr-only">Photos</FormLabel>
              <div
                className={cn(
                  "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-input bg-muted/30 hover:bg-muted/50",
                  uploadMutation.isPending && "pointer-events-none opacity-70",
                )}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  const files = Array.from(event.dataTransfer.files).filter((file) =>
                    file.type.startsWith("image/"),
                  );
                  void uploadImages(files, images, field.onChange);
                }}
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-background shadow-xs ring-1 ring-foreground/10">
                  <HugeiconsIcon
                    icon={uploadMutation.isPending ? Loading03Icon : ImageUploadIcon}
                    strokeWidth={2}
                    className={cn(
                      "size-5 text-muted-foreground",
                      uploadMutation.isPending && "animate-spin",
                    )}
                    aria-hidden
                  />
                </span>
                <p className="text-sm font-medium text-foreground">
                  {uploadMutation.isPending ? (
                    "Uploading photos..."
                  ) : (
                    <>
                      Drag photos here or{" "}
                      <button
                        type="button"
                        className="rounded-sm font-semibold text-primary-text underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
                        aria-describedby={hintId}
                        onClick={() => inputRef.current?.click()}
                      >
                        browse
                      </button>
                    </>
                  )}
                </p>
                <p id={hintId} className="text-sm text-muted-foreground">
                  JPG, PNG, WebP or AVIF, up to 25 MB each.
                  {!listingId ? " Adding a photo saves this listing as a draft." : null}
                </p>
                <FormControl>
                  <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept={acceptedImageTypes}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      event.target.value = "";
                      void uploadImages(files, images, field.onChange);
                    }}
                    disabled={uploadMutation.isPending}
                  />
                </FormControl>
              </div>
              {uploadMutation.error && (
                <p className="text-sm text-destructive" role="alert">
                  {uploadMutation.error instanceof Error
                    ? uploadMutation.error.message
                    : "Unable to upload image(s). Please try again."}
                </p>
              )}

              {images.length > 0 && (
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-label="Uploaded photos">
                  {images.map((image, index) => {
                    const position = `Photo ${index + 1} of ${images.length}`;
                    return (
                      <li
                        key={`${image.url}-${index}`}
                        className="overflow-hidden rounded-lg bg-background ring-1 ring-foreground/10"
                      >
                        <div className="relative aspect-[3/2] bg-muted">
                          <img
                            src={image.url}
                            alt={image.caption || position}
                            className="size-full object-cover"
                          />
                          {index === 0 ? (
                            <Badge
                              variant="outline"
                              className="absolute top-2 left-2 border-transparent shadow-xs"
                            >
                              Cover
                            </Badge>
                          ) : null}
                          <div className="absolute top-2 right-2 flex gap-1 rounded-lg bg-background/90 p-0.5 shadow-xs ring-1 ring-foreground/10 backdrop-blur">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Move ${position} earlier`}
                              title="Move earlier"
                              disabled={index === 0}
                              onClick={() => moveImage(index, index - 1)}
                            >
                              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} aria-hidden />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Move ${position} later`}
                              title="Move later"
                              disabled={index === images.length - 1}
                              onClick={() => moveImage(index, index + 1)}
                            >
                              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} aria-hidden />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              aria-label={`Remove ${position}`}
                              title="Remove"
                              onClick={() => {
                                field.onChange(
                                  images.filter((_, imageIndex) => imageIndex !== index),
                                );
                              }}
                            >
                              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} aria-hidden />
                            </Button>
                          </div>
                        </div>
                        <div className="p-3">
                          {/* The caption is the photo's alt text, so it wraps and grows instead of
                              cutting off. It stays one paragraph: Enter doesn't add a line. */}
                          <Textarea
                            rows={2}
                            className="min-h-[calc(2lh+1.25rem+2px)] resize-none [field-sizing:content]"
                            aria-label={`Caption for ${position.toLowerCase()}`}
                            placeholder="Add a caption"
                            value={image.caption}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") event.preventDefault();
                            }}
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
                      </li>
                    );
                  })}
                </ul>
              )}
              <FormMessage />
            </FormItem>
          );
        }}
      />
    </FormSection>
  );
}
